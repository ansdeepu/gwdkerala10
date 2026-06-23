
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { DataEntryFormData, StaffMember, SiteWorkStatus, ArsStatus } from '@/lib/schemas';
import type { ArsEntry } from '@/hooks/useArsEntries';
import type { UserProfile } from '@/hooks/useAuth';
import { Users } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SupervisorWorkProps {
  allFileEntries: DataEntryFormData[];
  allArsEntries: ArsEntry[];
  allUsers: UserProfile[];
  staffMembers: StaffMember[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
}

const COMPLETED_STATUSES: string[] = ["Work Completed", "Work Failed", "Work Cancelled", "Completed"];
const ONGOING_STATUSES: string[] = ["Work Order Issued", "Work in Progress", "Work Initiated", "Department Rig Allotted", "Pending", "VES Pending", "Under Process", "Additional Fund Awaited", "Tendered", "Selection Notice Issued", "Proposal Submitted", "AS & TS Issued", "TS Pending"];

export default function SupervisorWork({ allFileEntries, allArsEntries, allUsers, staffMembers, onOpenDialog }: SupervisorWorkProps) {
  
  const staffSummaryData = useMemo(() => {
    const staffMap = new Map(staffMembers.map(s => [s.id, s]));
    
    // 1. Identify all Field Staff (Investigators or Supervisors)
    const fieldStaff = allUsers
      .filter(u => u.isApproved && (u.role === 'supervisor' || u.role === 'investigator'))
      .map(u => {
        const staffInfo = u.staffId ? staffMap.get(u.staffId) : null;
        const name = staffInfo?.name || u.name || u.email?.split('@')[0] || "User";
        const designation = staffInfo?.designation || (u.role.charAt(0).toUpperCase() + u.role.slice(1));
        
        return {
          uid: u.uid,
          name,
          designation,
          staffId: u.staffId,
          role: u.role
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // 2. Aggregate counts for each staff member
    return fieldStaff.map(staff => {
        const totalWorks: any[] = [];
        const completedWorks: any[] = [];
        const balanceWorks: any[] = [];

        const checkMatch = (site: any) => {
            const isAssignedSupervisor = site.supervisorUid === staff.uid || 
                (staff.name && site.supervisorName?.includes(staff.name));
            const isAssignedInvestigator = staff.name && (site.nameOfInvestigator === staff.name || site.vesInvestigator === staff.name);
            return isAssignedSupervisor || isAssignedInvestigator;
        };

        // Process File Entries
        allFileEntries.forEach(entry => {
            entry.siteDetails?.forEach(site => {
                if (checkMatch(site) && site.workStatus !== 'Work Cancelled') {
                    const workItem = {
                        fileNo: entry.fileNo || 'N/A',
                        applicantName: entry.applicantName || 'N/A',
                        siteName: site.nameOfSite || 'N/A',
                        purpose: site.purpose || 'N/A',
                        workStatus: site.workStatus || 'N/A'
                    };
                    totalWorks.push(workItem);
                    if (COMPLETED_STATUSES.includes(site.workStatus as string)) completedWorks.push(workItem);
                    else if (ONGOING_STATUSES.includes(site.workStatus as string)) balanceWorks.push(workItem);
                }
            });
        });

        // Process ARS Entries
        allArsEntries.forEach(ars => {
            const isAssigned = ars.supervisorUid === staff.uid || (staff.name && ars.supervisorName?.includes(staff.name));
            if (isAssigned && ars.arsStatus !== 'Work Cancelled') {
                const workItem = {
                    fileNo: ars.fileNo || 'N/A',
                    applicantName: 'ARS Scheme',
                    siteName: ars.nameOfSite || 'N/A',
                    purpose: ars.arsTypeOfScheme || 'ARS',
                    workStatus: ars.arsStatus || 'N/A',
                    id: ars.id
                };
                totalWorks.push(workItem);
                if (COMPLETED_STATUSES.includes(ars.arsStatus as string)) completedWorks.push(workItem);
                else if (ONGOING_STATUSES.includes(ars.arsStatus as string)) balanceWorks.push(workItem);
            }
        });

        return {
            ...staff,
            totalCount: totalWorks.length,
            completedCount: completedWorks.length,
            balanceCount: balanceWorks.length,
            data: {
                total: totalWorks,
                completed: completedWorks,
                balance: balanceWorks
            }
        };
    }).filter(s => s.totalCount > 0); 
  }, [allFileEntries, allArsEntries, allUsers, staffMembers]);

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
            <Users className="h-5 w-5 text-primary" />
            Field Staff Performance Summary
        </CardTitle>
        <CardDescription>
            Workload overview for all active Investigators and Supervisors.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-[350px]">
            <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                        <TableHead className="w-[50px] text-center">#</TableHead>
                        <TableHead>Staff Name</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Completed</TableHead>
                        <TableHead className="text-center">Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {staffSummaryData.length > 0 ? (
                        staffSummaryData.map((staff, index) => (
                            <TableRow key={staff.uid} className="hover:bg-primary/5 transition-colors">
                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">{staff.name}</span>
                                            <Badge variant="outline" className={cn(
                                                "text-[8px] h-3 px-1 leading-none uppercase",
                                                staff.role === 'supervisor' ? "border-blue-500 text-blue-700 bg-blue-50" : "border-purple-500 text-purple-700 bg-purple-50"
                                            )}>
                                                {staff.role}
                                            </Badge>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{staff.designation}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-bold" onClick={() => handleCellClick(staff.data.total, `Total Works - ${staff.name}`)}>
                                        {staff.totalCount}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-bold text-green-600" onClick={() => handleCellClick(staff.data.completed, `Completed Works - ${staff.name}`)} disabled={staff.completedCount === 0}>
                                        {staff.completedCount}
                                    </Button>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Button variant="link" className="p-0 h-auto font-bold text-orange-600" onClick={() => handleCellClick(staff.data.balance, `Ongoing Balance - ${staff.name}`)} disabled={staff.balanceCount === 0}>
                                        {staff.balanceCount}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                No field staff assignments found in current records.
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
