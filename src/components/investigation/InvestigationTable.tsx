
// src/components/investigation/InvestigationTable.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Move } from "lucide-react";
import type { DataEntryFormData, SiteWorkStatus } from "@/lib/schemas";
import { format, isValid, parseISO } from "date-fns";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useFileEntries } from "@/hooks/useFileEntries";
import { useAuth } from "@/hooks/useAuth";
import { useDataStore } from "@/hooks/use-data-store";
import { cn } from "@/lib/utils";
import { MoveCopyFileDialog, MoveCopySiteDialog } from "../shared/MoveCopyDialogs";

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const getStatusColorClass = (status: SiteWorkStatus | undefined): string => {
    if (!status) return 'text-muted-foreground';
    if (status === 'Work Cancelled') return 'text-gray-500 line-through';
    if (status === 'Work Completed' || status === 'Completed') return 'text-green-600';
    if (status === 'VES Pending') return 'text-orange-600';
    if (status === 'Pending') return 'text-yellow-600';
    return 'text-muted-foreground';
};

interface InvestigationTableProps {
  fileEntries: DataEntryFormData[];
  isLoading: boolean;
  searchActive: boolean;
  totalEntries: number;
  activeTab?: string;
  currentPage?: number;
}

type SortKey = keyof DataEntryFormData | 'firstRemittanceDate';

export default function InvestigationTable({ fileEntries, isLoading, searchActive, totalEntries, activeTab, currentPage = 1 }: InvestigationTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { deleteFileEntry, moveCopyFile } = useFileEntries(); 
  const { user, authIsLoading } = useAuth() as any;
  const { allFileEntries } = useDataStore();

  const lastId = searchParams?.get('lastId');
  const [deleteItem, setDeleteItem] = useState<DataEntryFormData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToMove, setItemToMove] = useState<DataEntryFormData | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'firstRemittanceDate', direction: 'desc' });

  const canDelete = user?.role === 'admin';
  const canCopy = user?.role === 'admin';

  const getDisplayDate = (entry: DataEntryFormData): Date | null => {
    let latestDate: Date | null = null;
    entry.remittanceDetails?.forEach(rd => {
      const d = safeParseDate(rd.dateOfRemittance);
      if (d && (!latestDate || d > latestDate)) latestDate = d;
    });
    const normalizedFileNo = entry.fileNo?.toLowerCase().trim();
    if (normalizedFileNo && allFileEntries) {
      allFileEntries.forEach(otherEntry => {
        if (otherEntry.fileNo?.toLowerCase().trim() === normalizedFileNo) return;
        otherEntry.reappropriationDetails?.forEach(reapp => {
          if (reapp.refFileNo?.toLowerCase().trim() === normalizedFileNo) {
            const d = safeParseDate(reapp.date);
            if (d && (!latestDate || d > latestDate)) latestDate = d;
          }
        });
      });
    }
    return latestDate;
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30 group-hover:opacity-100" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-3 w-3" />;
    return <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const sortedFileEntries = useMemo(() => {
    let sortableItems = [...fileEntries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof DataEntryFormData];
        let bValue: any = b[sortConfig.key as keyof DataEntryFormData];
        if (sortConfig.key === 'firstRemittanceDate') {
          const dateA = getDisplayDate(a);
          const dateB = getDisplayDate(b);
          aValue = dateA?.getTime() || 0;
          bValue = dateB?.getTime() || 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [fileEntries, sortConfig, allFileEntries]);

  useEffect(() => {
    if (!isLoading && lastId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`row-${lastId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-primary/10');
          setTimeout(() => element.classList.remove('bg-primary/10'), 2000);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, lastId]);

  const getDetailUrl = (item: DataEntryFormData) => {
    if (!item.id) return '#';
    const queryParams = new URLSearchParams({ 
        id: item.id, 
        workType: 'gwInvestigation',
        tab: activeTab || '',
        page: String(currentPage)
    });
    return `/dashboard/data-entry?${queryParams.toString()}`;
  };

  const handleViewClick = (item: DataEntryFormData) => {
    const url = getDetailUrl(item);
    if (url !== '#') {
      router.push(url);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem || !deleteItem.id) return;
    setIsDeleting(true);
    try {
        await deleteFileEntry(deleteItem.id);
        toast({ title: "Investigation File Deleted" });
    } catch (error: any) {
        toast({ title: "Error Deleting File", description: error.message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setDeleteItem(null);
    }
  };

  const handleMoveCopyFileConfirm = async (op: 'move' | 'copy', target: string) => {
    if (!itemToMove || !itemToMove.id) return;
    try {
        await moveCopyFile(itemToMove.id, op, target);
        toast({ title: op === 'move' ? "File Moved" : "File Copied" });
    } catch (error: any) {
        toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading || authIsLoading) {
    return <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading data...</p></div>;
  }

  if (sortedFileEntries.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <Image src="https://placehold.co/128x128/F0F2F5/3F51B5.png?text=No+Files" width={100} height={100} alt="No files" className="mb-4 opacity-70 rounded-lg" data-ai-hint="empty box document"/>
            <h3 className="text-xl font-semibold">No Investigation Files Found</h3>
            <p className="text-muted-foreground">{searchActive ? "No files match your search criteria." : "There are no files in this category."}</p>
        </div>
    );
  }

  return (
    <>
      <TooltipProvider>
        <div className="max-h-[70vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary z-10">
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead><Button variant="ghost" className="p-0 hover:bg-transparent font-bold text-left" onClick={() => requestSort('fileNo')}>File No. {getSortIcon('fileNo')}</Button></TableHead>
                <TableHead><Button variant="ghost" className="p-0 hover:bg-transparent font-bold text-left" onClick={() => requestSort('applicantName')}>Applicant {getSortIcon('applicantName')}</Button></TableHead>
                <TableHead>Site Name(s)</TableHead>
                <TableHead><Button variant="ghost" className="p-0 hover:bg-transparent font-bold text-left" onClick={() => requestSort('firstRemittanceDate')}>Remittance {getSortIcon('firstRemittanceDate')}</Button></TableHead>
                <TableHead>
                  {user?.role === 'investigator' ? (
                    "Work Status"
                  ) : (
                    <Button variant="ghost" className="p-0 hover:bg-transparent font-bold text-left" onClick={() => requestSort('fileStatus')}>
                      File Status {getSortIcon('fileStatus')}
                    </Button>
                  )}
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFileEntries.map((entry, index) => {
                const displayDate = getDisplayDate(entry);
                const detailUrl = getDetailUrl(entry);
                return (
                <TableRow key={entry.id} id={`row-${entry.id}`} className="transition-colors duration-1000">
                  <TableCell className="text-center font-mono">{(currentPage - 1) * 50 + index + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                        href={detailUrl}
                        className="font-mono text-sm text-primary font-bold hover:underline"
                        onContextMenu={(e) => {
                            e.preventDefault();
                            window.open(detailUrl, '_blank');
                        }}
                    >
                        {entry.fileNo}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{entry.applicantName}</TableCell>
                  <TableCell>
                    {(entry.siteDetails || []).map((site, idx) => (
                      <span key={idx} className={cn("font-semibold text-xs", getStatusColorClass(site.workStatus as SiteWorkStatus))}>
                        {site.nameOfSite}{idx < entry.siteDetails!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className="text-xs">
                    {displayDate ? format(displayDate, "dd/MM/yyyy") : "N/A"}
                  </TableCell>
                  <TableCell className="font-semibold text-xs">
                    {user?.role === 'investigator' ? (
                      <div className="flex flex-col gap-0.5">
                        {(entry.siteDetails || []).map((site, idx) => (
                          <span key={idx} className={cn("text-[10px] font-bold uppercase", getStatusColorClass(site.workStatus as SiteWorkStatus))}>
                            {site.workStatus || 'N/A'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      entry.fileStatus
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleViewClick(entry)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Details</p></TooltipContent>
                        </Tooltip>
                        {canCopy && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setItemToMove(entry)}><Move className="h-4 w-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Move or Copy File</p></TooltipContent>
                            </Tooltip>
                        )}
                        {canDelete && 
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteItem(entry)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete File</p></TooltipContent>
                          </Tooltip>
                        }
                    </div>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
      
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this investigation file?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveCopyFileDialog
        isOpen={!!itemToMove}
        onClose={() => setItemToMove(null)}
        onConfirm={handleMoveCopyFileConfirm}
        fileNo={itemToMove?.fileNo || ''}
        currentModule="gwInvestigation"
      />
    </>
  );
}

