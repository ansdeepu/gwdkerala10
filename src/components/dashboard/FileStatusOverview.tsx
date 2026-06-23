
// src/components/dashboard/FileStatusOverview.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, isValid, parseISO } from 'date-fns';
import { 
    type DataEntryFormData, 
    type SiteWorkStatus, 
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
} from '@/lib/schemas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useDataStore } from '@/hooks/use-data-store';

const ClipboardList = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
);

const REQUIRED_FILE_STATUSES = [
  "File Under Process",
  "Tender Process",
  "Work Initiated",
  "Fully Completed",
  "Fully Disputed",
  "Fully Completed Except Disputed",
  "Partially Completed",
  "File Closed"
] as const;

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

const AgeStatCard = ({ title, total, closed, balance, onClick, onClosedClick, onBalanceClick }: { title: string; total: number; closed: number; balance: number; onClick: () => void; onClosedClick: () => void; onBalanceClick: () => void; }) => (
  <div
    className="p-3 text-center rounded-md border bg-secondary/30 transition-colors"
  >
    <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
    <div className="grid grid-cols-3 gap-1">
        <button onClick={onClick} disabled={total === 0} className="flex flex-col items-center p-1 rounded-md hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="text-xs font-medium text-blue-600">Total</span>
            <span className="text-lg font-bold text-blue-700">{total}</span>
        </button>
        <button onClick={onClosedClick} disabled={closed === 0} className="flex flex-col items-center p-1 rounded-md hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="text-xs font-medium text-red-600">Closed</span>
            <span className="text-lg font-bold text-red-700">{closed}</span>
        </button>
        <button onClick={onBalanceClick} disabled={balance === 0} className="flex flex-col items-center p-1 rounded-md hover:bg-green-100 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="text-xs font-medium text-green-600">Balance</span>
            <span className="text-lg font-bold text-green-700">{balance}</span>
        </button>
    </div>
  </div>
);

interface FileStatusOverviewProps {
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'fileStatus' | 'age') => void;
  nonArsEntries: DataEntryFormData[];
}

const OverviewSection = ({ data, onFileStatusClick, onAgeCardClick, categoryTitle }: { data: any, onFileStatusClick: any, onAgeCardClick: any, categoryTitle: string }) => {
    return (
        <div className="space-y-6">
            <div className="mt-2"><div className="inline-flex items-baseline gap-2 p-3 rounded-lg shadow-sm bg-primary/10 border border-primary/20"><h4 className="text-sm font-medium text-primary">Total Visible Files</h4><p className="text-2xl font-bold text-primary">{data.totalFiles}</p></div></div>
            
            {data.totalFiles > 0 && (
                <div className="mt-6 pt-6 border-t border-border/60">
                    <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-medium text-primary">Files by Age</h4><p className="text-xs text-muted-foreground">Based on latest financial transaction</p></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AgeStatCard title="< 1 Year" {...data.filesByAgeStats.lessThan1} 
                          onClick={() => onAgeCardClick(data.filesByAgeStats.lessThan1.data.total, `${categoryTitle} Files Aged < 1 Year (Total)`)} 
                          onClosedClick={() => onAgeCardClick(data.filesByAgeStats.lessThan1.data.closed, `${categoryTitle} Files Aged < 1 Year (Closed)`)} 
                          onBalanceClick={() => onAgeCardClick(data.filesByAgeStats.lessThan1.data.balance, `${categoryTitle} Files Aged < 1 Year (Balance)`)} 
                        />
                        <AgeStatCard title="1-2 Years" {...data.filesByAgeStats.between1And2}
                          onClick={() => onAgeCardClick(data.filesByAgeStats.between1And2.data.total, `${categoryTitle} Files Aged 1-2 Years (Total)`)}
                          onClosedClick={() => onAgeCardClick(data.filesByAgeStats.between1And2.data.closed, `${categoryTitle} Files Aged 1-2 Years (Closed)`)}
                          onBalanceClick={() => onAgeCardClick(data.filesByAgeStats.between1And2.data.balance, `${categoryTitle} Files Aged 1-2 Years (Balance)`)}
                        />
                        <AgeStatCard title="2-3 Years" {...data.filesByAgeStats.between2And3}
                          onClick={() => onAgeCardClick(data.filesByAgeStats.between2And3.data.total, `${categoryTitle} Files Aged 2-3 Years (Total)`)}
                          onClosedClick={() => onAgeCardClick(data.filesByAgeStats.between2And3.data.closed, `${categoryTitle} Files Aged 2-3 Years (Closed)`)}
                          onBalanceClick={() => onAgeCardClick(data.filesByAgeStats.between2And3.data.balance, `${categoryTitle} Files Aged 2-3 Years (Balance)`)}
                        />
                        <AgeStatCard title="3-4 Years" {...data.filesByAgeStats.between3And4}
                          onClick={() => onAgeCardClick(data.filesByAgeStats.between3And4.data.total, `${categoryTitle} Files Aged 3-4 Years (Total)`)}
                          onClosedClick={() => onAgeCardClick(data.filesByAgeStats.between3And4.data.closed, `${categoryTitle} Files Aged 3-4 Years (Closed)`)}
                          onBalanceClick={() => onAgeCardClick(data.filesByAgeStats.between3And4.data.balance, `${categoryTitle} Files Aged 3-4 Years (Balance)`)}
                        />
                        <AgeStatCard title="4-5 Years" {...data.filesByAgeStats.between4And5}
                          onClick={() => onAgeCardClick(data.filesByAgeStats.between4And5.data.total, `${categoryTitle} Files Aged 4-5 Years (Total)`)}
                          onClosedClick={() => onAgeCardClick(data.filesByAgeStats.between4And5.data.closed, `${categoryTitle} Files Aged 4-5 Years (Closed)`)}
                          onBalanceClick={() => onAgeCardClick(data.filesByAgeStats.between4And5.data.balance, `${categoryTitle} Files Aged 4-5 Years (Balance)`)}
                        />
                        <AgeStatCard title="> 5 Years" {...data.filesByAgeStats.above5}
                          onClick={() => onAgeCardClick(data.filesByAgeStats.above5.data.total, `${categoryTitle} Files Aged > 5 Years (Total)`)}
                          onClosedClick={() => onAgeCardClick(data.filesByAgeStats.above5.data.closed, `${categoryTitle} Files Aged > 5 Years (Closed)`)}
                          onBalanceClick={() => onAgeCardClick(data.filesByAgeStats.above5.data.balance, `${categoryTitle} Files Aged > 5 Years (Balance)`)}
                        />
                    </div>
                </div>
            )}
            <div className="mt-auto space-y-2 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {data.fileStatusCountsData.map((item: any) => (
                    <button key={item.status} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30 text-left hover:bg-secondary/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors" onClick={() => onFileStatusClick(item.status, item.data)} disabled={item.count === 0}>
                    <span className="text-sm font-medium text-foreground">{item.status}</span>
                    <span className="text-lg font-bold text-primary">{item.count}</span>
                    </button>
                ))}
                </div>
            </div>
        </div>
    );
};


export default function FileStatusOverview({ onOpenDialog, nonArsEntries }: FileStatusOverviewProps) {
    const [activeTab, setActiveTab] = useState("deposit");
    const { allFileEntries } = useDataStore();

    const { 
        depositWorksData, 
        gwInvestigationData, 
        loggingPumpingTestData 
    } = useMemo(() => {
        const gwInvestigationEntries: DataEntryFormData[] = [];
        const loggingPumpingTestEntries: DataEntryFormData[] = [];
        const depositWorkEntries: DataEntryFormData[] = [];

        for (const entry of nonArsEntries) {
            const isInvestigationCategory = ['Govt', 'Private', 'Complaints'].includes((entry as any).category);
            const hasInvestigationPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
            const hasLoggingPumpingPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

            if ((isInvestigationCategory || hasInvestigationPurpose) && !hasLoggingPumpingPurpose) {
                gwInvestigationEntries.push(entry);
            } else if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) {
                loggingPumpingTestEntries.push(entry);
            } else if (!isInvestigationCategory && !hasInvestigationPurpose && !hasLoggingPumpingPurpose) {
                depositWorkEntries.push(entry);
            }
        }

        const processEntriesForOverview = (entries: DataEntryFormData[], statusOptions: readonly string[]) => {
            const fileStatusCounts = new Map<string, number>();
            statusOptions.forEach(status => fileStatusCounts.set(status, 0));
            
            const ageGroups: Record<string, DataEntryFormData[]> = {
                lessThan1: [], between1And2: [], between2And3: [], between3And4: [], between4And5: [], above5: [],
            };

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

            const now = new Date();

            for (const entry of entries) {
                if (entry.fileStatus && fileStatusCounts.has(entry.fileStatus)) {
                    fileStatusCounts.set(entry.fileStatus, (fileStatusCounts.get(entry.fileStatus) || 0) + 1);
                }

                const basisDate = getDisplayDate(entry) || ((entry as any).createdAt ? safeParseDate((entry as any).createdAt) : null);

                if (basisDate && isValid(basisDate)) {
                    const ageInMs = now.getTime() - basisDate.getTime();
                    const ageInYears = ageInMs / (1000 * 3600 * 24 * 365.25);
                    if (ageInYears < 1) ageGroups.lessThan1.push(entry);
                    else if (ageInYears < 2) ageGroups.between1And2.push(entry);
                    else if (ageInYears < 3) ageGroups.between2And3.push(entry);
                    else if (ageInYears < 4) ageGroups.between3And4.push(entry);
                    else if (ageInYears < 5) ageGroups.between4And5.push(entry);
                    else ageGroups.above5.push(entry);
                }
            }

            const processAgeGroup = (group: DataEntryFormData[]) => {
                const total = group.length;
                const closedData = group.filter(e => e.fileStatus === 'File Closed');
                const closed = closedData.length;
                const balanceData = group.filter(e => e.fileStatus !== 'File Closed');
                const balance = balanceData.length;
                return { total, closed, balance, data: { total: group, closed: closedData, balance: balanceData } };
            };
            
            return {
                fileStatusCountsData: statusOptions.map(status => ({
                    status,
                    count: fileStatusCounts.get(status) || 0,
                    data: entries.filter(e => e.fileStatus === status),
                })),
                filesByAgeStats: {
                    lessThan1: processAgeGroup(ageGroups.lessThan1),
                    between1And2: processAgeGroup(ageGroups.between1And2),
                    between2And3: processAgeGroup(ageGroups.between2And3),
                    between3And4: processAgeGroup(ageGroups.between3And4),
                    between4And5: processAgeGroup(ageGroups.between4And5),
                    above5: processAgeGroup(ageGroups.above5),
                },
                totalFiles: entries.length,
            };
        };

        return {
            depositWorksData: processEntriesForOverview(depositWorkEntries, REQUIRED_FILE_STATUSES),
            gwInvestigationData: processEntriesForOverview(gwInvestigationEntries, REQUIRED_FILE_STATUSES),
            loggingPumpingTestData: processEntriesForOverview(loggingPumpingTestEntries, REQUIRED_FILE_STATUSES)
        };
    }, [nonArsEntries, allFileEntries]);

  const handleFileStatusCardClick = (category: string, status: string, dataForDialog: DataEntryFormData[]) => {
    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteNames', label: 'Site(s)' },
      { key: 'firstRemittanceDate', label: 'First Remittance' }, { key: 'workStatuses', label: 'Site Status(es)' },
    ];
    
    const mappedData = dataForDialog.map((entry, index) => ({
      slNo: index + 1, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
      siteNames: entry.siteDetails?.map(s => s.nameOfSite).join(', ') || 'N/A',
      firstRemittanceDate: entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), 'dd/MM/yyyy') : 'N/A',
      workStatuses: entry.siteDetails?.map(s => s.workStatus).join(', ') || 'N/A',
    }));

    onOpenDialog(mappedData, `${category} Files - Status: "${status}"`, columns, 'fileStatus');
  };

  const handleAgeCardClick = (data: DataEntryFormData[], title: string) => {
     if (data.length === 0) return;
    
    const dataForDialog = data.map((entry, index) => {
      const latestRemittanceDate = entry.remittanceDetails?.map(rd => (rd.dateOfRemittance ? new Date(rd.dateOfRemittance) : null)).filter((d): d is Date => d !== null && isValid(d)).sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        slNo: index + 1, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A',
        siteNames: entry.siteDetails?.map(sd => sd.nameOfSite).filter(Boolean).join(', ') || 'N/A',
        lastRemittanceDate: latestRemittanceDate ? format(latestRemittanceDate, 'dd/MM/yyyy') : 'N/A',
        fileStatus: entry.fileStatus || 'N/A',
      };
    }) || [];

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteNames', label: 'Site Name(s)' },
      { key: 'lastRemittanceDate', label: 'Last Remittance Date' }, { key: 'fileStatus', label: 'File Status' },
    ];
    onOpenDialog(dataForDialog, title, columns, 'age');
  };

  return (
    <Card className="shadow-lg flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />File Status Overview</CardTitle>
        <CardDescription>Current count of files by status, based on your visible files. Click a status to see details.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        <Tabs defaultValue="deposit" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">Deposit Works <Badge variant="secondary" className="ml-2">{depositWorksData.totalFiles}</Badge></TabsTrigger>
            <TabsTrigger value="gwInvestigation">GW Investigation <Badge variant="secondary" className="ml-2">{gwInvestigationData.totalFiles}</Badge></TabsTrigger>
            <TabsTrigger value="loggingPumpingTest">Logging &amp; Pumping Test <Badge variant="secondary" className="ml-2">{loggingPumpingTestData.totalFiles}</Badge></TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4">
            <OverviewSection 
                data={depositWorksData} 
                onFileStatusClick={(status: string, data: DataEntryFormData[]) => handleFileStatusCardClick('Deposit Works', status, data)} 
                onAgeCardClick={handleAgeCardClick} 
                categoryTitle="Deposit Works" 
            />
          </TabsContent>
          <TabsContent value="gwInvestigation" className="mt-4">
            <OverviewSection 
                data={gwInvestigationData} 
                onFileStatusClick={(status: string, data: DataEntryFormData[]) => handleFileStatusCardClick('GW Investigation', status, data)} 
                onAgeCardClick={handleAgeCardClick} 
                categoryTitle="GW Investigation"
            />
          </TabsContent>
          <TabsContent value="loggingPumpingTest" className="mt-4">
            <OverviewSection 
                data={loggingPumpingTestData} 
                onFileStatusClick={(status: string, data: DataEntryFormData[]) => handleFileStatusCardClick('Logging &amp; Pumping Test', status, data)} 
                onAgeCardClick={handleAgeCardClick} 
                categoryTitle="Logging &amp; Pumping Test"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
