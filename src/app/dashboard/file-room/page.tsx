// src/app/dashboard/file-room/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { DataEntryFormData } from '@/lib/schemas';
import { 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES,
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
} from '@/lib/schemas';
import { parseISO, isValid } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries'; 
import { useDataStore } from '@/hooks/use-data-store';
import PaginationControls from '@/components/shared/PaginationControls';
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
  if (typeof dateValue === 'object' && dateValue.toDate) {
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function FileManagerPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries(); 
  const { allFileEntries, searchTerms, setModuleSearchTerm } = useDataStore();
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsNavigating } = usePageNavigation();
  
  const searchTerm = searchTerms['file-room'] || "";
  const setSearchTerm = (term: string) => setModuleSearchTerm('file-room', term);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || "pre-execution");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setHeader('Deposit Works', 'List of all public and government deposit works.');
  }, [setHeader]);

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  const canCreate = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'scientist';
  
  const { depositWorkEntries } = useMemo(() => {
    let entries = fileEntries.filter(entry => {
        const isInvestigationCategory = ['Govt', 'Private', 'Complaints'].includes((entry as any).category);
        const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));
        
        if ((isInvestigationCategory || hasInvestigationPurpose) && !hasLoggingPumpingPurpose) return false;
        if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) return false;

        if (entry.applicationType) {
            if (PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as any)) return false;
            if (COLLECTOR_APPLICATION_TYPES.includes(entry.applicationType as any)) return false;
            if (PLAN_FUND_APPLICATION_TYPES.includes(entry.applicationType as any)) return false;
        }
        if ((entry as any).category) return false;

        return true;
    });

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

    return { depositWorkEntries: entries };
  }, [fileEntries, allFileEntries]);
  
  const searchFilteredEntries = useMemo(() => {
    if (!searchTerm) return depositWorkEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return depositWorkEntries.filter(entry => {
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
  }, [depositWorkEntries, searchTerm]);

  const totalSitesCount = useMemo(() => {
    return searchFilteredEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
  }, [searchFilteredEntries]);

  const { groups, counts } = useMemo(() => {
      const pre = searchFilteredEntries.filter(e => e.fileStatus === 'File Under Process');
      const tender = searchFilteredEntries.filter(e => e.fileStatus === 'Tender Process');
      const exec = searchFilteredEntries.filter(e => ["Work Initiated", "Partially Completed"].includes(e.fileStatus as string));
      const comp = searchFilteredEntries.filter(e => ["Fully Completed", "Fully Disputed", "Fully Completed Except Disputed"].includes(e.fileStatus as string));
      
      const isZero = (val: any) => {
        if (val === undefined || val === null || val === '') return true;
        const normalized = String(val).replace(/[₹,]/g, '').trim();
        const num = Number(normalized);
        return !isNaN(num) && Math.abs(num) < 0.01;
      };
      
      const getBalance = (e: any) => {
          if (e.overallBalance !== undefined && e.overallBalance !== null) return e.overallBalance;
          if (e.finalDetails?.overallBalance !== undefined && e.finalDetails?.overallBalance !== null) return e.finalDetails.overallBalance;
          return 0;
      };

      const closedPending = searchFilteredEntries.filter(e => e.fileStatus === 'File Closed' && !isZero(getBalance(e)));
      const completelyClosed = searchFilteredEntries.filter(e => e.fileStatus === 'File Closed' && isZero(getBalance(e)));

      return {
          groups: {
              "pre-execution": pre,
              "tender-stage": tender,
              "execution": exec,
              "completed": comp,
              "closed-pending": closedPending,
              "completely-closed": completelyClosed
          },
          counts: {
              pre: pre.length,
              tender: tender.length,
              exec: exec.length,
              comp: comp.length,
              closedPending: closedPending.length,
              completelyClosed: completelyClosed.length
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
        workType: 'public',
        tab: activeTab,
        page: String(currentPage)
    });
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };
  
  const startEntryNum = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endEntryNum = Math.min(currentPage * ITEMS_PER_PAGE, activeGroupEntries.length);

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 space-y-4">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search files..." className="w-full pl-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
               <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
                <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mr-2">
                    <span>Files: <span className="text-primary font-bold">{searchFilteredEntries.length}</span></span>
                    <span>Sites: <span className="text-primary font-bold">{totalSitesCount}</span></span>
                </div>
                {canCreate && (
                    <Button onClick={handleAddNewClick} size="sm" className="shrink-0"><PlusCircle className="mr-2 h-4 w-4" /> New File</Button>
                )}
               </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
                    <TabsTrigger value="closed-pending" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Closed (Pending) <Badge variant="secondary" className="ml-1">{counts.closedPending || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completely-closed" className="flex-shrink-0 py-2 px-2 text-xs md:text-sm whitespace-nowrap">
                        Closed (Zero) <Badge variant="secondary" className="ml-1">{counts.completelyClosed || 0}</Badge>
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
                currentPage={currentPage}
                userRole={user?.role}
                currentModule="deposit"
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
