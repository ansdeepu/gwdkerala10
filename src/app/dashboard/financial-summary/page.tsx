// src/app/dashboard/financial-summary/page.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { usePageHeader } from '@/hooks/usePageHeader';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parseISO, parse } from 'date-fns';
import { cn } from "@/lib/utils";
import type { DataEntryFormData, SitePurpose, SiteWorkStatus, ApplicationType, SiteDetailFormData } from '@/lib/schemas';
import { sitePurposeOptions, PLAN_FUND_APPLICATION_TYPES, COLLECTOR_APPLICATION_TYPES, PUBLIC_DEPOSIT_APPLICATION_TYPES, PRIVATE_APPLICATION_TYPES } from '@/lib/schemas';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDataStore } from '@/hooks/use-data-store';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);
const Landmark = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
);

interface SiteDetailWithFileContext extends SiteDetailFormData {
  fileNo: string;
  applicantName: string;
  applicationType: ApplicationType;
  fileRemittanceDate?: Date | null;
}

interface FinancialSummary {
  totalApplications: number;
  totalRemittance: number;
  totalCompleted: number;
  totalPayment: number;
  applicationData: DataEntryFormData[]; 
  completedData: SiteDetailWithFileContext[];
  paymentData: any[]; // To hold detailed payment records
}
type FinancialSummaryReport = Record<string, FinancialSummary>;

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


export default function FinancialSummaryPage() {
    const { setHeader } = usePageHeader();
    const { user } = useAuth();
    const { allFileEntries, isLoading: entriesLoading } = useDataStore();
    const { toast } = useToast();
    
    const [financeStartDate, setFinanceStartDate] = useState<Date | undefined>(undefined);
    const [financeEndDate, setFinanceEndDate] = useState<Date | undefined>(undefined);
    
    useEffect(() => {
        setHeader('Financial Summary', 'An overview of financial metrics including credits, debits, and balances.');
    }, [setHeader]);


    const transformedFinanceMetrics = useMemo(() => {
        if (entriesLoading) return null;
    
        const sDate = financeStartDate ? startOfDay(financeStartDate) : null;
        const eDate = financeEndDate ? endOfDay(financeEndDate) : null;
        const isDateFilterActive = !!sDate && !!eDate;

        let sbiCredit = 0, stsbCredit = 0, revenueHeadCreditDirect = 0;
        let sbiDebit = 0, stsbDebit = 0;
        let planFundDeferredAmount = 0;
        let collectorFundDeferredAmount = 0;
        let planFundExpenditure = 0;
        let collectorFundExpenditure = 0;

        const operationalAccountEntries = allFileEntries.filter(e => {
            const appType = e.applicationType as ApplicationType;
            return PUBLIC_DEPOSIT_APPLICATION_TYPES.includes(appType as any) || PRIVATE_APPLICATION_TYPES.includes(appType as any) || !appType;
        });

        const adminSanctionEntries = allFileEntries.filter(e => {
            const appType = e.applicationType as ApplicationType;
            return appType && (COLLECTOR_APPLICATION_TYPES.includes(appType as any) || PLAN_FUND_APPLICATION_TYPES.includes(appType as any));
        });

        operationalAccountEntries.forEach((entry: DataEntryFormData) => {
          entry.remittanceDetails?.forEach(rd => {
            const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
            const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && isWithinInterval(remittedDate, { start: sDate!, end: eDate! }));
            if (isInPeriod) {
              const amount = Number(rd.amountRemitted) || 0;
              if (rd.remittedAccount === 'Bank') sbiCredit += amount;
              else if (rd.remittedAccount === 'STSB') stsbCredit += amount;
            }
          });

          entry.paymentDetails?.forEach(pd => {
            const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
            const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate!, end: eDate! }));
            
            if (isInPeriod) {
              const currentPaymentDebitAmount = (Number(pd.contractorsPayment) || 0) + (Number(pd.gst) || 0) + (Number(pd.incomeTax) || 0) + (Number(pd.kbcwb) || 0) + (Number(pd.refundToParty) || 0);

              if (pd.paymentAccount === 'Bank') sbiDebit += currentPaymentDebitAmount;
              else if (pd.paymentAccount === 'STSB') stsbDebit += currentPaymentDebitAmount;
            }
          });
        });
        
        adminSanctionEntries.forEach((entry: DataEntryFormData) => {
          const isPlanFund = entry.applicationType && PLAN_FUND_APPLICATION_TYPES.includes(entry.applicationType as any);
          const isCollectorFund = entry.applicationType && COLLECTOR_APPLICATION_TYPES.includes(entry.applicationType as any);

          // User requested: If any work in Plan Fund Works, status is "Work Cancelled", the amount is not shown in Total Sanctioned Amount (₹).
          const hasCancelledWork = isPlanFund && entry.siteDetails?.some(site => site.workStatus === 'Work Cancelled');

          entry.remittanceDetails?.forEach(rd => {
            const remittedDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
            const isInPeriod = !isDateFilterActive || (remittedDate && isValid(remittedDate) && isWithinInterval(remittedDate, { start: sDate!, end: eDate! }));
            
            if (isInPeriod) {
              const amount = Number(rd.amountRemitted) || 0;
              if (isPlanFund) {
                  if (!hasCancelledWork) {
                    planFundDeferredAmount += amount;
                  }
              }
              if (isCollectorFund) collectorFundDeferredAmount += amount;
            }
          });

          entry.paymentDetails?.forEach(pd => {
            const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
            const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate!, end: eDate! }));
            
            if (isInPeriod) {
              const totalPaymentPerEntry = (Number(pd.totalPaymentPerEntry) || 0);
              if (isPlanFund) {
                  if (!hasCancelledWork) {
                    planFundExpenditure += totalPaymentPerEntry;
                  }
              }
              if (isCollectorFund) collectorFundExpenditure += totalPaymentPerEntry;
            }
          });
        });

        allFileEntries.forEach((entry: DataEntryFormData) => {
            entry.remittanceDetails?.forEach(rd => {
                const remDate = rd.dateOfRemittance ? safeParseDate(rd.dateOfRemittance) : null;
                const isInPeriod = !isDateFilterActive || (remDate && isValid(remDate) && isWithinInterval(remDate, { start: sDate!, end: eDate! }));
                if (isInPeriod && rd.remittedAccount === 'Revenue Head') {
                    revenueHeadCreditDirect += Number(rd.amountRemitted) || 0;
                }
            });
            entry.paymentDetails?.forEach(pd => {
                const paymentDate = pd.dateOfPayment ? safeParseDate(pd.dateOfPayment) : null;
                const isInPeriod = !isDateFilterActive || (paymentDate && isValid(paymentDate) && isWithinInterval(paymentDate, { start: sDate!, end: eDate! }));
                 if (isInPeriod && pd.revenueHead) {
                    revenueHeadCreditDirect += Number(pd.revenueHead) || 0;
                 }
            });
        });
        
        return {
          sbiCredit, sbiDebit, sbiBalance: sbiCredit - sbiDebit,
          stsbCredit, stsbDebit, stsbBalance: stsbCredit - stsbDebit,
          revenueHeadCredit: revenueHeadCreditDirect,
          planFundDeferredAmount,
          collectorFundDeferredAmount,
          planFundExpenditure,
          collectorFundExpenditure,
        };
    }, [financeStartDate, financeEndDate, allFileEntries, entriesLoading]);


    const handleClearFinanceDates = () => {
        setFinanceStartDate(undefined);
        setFinanceEndDate(undefined);
    };

    if (entriesLoading) {
      return (
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading financial data...</p>
        </div>
      );
    }

    return (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" />Financial Summary</CardTitle>
                <CardDescription>An overview of financial metrics including credits, debits, and balances.</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
              <div className="space-y-1">
                <Label htmlFor="finance-start-date">From Date</Label>
                <Input 
                    type="date" 
                    id="finance-start-date"
                    name="financeStartDate"
                    placeholder="From: yyyy-mm-dd" 
                    className="w-[180px]" 
                    value={financeStartDate ? format(financeStartDate, "yyyy-MM-dd") : ''} 
                    onChange={(e) => setFinanceStartDate(e.target.value ? new Date(e.target.value) : undefined)} 
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="finance-end-date">To Date</Label>
                <Input 
                    type="date" 
                    id="finance-end-date"
                    name="financeEndDate"
                    placeholder="To: yyyy-mm-dd" 
                    className="w-[180px]" 
                    value={financeEndDate ? format(financeEndDate, "yyyy-MM-dd") : ''} 
                    onChange={(e) => setFinanceEndDate(e.target.value ? new Date(e.target.value) : undefined)} 
                />
              </div>
              <div className="self-end">
                <Button onClick={handleClearFinanceDates} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear Dates</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
              {transformedFinanceMetrics ? (
                <div className="space-y-6">
                  <Card className="shadow-inner bg-background/50">
                      <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Operational Accounts</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Table>
                            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Total Credit (₹)</TableHead><TableHead className="text-right">Total Debit (₹)</TableHead><TableHead className="text-right">Balance (₹)</TableHead></TableRow></TableHeader>
                            <TableBody>
                              <TableRow><TableCell className="font-medium">Bank</TableCell><TableCell className="text-right font-mono font-bold text-green-600">{transformedFinanceMetrics.sbiCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold text-red-600">{transformedFinanceMetrics.sbiDebit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold">{transformedFinanceMetrics.sbiBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                              <TableRow><TableCell className="font-medium">STSB</TableCell><TableCell className="text-right font-mono font-bold text-green-600">{transformedFinanceMetrics.stsbCredit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold text-red-600">{transformedFinanceMetrics.stsbDebit.toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-mono font-bold">{transformedFinanceMetrics.stsbBalance.toLocaleString('en-IN')}</TableCell></TableRow>
                            </TableBody>
                            <TableFooter><TableRow className="bg-muted/80"><TableCell className="font-bold">Total Balance</TableCell><TableCell colSpan={3} className="text-right font-bold text-lg text-primary">₹{(transformedFinanceMetrics.sbiBalance + transformedFinanceMetrics.stsbBalance).toLocaleString('en-IN')}</TableCell></TableRow></TableFooter>
                          </Table>
                      </CardContent>
                  </Card>
                   <Card className="shadow-inner bg-background/50">
                      <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Administrative Sanction of Funds</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <Table>
                               <TableHeader>
                                <TableRow>
                                  <TableHead>Fund Type</TableHead>
                                  <TableHead className="text-right">Total Sanctioned Amount (₹)</TableHead>
                                  <TableHead className="text-right">Total Expenditure (₹)</TableHead>
                                  <TableHead className="text-right">Balance (₹)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                  <TableRow>
                                      <TableCell className="font-medium">Plan Fund (GWBDWS)</TableCell>
                                      <TableCell className="text-right font-mono font-bold">
                                          <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold" disabled={!transformedFinanceMetrics.planFundDeferredAmount}>
                                              {transformedFinanceMetrics.planFundDeferredAmount.toLocaleString('en-IN')}
                                          </Button>
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-bold text-red-600">
                                          <Button variant="link" className="p-0 h-auto font-mono text-right w-full block text-red-600" disabled={!transformedFinanceMetrics.planFundExpenditure}>
                                              {transformedFinanceMetrics.planFundExpenditure.toLocaleString('en-IN')}
                                          </Button>
                                      </TableCell>
                                      <TableCell className="text-right font-mono font-bold">
                                          {(transformedFinanceMetrics.planFundDeferredAmount - transformedFinanceMetrics.planFundExpenditure).toLocaleString('en-IN')}
                                      </TableCell>
                                  </TableRow>
                                  <TableRow>
                                      <TableCell className="font-medium">Collector's Deposit Works</TableCell>
                                       <TableCell className="text-right font-mono font-bold">
                                            <Button variant="link" className="p-0 h-auto font-mono text-right w-full block font-bold" disabled={!transformedFinanceMetrics.collectorFundDeferredAmount}>
                                                {transformedFinanceMetrics.collectorFundDeferredAmount.toLocaleString('en-IN')}
                                            </Button>
                                       </TableCell>
                                       <TableCell className="text-right font-mono font-bold text-red-600">
                                            <Button variant="link" className="p-0 h-auto font-mono text-right w-full block text-red-600" disabled={!transformedFinanceMetrics.collectorFundExpenditure}>
                                               {transformedFinanceMetrics.collectorFundExpenditure.toLocaleString('en-IN')}
                                            </Button>
                                       </TableCell>
                                       <TableCell className="text-right font-mono font-bold">
                                          {(transformedFinanceMetrics.collectorFundDeferredAmount - transformedFinanceMetrics.collectorFundExpenditure).toLocaleString('en-IN')}
                                      </TableCell>
                                  </TableRow>
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
                   <Card className="shadow-inner bg-background/50">
                      <CardHeader className="pb-4">
                          <CardTitle className="text-lg">Revenue Head Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 flex items-center justify-between">
                            <span className="font-medium">Total Credited to Revenue Head</span>
                            <span className="text-lg font-bold font-mono text-green-600">
                                ₹{transformedFinanceMetrics.revenueHeadCredit.toLocaleString('en-IN')}
                            </span>
                        </div>
                      </CardContent>
                  </Card>
                </div>
              ) : (<div className="h-40 flex items-center justify-center"><p className="text-muted-foreground">Calculating financial data...</p></div>)}
            </CardContent>
            <CardFooter>
                <p className="text-xs text-muted-foreground pt-4">
                    Note: Operational Accounts data is based on Deposit Works (Public & Private). Administrative Sanction data is based on Collector's & Plan Fund works. Revenue Head includes credits from all work types.
                </p>
          </CardFooter>
        </Card>
    );
}
