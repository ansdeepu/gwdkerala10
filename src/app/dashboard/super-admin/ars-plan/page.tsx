
// src/app/dashboard/super-admin/ars-plan/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useArsEntries, type ArsEntry } from "@/hooks/useArsEntries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, isValid, parse, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import ExcelJS from "exceljs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageHeader } from "@/hooks/usePageHeader";
import type { ArsEntryFormData, SiteWorkStatus, ArsStatus } from "@/lib/schemas";
import { arsTypeOfSchemeOptions, constituencyOptions, arsWorkStatusOptions } from "@/lib/schemas";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from '@/hooks/use-data-store';
import { Loader2, Search, Eye, XCircle, Clock, FileDown } from 'lucide-react';


export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 50;

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (isValid(parsed)) return parsed;
  }
  // Fallback for other potential date-like objects from Firestore
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = safeParseDate(dateInput);
  return date ? format(date, 'dd/MM/yyyy') : '';
};

// New helper function for color coding
const getStatusRowClass = (status: SiteWorkStatus | ArsStatus | undefined | null): string => {
    if (!status) return "";
    
    if (status === 'Work Cancelled') {
        return 'bg-gray-500/5 hover:bg-gray-500/15 text-gray-500 line-through';
    }
    
    const completedOrFailed: (SiteWorkStatus | ArsStatus)[] = ["Work Completed", "Work Failed"];
    if (completedOrFailed.includes(status as any)) {
        return 'bg-red-500/5 hover:bg-red-500/15 text-red-700';
    }
    
    if (status === 'Refund Pending') {
        return 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700';
    }
    
    return 'bg-green-500/5 hover:bg-green-500/15 text-green-700';
};


export default function ArsPlanPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('ARS - Plan', 'A read-only overview of all Artificial Recharge Schemes.');
  }, [setHeader]);
  
  const { allArsEntries: arsEntries, isLoading: entriesLoading, searchTerms, setModuleSearchTerm } = useDataStore();
  
  const searchTerm = searchTerms['ars-plan'] || "";
  const setSearchTerm = (term: string) => setModuleSearchTerm('ars-plan', term);

  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();
  const { officeAddress } = useDataStore();
  
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [schemeTypeFilter, setSchemeTypeFilter] = useState<string>('all');
  const [constituencyFilter, setConstituencyFilter] = useState<string>('all');
  
  const handleViewClick = (siteId: string) => {
    const pageParam = currentPage > 1 ? `&page=${currentPage}` : '';
    router.push(`/dashboard/ars/entry?id=${siteId}&readOnly=true${pageParam ? `&${pageParam.substring(1)}` : ''}`);
  };

  const { filteredSites, lastCreatedDate } = useMemo(() => {
    let sites: ArsEntry[] = [...arsEntries];
    
    if (schemeTypeFilter !== 'all') {
      sites = sites.filter(site => site.arsTypeOfScheme === schemeTypeFilter);
    }
    
    if (constituencyFilter !== 'all') {
      sites = sites.filter(site => site.constituency === constituencyFilter);
    }

    if (startDate || endDate) {
      const sDate = startDate ? startOfDay(parse(startDate, 'yyyy-MM-dd', new Date())) : null;
      const eDate = endDate ? endOfDay(parse(endDate, 'yyyy-MM-dd', new Date())) : null;

      sites = sites.filter(site => {
        const completionValue = site.dateOfCompletion;
        if (!completionValue) return false;
        
        const completionDate = safeParseDate(completionValue);

        if (!completionDate || !isValid(completionDate)) return false;

        if (sDate && eDate) return isWithinInterval(completionDate, { start: sDate, end: eDate });
        if (sDate) return completionDate >= sDate;
        if (eDate) return completionDate <= eDate;
        return false;
      });
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    if (lowercasedFilter) {
      sites = sites.filter(site => {
        const searchableContent = [
          site.fileNo,
          site.nameOfSite,
          site.constituency,
          site.arsTypeOfScheme,
          site.localSelfGovt,
          site.arsBlock,
          site.arsStatus,
          site.supervisorName,
          site.workRemarks,
          (site as any).officeLocation || (site as any).officeLocationFromPath
        ].filter(Boolean).map(String).join(' ').toLowerCase();

        return searchableContent.includes(lowercasedFilter);
      });
    }
    
    sites.sort((a, b) => {
        // Primary sort: Sanctioned Date (Descending)
        const sanctionedA = a.arsSanctionedDate ? safeParseDate(a.arsSanctionedDate) : null;
        const sanctionedB = b.arsSanctionedDate ? safeParseDate(b.arsSanctionedDate) : null;

        if (sanctionedA && sanctionedB) {
            if (sanctionedA.getTime() !== sanctionedB.getTime()) {
                return sanctionedB.getTime() - sanctionedA.getTime();
            }
        } else if (sanctionedA) {
            return -1;
        } else if (sanctionedB) {
            return 1;
        }

        // Secondary sort: Creation Date (Descending)
        const dateA = a.createdAt ? safeParseDate(a.createdAt) : null;
        const dateB = b.createdAt ? safeParseDate(b.createdAt) : null;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        if (!isValid(dateA)) return 1;
        if (!isValid(dateB)) return -1;

        return dateB.getTime() - dateA.getTime();
    });

    const lastCreated = sites.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        if (createdAt && (!latest || createdAt > latest)) {
            return createdAt;
        }
        return latest;
    }, null as Date | null);

    return { filteredSites: sites, lastCreatedDate: lastCreated };
  }, [arsEntries, searchTerm, startDate, endDate, schemeTypeFilter, constituencyFilter]);

  useEffect(() => {
    const pageFromUrl = searchParams?.get('page');
    const pageNum = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    if (!isNaN(pageNum) && pageNum > 0) {
      setCurrentPage(pageNum);
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const newTotalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    } else if (currentPage === 0 && newTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredSites.length, currentPage]);

  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSites, currentPage]);
  
  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);
  
  const handleExportExcel = useCallback(async () => {
    if (filteredSites.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }
    const reportTitle = "Artificial Recharge Schemes (ARS) Report";
    const fileNamePrefix = "gwd_ars_report_all_offices";
    
    const headers = [
      "Sl. No.", "File No", "Name of Site", "Constituency (LAC)", "Type of Scheme", 
      "Local Self Govt.", "Block", "Latitude", "Longitude", "Number of Structures", 
      "Storage Capacity (m3)", "No. of Fillings", "AS/TS Accorded Details", 
      "AS/TS Amount (₹)", "Sanctioned Date", "Tender No.", "Contractor", "Tendered Amount (₹)", "Awarded Amount (₹)", 
      "Present Status", "Completion Date", "No. of Beneficiaries", "Remarks", "Office Location"
    ];

    const dataForExport = filteredSites.map((site, index) => ({
      "Sl. No.": index + 1,
      "File No": site.fileNo || 'N/A',
      "Name of Site": site.nameOfSite || 'N/A',
      "Constituency (LAC)": site.constituency || 'N/A',
      "Type of Scheme": site.arsTypeOfScheme || 'N/A',
      "Local Self Govt.": site.localSelfGovt || 'N/A',
      "Block": site.arsBlock || 'N/A',
      "Latitude": site.latitude ?? 'N/A',
      "Longitude": site.longitude ?? 'N/A',
      "Number of Structures": site.arsNumberOfStructures ?? 'N/A',
      "Storage Capacity (m3)": site.arsStorageCapacity ?? 'N/A',
      "No. of Fillings": site.arsNumberOfFillings ?? 'N/A',
      "AS/TS Accorded Details": site.arsAsTsDetails || 'N/A',
      "AS/TS Amount (₹)": site.tsAmount ?? 'N/A',
      "Sanctioned Date": formatDateSafe(site.arsSanctionedDate),
      "Tender No.": site.arsTenderNo || 'N/A',
      "Contractor": site.arsContractorName || 'N/A',
      "Tendered Amount (₹)": site.arsTenderedAmount ?? 'N/A',
      "Awarded Amount (₹)": site.arsAwardedAmount ?? 'N/A',
      "Present Status": site.arsStatus || 'N/A',
      "Completion Date": formatDateSafe(site.dateOfCompletion),
      "No. of Beneficiaries": site.noOfBeneficiary || 'N/A',
      "Remarks": site.workRemarks || 'N/A',
      "Office Location": (site as any).officeLocation || (site as any).officeLocationFromPath || 'N/A'
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ARSReport");

    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit(); // Spacer

    worksheet.mergeCells('A1:W1');
    worksheet.mergeCells('A2:W2');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F0F0F0' }
      };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    dataForExport.forEach(row => {
        const values = headers.map(header => row[header as keyof typeof row]);
        const newRow = worksheet.addRow(values);
        newRow.eachCell(cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
    });

    worksheet.columns.forEach((column, i) => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Excel Exported", description: `Report downloaded.` });
  }, [filteredSites, toast]);
  
  if (entriesLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading ARS data...</p>
      </div>
    );
  }

  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, filteredSites.length);

  return (
    <div className="space-y-6">
      <TooltipProvider>
       <Card>
        <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Search across all fields..." className="w-full rounded-lg bg-background pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center flex-wrap sm:flex-nowrap justify-end gap-2">
                  <Button variant="outline" onClick={handleExportExcel} size="sm" className="shrink-0"> <FileDown className="mr-2 h-4 w-4" /> Export Excel </Button>
                </div>
            </div>
            <div className="border-t pt-4 mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                  <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-auto"
                  />
                  <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-auto"
                  />
                  <Select value={schemeTypeFilter} onValueChange={setSchemeTypeFilter}>
                      <SelectTrigger className="w-auto min-w-[200px]">
                          <SelectValue placeholder="Filter by Type of Scheme" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Scheme Types</SelectItem>
                          {arsTypeOfSchemeOptions.map((scheme) => (
                          <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Select value={constituencyFilter} onValueChange={setConstituencyFilter}>
                      <SelectTrigger className="w-auto min-w-[200px]">
                          <SelectValue placeholder="Filter by Constituency" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">All Constituencies</SelectItem>
                          {[...constituencyOptions].sort((a,b) => a.localeCompare(b)).map((constituency) => (
                          <SelectItem key={constituency} value={constituency}>{constituency}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                <Button onClick={() => {setStartDate(""); setEndDate(""); setSchemeTypeFilter("all"); setConstituencyFilter("all");}} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Filters</Button>
              </div>
              <div className="flex justify-between items-center gap-4">
                   <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-semibold">Row Color Legend:</span>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500/80"></div><span>Ongoing</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><span>Refund Pending</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500/80"></div><span>Completed / Failed</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-500/80"></div><span className="line-through">Cancelled</span></div>
                   </div>
                   <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                            Total Sites: <span className="font-bold text-primary">{filteredSites.length}</span>
                        </div>
                        {lastCreatedDate && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                <Clock className="h-3.5 w-3.5"/>
                                Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                            </div>
                        )}
                    </div>
              </div>
            </div>
             <div className="flex items-center justify-center pt-4 border-t">
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </CardContent>
       </Card>

        <Card className="shadow-lg">
            <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-auto">
                    <Table>
                        <TableHeader className="bg-secondary sticky top-0">
                            <TableRow>
                                <TableHead>Sl. No.</TableHead>
                                <TableHead>File No</TableHead>
                                <TableHead>Office</TableHead>
                                <TableHead>Name of Site</TableHead>
                                <TableHead>Type of Scheme</TableHead>
                                <TableHead>Local Self Govt.</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Completion Date</TableHead>
                                <TableHead className="text-center w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSites.length > 0 ? (
                                paginatedSites.map((site, index) => {
                                    return (
                                        <TableRow key={site.id} className={getStatusRowClass(site.arsStatus as SiteWorkStatus)}>
                                            <TableCell className="w-[80px]">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                            <TableCell className="w-[150px] font-medium">{site.fileNo}</TableCell>
                                            <TableCell className="w-[120px] font-medium capitalize">
                                                {(site as any).officeLocationFromPath || (site as any).officeLocation || 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-semibold whitespace-normal break-words">
                                              {site.nameOfSite}
                                            </TableCell>
                                            <TableCell className="whitespace-normal break-words">
                                              {site.arsTypeOfScheme || 'N/A'}
                                            </TableCell>
                                            <TableCell className="whitespace-normal break-words">{site.localSelfGovt || 'N/A'}</TableCell>
                                            <TableCell>{site.arsStatus ?? 'N/A'}</TableCell>
                                            <TableCell>{formatDateSafe(site.dateOfCompletion)}</TableCell>
                                            <TableCell className="text-center w-[120px]">
                                                <div className="flex items-center justify-center space-x-1">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" onClick={() => handleViewClick(site.id!)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>View Details</p></TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">
                                        No ARS sites found {searchTerm || startDate || endDate || schemeTypeFilter !== 'all' ? "matching your search criteria" : ""}.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            Showing <strong>{filteredSites.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{filteredSites.length}</strong> sites.
                        </p>
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
