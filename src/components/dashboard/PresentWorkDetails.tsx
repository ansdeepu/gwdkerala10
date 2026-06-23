
// src/components/dashboard/PresentWorkDetails.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Search, ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SiteDetailFormData, SiteWorkStatus, ApplicationType } from '@/lib/schemas';
import type { ArsEntry } from '@/hooks/useArsEntries';
import { 
    PUBLIC_DEPOSIT_APPLICATION_TYPES, 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES 
} from '@/lib/schemas';

interface PresentWorkDetailsProps {
  allFileEntries: DataEntryFormData[];
  allArsEntries: ArsEntry[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
}

const ONGOING_STATUSES = [
    "Department Rig Allotted", 
    "Work Order Issued", 
    "Work in Progress"
];

const getStatusColor = (status: string | null | undefined) => {
    if (!status) return "";
    if (status.includes("Completed") || status.includes("Bill") || status.includes("Payment")) return "text-red-600";
    if (status.includes("Cancelled")) return "text-gray-500 line-through";
    if (status.includes("Refund")) return "text-yellow-600";
    return "text-green-600";
};

export default function PresentWorkDetails({ allFileEntries, allArsEntries, onOpenDialog }: PresentWorkDetailsProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("deposit");

    const categorizedWorks = useMemo(() => {
        const groups: Record<string, any[]> = {
            deposit: [],
            collector: [],
            private: [],
            planFund: [],
            ars: []
        };

        // 1. Process regular files
        allFileEntries.forEach(entry => {
            const appType = entry.applicationType as any;
            let groupKey = "deposit";
            
            if (PRIVATE_APPLICATION_TYPES.includes(appType)) groupKey = "private";
            else if (COLLECTOR_APPLICATION_TYPES.includes(appType)) groupKey = "collector";
            else if (PLAN_FUND_APPLICATION_TYPES.includes(appType)) groupKey = "planFund";
            else if (PUBLIC_DEPOSIT_APPLICATION_TYPES.includes(appType)) groupKey = "deposit";
            else if (!appType) groupKey = "deposit"; // Default for unassigned in Deposit section

            entry.siteDetails?.forEach(site => {
                if (site.workStatus && ONGOING_STATUSES.includes(site.workStatus) && site.workStatus !== 'Work Cancelled') {
                    groups[groupKey].push({
                        id: entry.id,
                        fileNo: entry.fileNo,
                        siteId: site.id,
                        nameOfWork: site.nameOfSite,
                        contractor: site.contractorName || "N/A",
                        supervisor: site.supervisorName || "N/A",
                        status: site.workStatus,
                        type: 'file'
                    });
                }
            });
        });

        // 2. Process ARS module
        allArsEntries.forEach(ars => {
            if (ars.arsStatus && ONGOING_STATUSES.includes(ars.arsStatus) && ars.arsStatus !== 'Work Cancelled') {
                groups.ars.push({
                    id: ars.id,
                    fileNo: ars.fileNo,
                    nameOfWork: ars.nameOfSite,
                    contractor: ars.arsContractorName || "N/A",
                    supervisor: ars.supervisorName || "N/A",
                    status: ars.arsStatus,
                    type: 'ars'
                });
            }
        });

        // Sort all groups
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.nameOfWork.localeCompare(b.nameOfWork));
        });

        return groups;
    }, [allFileEntries, allArsEntries]);

    const activeList = useMemo(() => {
        const list = categorizedWorks[activeTab] || [];
        if (!searchTerm) return list;
        
        const lowerTerm = searchTerm.toLowerCase();
        return list.filter(w => 
            w.nameOfWork.toLowerCase().includes(lowerTerm) ||
            w.contractor.toLowerCase().includes(lowerTerm) ||
            w.supervisor.toLowerCase().includes(lowerTerm) ||
            w.fileNo.toLowerCase().includes(lowerTerm)
        );
    }, [categorizedWorks, activeTab, searchTerm]);

    const handleWorkClick = (work: any) => {
        const url = work.type === 'ars' 
            ? `/dashboard/ars/entry?id=${work.id}` 
            : `/dashboard/data-entry?id=${work.id}`;
        window.open(url, '_blank');
    };

    return (
        <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5 pb-4 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Briefcase className="h-5 w-5" />
                            Present Work Details
                        </CardTitle>
                        <CardDescription>
                            Ongoing activities (Rig Allotted / Work Order / In Progress) across all sections.
                        </CardDescription>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search in current tab..." 
                            className="pl-9 h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="px-6 py-2 border-b bg-background/50">
                        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                            <TabsTrigger value="deposit" className="py-2 text-xs">
                                Deposit Works <Badge variant="secondary" className="ml-1.5 h-4 px-1">{categorizedWorks.deposit.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="collector" className="py-2 text-xs">
                                Collector&apos;s <Badge variant="secondary" className="ml-1.5 h-4 px-1">{categorizedWorks.collector.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="private" className="py-2 text-xs">
                                Private <Badge variant="secondary" className="ml-1.5 h-4 px-1">{categorizedWorks.private.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="planFund" className="py-2 text-xs">
                                Plan Fund <Badge variant="secondary" className="ml-1.5 h-4 px-1">{categorizedWorks.planFund.length}</Badge>
                            </TabsTrigger>
                            <TabsTrigger value="ars" className="py-2 text-xs">
                                ARS <Badge variant="secondary" className="ml-1.5 h-4 px-1">{categorizedWorks.ars.length}</Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">#</TableHead>
                                    <TableHead className="min-w-[200px]">Work Name</TableHead>
                                    <TableHead>Contractor</TableHead>
                                    <TableHead>Supervisor</TableHead>
                                    <TableHead className="w-[150px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeList.length > 0 ? (
                                    activeList.map((work, index) => (
                                        <TableRow key={`${work.fileNo}-${work.nameOfWork}`} className="hover:bg-secondary/30 transition-colors">
                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <button 
                                                        onClick={() => handleWorkClick(work)}
                                                        className="font-bold text-sm text-left hover:text-primary transition-colors flex items-center gap-1.5"
                                                    >
                                                        {work.nameOfWork}
                                                        <ExternalLink className="h-3 w-3 opacity-50" />
                                                    </button>
                                                    <span className="text-[10px] text-muted-foreground font-mono">{work.fileNo}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">{work.contractor}</TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground">{work.supervisor}</TableCell>
                                            <TableCell>
                                                <span className={cn("text-xs font-bold", getStatusColor(work.status))}>
                                                    {work.status}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                            {searchTerm ? "No matching results found in this category." : "No active projects found in this category."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Tabs>
            </CardContent>
        </Card>
    );
}
