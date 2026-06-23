
// src/components/reports/ReportTable.tsx
"use client";

import React, { useState, useMemo } from 'react';
import type { FlattenedReportRow } from '@/app/dashboard/reports/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, ArrowUpDown } from 'lucide-react';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import Link from 'next/link';
import { 
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    PRIVATE_APPLICATION_TYPES,
    COLLECTOR_APPLICATION_TYPES,
    PLAN_FUND_APPLICATION_TYPES,
    ApplicationType
} from '@/lib/schemas';

interface ReportTableProps {
  data: FlattenedReportRow[];
  onViewDetailsClick: (fileNo: string) => void;
  currentPage: number;
  itemsPerPage: number;
}

type SortKey = keyof FlattenedReportRow;

export default function ReportTable({ data, onViewDetailsClick, currentPage, itemsPerPage }: ReportTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'fileNo', direction: 'asc' });

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key] ?? '';
        const bValue = (b as any)[sortConfig.key] ?? '';
        
        // Basic alphanumeric sort
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const getDetailUrl = (row: FlattenedReportRow) => {
    const fileNo = row.fileNo;
    if (!fileNo || fileNo === 'N/A' || fileNo === '-') return '#';

    // ARS check
    if (row.id && (row.applicantName === 'ARS Scheme' || row.applicationType === 'ARS')) {
      return `/dashboard/ars/entry?id=${row.id}`;
    }

    // This table usually doesn't have the internal id on every row if it's a flattened report.
    // However, the onViewDetailsClick usually finds it in the cache.
    // For direct link support, we attempt to find the ID if passed.
    if (row.id) {
        let workType = '';
        const appType = row.applicationType as any;

        if (row.sitePurpose === 'GW Investigation') workType = 'gwInvestigation';
        else if (LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(row.sitePurpose as any)) workType = 'loggingPumpingTest';
        else if (PRIVATE_APPLICATION_TYPES.includes(appType)) workType = 'private';
        else if (COLLECTOR_APPLICATION_TYPES.includes(appType)) workType = 'collector';
        else if (PLAN_FUND_APPLICATION_TYPES.includes(appType)) workType = 'planFund';
        else workType = 'public';

        return `/dashboard/data-entry?id=${row.id}&workType=${workType}`;
    }

    return '#';
  };

  return (
    <TooltipProvider>
      <Table>
        <TableHeader className="sticky top-0 bg-secondary z-10">
          <TableRow>
            <TableHead className="w-[6%] px-2 py-3 text-sm">Sl. No.</TableHead>
            <TableHead className="w-[12%] px-2 py-3 text-sm">File No.</TableHead>
            <TableHead className="w-[20%] px-2 py-3 text-sm">Applicant Name</TableHead>
            <TableHead className="w-[20%] px-2 py-3 text-sm">Site Name(s)</TableHead>
            <TableHead className="w-[10%] px-2 py-3 text-sm">Date of Remittance</TableHead>
            <TableHead className="w-[12%] px-2 py-3 text-sm">File Status</TableHead>
            <TableHead className="w-[12%] px-2 py-3 text-sm">Site Work Status</TableHead>
            <TableHead className="text-center w-[8%] px-2 py-3 text-sm">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length > 0 ? (
            sortedData.map((row, index) => {
              const detailUrl = getDetailUrl(row);
              return (
              <TableRow key={`${row.fileNo}-${row.siteName}-${index}`}>
                <TableCell className="px-2 py-2 text-center w-[6%]">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell className="w-[12%] px-2 py-2">
                  {detailUrl !== '#' ? (
                      <Link
                          href={detailUrl}
                          className="font-mono text-sm text-primary font-bold hover:underline"
                          onContextMenu={(e) => {
                              e.preventDefault();
                              window.open(detailUrl, '_blank');
                          }}
                      >
                          {row.fileNo}
                      </Link>
                  ) : (
                      <span className="font-mono text-sm">{row.fileNo}</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal break-words px-2 py-2 w-[20%]">{row.applicantName}</TableCell>
                <TableCell className="whitespace-normal break-words px-2 py-2 w-[20%]">{row.siteName}</TableCell>
                <TableCell className="whitespace-normal break-words px-2 py-2 w-[10%]">{row.fileFirstRemittanceDate}</TableCell>
                <TableCell className="whitespace-normal break-words px-2 py-2 w-[12%]">{row.fileStatus}</TableCell>
                <TableCell className="whitespace-normal break-words px-2 py-2 w-[12%]">{row.siteWorkStatus}</TableCell>
                <TableCell className="text-center px-2 py-2 w-[8%]">
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => onViewDetailsClick(row.fileNo)}>
                            <Eye className="h-4 w-4" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View Full File Details</p></TooltipContent>
                    </Tooltip>
                </TableCell>
              </TableRow>
            )})
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No results found for the selected filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}

