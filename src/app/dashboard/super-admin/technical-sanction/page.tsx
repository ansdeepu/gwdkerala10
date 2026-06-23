
// src/app/dashboard/super-admin/technical-sanction/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDataStore } from '@/hooks/use-data-store';
import { Loader2, Search, Eye, FileText } from 'lucide-react';
import type { DataEntryFormData, SiteDetailFormData, ArsStatus, SiteWorkStatus } from '@/lib/schemas';
import { usePageHeader } from "@/hooks/usePageHeader";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 50;

interface TdSite extends SiteDetailFormData {
  fileNo: string;
  applicantName: string;
  officeLocation: string;
  fileId: string;
}

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

export default function TechnicalSanctionPage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('Technical Sanction Pending', 'An overview of all works awaiting Technical Sanction across all offices.');
  }, [setHeader]);

  const { allFileEntries, isLoading } = useDataStore();
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  const handleViewClick = (fileId: string, officeLocation: string) => {
    const queryParams = new URLSearchParams({ id: fileId, readOnly: 'true' });
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };

  const tsPendingSites = useMemo(() => {
    if (!allFileEntries) return [];

    const sites: TdSite[] = [];
    allFileEntries.forEach((entry: DataEntryFormData) => {
      entry.siteDetails?.forEach(site => {
        if (site.workStatus === 'TS Pending') {
          sites.push({
            ...site,
            fileNo: entry.fileNo,
            applicantName: entry.applicantName,
            officeLocation: (entry as any).officeLocationFromPath || entry.officeLocation || 'N/A',
            fileId: entry.id || '',
          });
        }
      });
    });
    return sites;
  }, [allFileEntries]);

  const filteredSites = useMemo(() => {
    if (!searchTerm) return tsPendingSites;
    const lowercasedFilter = searchTerm.toLowerCase();

    return tsPendingSites.filter(site => {
      const searchableContent = [
        site.fileNo,
        site.applicantName,
        site.nameOfSite,
        site.officeLocation,
        site.purpose
      ].filter(Boolean).map(String).join(' ').toLowerCase();
      return searchableContent.includes(lowercasedFilter);
    });
  }, [tsPendingSites, searchTerm]);

  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE);

  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSites, currentPage]);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };


  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by office, file, site..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Total Pending: <span className="font-bold text-destructive">{filteredSites.length}</span>
                </div>
                {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </div>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl. No.</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>File No.</TableHead>
                  <TableHead>Applicant Name</TableHead>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSites.length > 0 ? (
                  paginatedSites.map((site, index) => (
                    <TableRow key={`${site.fileId}-${site.nameOfSite}-${index}`} className={getStatusRowClass(site.workStatus as SiteWorkStatus)}>
                      <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                      <TableCell className="font-medium capitalize">{site.officeLocation}</TableCell>
                      <TableCell>{site.fileNo}</TableCell>
                      <TableCell>{site.applicantName}</TableCell>
                      <TableCell className="font-semibold">{site.nameOfSite}</TableCell>
                      <TableCell>{site.purpose}</TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleViewClick(site.fileId, site.officeLocation)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Full File</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No sites awaiting technical sanction.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="font-semibold">Row Color Legend:</span>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500/80"></div><span>Ongoing</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><span>Refund Pending</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500/80"></div><span>Completed / Failed</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-500/80"></div><span className="line-through">Cancelled</span></div>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center">
                  <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
