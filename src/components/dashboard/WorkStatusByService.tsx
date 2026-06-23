
// src/components/dashboard/WorkStatusByService.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { DataEntryFormData, SitePurpose, SiteWorkStatus, UserRole, ApplicationType, TypeOfWell } from '@/lib/schemas';
import { 
    siteWorkStatusOptions, 
    sitePurposeOptions, 
    typeOfWellOptions,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
    INVESTIGATION_WORK_STATUS_OPTIONS,
    LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS
} from '@/lib/schemas';
import { cn } from "@/lib/utils";
import { Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// Service/Purpose orderings for different tables
const depositWorkServiceOrder: SitePurpose[] = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR", "ARS"];
const gwInvestigationServiceOrder: TypeOfWell[] = ["Open Well", "Bore Well", "Tube Well", "Filter Point Well"];
const loggingPumpingTestServiceOrder = LOGGING_PUMPING_TEST_PURPOSE_OPTIONS;

// Header labels for tables
const depositWorkHeaderLabels: Record<string, string> = {
    'BWC': 'BWC', 'TWC': 'TWC', 'FPW': 'FPW', 'BW Dev': 'BW<br/>Dev', 'TW Dev': 'TW<br/>Dev',
    'FPW Dev': 'FPW<br/>Dev', 'MWSS': 'MWSS', 'MWSS Ext': 'MWSS<br/>Ext', 'Pumping Scheme': 'Pumping<br/>Scheme',
    'MWSS Pump Reno': 'MWSS<br/>Pump<br/>Reno', 'HPS': 'HPS', 'HPR': 'HPR', 'ARS': 'ARS',
};

// Filtered status options for Deposit Works tab as requested
const DEPOSIT_WORK_STATUS_OPTIONS = [
  "Under Process",
  "Additional Fund Awaited",
  "TS Pending",
  "Refund Pending",
  "Department Rig Allotted",
  "Tendered",
  "Selection Notice Issued",
  "Work Order Issued",
  "Work in Progress",
  "Work Failed",
  "Work Cancelled",
  "Work Completed"
] as const;

interface WorkStatusRow {
  statusCategory: string;
  total: { count: number; data: any[] };
  [service: string]: any; // Allows dynamic service keys
}

interface WorkStatusByServiceProps {
  allFileEntries: DataEntryFormData[];
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
  currentUserRole?: UserRole;
}

const ReportTable = ({ data, serviceOrder, serviceLabels, onCellClick }: { data: WorkStatusRow[], serviceOrder: readonly string[], serviceLabels: Record<string,string>, onCellClick: (data: any[], title: string) => void }) => (
    <div className="w-full overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="font-semibold p-2 min-w-[200px]">Work Category</TableHead>
                    {[...serviceOrder, 'Total'].map(service => (
                        <TableHead key={service} className={cn("text-center font-semibold p-1", service === 'Total' && 'text-primary bg-primary/10')} dangerouslySetInnerHTML={{ __html: service === 'Total' ? service : (serviceLabels[service] || service) }} />
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row) => {
                    const isTotalRow = row.statusCategory === "Total No. of Works/Files";
                    return (
                        <TableRow key={row.statusCategory} className={cn(isTotalRow && 'bg-primary/10 hover:bg-primary/20')}>
                            <TableCell className={cn("font-medium p-2 whitespace-normal break-words", isTotalRow && 'text-primary font-bold')}>{row.statusCategory}</TableCell>
                            {serviceOrder.map(service => (
                                <TableCell key={service} className={cn("text-center p-2", isTotalRow && "font-bold")}>
                                    {(row as any)[service].count > 0 ? (
                                        <Button variant="link" className={cn("p-0 h-auto font-semibold", isTotalRow && 'font-bold text-primary')} onClick={() => onCellClick((row as any)[service].data, `${row.statusCategory} - ${service}`)}>{(row as any)[service].count}</Button>
                                    ) : (0)}
                                </TableCell>
                            ))}
                            <TableCell className="text-center p-2 font-bold bg-primary/10 text-primary">
                                {(row as any)['total'].count > 0 ? (
                                    <Button variant="link" className="p-0 h-auto font-bold text-primary" onClick={() => onCellClick((row as any)['total'].data, `${row.statusCategory} - Total`)}>{(row as any)['total'].count}</Button>
                                ) : (0)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    </div>
);

export default function WorkStatusByService({ allFileEntries, onOpenDialog, currentUserRole }: WorkStatusByServiceProps) {
    const { depositWorksData, gwInvestigationData, loggingPumpingTestData } = useMemo(() => {
        const depositWorkEntries: DataEntryFormData[] = [];
        const gwInvestigationEntries: DataEntryFormData[] = [];
        const loggingPumpingTestEntries: DataEntryFormData[] = [];

        for (const entry of allFileEntries) {
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
        
        const processData = (entries: DataEntryFormData[], serviceOrder: readonly string[], workStatusOrder: readonly string[], serviceKey: 'purpose' | 'typeOfWell') => {
            const totalApplicationsRow = "Total No. of Works/Files";
            const reorderedRowLabels = [...workStatusOrder, totalApplicationsRow];

            const initialWorkStatusData: WorkStatusRow[] = reorderedRowLabels.map(statusCategory => {
                const serviceCounts: { [service: string]: { count: number, data: any[] } } = {};
                serviceOrder.forEach(service => {
                    serviceCounts[service] = { count: 0, data: [] };
                });
                return { statusCategory, ...serviceCounts, total: { count: 0, data: [] } };
            });

            for (const entry of entries) {
                entry.siteDetails?.forEach(sd => {
                    const siteData = { ...sd, fileNo: entry.fileNo, applicantName: entry.applicantName };
                    const serviceValue = sd[serviceKey] as string;
                    if (serviceValue && sd.workStatus && serviceOrder.includes(serviceValue)) {
                        const workStatusRow = initialWorkStatusData.find(row => row.statusCategory === sd.workStatus);
                        if (workStatusRow) {
                            workStatusRow[serviceValue].count++;
                            workStatusRow[serviceValue].data.push(siteData);
                            workStatusRow.total.count++;
                            workStatusRow.total.data.push(siteData);
                        }
                    }
                });
            }
            
            const totalAppsRow = initialWorkStatusData.find(row => row.statusCategory === totalApplicationsRow);
            if (totalAppsRow) {
                serviceOrder.forEach(service => {
                    let columnTotal = 0;
                    const columnData: any[] = [];
                    initialWorkStatusData.forEach(row => {
                        if (row.statusCategory !== totalApplicationsRow) {
                            const serviceData = (row as any)[service];
                            columnTotal += serviceData.count;
                            columnData.push(...serviceData.data);
                        }
                    });
                    (totalAppsRow as any)[service].count = columnTotal;
                    (totalAppsRow as any)[service].data = columnData;
                });
                let grandTotalCount = 0;
                const grandTotalData: any[] = [];
                initialWorkStatusData.forEach(row => {
                    if (row.statusCategory !== totalApplicationsRow) {
                        grandTotalCount += (row as any).total.count;
                        grandTotalData.push(...(row as any).total.data);
                    }
                });
                (totalAppsRow as any).total.count = grandTotalCount;
                (totalAppsRow as any).total.data = grandTotalData;
            }

            let finalData = initialWorkStatusData;
            if (currentUserRole === 'supervisor') {
                finalData = initialWorkStatusData.filter(row => row.total.count > 0 || row.statusCategory === totalApplicationsRow);
            }
            return finalData;
        };
        
        return {
            depositWorksData: processData(depositWorkEntries, depositWorkServiceOrder, DEPOSIT_WORK_STATUS_OPTIONS, 'purpose'),
            gwInvestigationData: processData(gwInvestigationEntries, gwInvestigationServiceOrder, INVESTIGATION_WORK_STATUS_OPTIONS, 'typeOfWell'),
            loggingPumpingTestData: processData(loggingPumpingTestEntries, loggingPumpingTestServiceOrder, LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS, 'purpose'),
        };

    }, [allFileEntries, currentUserRole]);

  const handleCellClick = (data: any[], title: string) => {
    const dialogData = data.map((site, index) => ({
      slNo: index + 1,
      fileNo: site.fileNo,
      applicantName: site.applicantName,
      siteName: site.nameOfSite,
      purpose: site.purpose || site.typeOfWell,
      workStatus: site.workStatus
    }));
    const columns = [
      { key: 'slNo', label: 'Sl. No.' },
      { key: 'fileNo', label: 'File No.' },
      { key: 'applicantName', label: 'Applicant Name' },
      { key: 'siteName', label: 'Site Name' },
      { key: 'purpose', label: 'Purpose/Type' },
      { key: 'workStatus', label: 'Work Status' }
    ];
    onOpenDialog(dialogData, title, columns, 'detail');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Work Status by Service</CardTitle>
        <CardDescription>Breakdown of application statuses across different service categories. Click on a number to see detailed reports.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">Deposit Works</TabsTrigger>
            <TabsTrigger value="gwInvestigation">GW Investigation</TabsTrigger>
            <TabsTrigger value="loggingPumpingTest">Logging &amp; Pumping</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit" className="mt-4">
            <ReportTable
              data={depositWorksData}
              serviceOrder={depositWorkServiceOrder}
              serviceLabels={depositWorkHeaderLabels}
              onCellClick={handleCellClick}
            />
          </TabsContent>
          <TabsContent value="gwInvestigation" className="mt-4">
             <ReportTable
              data={gwInvestigationData}
              serviceOrder={gwInvestigationServiceOrder}
              serviceLabels={{}} // Use direct value as label
              onCellClick={handleCellClick}
            />
          </TabsContent>
          <TabsContent value="loggingPumpingTest" className="mt-4">
             <ReportTable
              data={loggingPumpingTestData}
              serviceOrder={loggingPumpingTestServiceOrder}
              serviceLabels={{}} // Use direct value as label
              onCellClick={handleCellClick}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
