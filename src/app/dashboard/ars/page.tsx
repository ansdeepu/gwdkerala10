
// src/app/dashboard/ars/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useArsEntries, type ArsEntry } from "@/hooks/useArsEntries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageHeader } from "@/hooks/usePageHeader";
import type { ArsEntryFormData, SiteWorkStatus, ArsStatus } from "@/lib/schemas";
import { arsTypeOfSchemeOptions, constituencyOptions } from "@/lib/schemas";
import { usePageNavigation } from "@/hooks/usePageNavigation";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from '@/hooks/use-data-store';
import { Loader2, Search, PlusCircle, Download, Eye, Trash2, XCircle, FileDown, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

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
  if (typeof dateValue === 'object' && (dateValue as any).toDate) {
    const parsed = (dateValue as any).toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const formatDateSafe = (dateInput: any): string => {
  if (!dateInput) return '';
  const date = safeParseDate(dateInput);
  return date ? format(date, 'dd/MM/yyyy') : '';
};

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

const exportableArsFields = [
  { id: 'fileNo', label: 'File No' },
  { id: 'nameOfSite', label: 'Name of Site' },
  { id: 'constituency', label: 'Constituency (LAC)' },
  { id: 'arsTypeOfScheme', label: 'Type of Scheme' },
  { id: 'localSelfGovt', label: 'Local Self Govt.' },
  { id: 'arsBlock', label: 'Block' },
  { id: 'latitude', label: 'Latitude' },
  { id: 'longitude', label: 'Longitude' },
  { id: 'arsNumberOfStructures', label: 'Number of Structures' },
  { id: 'arsStorageCapacity', label: 'Storage Capacity (m3)' },
  { id: 'arsNumberOfFillings', label: 'No. of Fillings' },
  { id: 'arsAsTsDetails', label: 'AS/TS Accorded Details' },
  { id: 'tsAmount', label: 'AS/TS Amount (₹)' },
  { id: 'arsSanctionedDate', label: 'Sanctioned Date' },
  { id: 'arsTender No', label: 'Tender No.' },
  { id: 'arsContractorName', label: 'Contractor' },
  { id: 'arsTenderedAmount', label: 'Tendered Amount (₹)' },
  { id: 'arsAwardedAmount', label: 'Awarded Amount (₹)' },
  { id: 'arsStatus', label: 'Present Status' },
  { id: 'dateOfCompletion', label: 'Completion Date' },
  { id: 'noOfBeneficiary', label: 'No. of Beneficiaries' },
  { id: 'totalExpenditure', label: 'Expenditure (₹)' },
  { id: 'workRemarks', label: 'Remarks' },
];

type SortKey = keyof ArsEntry;

export default function ArsPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Artificial Recharge Schemes (ARS)', 'A dedicated module for managing all ARS sites, including data entry, reporting, and bulk imports.');
  }, [setHeader]);
  
  const { arsEntries, isLoading: entriesLoading, refreshArsEntries, deleteArsEntry, clearAllArsData, addArsEntry } = useArsEntries();
  const { searchTerms, setModuleSearchTerm, officeAddress } = useDataStore();
  
  const searchTerm = searchTerms['ars'] || "";
  const setSearchTerm = (term: string) => setModuleSearchTerm('ars', term);

  const { toast } = useToast();
  const { user, authLoading } = useAuth() as any;
  const canEdit = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setIsNavigating } = usePageNavigation();
  
  const lastId = searchParams?.get('lastId');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "pre-execution");

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

  const [isUploading, setIsUploading] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(['fileNo', 'nameOfSite', 'constituency', 'arsTypeOfScheme', 'arsStatus']);
  
  const [deletingSite, setDeletingSite] = useState<ArsEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-3 w-3 opacity-30 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };
  
  const handleAddNewClick = () => {
    setIsNavigating(true);
    router.push('/dashboard/ars/entry');
  };
  
  const handleViewClick = (siteId: string) => {
    const pageParam = currentPage > 1 ? `&page=${currentPage}` : '';
    const tabParam = activeTab ? `&tab=${activeTab}` : '';
    router.push(`/dashboard/ars/entry?id=${siteId}${pageParam}${tabParam}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { filteredSites } = useMemo(() => {
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
          site.workRemarks
        ].filter(Boolean).map(String).join(' ').toLowerCase();

        return searchableContent.includes(lowercasedFilter);
      });
    }
    
    if (sortConfig !== null) {
      sites.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];
        
        if (sortConfig.key === 'arsSanctionedDate' || sortConfig.key === 'dateOfCompletion' || sortConfig.key === 'createdAt') {
            aValue = aValue ? safeParseDate(aValue)?.getTime() ?? 0 : 0;
            bValue = bValue ? safeParseDate(bValue)?.getTime() ?? 0 : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
        sites.sort((a, b) => {
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

            const dateA = a.createdAt ? safeParseDate(a.createdAt) : null;
            const dateB = b.createdAt ? safeParseDate(b.createdAt) : null;

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            if (!isValid(dateA)) return 1;
            if (!isValid(dateB)) return -1;

            return dateB.getTime() - dateA.getTime();
        });
    }

    return { filteredSites: sites };
  }, [arsEntries, searchTerm, startDate, endDate, schemeTypeFilter, constituencyFilter, sortConfig]);

  const { groups, counts } = useMemo(() => {
    const isClosed = (s: ArsEntry) => (s.arsStatus === 'Work Completed' || s.arsStatus === 'Work Failed') && (Number(s.totalExpenditure) || 0) > 0;
    
    const pre = filteredSites.filter(s => ["Proposal Submitted", "AS & TS Issued"].includes(s.arsStatus as string));
    const tender = filteredSites.filter(s => ["Tendered", "Selection Notice Issued", "Work Order Issued"].includes(s.arsStatus as string));
    const exec = filteredSites.filter(s => s.arsStatus === "Work in Progress");
    const comp = filteredSites.filter(s => ["Work Cancelled", "Work Failed", "Work Completed"].includes(s.arsStatus as string) && !isClosed(s));
    const closed = filteredSites.filter(isClosed);

    return {
      groups: { "pre-execution": pre, "tender-stage": tender, "execution": exec, "completed": comp, "closed": closed },
      counts: { pre: pre.length, tender: tender.length, exec: exec.length, comp: comp.length, closed: closed.length }
    };
  }, [filteredSites]);

  const activeGroupSites = useMemo(() => {
    if (searchTerm) return filteredSites;
    return (groups as any)[activeTab] || [];
  }, [groups, activeTab, searchTerm, filteredSites]);

  const totalPages = Math.ceil(activeGroupSites.length / ITEMS_PER_PAGE);
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeGroupSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeGroupSites, currentPage]);

  useEffect(() => {
    if (!entriesLoading && lastId) {
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
  }, [entriesLoading, lastId]);
  
  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, activeGroupSites.length);
  
  const handleDeleteSite = async () => {
    if (!deletingSite || !deletingSite.id) return;
    setIsDeleting(true);
    try {
      await deleteArsEntry(deletingSite.id);
      toast({ title: "ARS Site Deleted", description: `Site "${deletingSite.nameOfSite}" has been removed.` });
      refreshArsEntries();
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeletingSite(null);
    }
  };
  
  const handleClearAllArs = async () => {
    setIsClearingAll(true);
    try {
        await clearAllArsData();
        toast({ title: "All ARS Data Cleared", description: "All ARS sites have been removed from the database."});
        refreshArsEntries();
    } catch (error: any) {
        toast({ title: "Clearing Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsClearingAll(false);
        setIsClearAllDialogOpen(false);
    }
  };

  const handleExportExcel = useCallback(async () => {
    if (filteredSites.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }

    if (selectedExportFields.length === 0) {
        toast({ title: "No Fields Selected", description: "Please select at least one field to export.", variant: "destructive" });
        return;
    }

    const reportTitle = "Artificial Recharge Schemes (ARS) Report";
    const fileNamePrefix = "gwd_ars_report";
    
    const activeFields = exportableArsFields.filter(f => selectedExportFields.includes(f.id));
    const headers = ["Sl. No.", ...activeFields.map(f => f.label)];

    const dataForExport = filteredSites.map((site, index) => {
        const row: any = { "Sl. No.": index + 1 };
        activeFields.forEach(field => {
            let value = (site as any)[field.id];
            if (field.id === 'sanctionedDate' || field.id === 'dateOfCompletion' || field.id.toLowerCase().includes('date')) {
                value = formatDateSafe(value);
            }
            row[field.label] = value ?? 'N/A';
        });
        return row;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ARSReport");

    worksheet.addRow([`Ground Water Department, ${officeAddress?.officeLocation || ''}`]).commit();
    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit();

    worksheet.mergeCells(`A1:${String.fromCharCode(65 + headers.length - 1)}1`);
    worksheet.mergeCells(`A2:${String.fromCharCode(65 + headers.length - 1)}2`);
    worksheet.mergeCells(`A3:${String.fromCharCode(65 + headers.length - 1)}3`);
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
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
        column.width = i === 0 ? 8 : 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Excel Exported" });
    setIsExportDialogOpen(false);
  }, [filteredSites, selectedExportFields, toast, officeAddress]);

  const handleDownloadTemplate = async () => {
    const templateData = [ { "File No": "Example/123", "Name of Site": "Sample ARS Site", "Constituency": "Kollam", "Type of Scheme": "Check Dam", "Local Self Govt.": "Sample Panchayath", "Block": "Sample Block", "Latitude": 8.8932, "Longitude": 76.6141, "Number of Structures": 1, "Storage Capacity (m3)": 500, "No. of Fillings": 2, "Estimate Amount": 500000, "AS/TS Accorded Details": "GO(Rt) No.123/2023/WRD", "AS/TS Amount": 450000, "Sanctioned Date": "15/01/2023", "Tendered Amount": 445000, "Awarded Amount": 440000, "Present Status": "Work in Progress", "Completion Date": "", "Expenditure (₹)": 200000, "No. of Beneficiaries": "50 families", "Remarks": "Work ongoing", } ];
    const headers = Object.keys(templateData[0]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("ARS_Template");

    worksheet.addRow(headers).font = { bold: true };
    worksheet.addRow(Object.values(templateData[0]));
    
    worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, (cell) => {
            let columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxLength) {
                maxLength = columnLength;
            }
        });
        column.width = maxLength < 15 ? 15 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GWD_ARS_Upload_Template.xlsx";
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Template Downloaded", description: "The Excel template has been downloaded." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    try {
        const workbook = new ExcelJS.Workbook();
        const buffer = await file.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) throw new Error("No worksheets found in the Excel file.");

        const jsonData: any[] = [];
        const headerRow = worksheet.getRow(1);
        if(!headerRow.values || (headerRow.values as any).length === 1) throw new Error("The Excel file seems to be empty or has no header row.");
        
        const headers = (headerRow.values as string[]).slice(1);

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                const rowData: Record<string, any> = {};
                row.eachCell((cell, colNumber) => {
                    const header = headers[colNumber - 1];
                    rowData[header] = cell.value;
                });
                jsonData.push(rowData);
            }
        });

        if (jsonData.length === 0) throw new Error("The selected Excel file has no data rows.");

        let successCount = 0;
        let errorCount = 0;

        for (const rowData of jsonData) {
          try {
            const parseDate = (dateValue: any): Date | undefined => {
                if (!dateValue) return undefined;
                if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
                const d = parse(String(dateValue), 'dd/MM/yyyy', new Date());
                return isValid(d) ? d : undefined;
            };

            const expenditureValue = String((rowData as any)['Expenditure (₹)'] || '');
            const cleanedExpenditure = expenditureValue.replace(/[^0-9.]/g, '');

            const newEntry: ArsEntryFormData = {
              fileNo: String((rowData as any)['File No'] || `Imported ${Date.now()}`),
              nameOfSite: String((rowData as any)['Name of Site'] || `Imported Site ${Date.now()}`),
              constituency: (rowData as any)['Constituency'] || undefined,
              arsTypeOfScheme: (rowData as any)['Type of Scheme'] || undefined,
              localSelfGovt: String((rowData as any)['Local Self Govt.'] || ''),
              arsBlock: String((rowData as any)['Block'] || ''),
              latitude: Number((rowData as any)['Latitude']) || undefined,
              longitude: Number((rowData as any)['Longitude']) || undefined,
              arsNumberOfStructures: Number((rowData as any)['Number of Structures']) || undefined,
              arsStorageCapacity: Number((rowData as any)['Storage Capacity (m3)']) || undefined,
              arsNumberOfFillings: Number((rowData as any)['No. of Fillings']) || undefined,
              estimateAmount: Number((rowData as any)['Estimate Amount']) || undefined,
              arsAsTsDetails: String((rowData as any)['AS/TS Accorded Details'] || ''),
              tsAmount: Number((rowData as any)['AS/TS Amount']) || undefined,
              arsSanctionedDate: parseDate((rowData as any)['Sanctioned Date']),
              arsTenderedAmount: Number((rowData as any)['Tendered Amount']) || undefined,
              arsAwardedAmount: Number((rowData as any)['Awarded Amount']) || undefined,
              arsStatus: (rowData as any)['Present Status'] || undefined,
              dateOfCompletion: parseDate((rowData as any)['Completion Date']),
              totalExpenditure: cleanedExpenditure ? Number(cleanedExpenditure) : undefined,
              noOfBeneficiary: String((rowData as any)['No. of Beneficiaries'] || ''),
              workRemarks: String((rowData as any)['Remarks'] || ''),
              supervisorName: null,
              supervisorUid: null,
              workImages: [],
              workVideos: []
            };

            await addArsEntry(newEntry);
            successCount++;
          } catch(e) {
            console.error("Failed to process row:", rowData, e);
            errorCount++;
          }
        }
        
        toast({ title: "Import Complete", description: `${successCount} sites imported successfully. ${errorCount} rows failed.` });
        refreshArsEntries();
      } catch (error: any) {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };
  
  if (entriesLoading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading ARS data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TooltipProvider>
       <Card>
        <CardContent className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="relative w-full lg:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search" 
                        placeholder="Search across all fields..." 
                        className="w-full rounded-lg bg-background pl-10 shadow-sm" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar py-1">
                  {canEdit && <Button size="sm" onClick={handleAddNewClick} className="shrink-0"> <PlusCircle className="mr-2 h-4 w-4" /> Add New ARS </Button>}
                  <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} size="sm" className="shrink-0"> <FileDown className="mr-2 h-4 w-4" /> Export Excel </Button>
                  {canEdit && ( <> 
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls" /> 
                      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} size="sm" className="shrink-0"> 
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                          {isUploading ? 'Importing...' : 'Import Excel'}
                      </Button> 
                      <Button variant="outline" onClick={handleDownloadTemplate} size="sm" className="shrink-0"> <Download className="mr-2 h-4 w-4" /> Template </Button> 
                      <Button variant="destructive" onClick={() => setIsClearAllDialogOpen(true)} disabled={isClearingAll || arsEntries.length === 0} size="sm" className="shrink-0"> <Trash2 className="mr-2 h-4 w-4" /> Clear All</Button> 
                  </> )}
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
                <Button onClick={() => {setStartDate(""); setEndDate(""); setSchemeTypeFilter("all"); setConstituencyFilter("all");}} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Filters</Button>
              </div>
              <div className="flex justify-between items-center gap-4 mt-4 pt-4 border-t">
                   <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-semibold">Row Color Legend:</span>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500/80"></div><span>Ongoing</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><span>Refund Pending</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500/80"></div><span>Completed / Failed</span></div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-500/80"></div><span className="line-through">Cancelled</span></div>
                   </div>
                   <div className="flex items-center gap-4 shrink-0 whitespace-nowrap">
                        <div className="text-sm font-medium text-muted-foreground">
                            Total Sites: <span className="font-bold text-primary">{filteredSites.length}</span>
                        </div>
                        {totalPages > 1 && (
                            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                        )}
                    </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full pt-4">
                <TabsList className="flex flex-nowrap overflow-x-auto w-full h-auto p-1 bg-muted/50 justify-start no-scrollbar">
                    <TabsTrigger value="pre-execution" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Pre-Execution <Badge variant="secondary" className="ml-1">{counts.pre || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="tender-stage" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Tender Stage <Badge variant="secondary" className="ml-1">{counts.tender || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="execution" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Execution <Badge variant="secondary" className="ml-1">{counts.exec || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Completed <Badge variant="secondary" className="ml-1">{counts.comp || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="closed" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Closed Files <Badge variant="secondary" className="ml-1">{counts.closed || 0}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
        </CardContent>
       </Card>

        <Card className="shadow-lg">
            <CardContent className="p-0">
                <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden">
                    <Table className="w-full">
                        <TableHeader className="bg-secondary sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[50px] text-sm px-2 text-center">Sl.</TableHead>
                                <TableHead className="w-[12%] text-sm px-2"><Button variant="ghost" className="p-0 hover:bg-transparent text-sm w-full justify-start font-bold" onClick={() => requestSort('fileNo')}>File No {getSortIcon('fileNo')}</Button></TableHead>
                                <TableHead className="w-[25%] text-sm px-2"><Button variant="ghost" className="p-0 hover:bg-transparent text-sm w-full justify-start font-bold" onClick={() => requestSort('nameOfSite')}>Site Name {getSortIcon('nameOfSite')}</Button></TableHead>
                                <TableHead className="w-[15%] text-sm px-2"><Button variant="ghost" className="p-0 hover:bg-transparent text-sm w-full justify-start font-bold" onClick={() => requestSort('arsTypeOfScheme')}>Scheme {getSortIcon('arsTypeOfScheme')}</Button></TableHead>
                                <TableHead className="w-[15%] text-sm px-2"><Button variant="ghost" className="p-0 hover:bg-transparent text-sm w-full justify-start font-bold" onClick={() => requestSort('localSelfGovt')}>LSG {getSortIcon('localSelfGovt')}</Button></TableHead>
                                <TableHead className="w-[13%] text-sm px-2"><Button variant="ghost" className="p-0 hover:bg-transparent text-sm w-full justify-start font-bold" onClick={() => requestSort('arsStatus')}>Status {getSortIcon('arsStatus')}</Button></TableHead>
                                <TableHead className="w-[10%] text-sm px-2"><Button variant="ghost" className="p-0 hover:bg-transparent text-sm w-full justify-start font-bold" onClick={() => requestSort('dateOfCompletion')}>Date {getSortIcon('dateOfCompletion')}</Button></TableHead>
                                <TableHead className="text-center w-[5%] text-sm px-2">Act</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSites.length > 0 ? (
                                paginatedSites.map((site: ArsEntry, index: number) => {
                                    const detailUrl = `/dashboard/ars/entry?id=${site.id}${currentPage > 1 ? `&page=${currentPage}` : ''}${activeTab ? `&tab=${activeTab}` : ''}`;
                                    return (
                                        <TableRow 
                                            key={site.id} 
                                            id={`row-${site.id}`}
                                            className={cn(getStatusRowClass(site.arsStatus as SiteWorkStatus), "text-sm transition-colors duration-1000")}
                                        >
                                            <TableCell className="px-2 text-center font-mono">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                            <TableCell className="px-2 font-medium break-all">
                                              <Link
                                                  href={detailUrl}
                                                  className="font-mono text-sm text-primary font-bold hover:underline"
                                                  onContextMenu={(e) => {
                                                      e.preventDefault();
                                                      window.open(detailUrl, '_blank');
                                                  }}
                                              >
                                                  {site.fileNo}
                                              </Link>
                                            </TableCell>
                                            <TableCell className="px-2 font-semibold break-words whitespace-normal">
                                              {site.nameOfSite}
                                            </TableCell>
                                            <TableCell className="px-2 break-words whitespace-normal">
                                              {site.arsTypeOfScheme || 'N/A'}
                                            </TableCell>
                                            <TableCell className="px-2 break-words whitespace-normal">{site.localSelfGovt || 'N/A'}</TableCell>
                                            <TableCell className="px-2">{site.arsStatus ?? 'N/A'}</TableCell>
                                            <TableCell className="px-2">{formatDateSafe(site.dateOfCompletion)}</TableCell>
                                            <TableCell className="px-2 text-center">
                                                <div className="flex items-center justify-center">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewClick(site.id!)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{canEdit ? "View / Edit" : "View Details"}</p></TooltipContent>
                                                    </Tooltip>
                                                    {canEdit && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/90" onClick={() => setDeletingSite(site)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Delete Site</p></TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
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
                            Showing <strong>{activeGroupSites.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{activeGroupSites.length}</strong> sites.
                        </p>
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </div>
                )}
            </CardContent>
        </Card>
      </TooltipProvider>
      
      <AlertDialog open={!!deletingSite} onOpenChange={() => setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the ARS site &quot;{deletingSite?.nameOfSite}&quot;. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSite} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete ALL ARS sites from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingAll}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearAllArs} 
              disabled={isClearingAll} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Yes, Clear All ARS Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Customize ARS Export</DialogTitle>
            <DialogDescription>Select the fields you want to include in the Excel report.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exportableArsFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-3 p-3 rounded-md border bg-secondary/10 hover:bg-secondary/20 transition-colors">
                    <Checkbox 
                      id={`export-field-${field.id}`}
                      checked={selectedExportFields.includes(field.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExportFields(prev => [...prev, field.id]);
                        } else {
                          setSelectedExportFields(prev => prev.filter(id => id !== field.id));
                        }
                      }}
                    />
                    <Label htmlFor={`export-field-${field.id}`} className="flex-1 cursor-pointer font-medium text-sm">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedExportFields(exportableArsFields.map(f => f.id))}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExportFields([])}>Deselect All</Button>
            </div>
            <div className="flex items-center gap-2">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleExportExcel}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
