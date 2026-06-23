// src/app/dashboard/pending-updates/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { useDataStore } from '@/hooks/use-data-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PendingUpdate, SiteDetailFormData, ArsEntryFormData, DataEntryFormData } from '@/lib/schemas';
import { LOGGING_PUMPING_TEST_PURPOSE_OPTIONS } from '@/lib/schemas';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { usePageHeader } from '@/hooks/usePageHeader';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, XCircle, UserX, ListChecks, Trash2, FolderOpen, Waves, TestTube2, Droplets, Info } from 'lucide-react';
import UpdateTable from '@/components/admin/PendingUpdatesTable';


const toDateOrNull = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
    const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
    return isValid(date) ? date : null;
  }
  if (typeof value === 'string') {
    const parsedDate = new Date(value);
    if (isValid(parsedDate)) return parsedDate;
  }
  return null;
};

const formatDateValue = (value: any): string => {
  const date = toDateOrNull(value);
  return date ? format(date, 'dd/MM/yyyy') : String(value || 'Not Set');
};

const getFieldName = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
};

export default function PendingUpdatesPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { rejectUpdate, deleteUpdate, subscribeToPendingUpdates } = usePendingUpdates();
  const { allFileEntries: fileEntries, isLoading: filesLoading } = useDataStore();
  const { allArsEntries: arsEntries, isLoading: arsLoading } = useDataStore();
  const { toast } = useToast();
  
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [updateToReject, setUpdateToReject] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [updateToDelete, setUpdateToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [changesToView, setChangesToView] = useState<{ title: string; changes: { field: string; oldValue: string; newValue: string }[] } | null>(null);

  useEffect(() => {
    setHeader('Pending Actions', 'Review and approve or reject updates submitted by supervisors.');
  }, [setHeader]);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToPendingUpdates((updates) => {
      setPendingUpdates(updates);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [subscribeToPendingUpdates]);

  const { depositWorkUpdates, arsUpdates, gwInvestigationUpdates, loggingPumpingTestUpdates } = useMemo(() => {
    const ars: PendingUpdate[] = [];
    const investigation: PendingUpdate[] = [];
    const logging: PendingUpdate[] = [];
    const deposit: PendingUpdate[] = [];

    pendingUpdates.forEach(update => {
        if (update.isArsUpdate) {
            ars.push(update);
        } else {
            const firstSite = update.updatedSiteDetails[0] as SiteDetailFormData;
            const purpose = firstSite?.purpose || 'Deposit Work';

            if (purpose === 'GW Investigation') {
                investigation.push(update);
            } else if (LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(purpose as any)) {
                logging.push(update);
            } else {
                deposit.push(update);
            }
        }
    });

    return { 
        arsUpdates: ars, 
        gwInvestigationUpdates: investigation, 
        loggingPumpingTestUpdates: logging, 
        depositWorkUpdates: deposit 
    };
  }, [pendingUpdates]);

  const handleReject = async () => {
    if (!updateToReject) return;
    setIsRejecting(true);
    try {
      await rejectUpdate(updateToReject, rejectionReason);
      toast({
        title: "Update Rejected",
        description: "The supervisor's changes have been rejected and they have been notified.",
      });
    } catch (error: any) {
      toast({ title: "Rejection Failed", description: error.message || "Could not reject the update.", variant: "destructive" });
    } finally {
      setIsRejecting(false);
      setUpdateToReject(null);
      setRejectionReason("");
    }
  };

  const handleDelete = async () => {
    if (!updateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUpdate(updateToDelete);
      toast({ title: "Update Deleted", description: "The pending update has been permanently removed." });
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message || "Could not delete the update.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setUpdateToDelete(null);
    }
  };

  const handleViewChanges = (update: PendingUpdate) => {
    let originalEntry: any | undefined;
    
    if (update.isArsUpdate) {
        originalEntry = arsEntries.find(f => f.id === update.arsId);
    } else {
        const firstSite = update.updatedSiteDetails?.[0] as SiteDetailFormData | undefined;
        const isGwInvestigationUpdate = firstSite?.purpose === 'GW Investigation';
        const isLoggingPumpingTestUpdate = firstSite?.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(firstSite.purpose as any);

        originalEntry = fileEntries.find(f => {
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
    }

    if (!originalEntry) {
        toast({ title: "Error", description: `Original record for File No: ${update.fileNo} not found in current cache.`, variant: "destructive" });
        return;
    }

    const allChanges: { field: string; oldValue: string; newValue: string }[] = [];
    let title = `Changes for File No: ${update.fileNo}`;

    const originalSites = update.isArsUpdate ? [originalEntry] : (originalEntry as DataEntryFormData).siteDetails || [];

    update.updatedSiteDetails.forEach((updatedSite: SiteDetailFormData | ArsEntryFormData) => {
        let originalSite: SiteDetailFormData | ArsEntryFormData | undefined;
        if (!update.isArsUpdate) {
          originalSite = (originalSites as SiteDetailFormData[]).find(
            s => s.nameOfSite === (updatedSite as SiteDetailFormData).nameOfSite
          );
        } else {
          originalSite = originalSites[0] as ArsEntryFormData;
        }

        if (!update.isArsUpdate) {
          const siteName = (updatedSite as SiteDetailFormData).nameOfSite;
          if (update.updatedSiteDetails.length > 1) {
            allChanges.push({ field: `--- Site: ${siteName} ---`, oldValue: '', newValue: '' });
          } else {
            title = `Changes for site "${siteName}"`;
          }
        }
        
        if (!originalSite) {
            allChanges.push({ field: "Site Status", oldValue: "Exists", newValue: "NEW SITE ADDED" });
            return;
        }

        Object.keys(updatedSite).forEach(key => {
            const typedKey = key as keyof (SiteDetailFormData | ArsEntryFormData);
            if (typedKey === 'workImages' || typedKey === 'workVideos') return; // Skip media comparison for summary view

            let originalValue = (originalSite as any)[typedKey];
            let updatedValue = (updatedSite as any)[typedKey];
            
            if (typedKey.toLowerCase().includes('date')) {
                originalValue = formatDateValue(originalValue);
                updatedValue = formatDateValue(updatedValue);
            } else {
                originalValue = originalValue ?? '';
                updatedValue = updatedValue ?? '';
            }

            if (String(originalValue) !== String(updatedValue)) {
                allChanges.push({
                    field: getFieldName(typedKey),
                    oldValue: String(originalValue) || '(empty)',
                    newValue: String(updatedValue) || '(empty)',
                });
            }
        });
    });
    
    if (allChanges.length > 0) {
      setChangesToView({ title, changes: allChanges });
    } else {
      toast({ title: "No Property Changes", description: "Only media or complex objects were updated, which are not listed in this diff view.", variant: "default" });
    }
  };

  const isAdmin = user?.role === 'admin';
  const isScientist = user?.role === 'scientist';
  const isEngineer = user?.role === 'engineer';

  if (isLoading || filesLoading || arsLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading pending updates...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {(isAdmin || isScientist) && (
            <>
                <UpdateTable
                    title="GW Investigation Updates"
                    icon={TestTube2}
                    updates={gwInvestigationUpdates}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isScientist}
                />
                <UpdateTable
                    title="Logging & Pumping Test Updates"
                    icon={Droplets}
                    updates={loggingPumpingTestUpdates}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isScientist}
                />
            </>
        )}
        
        {(isAdmin || isEngineer) && (
            <>
                <UpdateTable
                    title="Deposit Work Updates"
                    icon={FolderOpen}
                    updates={depositWorkUpdates}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isEngineer}
                />
                <UpdateTable
                    title="ARS Updates"
                    icon={Waves}
                    updates={arsUpdates}
                    isArsTable={true}
                    fileEntries={fileEntries}
                    arsEntries={arsEntries}
                    handleViewChanges={handleViewChanges}
                    setUpdateToReject={setUpdateToReject}
                    setUpdateToDelete={setUpdateToDelete}
                    isRejecting={isRejecting}
                    isDeleting={isDeleting}
                    canApprove={isAdmin || isEngineer}
                />
            </>
        )}
      </div>
      
      <AlertDialog open={!!updateToReject} onOpenChange={() => setUpdateToReject(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reject this update?</AlertDialogTitle><AlertDialogDescription>Please provide a reason for the rejection below.</AlertDialogDescription></AlertDialogHeader>
            <div className="py-2"><Label htmlFor="rejection-reason" className="text-left">Reason (Optional)</Label><Textarea id="rejection-reason" placeholder="e.g., Incorrect work status." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2" /></div>
            <AlertDialogFooter><AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReject} disabled={isRejecting} className="bg-destructive hover:bg-destructive/90">{isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Reject"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!updateToDelete} onOpenChange={() => setUpdateToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Permanently delete this update?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will remove the update record permanently.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changesToView} onOpenChange={() => setChangesToView(null)}>
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{changesToView?.title}</DialogTitle>
            <DialogDescription>Review the changes submitted by the supervisor.</DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              <Table>
                <TableHeader><TableRow><TableHead className="w-[30%]">Field</TableHead><TableHead className="w-[35%]">Original Value</TableHead><TableHead className="w-[35%]">New Value</TableHead></TableRow></TableHeader>
                <TableBody>{changesToView?.changes.map((change, index) => (<TableRow key={index}><TableCell className="font-medium text-xs">{change.field}</TableCell><TableCell className="text-xs text-muted-foreground line-through">{change.oldValue}</TableCell><TableCell className="text-xs font-semibold text-primary">{change.newValue}</TableCell></TableRow>))}</TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
