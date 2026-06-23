
// src/components/dashboard/DepartmentalRigWorks.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { DataEntryFormData, RigCompressor, SiteWorkStatus } from '@/lib/schemas';
import { Construction } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface DepartmentalRigWorksProps {
  allFileEntries: DataEntryFormData[];
  rigCompressors: RigCompressor[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
}

const COMPLETED_STATUSES: string[] = ["Work Completed", "Work Failed", "Work Cancelled", "Completed"];
const ONGOING_STATUSES: string[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Department Rig Allotted", "Pending", "VES Pending", "Under Process", "Additional Fund Awaited", "Tendered", "Selection Notice Issued", "Proposal Submitted", "AS & TS Issued", "TS Pending"];

export default function DepartmentalRigWorks({ allFileEntries, rigCompressors, onOpenDialog }: DepartmentalRigWorksProps) {
  
  const rigPerformanceData = useMemo(() => {
    // 1. Identify all internal departmental rigs
    const internalRigs = rigCompressors
      .filter(r => !r.isExternal)
      .sort((a, b) => (a.typeOfRigUnit || '').localeCompare(b.typeOfRigUnit || ''));

    // 2. Aggregate work counts for each rig
    return internalRigs.map(rig => {
        const totalWorks: any[] = [];
        const completedWorks: any[] = [];
        const balanceWorks: any[] = [];

        // Scan through all sites to find matches for this rig
        allFileEntries.forEach(entry => {
            entry.siteDetails?.forEach(site => {
                // Matching based on the typeOfRig field in site details
                const isMatch = site.typeOfRig === rig.typeOfRigUnit;
                
                if (isMatch && site.workStatus !== 'Work Cancelled') {
                    const workItem = {
                        fileNo: entry.fileNo || 'N/A',
                        applicantName: entry.applicantName || 'N/A',
                        siteName: site.nameOfSite || 'N/A',
                        purpose: site.purpose || 'N/A',
                        workStatus: site.workStatus || 'N/A'
                    };
                    
                    totalWorks.push(workItem);
                    if (COMPLETED_STATUSES.includes(site.workStatus as string)) {
                        completedWorks.push(workItem);
                    } else if (ONGOING_STATUSES.includes(site.workStatus as string)) {
                        balanceWorks.push(workItem);
                    }
                }
            });
        });

        return {
            ...rig,
            totalCount: totalWorks.length,
            completedCount: completedWorks.length,
            balanceCount: balanceWorks.length,
            data: {
                total: totalWorks,
                completed: completedWorks,
                balance: balanceWorks
            }
        };
    });
  }, [allFileEntries, rigCompressors]);

  const handleCellClick = (data: any[], title: string) => {
    const columns = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' },
      { key: 'workStatus', label: 'Work Status' },
    ];
    const dataWithSlNo = data.map((item, index) => ({ slNo: index + 1, ...item }));
    onOpenDialog(dataWithSlNo, title, columns, 'detail');
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-primary" />
            Departmental Rig Works Summary
        </CardTitle>
        <CardDescription>
            Drilling performance and active workload for internal units.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-[350px]">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                        <TableHead className="w-[50px] text-center">#</TableHead>
                        <TableHead>Rig Unit</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead className="text-center">Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rigPerformanceData.length > 0 ? (
                        rigPerformanceData.map((rig, index) => (
                            <TableRow key={rig.id} className="hover:bg-primary/5 transition-colors">
                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{rig.typeOfRigUnit}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">{rig.rigVehicleRegNo || 'No Reg No.'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-bold" onClick={() => handleCellClick(rig.data.total, `Total Works - ${rig.typeOfRigUnit}`)}>
                                        {rig.totalCount}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-bold text-green-600" onClick={() => handleCellClick(rig.data.completed, `Completed Works - ${rig.typeOfRigUnit}`)} disabled={rig.completedCount === 0}>
                                        {rig.completedCount}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-bold text-orange-600" onClick={() => handleCellClick(rig.data.balance, `Ongoing Balance - ${rig.typeOfRigUnit}`)} disabled={rig.balanceCount === 0}>
                                        {rig.balanceCount}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                No departmental rigs found in current records.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}
