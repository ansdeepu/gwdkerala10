
// src/components/admin/PendingUpdatesTable.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, UserX, ListChecks, Trash2, FolderOpen, Waves, TestTube2, Droplets, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PendingUpdate, SiteDetailFormData, ArsEntryFormData, DataEntryFormData } from '@/lib/schemas';
import { LOGGING_PUMPING_TEST_PURPOSE_OPTIONS } from '@/lib/schemas';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const UpdateTable = ({
  title,
  icon: Icon,
  updates,
  isArsTable = false,
  fileEntries,
  handleViewChanges,
  setUpdateToReject,
  setUpdateToDelete,
  isRejecting,
  isDeleting,
  arsEntries,
  canApprove,
}: {
  title: string;
  icon: React.ElementType;
  updates: PendingUpdate[];
  isArsTable?: boolean;
  fileEntries: DataEntryFormData[];
  handleViewChanges: (update: PendingUpdate) => void;
  setUpdateToReject: (id: string | null) => void;
  setUpdateToDelete: (id: string | null) => void;
  isRejecting: boolean;
  isDeleting: boolean;
  arsEntries: any[];
  canApprove: boolean;
}) => {
  return (
    <Card className="overflow-hidden shadow-md">
      <CardHeader className="bg-secondary/10">
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title} ({updates.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Sl. No.</TableHead>
                <TableHead>File No.</TableHead>
                {!isArsTable && <TableHead>Applicant Name</TableHead>}
                <TableHead>Site Name(s)</TableHead>
                {!isArsTable && <TableHead>Purpose(s)</TableHead>}
                <TableHead>Submitted By</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-[240px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.length > 0 ? (
                updates.map((update, index) => {
                  const isUnassigned = update.status === 'supervisor-unassigned';
                  
                  const parentFile = (() => {
                    if (isArsTable) {
                      return arsEntries.find(a => a.id === update.arsId);
                    }
                  
                    const firstSite = update.updatedSiteDetails?.[0] as SiteDetailFormData | undefined;
                    const isGwInvestigationUpdate = firstSite?.purpose === 'GW Investigation';
                    const isLoggingPumpingTestUpdate = firstSite?.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(firstSite.purpose as any);
                  
                    return fileEntries.find(f => {
                      if (f.fileNo !== update.fileNo) return false;
                  
                      const isOriginalGwInvestigation = f.siteDetails?.some(s => s.purpose === 'GW Investigation');
                      const isOriginalLoggingPumping = f.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any));
                  
                      if (isGwInvestigationUpdate) {
                        return isOriginalGwInvestigation && !isOriginalLoggingPumping;
                      }
                      if (isLoggingPumpingTestUpdate) {
                        return isOriginalLoggingPumping;
                      }
                      return !isOriginalGwInvestigation && !isOriginalLoggingPumping;
                    });
                  })();

                  const applicantName = update.isArsUpdate ? 'N/A' : (parentFile as DataEntryFormData)?.applicantName || 'N/A';
                  const siteNames = update.updatedSiteDetails.map((s: SiteDetailFormData | ArsEntryFormData) => s.nameOfSite).join(', ');
                  
                  let purposeDisplay: string;
                  if (update.isArsUpdate) {
                    const arsDetail = update.updatedSiteDetails[0] as ArsEntryFormData;
                    purposeDisplay = arsDetail?.arsTypeOfScheme || 'N/A';
                  } else {
                    const siteDetails = update.updatedSiteDetails as SiteDetailFormData[];
                    purposeDisplay = siteDetails.map((s: SiteDetailFormData) => s.purpose || 'N/A').join(', ');
                  }

                  const isRejected = update.status === 'rejected';

                  let reviewLink = '';
                  if (update.isArsUpdate && update.arsId) {
                    reviewLink = `/dashboard/ars/entry?id=${update.arsId}&approveUpdateId=${update.id}`;
                  } else if (!update.isArsUpdate) {
                    const parentFileId = (parentFile as DataEntryFormData)?.id;
                    if (parentFileId) {
                      reviewLink = `/dashboard/data-entry?id=${parentFileId}&approveUpdateId=${update.id}`;
                    }
                  }

                  return (
                    <TableRow key={update.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium font-mono text-xs">{update.fileNo}</TableCell>
                      {!isArsTable && <TableCell className="max-w-[150px] truncate">{applicantName}</TableCell>}
                      <TableCell className="max-w-[150px] truncate">{siteNames}</TableCell>
                      {!isArsTable && <TableCell className="text-xs">{purposeDisplay}</TableCell>}
                      <TableCell className="text-xs">{update.submittedByName}</TableCell>
                      <TableCell className="text-[10px] whitespace-nowrap">
                        {formatDistanceToNow(update.submittedAt, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={isUnassigned ? "destructive" : isRejected ? "outline" : "default"} className={isRejected ? "text-destructive border-destructive" : ""}>
                              {isUnassigned ? <UserX className="mr-1 h-3 w-3" /> : isRejected && <XCircle className="mr-1 h-3 w-3" />}
                              {isUnassigned ? "Unassigned" : isRejected ? "Rejected" : update.status}
                            </Badge>
                          </TooltipTrigger>
                          {(isUnassigned || isRejected) && update.notes && <TooltipContent><p>{update.notes}</p></TooltipContent>}
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Button variant="link" className="p-0 h-auto text-xs" onClick={() => handleViewChanges(update)}><ListChecks className="mr-1 h-3 w-3" />Diff</Button>
                            {canApprove && reviewLink ? (
                            <Button asChild size="sm" variant="outline" className="h-8 text-xs"><Link href={reviewLink}><CheckCircle className="mr-1 h-3 w-3" /> Review</Link></Button>
                            ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 text-xs" disabled><CheckCircle className="mr-1 h-3 w-3" /> Review</Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{!canApprove ? "Only assigned role (Scientist/Engineer) can approve this." : "Original file could not be found to start review."}</p></TooltipContent>
                            </Tooltip>
                            )}
                            {canApprove && (
                                <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setUpdateToReject(update.id)} disabled={isRejecting || isRejected}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                            )}
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setUpdateToDelete(update.id)} disabled={isDeleting}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Permanently Delete Update</p></TooltipContent>
                            </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={isArsTable ? 7 : 9} className="h-20 text-center text-muted-foreground italic">No pending updates in this category.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpdateTable;
