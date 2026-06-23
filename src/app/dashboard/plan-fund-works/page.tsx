// src/app/dashboard/plan-fund-works/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { DataEntryFormData, SitePurpose } from '@/lib/schemas';
import { PLAN_FUND_APPLICATION_TYPES } from '@/lib/schemas';
import { parseISO, isValid } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useDataStore } from '@/hooks/use-data-store';
import PaginationControls from '@/components/shared/PaginationControls';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') {
    const parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
  }
  if (typeof dateValue === 'object' && (dateValue as any).toDate) {
    const parsed = (dateValue as any).toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function PlanFundWorksPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const { allFileEntries, searchTerms, setModuleSearchTerm } = useDataStore();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();

  const codeFilter = searchParams.get('code');
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  
  const searchTerm = searchTerms['plan-fund'] || "";
  const setSearchTerm = (term: string) => setModuleSearchTerm('plan-fund', term);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "pre-execution");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    const description = 'List of all deposit works funded by the Plan Fund (GWBDWS).';
    let title = 'Plan Fund Works';
    if (codeFilter) {
      if (codeFilter.includes('4702')) title = 'GWBDWS (4702)';
      else if (codeFilter.includes('2702')) title = 'GWBDWS (2702)';
      else title = `GWBDWS (${codeFilter})`;
    }
    setHeader(title, description);
  }, [setHeader, codeFilter]);

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  const canCreate = (user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist') && !isSuperAdmin;
  
  const { planFundEntries } = useMemo(() => {
    let entries = fileEntries.filter(entry => 
        !!entry.applicationType && PLAN_FUND_APPLICATION_TYPES.includes(entry.applicationType as any)
    );

    if (codeFilter) {
        const purposesFor2702: SitePurpose[] = ['MWSS Pump Reno', 'HPR'];
        const is2702Report = codeFilter.includes('2702');

        entries = entries.flatMap(entry => {
            if (!entry.siteDetails || entry.siteDetails.length === 0) return [];
            const filteredSites = entry.siteDetails.filter(site => {
                const purpose = site.purpose as SitePurpose;
                return is2702Report ? purposesFor2702.includes(purpose) : !purposesFor2702.includes(purpose);
            });
            if (filteredSites.length > 0) return [{ ...entry, siteDetails: filteredSites }];
            return [];
        });
    }

    const getLatestRemittanceDate = (entry: DataEntryFormData): Date | null => {
        let latest: Date | null = null;
        entry.remittanceDetails?.forEach(rd => {
            const d = safeParseDate(rd.dateOfRemittance);
            if (d && (!latest || d > latest)) latest = d;
        });
        return latest;
    };

    const getLatestInwardCreditDate = (entry: DataEntryFormData): Date | null => {
        let latest: Date | null = null;
        const normalizedFileNo = entry.fileNo?.toLowerCase().trim();
        if (normalizedFileNo && allFileEntries) {
            allFileEntries.forEach(otherEntry => {
                if (otherEntry.fileNo?.toLowerCase().trim() === normalizedFileNo) return;
                otherEntry.reappropriationDetails?.forEach(reapp => {
                    if (reapp.refFileNo?.toLowerCase().trim() === normalizedFileNo) {
                        const d = safeParseDate(reapp.date);
                        if (d && (!latest || d > latest)) latest = d;
                    }
                });
            });
        }
        return latest;
    };

    entries.sort((a, b) => {
        const remA = getLatestRemittanceDate(a);
        const remB = getLatestRemittanceDate(b);
        if (remA && remB) return remB.getTime() - remA.getTime();
        if (remA) return -1;
        if (remB) return 1;
        const reapA = getLatestInwardCreditDate(a);
        const reapB = getLatestInwardCreditDate(b);
        if (reapA && reapB) return reapB.getTime() - reapA.getTime();
        if (reapA) return -1;
        if (reapB) return 1;
        const caA = safeParseDate((a as any).createdAt);
        const caB = safeParseDate((b as any).createdAt);
        if (caA && caB) return caB.getTime() - caA.getTime();
        return 0;
    });

    return { planFundEntries: entries };
  }, [fileEntries, user, codeFilter, allFileEntries]);
  
  const searchFilteredEntries = useMemo(() => {
    if (!searchTerm) return planFundEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return planFundEntries.filter(entry => {
        const remittanceAmounts = (entry.remittanceDetails || []).map(r => r.amountRemitted);
        const reappropriationAmounts = (entry.reappropriationDetails || []).map(r => r.amount);
        const paymentAmounts = (entry.paymentDetails || []).flatMap(p => [
            p.contractorsPayment,
            p.revenueHead,
            p.gst,
            p.incomeTax,
            p.kbcwb,
            p.refundToParty,
            p.totalPaymentPerEntry
        ]);
        const siteAmounts = (entry.siteDetails || []).flatMap(s => [
            s.estimateAmount,
            s.remittedAmount,
            s.tsAmount,
            s.totalExpenditure
        ]);

        const allNumericValues = [
            ...remittanceAmounts,
            ...reappropriationAmounts,
            ...paymentAmounts,
            ...siteAmounts
        ].filter(v => v !== undefined && v !== null && (v as any) !== '');

        const amountRepresentations = allNumericValues.flatMap(val => {
            const num = Number(val);
            if (isNaN(num)) return [String(val)];
            return [
                String(num),
                num.toFixed(0),
                num.toFixed(2),
                num.toLocaleString('en-IN'),
                num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];
        });

        const searchableContent = [
            entry.fileNo, entry.applicantName, entry.phoneNo, entry.fileStatus,
            ...(entry.siteDetails || []).map(s => s.nameOfSite),
            ...amountRepresentations
        ].filter(Boolean).map(val => String(val).toLowerCase()).join(' '); 
        return searchableContent.includes(lowerSearchTerm);
    });
  }, [planFundEntries, searchTerm]);

  const totalSitesCount = useMemo(() => {
    return searchFilteredEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
  }, [searchFilteredEntries]);

  const { groups, counts } = useMemo(() => {
      const pre = searchFilteredEntries.filter(e => e.fileStatus === 'File Under Process');
      const tender = searchFilteredEntries.filter(e => e.fileStatus === 'Tender Process');
      const exec = searchFilteredEntries.filter(e => ["Work Initiated", "Partially Completed"].includes(e.fileStatus as string));
      const comp = searchFilteredEntries.filter(e => ["Fully Completed", "Fully Disputed", "Fully Completed Except Disputed"].includes(e.fileStatus as string));
      const closed = searchFilteredEntries.filter(e => e.fileStatus === 'File Closed');

      return {
          groups: {
              "pre-execution": pre,
              "tender-stage": tender,
              "execution": exec,
              "completed": comp,
              "closed": closed
          },
          counts: {
              pre: pre.length,
              tender: tender.length,
              exec: exec.length,
              comp: comp.length,
              closed: closed.length
          }
      };
  }, [searchFilteredEntries]);

  const activeGroupEntries = useMemo(() => {
      if (searchTerm) return searchFilteredEntries;
      return (groups as any)[activeTab] || [];
  }, [groups, activeTab, searchTerm, searchFilteredEntries]);

  const totalPages = Math.ceil(activeGroupEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeGroupEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeGroupEntries, currentPage]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleAddNewClick = () => {
    setIsNavigating(true);
    const queryParams = new URLSearchParams({ 
        workType: 'planFund',
        tab: activeTab,
        page: String(currentPage)
    });
    if (codeFilter) queryParams.set('code', codeFilter);
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };
  
  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, activeGroupEntries.length);

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search all fields..."
                  className="w-full rounded-lg bg-background pl-10 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
               <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mr-2">
                    <span>Files: <span className="text-primary font-bold">{searchFilteredEntries.length}</span></span>
                    <span>Sites: <span className="text-primary font-bold">{totalSitesCount}</span></span>
                </div>
                {canCreate && (
                    <Button onClick={handleAddNewClick} className="w-full sm:w-auto shrink-0"><PlusCircle className="mr-2 h-4 w-4" /> New File</Button>
                )}
               </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-auto p-1">
                    <TabsTrigger value="pre-execution" className="py-2 text-xs md:text-sm">
                        Pre-Execution <Badge variant="secondary" className="ml-2">{counts.pre}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="tender-stage" className="py-2 text-xs md:text-sm">
                        Tender Stage <Badge variant="secondary" className="ml-2">{counts.tender}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="execution" className="py-2 text-xs md:text-sm">
                        Execution <Badge variant="secondary" className="ml-2">{counts.exec}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="py-2 text-xs md:text-sm">
                        Completed <Badge variant="secondary" className="ml-2">{counts.comp}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="closed" className="py-2 text-xs md:text-sm">
                        Closed Files <Badge variant="secondary" className="ml-2">{counts.closed}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

             <div className="flex justify-between items-center gap-4 mt-2 pt-2 border-t">
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider">Legend:</span>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-600"></div><span>Active</span></div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-yellow-600"></div><span>Refund</span></div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-600"></div><span>Closed</span></div>
                    <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-gray-500"></div><span className="line-through">Cancelled</span></div>
                </div>
                {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardContent className="p-0">
            <FileDatabaseTable 
                fileEntries={paginatedEntries} 
                isLoading={isLoading}
                searchActive={!!searchTerm}
                totalEntries={activeGroupEntries.length}
                isReadOnly={isSuperAdmin}
                currentPage={currentPage}
                userRole={user?.role}
                currentModule="planFund"
                activeTab={activeTab}
            />
        </CardContent>
         {totalPages > 1 && (
            <CardFooter className="p-4 border-t flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                    Showing <strong>{activeGroupEntries.length > 0 ? startEntryNum : 0}</strong>-<strong>{endEntryNum}</strong> of <strong>{activeGroupEntries.length}</strong> files.
                </p>
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
