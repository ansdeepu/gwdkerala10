// src/app/dashboard/gw-investigation/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import InvestigationTable from "@/components/investigation/InvestigationTable";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { parseISO, isValid, format, startOfDay, endOfDay } from 'date-fns';
import { usePageHeader } from '@/hooks/usePageHeader';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useFileEntries } from '@/hooks/useFileEntries';
import { useDataStore } from '@/hooks/use-data-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LOGGING_PUMPING_TEST_PURPOSE_OPTIONS, DataEntryFormData } from '@/lib/schemas';
import PaginationControls from '@/components/shared/PaginationControls';
import { Search, FilePlus2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) return dateValue;
  if (typeof dateValue === 'string') { const parsed = parseISO(dateValue); if (isValid(parsed)) return parsed; }
   if (typeof dateValue === 'object' && dateValue.toDate) { // For Firestore Timestamps
    const parsed = dateValue.toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

const ITEMS_PER_PAGE = 50;


export default function GWInvestigationPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { fileEntries, isLoading } = useFileEntries();
  const { allFileEntries, searchTerms, setModuleSearchTerm } = useDataStore();
  
  const searchTerm = searchTerms['gw-investigation'] || "";
  const setSearchTerm = (term: string) => setModuleSearchTerm('gw-investigation', term);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { setIsNavigating } = usePageNavigation();
  const [currentPage, setCurrentPage] = useState(1);

  const tabFromUrl = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "Govt");
  
  useEffect(() => { setHeader('GW Investigation', 'List of all Ground Water Investigation files.'); }, [setHeader]);

  const canCreate = user?.role === 'admin' || user?.role === 'scientist';

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const allInvestigationEntries = useMemo(() => {
    let entries = fileEntries.filter(entry => {
        const isInvestigationCategory = ['Govt', 'Private', 'Complaints'].includes((entry as any).category);
        const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));
        
        return (isInvestigationCategory || hasInvestigationPurpose) && !hasLoggingPumpingPurpose;
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
        // Tier 1: Remittance Priority
        const remA = getLatestRemittanceDate(a);
        const remB = getLatestRemittanceDate(b);

        if (remA && remB) return remB.getTime() - remA.getTime();
        if (remA) return -1;
        if (remB) return 1;

        // Tier 2: Inward Credit Priority
        const reapA = getLatestInwardCreditDate(a);
        const reapB = getLatestInwardCreditDate(b);

        if (reapA && reapB) return reapB.getTime() - reapA.getTime();
        if (reapA) return -1;
        if (reapB) return 1;

        // Tier 3: Creation Date Fallback
        const caA = safeParseDate((a as any).createdAt);
        const caB = safeParseDate((b as any).createdAt);
        if (caA && caB) return caB.getTime() - caA.getTime();
        
        return 0;
    });
    return entries;
  }, [fileEntries, allFileEntries]);

  const searchFilteredEntries = useMemo(() => {
    if (!searchTerm) return allInvestigationEntries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allInvestigationEntries.filter(entry => {
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
            entry.fileNo, 
            entry.applicantName,
            ...(entry.siteDetails || []).map(s => s.nameOfSite),
            entry.phoneNo,
            ...amountRepresentations
        ].filter(Boolean).map(val => String(val).toLowerCase()).join(' ');
        return searchableContent.includes(lowerSearchTerm);
    });
  }, [allInvestigationEntries, searchTerm]);

  const totalSitesCount = useMemo(() => {
    return searchFilteredEntries.reduce((acc, entry) => acc + (entry.siteDetails?.length || 0), 0);
  }, [searchFilteredEntries]);

  const { investigationEntries, counts, lastCreatedDate } = useMemo(() => {
    const govt = searchFilteredEntries.filter(e => (e as any).category === 'Govt' || (e.applicationType === 'GW_Investigation' && !(e as any).category));
    const pvt = searchFilteredEntries.filter(e => (e as any).category === 'Private');
    const complaints = searchFilteredEntries.filter(e => (e as any).category === 'Complaints');

    let filtered = govt;
    if (activeTab === 'Private') filtered = pvt;
    if (activeTab === 'Complaints') filtered = complaints;
    if (activeTab === 'Govt') filtered = govt;

    const lastCreated = allInvestigationEntries.reduce((latest, entry) => {
        const createdAt = (entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null;
        return (createdAt && (!latest || createdAt > latest)) ? createdAt : latest;
    }, null as Date | null);
    
    return { 
        investigationEntries: filtered, 
        counts: { Govt: govt.length, Private: pvt.length, Complaints: complaints.length },
        lastCreatedDate: lastCreated
    };
  }, [searchFilteredEntries, allInvestigationEntries, activeTab]);
  
  const totalPages = Math.ceil(investigationEntries.length / ITEMS_PER_PAGE);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return investigationEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [investigationEntries, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleAddNewClick = () => {
    setIsNavigating(true);
    const queryParams = new URLSearchParams({ 
        workType: 'gwInvestigation',
        tab: activeTab,
        page: String(currentPage)
    });
    router.push(`/dashboard/data-entry?${queryParams.toString()}`);
  };

  return (
    <div className="space-y-6">
       <Card>
         <CardContent className="p-4 space-y-4">
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search across all categories (File No, Applicant, Site Name)..."
                  className="w-full rounded-lg bg-background shadow-sm pl-10"
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
                    <Button onClick={handleAddNewClick} size="sm" className="w-full sm:w-auto shrink-0"><FilePlus2 className="mr-2 h-4 w-4" /> New File</Button>
                )}
               </div>
            </div>
           
           <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-semibold">Legend:</span>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-600"></div><span>Completed</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-600"></div><span>VES Pending</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-600"></div><span>Pending</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-500"></div><span className="line-through">Cancelled</span></div>
                </div>
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="Govt">Govt <Badge variant="secondary" className="ml-2">{counts.Govt}</Badge></TabsTrigger>
                        <TabsTrigger value="Private">Private <Badge variant="secondary" className="ml-2">{counts.Private}</Badge></TabsTrigger>
                        <TabsTrigger value="Complaints">Complaints <Badge variant="secondary" className="ml-2">{counts.Complaints}</Badge></TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex flex-col items-end gap-2">
                    {lastCreatedDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5" />
                            Last created: <span className="font-semibold text-primary/90 font-mono">{format(lastCreatedDate, 'dd/MM/yy, hh:mm a')}</span>
                        </div>
                    )}
                    {totalPages > 1 && (
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
         </CardContent>
       </Card>
       
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <InvestigationTable 
                fileEntries={paginatedEntries} 
                isLoading={isLoading} 
                searchActive={!!searchTerm} 
                totalEntries={investigationEntries.length}
                activeTab={activeTab}
                currentPage={currentPage}
            />
          </div>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="p-4 flex items-center justify-center border-t">
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
