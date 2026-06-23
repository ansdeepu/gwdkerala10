
// src/app/dashboard/progress-report/page.tsx
"use client";
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, parse, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  applicationTypeOptions,
  applicationTypeDisplayMap,
  type ApplicationType,
  type SitePurpose,
  type DataEntryFormData,
  type SiteDetailFormData,
  type SiteWorkStatus,
  REPORTING_PURPOSE_ORDER,
  PUMPING_TEST_AGGREGATE_PURPOSES,
  type TypeOfWell,
  typeOfWellOptions,
  PRIVATE_APPLICATION_TYPES,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  PUBLIC_DEPOSIT_APPLICATION_TYPES,
  COLLECTOR_APPLICATION_TYPES,
  PLAN_FUND_APPLICATION_TYPES,
} from '@/lib/schemas';
import ExcelJS from "exceljs";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { generateProgressReportPdf } from '@/components/reports/pdf/progressReportPdfGenerator';
import download from 'downloadjs';
import { useDataStore } from '@/hooks/use-data-store';
import { Play, XCircle, FileDown, Loader2, Landmark, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';


export const dynamic = 'force-dynamic';

interface SiteDetailWithFileContext extends SiteDetailFormData {
  fileNo: string;
  applicantName: string;
  applicationType: ApplicationType;
  fileRemittanceDate?: Date | null;
}

interface ProgressStats {
  previousBalance: number;
  currentApplications: number;
  toBeRefunded: number;
  totalApplications: number;
  completed: number;
  feasible: number;
  nonFeasible: number;
  balance: number;
  previousBalanceData: SiteDetailWithFileContext[];
  currentApplicationsData: SiteDetailWithFileContext[];
  toBeRefundedData: SiteDetailWithFileContext[];
  totalApplicationsData: SiteDetailWithFileContext[];
  completedData: SiteDetailWithFileContext[];
  feasibleData: SiteDetailWithFileContext[];
  nonFeasibleData: SiteDetailWithFileContext[];
  balanceData: SiteDetailWithFileContext[];
}

type OtherServiceProgress = Record<SitePurpose, ProgressStats>;

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[];
  completedData: SiteDetailWithFileContext[];
  paymentData: any[];
}
type FinancialSummaryReport = Record<string, FinancialSummary>;


const BWC_DIAMETERS = ['110 mm (4.5”)', '150 mm (6”)'];
const TWC_DIAMETERS = ['150 mm (6”)', '200 mm (8”)'];
const FPW_DIAMETERS = ['110 mm (4.5”)'];


const REFUNDED_STATUSES: string[] = ['Refund Pending'];

interface DetailDialogColumn {
  key: string;
  label: string;
  isNumeric?: boolean;
}

const PROGRESS_REPORT_METRICS: Array<{ key: keyof ProgressStats; label: string }> = [
    { key: 'previousBalance', label: 'Previous Balance' },
    { key: 'currentApplications', label: 'Current Application' },
    { key: 'toBeRefunded', label: 'To be Refunded' },
    { key: 'totalApplications', label: 'Total Application' },
    { key: 'completed', label: 'Completed' },
    { key: 'feasible', label: 'Feasible' },
    { key: 'nonFeasible', label: 'Non-feasible' },
    { key: 'balance', label: 'Balance' },
];

const ReportDetailsTable = ({
  data,
  categoryKeys,
  categoryLabels,
  onCountClick,
  titlePrefix,
}: {
  data: Record<string, ProgressStats>;
  categoryKeys: readonly string[];
  categoryLabels: Record<string, string>;
  onCountClick: (data: SiteDetailWithFileContext[], title: string) => void;
  titlePrefix: string;
}) => {
    const { categoryTotals, hasData, activeMetrics } = useMemo(() => {
        const totals: ProgressStats = { previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, feasible: 0, nonFeasible: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], toBeRefundedData: [], totalApplicationsData: [], completedData: [], feasibleData: [], nonFeasibleData: [], balanceData: [] };
        let dataFound = false;
        
        const metricActivity = new Map<string, boolean>();
        PROGRESS_REPORT_METRICS.forEach(m => metricActivity.set(m.key, false));

        categoryKeys.forEach(catKey => {
            const stats = data[catKey];
            if (stats) {
                if (Object.values(stats).some(val => (typeof val === 'number' && val > 0) || (Array.isArray(val) && val.length > 0))) {
                    dataFound = true;
                }
                PROGRESS_REPORT_METRICS.forEach(metric => {
                    const count = (stats[metric.key] as number) || 0;
                    if (count > 0) metricActivity.set(metric.key, true);

                    const dataKey = `${metric.key}Data` as keyof ProgressStats;
                    const metricData = stats[dataKey] as SiteDetailWithFileContext[] | undefined;
                    
                    (totals[metric.key] as number) += count;
                     if (Array.isArray(totals[dataKey]) && Array.isArray(metricData)) {
                        (totals[dataKey] as any[]).push(...metricData);
                     }
                });
            }
        });

        // Always show basic metrics
        ['previousBalance', 'currentApplications', 'toBeRefunded', 'totalApplications', 'completed', 'balance'].forEach(k => metricActivity.set(k, true));

        const active = PROGRESS_REPORT_METRICS.filter(m => metricActivity.get(m.key));

        return { categoryTotals: totals, hasData: dataFound, activeMetrics: active };
    }, [data, categoryKeys]);
    
    if (!hasData) {
        return <p className="text-center text-sm text-muted-foreground p-4">No data available for this category in the selected period.</p>;
    }

    return (
        <div className="relative overflow-x-auto">
            <Table className="min-w-full border-collapse">
                <TableHeader>
                    <TableRow>
                        <TableHead className="border p-2 align-middle text-left min-w-[200px] font-semibold">Category</TableHead>
                        {activeMetrics.map(metric => (
                            <TableHead key={metric.key} className="border p-2 text-center font-semibold min-w-[100px] whitespace-normal break-words">{metric.label}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {categoryKeys.map(catKey => {
                        const stats = data[catKey];
                        if (!stats || !Object.values(stats).some(val => (typeof val === 'number' && val > 0))) return null;
                        return (
                            <TableRow key={catKey}>
                                <TableCell className="border p-2 text-left font-medium">{categoryLabels[catKey] || catKey}</TableCell>
                                {activeMetrics.map(metric => {
                                    const count = stats[metric.key] as number ?? 0;
                                    const metricData = stats[`${metric.key}Data` as keyof ProgressStats] as SiteDetailWithFileContext[] ?? [];
                                    return (
                                        <TableCell key={`${catKey}-${metric.key}`} className={cn("border p-2 text-center", (metric.key === 'balance' || metric.key === 'totalApplications') && "font-bold")}>
                                            <Button variant="link" className="p-0 h-auto font-semibold" disabled={count === 0} onClick={() => onCountClick(metricData, `${titlePrefix} - ${categoryLabels[catKey] || catKey} - ${metric.label}`)}>
                                                {count}
                                            </Button>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        )
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow className="bg-muted/50">
                        <TableCell className="border p-2 text-left font-bold">Total</TableCell>
                        {activeMetrics.map(metric => (
                            <TableCell key={`total-${metric.key}`} className={cn("border p-2 text-center font-bold")}>
                                <Button variant="link" className="p-0 h-auto font-bold" disabled={(categoryTotals[metric.key] as number) === 0} onClick={() => onCountClick(categoryTotals[`${metric.key}Data` as keyof ProgressStats] as SiteDetailWithFileContext[], `Total for ${titlePrefix} - ${metric.label}`)}>
                                    {categoryTotals[metric.key] as number}
                                </Button>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
};

const ReportCategoryTable = ({
  accordionId,
  title,
  data,
  categoryKeys,
  categoryLabels,
  onCountClick,
  diameter,
  alwaysVisible = false,
}: {
  accordionId: string;
  title: string;
  data: Record<string, any>; 
  categoryKeys: readonly string[];
  categoryLabels: Record<string, string>;
  onCountClick: (data: SiteDetailWithFileContext[], title: string) => void;
  diameter?: string; 
  alwaysVisible?: boolean;
}) => {
    const hasData = useMemo(() => {
        if (!data) return false;
        return categoryKeys.some(catKey => {
            const stats = diameter ? data[catKey]?.[diameter] : data[catKey];
            if (!stats) return false;
            return Object.values(stats).some(val => {
                if (typeof val === 'number' && val > 0) return true;
                if (Array.isArray(val) && val.length > 0) return true;
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    return Object.values(val).some((nestedVal: any) => 
                        (typeof nestedVal === 'number' && nestedVal > 0) || 
                        (Array.isArray(nestedVal) && nestedVal.length > 0)
                    );
                }
                return false;
            });
        });
    }, [data, categoryKeys, diameter]);
  
    if (!hasData && !alwaysVisible) return null;
  
    return (
      <AccordionItem value={accordionId} className="border-b-0">
        <Card className="shadow-lg">
          <AccordionTrigger className="p-6 hover:no-underline [&[data-state=open]]:border-b">
            <CardTitle>{title}</CardTitle>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="pt-6">
                <ReportDetailsTable
                    data={diameter ? Object.fromEntries(Object.entries(data || {}).map(([key, val]) => [key, val[diameter]])) : data}
                    categoryKeys={categoryKeys}
                    categoryLabels={categoryLabels}
                    onCountClick={onCountClick}
                    titlePrefix={title}
                />
            </CardContent>
          </AccordionContent>
        </Card>
      </AccordionItem>
    );
  };

const FinancialSummaryTable = ({ data, onCellClick, onTotalClick, category }: { data: FinancialSummaryReport, onCellClick: (dataType: 'application' | 'payment', purpose: string, data: any[], title: string) => void, onTotalClick: (type: 'applications' | 'remittance' | 'completed' | 'payment') => void, category: string }) => {
  const categories = Object.keys(data);
  const totals = {
      totalApplications: categories.reduce((sum, key) => sum + data[key].totalApplications, 0),
      totalRemittance: categories.reduce((sum, key) => sum + data[key].totalRemittance, 0),
      totalCompleted: categories.reduce((sum, key) => sum + data[key].totalCompleted, 0),
      totalPayment: categories.reduce((sum, key) => sum + data[key].totalPayment, 0),
  };
  if (categories.length === 0) return <p className="text-center text-sm text-muted-foreground p-4">No data for this category in the selected period.</p>;
  return (
      <Table>
          <TableHeader><TableRow><TableHead>Type of Purpose</TableHead><TableHead className="text-center">Total Application Received</TableHead><TableHead className="text-right">Total Remittance (₹)</TableHead><TableHead className="text-center">No. of Application Completed</TableHead><TableHead className="text-right">Total Payment (₹)</TableHead></TableRow></TableHeader>
          <TableBody>
              {categories.map(key => (
                  <TableRow key={key}>
                      <TableCell className="font-medium">{key}</TableCell>
                      <TableCell className="text-center"><Button variant="link" disabled={data[key].totalApplications === 0} onClick={() => onCellClick('application', key, data[key].applicationData, `${category} Applications for ${key}`)}>{data[key].totalApplications}</Button></TableCell>
                      <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-mono text-right w-full block" disabled={data[key].totalRemittance === 0} onClick={() => onCellClick('application', key, data[key].applicationData, `${category} Remittances for ${key}`)}>{data[key].totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                      <TableCell className="text-center"><Button variant="link" disabled={data[key].totalCompleted === 0} onClick={() => onCellClick('application', key, data[key].completedData, `${category} Completed Works for ${key}`)}>{data[key].totalCompleted}</Button></TableCell>
                      <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-mono text-right w-full block" disabled={data[key].totalPayment === 0} onClick={() => onCellClick('payment', key, data[key].paymentData, `${category} Payments for ${key}`)}>{data[key].totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                  </TableRow>
              ))}
          </TableBody>
          <TableFooter>
              <TableRow className="font-bold bg-secondary">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center"><Button variant="link" className="p-0 h-auto font-bold" onClick={() => onTotalClick('applications')}>{totals.totalApplications}</Button></TableCell>
                  <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-bold font-mono text-right w-full block" onClick={() => onTotalClick('remittance')}>{totals.totalRemittance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
                  <TableCell className="text-center"><Button variant="link" className="p-0 h-auto font-bold" onClick={() => onTotalClick('completed')}>{totals.totalCompleted}</Button></TableCell>
                  <TableCell className="text-right font-mono"><Button variant="link" className="p-0 h-auto font-bold font-mono text-right w-full block" onClick={() => onTotalClick('payment')}>{totals.totalPayment.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Button></TableCell>
              </TableRow>
          </TableFooter>
      </Table>
  );
};


const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const calculatePaymentEntryTotalGlobal = (payment: any): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) + (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) + (Number(payment.kbcwb) || 0) + (Number(payment.refundToParty) || 0);
};

export default function ProgressReportPage() {
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const { reportEntries: fileEntries, isReportLoading: entriesLoading } = useAllFileEntriesForReports();
  const { officeAddress } = useDataStore();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  const [reportData, setReportData] = useState<any | null>(null);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailDialogTitle, setDetailDialogTitle] = useState("");
  const [detailDialogData, setDetailDialogData] = useState<Array<SiteDetailWithFileContext | DataEntryFormData | Record<string, any>>>([]);
  const [detailDialogColumns, setDetailDialogColumns] = useState<DetailDialogColumn[]>([]);
  
  const uniqueApplicationTypes = useMemo(() => [...new Set(applicationTypeOptions.filter(type => !['GW_Investigation', 'Logging_Pumping_Test'].some(prefix => type.startsWith(prefix))))], []);
  const UNASSIGNED_APP_TYPE = 'Unassigned';
  const uniqueApplicationTypesWithUnassigned = useMemo(() => [...uniqueApplicationTypes, UNASSIGNED_APP_TYPE], [uniqueApplicationTypes]);
  const applicationTypeDisplayMapWithUnassigned = useMemo(() => ({
    ...applicationTypeDisplayMap,
    [UNASSIGNED_APP_TYPE]: 'Unassigned / Other'
  }), []);


  useEffect(() => {
    setHeader('Progress Reports', 'Generate monthly or periodic progress reports for various schemes and services.');
  }, [setHeader]);
  
  useEffect(() => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(endOfMonth(new Date()));
  }, []);
  
  const handleGenerateReport = useCallback(() => {
    if (!startDate || !endDate) {
        toast({ title: "Date Range Required", description: "Please select both a 'From' and 'To' date to generate the report.", variant: "destructive" });
        return;
    }
    setIsFiltering(true);
    setReportData(null); 

    const sDate = startOfDay(startDate);
    const eDate = endOfDay(endDate);
    const isDateFilterActive = !!sDate && !!eDate;

    const includedSites: SiteDetailWithFileContext[] = fileEntries.flatMap(entry => 
        (entry.siteDetails || [])
        .filter(site => site.workStatus !== "Work Cancelled")
        .map(site => {
            const firstRemittanceDate = safeParseDate(entry.remittanceDetails?.[0]?.dateOfRemittance);
            return { ...site, fileNo: entry.fileNo!, applicantName: entry.applicantName!, applicationType: (entry.applicationType || UNASSIGNED_APP_TYPE) as ApplicationType, fileRemittanceDate: firstRemittanceDate, id: entry.id };
        })
    );

    const initialStats = (): ProgressStats => ({ previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, feasible: 0, nonFeasible: 0, balance: 0, previousBalanceData: [], currentApplicationsData: [], toBeRefundedData: [], totalApplicationsData: [], completedData: [], feasibleData: [], nonFeasibleData: [], balanceData: [] });
    
    const calculateBalanceAndTotal = (stats: ProgressStats) => {
        if(!stats) return;
        stats.totalApplications = (stats.previousBalance || 0) + (stats.currentApplications || 0) - (stats.toBeRefunded || 0);
        stats.balance = stats.totalApplications - (stats.completed || 0);
        
        const totalApplicationSites = new Map<string, SiteDetailWithFileContext>();
        if (stats.previousBalanceData) {
            stats.previousBalanceData.forEach(site => { 
                const key = `${site.fileNo}-${site.nameOfSite}`; 
                if (!totalApplicationSites.has(key)) totalApplicationSites.set(key, site); 
            });
        }
        if (stats.currentApplicationsData) {
            stats.currentApplicationsData.forEach(site => { 
                const key = `${site.fileNo}-${site.nameOfSite}`; 
                if (!totalApplicationSites.has(key)) totalApplicationSites.set(key, site); 
            });
        }
        
        const toBeRefundedKeys = new Set((stats.toBeRefundedData || []).map(site => `${site.fileNo}-${site.nameOfSite}`));
        toBeRefundedKeys.forEach(key => totalApplicationSites.delete(key));
        stats.totalApplicationsData = Array.from(totalApplicationSites.values());
        
        const completedKeys = new Set((stats.completedData || []).map(site => `${site.fileNo}-${site.nameOfSite}`));
        stats.balanceData = (stats.totalApplicationsData || []).filter(site => !completedKeys.has(`${site.fileNo}-${site.nameOfSite}`));
    };

    const createNestedStructure = (outerKeys: readonly string[], innerKeys: readonly string[]): Record<string, Record<string, ProgressStats>> => {
        const structure: Record<string, Record<string, ProgressStats>> = {};
        outerKeys.forEach(outerKey => {
            structure[outerKey] = {};
            innerKeys.forEach(innerKey => {
                structure[outerKey][innerKey] = initialStats();
            });
        });
        return structure;
    };
    const createSingleStructure = (keys: readonly string[]): Record<string, ProgressStats> => {
        const structure: Record<string, ProgressStats> = {};
        keys.forEach(key => {
            structure[key] = initialStats();
        });
        return structure;
    };

    const progressSummaryData: OtherServiceProgress = {} as OtherServiceProgress;
    REPORTING_PURPOSE_ORDER.forEach(p => { progressSummaryData[p as SitePurpose] = initialStats(); });

    const bwcData = createNestedStructure(uniqueApplicationTypesWithUnassigned, BWC_DIAMETERS);
    const twcData = createNestedStructure(uniqueApplicationTypesWithUnassigned, TWC_DIAMETERS);
    const fpwData = createNestedStructure(uniqueApplicationTypesWithUnassigned, FPW_DIAMETERS);
    
    const UNASSIGNED_WELL_TYPE = 'Other / Unassigned';
    const typeOfWellOptionsWithUnassigned = [...typeOfWellOptions, UNASSIGNED_WELL_TYPE] as const;
    const gwInvestigationData = createNestedStructure(typeOfWellOptionsWithUnassigned, uniqueApplicationTypesWithUnassigned);
    
    const vesData = createSingleStructure(uniqueApplicationTypesWithUnassigned);
    const geologicalLoggingData = createSingleStructure(uniqueApplicationTypesWithUnassigned);
    const geophysicalLoggingData = createSingleStructure(uniqueApplicationTypesWithUnassigned);
    const pumpingTestData = createSingleStructure(uniqueApplicationTypesWithUnassigned);
    
    const otherSchemesData: Record<string, Record<string, ProgressStats>> = {};
    const otherSchemesPurposes: SitePurpose[] = ["BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"];
    otherSchemesPurposes.forEach(p => {
        otherSchemesData[p] = createSingleStructure(uniqueApplicationTypesWithUnassigned);
    });

    includedSites.forEach(siteWithFileContext => {
        const { fileRemittanceDate, ...site } = siteWithFileContext;
        const purpose = site.purpose as SitePurpose;
        const diameter = site.diameter;
        const workStatus = site.workStatus as SiteWorkStatus | undefined;
        const completionDate = safeParseDate(site.dateOfCompletion);
        const applicationType = siteWithFileContext.applicationType || UNASSIGNED_APP_TYPE;
        
        const isCurrentApplicationInPeriod = fileRemittanceDate && isDateFilterActive && isWithinInterval(fileRemittanceDate, { start: sDate!, end: eDate! });
        const isCompletedInPeriod = completionDate && isDateFilterActive && isWithinInterval(completionDate, { start: sDate!, end: eDate! });
        const isToBeRefunded = workStatus && REFUNDED_STATUSES.includes(workStatus);
        const wasActiveBeforePeriod = fileRemittanceDate && isDateFilterActive && isBefore(fileRemittanceDate, sDate!) && (!completionDate || !isBefore(completionDate, sDate!));

        const updateStats = (statsObj: ProgressStats) => {
            if (!statsObj) return;
            if (isCurrentApplicationInPeriod) { statsObj.currentApplications++; statsObj.currentApplicationsData.push(siteWithFileContext); }
            if (wasActiveBeforePeriod) { statsObj.previousBalance++; statsObj.previousBalanceData.push(siteWithFileContext); }
            if (isCompletedInPeriod) { 
                statsObj.completed++; 
                statsObj.completedData.push(siteWithFileContext); 
                
                // Track Feasibility for investigations
                if (purpose === 'GW Investigation' || (LOGGING_PUMPING_TEST_PURPOSE_OPTIONS as readonly string[]).includes(purpose)) {
                    if (site.feasibility === 'Yes') {
                        statsObj.feasible++;
                        statsObj.feasibleData.push(siteWithFileContext);
                    } else if (site.feasibility === 'No') {
                        statsObj.nonFeasible++;
                        statsObj.nonFeasibleData.push(siteWithFileContext);
                    }
                }
            }
            if (isToBeRefunded && fileRemittanceDate && isDateFilterActive && isBefore(fileRemittanceDate, eDate!)) { statsObj.toBeRefunded++; statsObj.toBeRefundedData.push(siteWithFileContext); }
        };

        if (purpose === 'GW Investigation') {
            updateStats(progressSummaryData['GW Investigation']);
            if (site.vesRequired === 'Yes') {
                updateStats(progressSummaryData['VES']);
            }
        } else if (purpose && (PUMPING_TEST_AGGREGATE_PURPOSES as readonly string[]).includes(purpose)) {
             updateStats(progressSummaryData['Pumping test']);
        } else if (purpose && (REPORTING_PURPOSE_ORDER as readonly string[]).includes(purpose)) {
            if (progressSummaryData[purpose]) {
                updateStats(progressSummaryData[purpose]);
            }
        }

        if (applicationType) {
            if (purpose === 'BWC' && diameter && bwcData[applicationType]?.[diameter]) updateStats(bwcData[applicationType][diameter]);
            else if (purpose === 'TWC' && diameter && twcData[applicationType]?.[diameter]) updateStats(twcData[applicationType][diameter]);
            else if (purpose === 'FPW' && diameter && fpwData[applicationType]?.[diameter]) updateStats(fpwData[applicationType][diameter]);
            else if (purpose === 'GW Investigation') {
                const wellType = ((site as any).typeOfWell as TypeOfWell) || UNASSIGNED_WELL_TYPE;
                if (applicationType && gwInvestigationData[wellType]?.[applicationType]) {
                    updateStats(gwInvestigationData[wellType][applicationType]);
                }
                if (site.vesRequired === 'Yes' && vesData[applicationType]) {
                    updateStats(vesData[applicationType]);
                }
            } else if (purpose === "Geological logging") {
                if(geologicalLoggingData[applicationType]) updateStats(geologicalLoggingData[applicationType]);
            } else if (purpose === "Geophysical Logging") {
                if(geophysicalLoggingData[applicationType]) updateStats(geophysicalLoggingData[applicationType]);
            } else if ((PUMPING_TEST_AGGREGATE_PURPOSES as readonly string[]).includes(purpose) && pumpingTestData[applicationType]) {
                updateStats(pumpingTestData[applicationType]);
            } else if (otherSchemesPurposes.includes(purpose) && otherSchemesData[purpose]?.[applicationType]) {
                updateStats(otherSchemesData[purpose][applicationType]);
            }
        }
    });

    Object.values(progressSummaryData).forEach(calculateBalanceAndTotal);
    
    Object.values(gwInvestigationData).forEach(wellTypeData => Object.values(wellTypeData).forEach(calculateBalanceAndTotal));
    Object.values(vesData).forEach(calculateBalanceAndTotal);
    Object.values(geologicalLoggingData).forEach(calculateBalanceAndTotal);
    Object.values(geophysicalLoggingData).forEach(calculateBalanceAndTotal);
    Object.values(pumpingTestData).forEach(calculateBalanceAndTotal);

    uniqueApplicationTypesWithUnassigned.forEach(appType => {
      BWC_DIAMETERS.forEach(d => { if(bwcData[appType]?.[d]) calculateBalanceAndTotal(bwcData[appType][d]) });
      TWC_DIAMETERS.forEach(d => { if(twcData[appType]?.[d]) calculateBalanceAndTotal(twcData[appType][d]) });
      FPW_DIAMETERS.forEach(d => { if(fpwData[appType]?.[d]) calculateBalanceAndTotal(fpwData[appType][d]) });
    });
    Object.values(otherSchemesData).forEach(appTypes => Object.values(appTypes).forEach(calculateBalanceAndTotal));

    const gwInvestigationAggregated: Record<string, ProgressStats> = {};
    Object.entries(gwInvestigationData).forEach(([wellType, appTypeMap]) => {
        const total = initialStats();
        Object.values(appTypeMap).forEach(stats => {
            total.previousBalance += stats.previousBalance;
            total.currentApplications += stats.currentApplications;
            total.toBeRefunded += stats.toBeRefunded;
            total.totalApplications += stats.totalApplications;
            total.completed += stats.completed;
            total.feasible += stats.feasible;
            total.nonFeasible += stats.nonFeasible;
            total.balance += stats.balance;
            total.previousBalanceData.push(...stats.previousBalanceData);
            total.currentApplicationsData.push(...stats.currentApplicationsData);
            total.toBeRefundedData.push(...stats.toBeRefundedData);
            total.totalApplicationsData.push(...stats.totalApplicationsData);
            total.completedData.push(...stats.completedData);
            total.feasibleData.push(...stats.feasibleData);
            total.nonFeasibleData.push(...stats.nonFeasibleData);
            total.balanceData.push(...stats.balanceData);
        });
        gwInvestigationAggregated[wellType] = total;
    });

    const privateFinancialSummaryData: FinancialSummaryReport = {};
    const governmentFinancialSummaryData: FinancialSummaryReport = {};
    const revenueHeadBreakdown: Record<string, { total: number, data: any[] }> = {};
    const revenueHeadCreditData: any[] = [];
    
    const privateEntries = fileEntries.filter(entry => entry.applicationType && PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as any));
    const governmentEntries = fileEntries.filter(entry => !entry.applicationType || !PRIVATE_APPLICATION_TYPES.includes(entry.applicationType as any));
    
    const processFinancialSummary = (entries: DataEntryFormData[], summaryData: FinancialSummaryReport) => {
        const checkDateInRange = (date: any): boolean => {
            if (!isDateFilterActive) return true;
            const d = safeParseDate(date);
            if (!d || !isValid(d) || !sDate || !eDate) return false;
            return isWithinInterval(d, { start: sDate, end: eDate });
        };

        entries.forEach(entry => {
            const purpose = entry.siteDetails?.[0]?.purpose || 'Others';
            if (!revenueHeadBreakdown[purpose]) {
                revenueHeadBreakdown[purpose] = { total: 0, data: [] };
            }

            entry.paymentDetails?.forEach(pd => {
                if (checkDateInRange(pd.dateOfPayment)) {
                    if (!summaryData[purpose]) summaryData[purpose] = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [], paymentData: [] };
                    summaryData[purpose].totalPayment += calculatePaymentEntryTotalGlobal(pd);
                    summaryData[purpose].paymentData.push({ ...pd, fileNo: entry.fileNo, applicantName: entry.applicantName, siteDetails: entry.siteDetails || [] });
                    
                    if (pd.revenueHead && Number(pd.revenueHead) > 0) {
                        const amount = Number(pd.revenueHead);
                        revenueHeadBreakdown[purpose].total += amount;
                        revenueHeadBreakdown[purpose].data.push({ entryId: entry.id, amount });
                        revenueHeadCreditData.push({ entryId: entry.id, amount });
                    }
                }
            });

            // Re-calculate application received/remittance if relevant
            const hasRemittanceInPeriod = entry.remittanceDetails?.some(rd => checkDateInRange(rd.dateOfRemittance));
            if (hasRemittanceInPeriod) {
                if (!summaryData[purpose]) summaryData[purpose] = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [], paymentData: [] };
                summaryData[purpose].totalApplications++;
                summaryData[purpose].applicationData.push(entry);
                entry.remittanceDetails?.forEach(rd => { 
                    if (checkDateInRange(rd.dateOfRemittance)) {
                        const amount = (Number(rd.amountRemitted) || 0);
                        summaryData[purpose].totalRemittance += amount;
                    }
                });
            }

            entry.siteDetails?.forEach(site => {
                const completionDate = safeParseDate(site.dateOfCompletion);
                if (completionDate && isValid(completionDate) && checkDateInRange(completionDate)) {
                    if (!summaryData[purpose]) summaryData[purpose] = { totalApplications: 0, totalRemittance: 0, totalCompleted: 0, totalPayment: 0, applicationData: [], completedData: [], paymentData: [] };
                    summaryData[purpose].totalCompleted++;
                    summaryData[purpose].completedData.push({ ...site, fileNo: entry.fileNo!, applicantName: entry.applicantName!, applicationType: (entry.applicationType || UNASSIGNED_APP_TYPE) as ApplicationType } as SiteDetailWithFileContext);
                }
            });
        });
    };

    processFinancialSummary(privateEntries, privateFinancialSummaryData);
    processFinancialSummary(governmentEntries, governmentFinancialSummaryData);

    const totalRevenueHeadCredit = revenueHeadCreditData.reduce((sum, item) => sum + item.amount, 0);

    setReportData({ 
        bwcData, twcData, fpwData, progressSummaryData, gwInvestigationData, gwInvestigationAggregated, vesData, geologicalLoggingData, geophysicalLoggingData, pumpingTestData, 
        otherSchemesData, privateFinancialSummaryData, governmentFinancialSummaryData,
        totalRevenueHeadCredit, revenueHeadCreditData, revenueHeadBreakdown,
        typeOfWellOptionsWithUnassigned,
    });
    setIsFiltering(false);
  }, [fileEntries, startDate, endDate, toast, uniqueApplicationTypesWithUnassigned]);
  
  useEffect(() => {
    if (!entriesLoading) {
      if (startDate && endDate) {
        handleGenerateReport();
      } else {
        setIsFiltering(false);
        setReportData(null);
      }
    }
  }, [entriesLoading, startDate, endDate, handleGenerateReport]); 

  const handleResetFilters = () => {
    const today = new Date();
    setStartDate(startOfMonth(today));
    setEndDate(endOfMonth(today));
  };
  
  const handleExportExcel = async () => { 
    if (!reportData) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Summary');
    worksheet.addRow(['Service Type', 'Prev Balance', 'Current App', 'Refunded', 'Total App', 'Completed', 'Balance']).font = { bold: true };
    REPORTING_PURPOSE_ORDER.forEach(p => {
        const s = reportData.progressSummaryData[p as SitePurpose];
        if (s && (s.totalApplications > 0 || s.previousBalance > 0)) {
            worksheet.addRow([p, s.previousBalance, s.currentApplications, s.toBeRefunded, s.totalApplications, s.completed, s.balance]);
        }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Fix: Use Blob and anchor instead of downloadjs for better handling of ArrayBuffer
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Progress_Summary_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  
    const handleGeneratePdfReport = async () => {
    if (!reportData) {
      toast({ title: 'No report data to generate PDF.' });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await generateProgressReportPdf(
        reportData,
        officeAddress,
        startDate,
        endDate
      );
      download(pdfBytes, `Progress_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`, 'application/pdf');
      toast({ title: "PDF Generated", description: "Progress report has been downloaded." });
    } catch (error: any) {
      console.error("PDF Generation Error:", error);
      toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };


  const handleCountClick = (data: Array<any>, title: string) => {
    if (!data || data.length === 0) return;
    setDetailDialogTitle(title);

    let columns: DetailDialogColumn[];
    let dialogData: Array<Record<string, any>>;

    const isPaymentData = data[0] && 'paymentAccount' in data[0];
    const isFileLevelData = data[0] && 'siteDetails' in data[0];
    const isRevenueHeadData = title.includes('Revenue Head Credits');
    
    if (isRevenueHeadData) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant' },
            { key: 'siteNames', label: 'Site(s)' },
            { key: 'purposes', label: 'Purpose(s)' },
            { key: 'workStatuses', label: 'Work Status(es)' },
            { key: 'amount', label: 'Credited Amount (₹)', isNumeric: true },
        ];
        
        const relevantFileEntries = fileEntries.filter(entry => data.some((creditItem: any) => creditItem.entryId === entry.id));
        
        dialogData = relevantFileEntries.map((entry, index) => {
            const creditEntry = data.find((creditItem: any) => creditItem.entryId === entry.id);
            const totalCreditForFile = creditEntry ? creditEntry.amount : 0;
            const sites = (entry.siteDetails && entry.siteDetails.length > 0)
                ? entry.siteDetails
                : [{ nameOfSite: 'N/A', purpose: 'N/A', workStatus: entry.fileStatus }];

            return {
                slNo: index + 1,
                fileNo: entry.fileNo,
                applicantName: entry.applicantName,
                siteNames: sites.map(s => s.nameOfSite).join(', '),
                purposes: [...new Set(sites.map(s => s.purpose))].join(', '),
                workStatuses: [...new Set(sites.map(s => s.workStatus))].join(', '),
                amount: totalCreditForFile.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            };
        });

    } else if (isPaymentData) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' },
            { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant Name' },
            { key: 'siteNames', label: 'Site Name(s)' },
            { key: 'purposes', label: 'Purpose(s)' },
            { key: 'workStatuses', label: 'Work Status(es)' },
            { key: 'dateOfPayment', label: 'Payment Date' },
            { key: 'totalPaymentPerEntry', label: 'Amount (₹)', isNumeric: true },
        ];
        dialogData = data.map((payment, index) => ({
            slNo: index + 1,
            fileNo: payment.fileNo,
            applicantName: payment.applicantName,
            siteNames: (payment.siteDetails || []).map((s: any) => s.nameOfSite).join(', ') || 'N/A',
            purposes: [...new Set((payment.siteDetails || []).map((s: any) => s.purpose))].join(', ') || 'N/A',
            workStatuses: [...new Set((payment.siteDetails || []).map((s: any) => s.workStatus))].join(', ') || 'N/A',
            dateOfPayment: payment.dateOfPayment ? format(new Date(payment.dateOfPayment), 'dd/MM/yyyy') : 'N/A',
            totalPaymentPerEntry: (Number(payment.totalPaymentPerEntry) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        }));
    } else if (isFileLevelData) {
        columns = [
            { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
            { key: 'applicantName', label: 'Applicant Name' }, { key: 'siteName', label: 'Site Name' },
            { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' },
            { key: 'remittedAmount', label: 'Remitted (₹)', isNumeric: true }, { key: 'remittanceDate', label: 'First Remittance' }
        ];

        dialogData = (data as DataEntryFormData[]).flatMap((entry, entryIndex) => 
            (entry.siteDetails && entry.siteDetails.length > 0 ? entry.siteDetails : [{nameOfSite: 'N/A', purpose: 'N/A', workStatus: 'N/A'}]).map((site, siteIndex) => ({
                slNo: `${entryIndex + 1}.${siteIndex + 1}`,
                fileNo: entry.fileNo, applicantName: entry.applicantName,
                siteName: site.nameOfSite, purpose: site.purpose, workStatus: site.workStatus,
                remittedAmount: (Number(entry.totalRemittance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                remittanceDate: entry.remittanceDetails?.[0]?.dateOfRemittance ? format(new Date(entry.remittanceDetails[0].dateOfRemittance), 'dd/MM/yyyy') : 'N/A'
            }))
        ).map((item, index) => ({...item, slNo: index + 1}));
    } else {
         columns = [ { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' }, { key: 'applicantName', label: 'Applicant' }, { key: 'nameOfSite', label: 'Site Name' }, { key: 'purpose', label: 'Purpose' }, { key: 'workStatus', label: 'Work Status' }, ];
         dialogData = (data as SiteDetailWithFileContext[]).map((site, index) => ({ slNo: index + 1, fileNo: site.fileNo, applicantName: site.applicantName, nameOfSite: site.nameOfSite, purpose: site.purpose, workStatus: site.workStatus, id: (site as any).id }));
    }
    
    setDetailDialogColumns(columns);
    setDetailDialogData(dialogData);
    setIsDetailDialogOpen(true);
  };
  
  const handleFinancialTotalClick = (type: 'applications' | 'remittance' | 'completed' | 'payment', financialData: FinancialSummaryReport, category: string) => {
      const allData = Object.values(financialData);
      let aggregatedData: any[] = [];
      let title = '';
  
      if (type === 'applications' || type === 'remittance') {
          aggregatedData = allData.flatMap(d => d.applicationData);
          title = `All Remitted Applications (${category})`;
      } else if (type === 'completed') {
          aggregatedData = allData.flatMap(d => d.completedData);
          title = `All Completed Works (${category})`;
      } else if (type === 'payment') {
          aggregatedData = allData.flatMap(d => d.paymentData || []);
          title = `All Payments (${category})`;
      }
      
      if (aggregatedData.length > 0) {
          handleCountClick(aggregatedData, title);
      }
  };


    const {
        gwInvestigationBalance, vesBalance, pumpingTestBalance,
        geologicalLoggingBalance, geophysicalLoggingBalance,
        bwc110Balance, bwc150Balance, twc150Balance, twc200Balance, fpwBalance
      } = useMemo(() => {
          if (!reportData) return {};
          const calculateTotalBalanceForDiameter = (data: Record<string, any> = {}, diameter: string) => Object.values(data).reduce((acc, stats) => acc + ((stats as any)[diameter]?.balance || 0), 0);
          
          return {
              gwInvestigationBalance: reportData.progressSummaryData['GW Investigation']?.balance || 0,
              vesBalance: reportData.progressSummaryData['VES']?.balance || 0,
              pumpingTestBalance: reportData.progressSummaryData['Pumping test']?.balance || 0,
              geologicalLoggingBalance: reportData.progressSummaryData['Geological logging']?.balance || 0,
              geophysicalLoggingBalance: reportData.progressSummaryData['Geophysical Logging']?.balance || 0,
              bwc110Balance: calculateTotalBalanceForDiameter(reportData.bwcData, "110 mm (4.5”)"),
              bwc150Balance: calculateTotalBalanceForDiameter(reportData.bwcData, "150 mm (6”)"),
              twc150Balance: calculateTotalBalanceForDiameter(reportData.twcData, "150 mm (6”)"),
              twc200Balance: calculateTotalBalanceForDiameter(reportData.twcData, "200 mm (8”)"),
              fpwBalance: calculateTotalBalanceForDiameter(reportData.fpwData, "110 mm (4.5”)"),
          };
      }, [reportData]);

  const handleFileNoClick = (row: any) => {
    const userRole = user?.role;
    if (userRole === 'superAdmin' || userRole === 'investigator' || userRole === 'supervisor') {
        return;
    }

    const fileNo = row.fileNo;
    if (!fileNo || fileNo === 'N/A' || fileNo === '-') return;

    // Check if it's an ARS Scheme (from module)
    if (row.applicantName === 'ARS Scheme' && row.id) {
      window.open(`/dashboard/ars/entry?id=${row.id}`, '_blank');
      return;
    }

    // Find the entry in the existing fileEntries
    const entry = fileEntries.find(e => e.fileNo === fileNo);
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
      
      window.open(`/dashboard/data-entry?${queryParams.toString()}`, '_blank');
      return;
    }

    toast({ title: "Record Not Found", description: "The source record for this File No could not be identified.", variant: "destructive" });
  };
  
  const userRole = user?.role;
  const isFileNoClickable = userRole !== 'superAdmin' && userRole !== 'investigator' && userRole !== 'supervisor';

  if (entriesLoading) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <Card className="shadow-lg bg-background no-print">
          <CardHeader>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4">
                <Input 
                    type="date" 
                    id="progress-report-start-date"
                    name="progressReportStartDate"
                    placeholder="From Date" 
                    className="w-full sm:w-auto" 
                    value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} 
                    onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} 
                />
                <Input 
                    type="date" 
                    id="progress-report-end-date"
                    name="progressReportEndDate"
                    placeholder="To Date" 
                    className="w-full sm:w-auto" 
                    value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} 
                    onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)} 
                />
                <Button onClick={handleGenerateReport} disabled={isFiltering || !startDate || !endDate}><Play className="mr-2 h-4 w-4" />Generate</Button>
                <Button onClick={handleResetFilters} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0"><XCircle className="mr-2 h-4 w-4" />Clear</Button>
                <Button onClick={handleExportExcel} disabled={!reportData || isFiltering} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0"><FileDown className="mr-2 h-4 w-4" />Export</Button>
                <Button onClick={handleGeneratePdfReport} disabled={!reportData || isFiltering || isGeneratingPdf} variant="outline" className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                  {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  Progress Report
                </Button>
            </div>
          </CardHeader>
      </Card>
      
      <ScrollArea className="flex-1">
        <div className="space-y-8 pr-4">
            {isFiltering ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Generating reports...</p></div>
            ) : reportData ? (
            <>
                <Card className="shadow-lg">
                    <CardHeader><CardTitle>Progress Summary (Aggregate)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="relative overflow-x-auto">
                            <Table className="min-w-full border-collapse">
                            <TableHeader><TableRow><TableHead className="border p-2 align-middle text-center font-semibold">Service Type</TableHead><TableHead className="border p-2 text-center font-semibold">Previous Balance</TableHead><TableHead className="border p-2 text-center font-semibold">Current Application</TableHead><TableHead className="border p-2 text-center font-semibold">To be refunded</TableHead><TableHead className="border p-2 text-center font-bold">Total Application</TableHead><TableHead className="border p-2 text-center font-semibold">Completed</TableHead><TableHead className="border p-2 text-center font-bold">Balance</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {REPORTING_PURPOSE_ORDER.map(purpose => {
                                const stats = reportData.progressSummaryData[purpose as SitePurpose];
                                if (!stats) return null;
                                const isVisible = (stats.totalApplications > 0 || stats.previousBalance > 0 || (["GW Investigation", "VES", "Pumping test", "Geological logging", "Geophysical Logging", "BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"] as const).includes(purpose));
                                if (!isVisible) return null;

                                return (
                                    <TableRow key={purpose}>
                                        <TableCell className="border p-2 font-medium">
                                            {purpose === 'Pumping test' ? 'Pumping Test (Agg.)' : 
                                             purpose === 'Geological logging' ? 'Geological Logging' :
                                             purpose}
                                        </TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.previousBalance === 0} onClick={() => handleCountClick(stats.previousBalanceData, `${purpose} - Previous Balance`)}>{stats?.previousBalance || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.currentApplications === 0} onClick={() => handleCountClick(stats.currentApplicationsData, `${purpose} - Current Applications`)}>{stats?.currentApplications || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.toBeRefunded === 0} onClick={() => handleCountClick(stats.toBeRefundedData, `${purpose} - To be Refunded`)}>{stats?.toBeRefunded || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.totalApplications === 0} onClick={() => handleCountClick(stats.totalApplicationsData, `Site Details for ${purpose} Applications`)}>{stats?.totalApplications || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center"><Button variant="link" className="p-0 h-auto" disabled={stats?.completed === 0} onClick={() => handleCountClick(stats.completedData, `${purpose} - Completed`)}>{stats?.completed || 0}</Button></TableCell>
                                        <TableCell className="border p-2 text-center font-bold"><Button variant="link" className="p-0 h-auto font-bold" disabled={stats?.balance === 0} onClick={() => handleCountClick(stats.balanceData, `${purpose} - Balance`)}>{stats?.balance || 0}</Button></TableCell>
                                    </TableRow>
                                )})}
                            </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                    <ReportCategoryTable accordionId="gw-investigation" title={`GW Investigation (Balance - ${gwInvestigationBalance || 0})`} data={reportData.gwInvestigationAggregated} categoryKeys={reportData.typeOfWellOptionsWithUnassigned} categoryLabels={Object.fromEntries(reportData.typeOfWellOptionsWithUnassigned.map((o: string) => [o,o]))} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="ves" title={`VES (Balance - ${vesBalance || 0})`} data={reportData.vesData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="pumping-test" title={`Pumping Test (Balance - ${pumpingTestBalance || 0})`} data={reportData.pumpingTestData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="geo-logging" title={`Geological Logging (Balance - ${geologicalLoggingBalance || 0})`} data={reportData.geologicalLoggingData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="geophys-logging" title={`Geophysical Logging (Balance - ${geophysicalLoggingBalance || 0})`} data={reportData.geophysicalLoggingData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                </Accordion>

                <Accordion type="multiple" className="w-full space-y-4" defaultValue={[]}>
                    <ReportCategoryTable accordionId="bwc-110" title={`BWC - 110 mm (4.5”) (Balance - ${bwc110Balance || 0})`} diameter="110 mm (4.5”)" data={reportData.bwcData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="bwc-150" title={`BWC - 150 mm (6”) (Balance - ${bwc150Balance || 0})`} diameter="150 mm (6”)" data={reportData.bwcData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="twc-150" title={`TWC - 150 mm (6”) (Balance - ${twc150Balance || 0})`} diameter="150 mm (6”)" data={reportData.twcData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="twc-200" title={`TWC - 200 mm (8”) (Balance - ${twc200Balance || 0})`} diameter="200 mm (8”)" data={reportData.twcData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                    <ReportCategoryTable accordionId="fpw" title={`FPW (Balance - ${fpwBalance || 0})`} diameter="110 mm (4.5”)" data={reportData.fpwData} categoryKeys={uniqueApplicationTypesWithUnassigned} categoryLabels={applicationTypeDisplayMapWithUnassigned} onCountClick={handleCountClick} alwaysVisible />
                </Accordion>

                <Card>
                    <CardHeader><CardTitle>Financial Summary - Private Applications</CardTitle><CardDescription>A summary of financial and application counts for each purpose within the selected period.</CardDescription></CardHeader>
                    <CardContent><FinancialSummaryTable data={reportData.privateFinancialSummaryData} onCellClick={(dataType, purpose, data, title) => handleCountClick(data, title)} onTotalClick={(type) => handleFinancialTotalClick(type, reportData.privateFinancialSummaryData, "Private")} category="Private" /></CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Financial Summary - Government & Other Applications</CardTitle><CardDescription>A summary of financial and application counts for each purpose within the selected period.</CardDescription></CardHeader>
                    <CardContent><FinancialSummaryTable data={reportData.governmentFinancialSummaryData} onCellClick={(dataType, purpose, data, title) => handleCountClick(data, title)} onTotalClick={(type) => handleFinancialTotalClick(type, reportData.governmentFinancialSummaryData, "Government")} category="Government" /></CardContent>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="revenue-head" className="border rounded-lg bg-background/50 shadow-inner overflow-hidden">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]]:border-b">
                            <div className="flex items-center justify-between w-full pr-4">
                                <span className="text-lg font-semibold flex items-center gap-2">
                                    <Landmark className="h-5 w-5 text-primary" />
                                    Revenue Head Summary (Payment Details Only)
                                </span>
                                <span className="text-lg font-bold font-mono text-green-600 ml-4">
                                    ₹{reportData.totalRevenueHeadCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="pl-6">Purpose</TableHead>
                                        <TableHead className="text-right pr-6">Amount Credited (₹)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(reportData.revenueHeadBreakdown as Record<string, { total: number; data: any[] }>)
                                        .filter(([_, data]) => data.total > 0)
                                        .sort((a: [string, any], b: [string, any]) => b[1].total - a[1].total)
                                        .map(([purpose, data]) => (
                                            <TableRow key={purpose}>
                                                <TableCell className="font-medium pl-6">{purpose}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button variant="link" className="text-green-600 p-0 h-auto font-bold font-mono" onClick={() => handleCountClick(data.data, `Revenue Head Credits - ${purpose}`)}>
                                                        ₹{data.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    }
                                    {reportData.totalRevenueHeadCredit === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-4 text-muted-foreground italic">No credits to Revenue Head found for this period.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-muted/50">
                                        <TableCell className="font-bold pl-6">Total Credited to Revenue Head</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="link" className="text-green-600 p-0 h-auto text-lg font-bold font-mono" onClick={() => handleCountClick(reportData.revenueHeadCreditData, 'Revenue Head Credits')} disabled={reportData.totalRevenueHeadCredit === 0}>
                                                ₹{reportData.totalRevenueHeadCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
                </Card>
            </>
            ) : (
                <div className="flex items-center justify-center py-10 border-2 border-dashed rounded-lg"><p className="text-muted-foreground">Select a date range and click &quot;Generate Report&quot; to view progress.</p></div>
            )}
        </div>
      </ScrollArea>
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-4xl flex flex-col h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>{detailDialogTitle}</DialogTitle>
            <DialogDescription>Showing {detailDialogData.length} records.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 py-4">
            <ScrollArea className="h-full pr-4 -mr-4">
              {detailDialogData.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {detailDialogColumns.map(col => <TableHead key={col.key} className={cn(col.isNumeric && 'text-right')}>{col.label}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailDialogData.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {detailDialogColumns.map(col => (
                          <TableCell key={col.key} className={cn('text-xs', col.isNumeric && 'text-right font-mono')}>
                            {col.key === 'fileNo' && isFileNoClickable ? (
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-mono text-xs text-primary font-bold hover:underline" 
                                onClick={() => handleFileNoClick(row)}
                              >
                                {(row as any)[col.key]}
                              </Button>
                            ) : (
                              (row as any)[col.key]
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">No details found for this selection.</p>
              )}
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t">
              <DialogClose asChild>
                  <Button type="button" variant="secondary">Close</Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return null;
  }
  let displayValue = String(value);
  const isDate = label.toLowerCase().includes('date') || label.toLowerCase().includes('validity');
  if (isDate) {
      const date = safeParseDate(value);
      displayValue = date ? format(date, 'dd/MM/yyyy') : 'N/A';
  } else if (typeof value === 'number') {
      displayValue = value.toLocaleString('en-IN');
  }
  return (
      <div className="flex flex-col">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="text-sm font-semibold">{displayValue}</dd>
      </div>
  );
};
