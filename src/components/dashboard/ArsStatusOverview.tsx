
// src/components/dashboard/ArsStatusOverview.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, isValid, isWithinInterval, parse, parseISO } from 'date-fns';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { arsWorkStatusOptions, arsTypeOfSchemeOptions, type ArsStatus } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

// Inline SVG components with corrected viewBox
const Waves = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
);
const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);
const CheckCircle2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const Wrench = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
);
const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const Hammer = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.92a2.29 2.29 0 0 1-.17 3.23l-2.48 2.48a2.29 2.29 0 0 1-3.23-.17L2 15h6.83a2 2 0 0 0 1.42-.59L15 12Z"/></svg>
);
const Construction = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14V6"/><path d="M14 14V6"/></svg>
);
const FileText = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
);
const DollarSign = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);


interface ArsStatusOverviewProps {
  onOpenDialog: (data: any[], title: string, columns: any[], type: 'detail') => void;
  dates: { start?: Date, end?: Date };
  onSetDates: (dates: { start?: Date, end?: Date }) => void;
}

const statusIcons: { [key: string]: React.ElementType } = {
  "Proposal Submitted": FileText,
  "AS & TS Issued": FileText,
  "Tendered": Hammer,
  "Selection Notice Issued": FileText,
  "Work Order Issued": Hammer,
  "Work in Progress": Wrench,
  "Work Failed": AlertTriangle,
  "Work Completed": CheckCircle2,
};

export default function ArsStatusOverview({ onOpenDialog, dates, onSetDates }: ArsStatusOverviewProps) {
  const { arsEntries, isLoading } = useArsEntries();
  const [schemeTypeFilter, setSchemeTypeFilter] = useState<string>('all');

  const arsDashboardData = useMemo(() => {
    const sDate = dates.start ? startOfDay(dates.start) : null;
    const eDate = dates.end ? endOfDay(dates.end) : null;
  
    let filteredSites = arsEntries.filter(site => site.arsStatus !== 'Work Cancelled');

    // Filter by Scheme Type first
    if (schemeTypeFilter !== 'all') {
      filteredSites = filteredSites.filter(site => site.arsTypeOfScheme === schemeTypeFilter);
    }
  
    // Then filter by date
    if (sDate || eDate) {
        filteredSites = filteredSites.filter(site => {
            if (!site.dateOfCompletion) return false;
            const completionDate = site.dateOfCompletion ? parseISO(site.dateOfCompletion as unknown as string) : null;
            if (!completionDate || !isValid(completionDate)) return false;

            if (sDate && eDate) return isWithinInterval(completionDate, { start: sDate, end: eDate });
            if (sDate) return completionDate >= sDate;
            if (eDate) return completionDate <= eDate;
            return false;
      });
    }

    const arsStatusCounts = new Map<ArsStatus, { count: number, data: ArsEntry[], expenditure: number }>();
    (arsWorkStatusOptions || []).forEach(status => arsStatusCounts.set(status, { count: 0, data: [], expenditure: 0 }));
  
    let totalExpenditure = 0;
  
    filteredSites.forEach(site => {
      if (site.arsStatus && arsStatusCounts.has(site.arsStatus)) {
        const current = arsStatusCounts.get(site.arsStatus)!;
        current.count++;
        current.data.push(site);
        const siteExpenditure = Number(site.totalExpenditure) || 0;
        current.expenditure += siteExpenditure;
        totalExpenditure += siteExpenditure;
      }
    });
  
    const statusOrder = Array.from(arsWorkStatusOptions || []);
    const arsStatusCountsData = Array.from(arsStatusCounts.entries())
      .map(([status, { count, data, expenditure }]) => ({ status, count, data, expenditure }))
      .filter(item => item.count > 0)
      .sort((a,b) => {
          const indexA = statusOrder.indexOf(a.status);
          const indexB = statusOrder.indexOf(b.status);
          return indexA - indexB;
      });
  
    return {
      totalArsSites: filteredSites.length,
      totalArsExpenditure: totalExpenditure,
      arsStatusCountsData,
      allArsSites: filteredSites,
    };
  }, [arsEntries, dates, schemeTypeFilter]);

  const handleWorkStatusCellClick = (data: ArsEntry[], title: string) => {
    const dialogData = data.map((site, index) => ({
      slNo: index + 1,
      id: site.id,
      fileNo: site.fileNo,
      applicantName: 'ARS Scheme',
      siteName: site.nameOfSite,
      purpose: site.arsTypeOfScheme,
      workStatus: site.arsStatus,
      supervisorName: site.supervisorName || 'N/A'
    }));
    const columns = [
      { key: 'slNo', label: 'Sl. No.' }, { key: 'fileNo', label: 'File No.' },
      { key: 'siteName', label: 'Site Name' }, { key: 'purpose', label: 'Type of Scheme' },
      { key: 'workStatus', label: 'Work Status' }, { key: 'supervisorName', label: 'Supervisor' }
    ];
    onOpenDialog(dialogData, title, columns, 'detail');
  };

  return (
     <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Waves className="h-5 w-5 text-primary" />ARS Status Overview</CardTitle>
        <CardDescription>Current count of ARS sites by their work status.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
              <div className="p-6 pt-0">
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t mb-6">
                    <Select value={schemeTypeFilter} onValueChange={setSchemeTypeFilter} name="arsSchemeFilter">
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Filter by Type of Scheme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Scheme Types</SelectItem>
                        {arsTypeOfSchemeOptions.map((scheme) => (
                          <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                        type="date"
                        id="ars-overview-start-date"
                        name="arsOverviewStartDate"
                        className="w-[240px]"
                        value={dates.start ? format(dates.start, 'yyyy-MM-dd') : ''}
                        onChange={(e) => onSetDates({ ...dates, start: e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined })}
                    />
                    <Input
                        type="date"
                        id="ars-overview-end-date"
                        name="arsOverviewEndDate"
                        className="w-[240px]"
                        value={dates.end ? format(dates.end, 'yyyy-MM-dd') : ''}
                        onChange={(e) => onSetDates({ ...dates, end: e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined })}
                    />
                  <Button onClick={() => { onSetDates({ start: undefined, end: undefined }); setSchemeTypeFilter('all'); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4" />Clear Filters</Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <button onClick={() => handleWorkStatusCellClick(arsDashboardData?.allArsSites ?? [], 'All ARS Sites')} disabled={(arsDashboardData?.totalArsSites ?? 0) === 0} className="p-4 border rounded-lg bg-blue-50/10 text-center hover:bg-blue-50/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <p className="text-sm font-medium text-blue-600">Total ARS Sites</p>
                        <p className="text-4xl font-bold text-blue-700">{arsDashboardData?.totalArsSites ?? 0}</p>
                    </button>
                    <button disabled className="p-4 border rounded-lg bg-green-50/10 text-center disabled:opacity-50 disabled:cursor-not-allowed">
                        <p className="text-sm font-medium text-green-600">Total Expenditure</p>
                        <p className="text-3xl font-bold text-green-700 font-mono">₹{(arsDashboardData?.totalArsExpenditure ?? 0).toLocaleString('en-IN')}</p>
                    </button>
                </div>
                {arsDashboardData && arsDashboardData.arsStatusCountsData.length > 0 ? (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {arsDashboardData.arsStatusCountsData.map((item) => {
                            const Icon = statusIcons[item.status] || FileText;
                            return (
                                <button key={item.status} onClick={() => handleWorkStatusCellClick(item.data, `ARS - ${item.status}`)} disabled={item.count === 0} className="flex items-start gap-4 p-4 border rounded-lg text-left hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Icon className="h-6 w-6 text-muted-foreground mt-1" />
                                    <div>
                                        <p className="text-2xl font-bold">{item.count}</p>
                                        <p className="text-sm font-medium text-muted-foreground">{item.status}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-10 mt-6 text-center border-dashed border-2 rounded-lg"><p className="text-muted-foreground">No ARS sites found {dates.start || dates.end || schemeTypeFilter !== 'all' ? "for the selected filters" : ""}.</p></div>
                )}
              </div>
          </ScrollArea>
      </CardContent>
    </Card>
  );
}
