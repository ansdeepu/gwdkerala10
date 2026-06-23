
// src/components/dashboard/DashboardDialogs.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ExcelJS from 'exceljs';
import { format, isWithinInterval, startOfDay, endOfDay, isValid, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { DataEntryFormData } from '@/lib/schemas';
import { 
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    PRIVATE_APPLICATION_TYPES,
    COLLECTOR_APPLICATION_TYPES,
    PLAN_FUND_APPLICATION_TYPES,
    ApplicationType
} from '@/lib/schemas';
import type { ArsEntry } from '@/hooks/useArsEntries';
import { FileDown } from 'lucide-react';
import type { UserProfile } from '@/hooks/useAuth';
import Link from 'next/link';

interface DetailDialogColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  data: any[];
  columns: DetailDialogColumn[];
  type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance';
}

interface DashboardDialogsProps {
  dialogState: DialogState;
  setDialogState: React.Dispatch<React.SetStateAction<DialogState>>;
  allFileEntries: DataEntryFormData[];
  allArsEntries: ArsEntry[];
  financeDates?: { start?: Date, end?: Date };
  currentUser?: UserProfile | null;
}

export default function DashboardDialogs({ dialogState, setDialogState, allFileEntries, allArsEntries, financeDates, currentUser }: DashboardDialogsProps) {
  const { toast } = useToast();
  const { isOpen, title, data, columns, type } = dialogState;
  
  const getFileDetailUrl = (row: any) => {
    const fileNo = row.fileNo;
    if (!fileNo || fileNo === 'N/A' || fileNo === '-') return '#';

    // 1. Check if it's an ARS Scheme (from module)
    if (row.id && (row.applicantName === 'ARS Scheme' || row.purpose === 'ARS Scheme')) {
      return `/dashboard/ars/entry?id=${row.id}`;
    }

    // 2. Check regular files
    const entry = allFileEntries.find(e => e.fileNo === fileNo);
    if (entry && entry.id) {
      const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
      const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

      let workType = '';
      const appType = entry.applicationType as ApplicationType;

      if (hasInvestigationPurpose && !hasLoggingPumpingPurpose) {
          workType = 'gwInvestigation';
      } else if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) {
          workType = 'loggingPumpingTest';
      } else if (appType && (PUBLIC_DEPOSIT_APPLICATION_TYPES as any).includes(appType)) {
          workType = 'public';
      } else if (appType && (PRIVATE_APPLICATION_TYPES as any).includes(appType)) {
          workType = 'private';
      } else if (appType && (COLLECTOR_APPLICATION_TYPES as any).includes(appType)) {
          workType = 'collector';
      } else if (appType && (PLAN_FUND_APPLICATION_TYPES as any).includes(appType)) {
          workType = 'planFund';
      } else {
          workType = 'public';
      }

      const queryParams = new URLSearchParams({ id: entry.id });
      if (workType) queryParams.set('workType', workType);
      
      return `/dashboard/data-entry?${queryParams.toString()}`;
    }

    return '#';
  };

  const handleFileNoClick = (row: any) => {
    const url = getFileDetailUrl(row);
    if (url === '#') {
      toast({ title: "Record Not Found", description: "The source record for this File No could not be identified.", variant: "destructive" });
      return;
    }
    // For standard left-click, use current window or handled via Link component
  };

  const exportDialogDataToExcel = async () => {
    const reportTitle = title;
    const columnLabels = columns.map(col => col.label);
    
    if (data.length === 0) {
      toast({ title: "No Data to Export", variant: "default" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30));

    worksheet.addRow(["Ground Water Department"]).commit();
    worksheet.addRow([reportTitle]).commit();
    worksheet.addRow([`Report generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]).commit();
    worksheet.addRow([]).commit();

    const numCols = columnLabels.length;
    worksheet.mergeCells(1, 1, 1, numCols);
    worksheet.mergeCells(2, 1, 2, numCols);
    worksheet.mergeCells(3, 1, 3, numCols);

    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    
    worksheet.getRow(1).font = { bold: true, size: 16 };
    worksheet.getRow(2).font = { bold: true, size: 14 };
    
    const headerRow = worksheet.addRow(columnLabels);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern:'solid', fgColor:{argb:'F0F0F0'} };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    data.forEach(rowData => {
      const values = columns.map(col => rowData[col.key] ?? '');
      const newRow = worksheet.addRow(values);
      newRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (columns[colNumber - 1]?.isNumeric) {
            cell.alignment = { horizontal: 'right' };
          }
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
    a.download = `gwd_report_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Excel Exported" });
  };
  
  const userRole = currentUser?.role;
  const isFileNoClickable = userRole !== 'superAdmin' && userRole !== 'investigator' && userRole !== 'supervisor';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => setDialogState({ ...dialogState, isOpen: open })}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl p-0 flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Showing {data.length} records. {financeDates?.start && financeDates?.end ? `from ${format(financeDates.start, "dd/MM/yyyy")} to ${format(financeDates.end, "dd/MM/yyyy")}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 px-6 py-4">
            <ScrollArea className="h-full pr-4 -mr-4">
              {data.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {columns.map(col => 
                        <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, rowIndex) => {
                      const detailUrl = getFileDetailUrl(row);
                      return (
                      <TableRow key={rowIndex}>
                        {columns.map(col => (
                          <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>
                            {col.key === 'fileNo' ? (
                                <Link 
                                    href={detailUrl}
                                    className={cn(
                                        "font-mono text-xs text-primary font-bold transition-all",
                                        isFileNoClickable ? "hover:underline" : "cursor-default text-primary/80"
                                    )}
                                    onClick={(e) => {
                                      if (!isFileNoClickable || detailUrl === '#') {
                                        e.preventDefault();
                                        if (detailUrl === '#') handleFileNoClick(row);
                                      }
                                    }}
                                    onContextMenu={(e) => {
                                      if (isFileNoClickable && detailUrl !== '#') {
                                        e.preventDefault();
                                        window.open(detailUrl, '_blank');
                                      }
                                    }}
                                >
                                    {row[col.key]}
                                </Link>
                            ) : (
                              row[col.key]
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No details found for the selected criteria.</p>
              )}
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={exportDialogDataToExcel} disabled={data.length === 0}><FileDown className="mr-2 h-4 w-4" /> Export Excel</Button>
          <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

