
// src/components/dashboard/WorkProgress.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, isWithinInterval, startOfMonth, endOfMonth, isValid, parse } from 'date-fns';
import { 
    type SiteDetailFormData, 
    type SiteWorkStatus, 
    type SitePurpose, 
    type DataEntryFormData, 
    type ApplicationType, 
    sitePurposeOptions,
    PRIVATE_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS
} from '@/lib/schemas/DataEntrySchema';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@/hooks/useAuth';
import { CalendarCheck, Hourglass, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { ArsEntry } from '@/hooks/useArsEntries';

interface WorkProgressProps {
  allFileEntries: DataEntryFormData[];
  allArsEntries: ArsEntry[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'month') => void;
  currentUser?: UserProfile | null;
}

interface DetailedWorkSummary {
    totalCount: number;
    byPurpose: Record<string, number>;
    data: Array<any & { fileNo: string; applicantName: string; }>;
}

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const ProgressCategory = ({
  title,
  summary,
  onTotalClick,
  onPurposeClick,
}: {
  title: string;
  summary: DetailedWorkSummary;
  onTotalClick: () => void;
  onPurposeClick: (purpose: string) => void;
}) => {
  const isCompleted = title.includes('Completed');
  const Icon = isCompleted ? TrendingUp : Hourglass;
  const colorClass = isCompleted ? "text-green-600" : "text-orange-600";

  const sortedPurposes = useMemo(() => {
      const purposes = Object.keys(summary.byPurpose).filter(p => summary.byPurpose[p] > 0);
      return purposes.sort((a, b) => a.localeCompare(b));
  }, [summary.byPurpose]);

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
      <div className="flex justify-between items-center">
        <h3 className={`text-base font-semibold flex items-center gap-2 ${colorClass}`}>
          <Icon className="h-5 w-5" />
          {title}
        </h3>
        <Button variant="link" className="text-sm p-0 h-auto" onClick={onTotalClick} disabled={summary.totalCount === 0}>
          View All ({summary.totalCount})
        </Button>
      </div>
      <div className="space-y-2">
        {summary.totalCount > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {sortedPurposes.map(p => (
              <button key={`${p}-${title}`} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-orange-100/50" onClick={() => onPurposeClick(p)}>
                <span className="font-medium">{p}</span>
                <span className={`font-bold ${colorClass}`}>{summary.byPurpose[p]}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-4">No works in this category.</p>
        )}
      </div>
    </div>
  );
};

const WorkProgressCategoryView = ({
    entries,
    arsEntries,
    workReportMonth,
    currentUser,
    handleMonthStatClick,
    handleMonthPurposeClick
}: {
    entries: DataEntryFormData[];
    arsEntries: ArsEntry[];
    workReportMonth: Date;
    currentUser?: UserProfile | null;
    handleMonthStatClick: (type: 'ongoing' | 'completed', dataSource: DetailedWorkSummary) => void;
    handleMonthPurposeClick: (dataSource: DetailedWorkSummary, purpose: string, type: 'Ongoing' | 'Completed') => void;
}) => {
    const categoryStats = useMemo(() => {
        const startOfMonthDate = startOfMonth(workReportMonth);
        const endOfMonthDate = endOfMonth(workReportMonth);

        const ongoingWorkStatuses: SiteWorkStatus[] = ["Work Order Issued", "Work in Progress", "Department Rig Allotted", "Tendered", "Selection Notice Issued", "TS Pending", "Additional Fund Awaited", "Under Process", "Pending", "VES Pending"];
        const completedWorkStatuses: SiteWorkStatus[] = ["Work Failed", "Work Completed", "Completed"];
        
        const isSupervisor = currentUser?.role === 'supervisor';
        const isInvestigator = currentUser?.role === 'investigator';
        
        const uniqueCompletedSites = new Map<string, any>();
        const ongoingSites: Array<any> = [];

        // 1. Process regular file entries
        for (const entry of entries) {
            if (!entry.siteDetails) continue;
            for (const site of entry.siteDetails) {
                if (isSupervisor && site.supervisorUid !== currentUser.uid) continue;
                if (isInvestigator && site.nameOfInvestigator !== currentUser.name && site.vesInvestigator !== currentUser.name) continue;

                if (site.workStatus && completedWorkStatuses.includes(site.workStatus as SiteWorkStatus) && site.dateOfCompletion) {
                    const completionDate = safeParseDate(site.dateOfCompletion);
                    if (completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonthDate, end: endOfMonthDate })) {
                        const siteKey = `${entry.fileNo}-${site.nameOfSite}-${site.purpose}`;
                        if (!uniqueCompletedSites.has(siteKey)) {
                            uniqueCompletedSites.set(siteKey, { ...site, id: site.id, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', applicationType: entry.applicationType as ApplicationType });
                        }
                    }
                }
                
                if (site.workStatus && ongoingWorkStatuses.includes(site.workStatus as SiteWorkStatus)) {
                    ongoingSites.push({ ...site, id: site.id, fileNo: entry.fileNo || 'N/A', applicantName: entry.applicantName || 'N/A', applicationType: entry.applicationType as ApplicationType });
                }
            }
        }

        // 2. Process ARS module entries
        const arsOngoingStatuses = ["Proposal Submitted", "AS & TS Issued", "Tendered", "Selection Notice Issued", "Work Order Issued", "Work in Progress"];
        const arsCompletedStatuses = ["Work Completed", "Work Failed"];

        for (const arsEntry of arsEntries) {
            if (isSupervisor && arsEntry.supervisorUid !== currentUser.uid) continue;
            if (isInvestigator && arsEntry.supervisorUid !== currentUser.uid) continue;

            if (arsEntry.arsStatus && arsCompletedStatuses.includes(arsEntry.arsStatus) && arsEntry.dateOfCompletion) {
                const completionDate = safeParseDate(arsEntry.dateOfCompletion);
                if (completionDate && isValid(completionDate) && isWithinInterval(completionDate, { start: startOfMonthDate, end: endOfMonthDate })) {
                    const siteKey = `ARS-MODULE-${arsEntry.fileNo}-${arsEntry.nameOfSite}`;
                    if (!uniqueCompletedSites.has(siteKey)) {
                        uniqueCompletedSites.set(siteKey, { 
                            ...arsEntry, 
                            id: arsEntry.id,
                            fileNo: arsEntry.fileNo || 'N/A', 
                            applicantName: 'ARS Scheme', 
                            purpose: 'ARS Scheme',
                            workStatus: arsEntry.arsStatus 
                        });
                    }
                }
            }

            if (arsEntry.arsStatus && arsOngoingStatuses.includes(arsEntry.arsStatus)) {
                ongoingSites.push({ 
                    ...arsEntry, 
                    id: arsEntry.id,
                    fileNo: arsEntry.fileNo || 'N/A', 
                    applicantName: 'ARS Scheme', 
                    purpose: 'ARS Scheme',
                    workStatus: arsEntry.arsStatus 
                });
            }
        }
        
        const createDetailedSummary = (sites: any[]): DetailedWorkSummary => {
            const byPurpose: Record<string, number> = {};
            
            sites.forEach(site => {
                const purpose = site.purpose || 'N/A';
                byPurpose[purpose] = (byPurpose[purpose] || 0) + 1;
            });

            return { 
                totalCount: sites.length, 
                byPurpose, 
                data: sites,
            };
        };

        return {
            completedSummary: createDetailedSummary(Array.from(uniqueCompletedSites.values())),
            ongoingSummary: createDetailedSummary(ongoingSites),
        };
    }, [entries, arsEntries, workReportMonth, currentUser]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressCategory
                title={`Completed in ${format(workReportMonth, 'MMMM')}`}
                summary={categoryStats.completedSummary}
                onTotalClick={() => handleMonthStatClick('completed', categoryStats.completedSummary)}
                onPurposeClick={(p) => handleMonthPurposeClick(categoryStats.completedSummary, p, 'Completed')}
            />
            <ProgressCategory
                title="Total Ongoing Works"
                summary={categoryStats.ongoingSummary}
                onTotalClick={() => handleMonthStatClick('ongoing', categoryStats.ongoingSummary)}
                onPurposeClick={(p) => handleMonthPurposeClick(categoryStats.ongoingSummary, p, 'Ongoing')}
            />
        </div>
    );
};


export default function WorkProgress({ allFileEntries, allArsEntries, onOpenDialog, currentUser }: WorkProgressProps) {
  const [workReportMonth, setWorkReportMonth] = useState<Date>(new Date());
  
  const { 
    depositWorkEntries,
    gwInvestigationEntries, 
    loggingPumpingTestEntries 
  } = useMemo(() => {
    const gwInvestigationEntries: DataEntryFormData[] = [];
    const loggingPumpingTestEntries: DataEntryFormData[] = [];
    const depositWorkEntries: DataEntryFormData[] = [];

    for (const entry of allFileEntries) {
        const hasGwPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLpPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

        if (hasGwPurpose && !hasLpPurpose) {
            gwInvestigationEntries.push(entry);
        } else if (hasLpPurpose && !hasGwPurpose) {
            loggingPumpingTestEntries.push(entry);
        } else if (!hasGwPurpose && !hasLpPurpose) {
            depositWorkEntries.push(entry);
        }
    }
    return { depositWorkEntries, gwInvestigationEntries, loggingPumpingTestEntries };
  }, [allFileEntries]);

  const handleMonthStatClick = (type: 'ongoing' | 'completed', summary: DetailedWorkSummary) => {
    if (summary.totalCount === 0) return;

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' },
      { key: 'supervisorName', label: 'Supervisor' },
    ];

    const dialogData = summary.data.map((site, index) => ({
      slNo: index + 1, id: site.id, fileNo: site.fileNo, applicantName: site.applicantName, siteName: site.nameOfSite,
      purpose: site.purpose, workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A',
    }));

    const title = type === 'ongoing' ? "Total Ongoing Works" : `Works Completed in ${format(workReportMonth, 'MMMM yyyy')}`;
    onOpenDialog(dialogData, title, columns, 'month');
  };

  const handleMonthPurposeClick = (dataSource: DetailedWorkSummary, purpose: string, type: 'Ongoing' | 'Completed') => {
    const filteredData = dataSource.data.filter(d => d.purpose === purpose);
    if (filteredData.length === 0) return;

    const dialogData = filteredData.map((site, index) => ({
      slNo: index + 1, id: site.id, fileNo: site.fileNo, applicantName: site.applicantName, siteName: site.nameOfSite,
      purpose: site.purpose, workStatus: site.workStatus, supervisorName: site.supervisorName || 'N/A',
    }));

    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' }, { key: 'supervisorName', label: 'Supervisor' },
    ];
    onOpenDialog(dialogData, `${type} '${purpose}' Works`, columns, 'month');
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    const parsedDate = parse(dateString, 'yyyy-MM', new Date());
    if (isValid(parsedDate)) {
      setWorkReportMonth(parsedDate);
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-grow">
            <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" />Work Progress for {format(workReportMonth, 'MMMM yyyy')}</CardTitle>
            <CardDescription>Summary of completed and ongoing work by category.</CardDescription>
          </div>
          <div className="shrink-0">
             <Input 
                type="month" 
                id="work-report-month"
                name="workReportMonth"
                className="w-full sm:w-[200px]" 
                value={format(workReportMonth, 'yyyy-MM')} 
                onChange={handleMonthChange} 
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">Deposit Works <Badge variant="secondary" className="ml-2">{depositWorkEntries.length}</Badge></TabsTrigger>
            <TabsTrigger value="gwInvestigation">GW Investigation <Badge variant="secondary" className="ml-2">{gwInvestigationEntries.length}</Badge></TabsTrigger>
            <TabsTrigger value="loggingPumpingTest">Logging &amp; Pumping <Badge variant="secondary" className="ml-2">{loggingPumpingTestEntries.length}</Badge></TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4">
            <WorkProgressCategoryView 
                entries={depositWorkEntries}
                arsEntries={allArsEntries}
                workReportMonth={workReportMonth}
                currentUser={currentUser}
                handleMonthStatClick={handleMonthStatClick}
                handleMonthPurposeClick={handleMonthPurposeClick}
            />
          </TabsContent>
          <TabsContent value="gwInvestigation" className="mt-4">
             <WorkProgressCategoryView 
                entries={gwInvestigationEntries}
                arsEntries={[]}
                workReportMonth={workReportMonth}
                currentUser={currentUser}
                handleMonthStatClick={handleMonthStatClick}
                handleMonthPurposeClick={handleMonthPurposeClick}
            />
          </TabsContent>
          <TabsContent value="loggingPumpingTest" className="mt-4">
             <WorkProgressCategoryView 
                entries={loggingPumpingTestEntries}
                arsEntries={[]}
                workReportMonth={workReportMonth}
                currentUser={currentUser}
                handleMonthStatClick={handleMonthStatClick}
                handleMonthPurposeClick={handleMonthPurposeClick}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
