
// src/components/dashboard/RigFinancialSummary.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AgencyApplication, RigType } from '@/lib/schemas';
import { format, startOfDay, endOfDay, isWithinInterval, isValid, parse } from 'date-fns';

const DollarSign = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);
const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);


interface RigFinancialSummaryProps {
    applications: AgencyApplication[];
    onCellClick: (data: any[], title: string, columns: any[]) => void;
}

const rigTypeColumns: RigType[] = ["Hand Bore", "Filter Point Rig", "Calyx Rig", "Rotary Rig", "DTH Rig", "Rotary cum DTH Rig"];

// Define the type for the summary data object
interface SummaryData {
    agencyRegCount: Record<string, number>;
    rigRegCount: Record<string, number>;
    renewalCount: Record<string, number>;
    agencyRegAppFee: Record<string, number>;
    rigRegAppFee: Record<string, number>;
    agencyRegFee: Record<string, number>;
    rigRegFee: Record<string, any>;
    renewalFee: Record<string, any>;
    totals: Record<string, any>;
    grandTotalOfFees: number;

    // Detailed data for dialogs
    agencyRegData: any[];
    rigRegData: Record<string, any[]>;
    renewalData: Record<string, any[]>;
    agencyRegAppFeeData: any[];
    rigRegAppFeeData: any[];
    agencyRegFeeData: any[];
    rigRegFeeData: Record<string, any[]>;
    renewalFeeData: Record<string, any[]>;
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

const formatDateSafe = (d: any): string => {
    if (!d) return 'N/A';
    const date = safeParseDate(d);
    return date ? format(date, 'dd/MM/yyyy') : 'N/A';
};

const FinancialRow = ({ label, data, total, onCellClick, onTotalClick }: { label: string; data: Record<string, number>; total: number; onCellClick: (rigType: RigType | "Agency") => void; onTotalClick: () => void; }) => (
    <TableRow>
      <TableHead>{label}</TableHead>
      {label === "No. of Agency Registrations" ? (
        <>
            <TableCell colSpan={rigTypeColumns.length} className="text-center font-bold">
                 <Button variant="link" disabled={!total} onClick={() => onCellClick("Agency")} className="p-0 h-auto font-bold">{total}</Button>
            </TableCell>
        </>
      ) : (
        rigTypeColumns.map(rigType => (
            <TableCell key={rigType} className="text-center font-bold">
                <Button variant="link" disabled={!data[rigType]} onClick={() => onCellClick(rigType as RigType)} className="p-0 h-auto font-bold">{data[rigType] || 0}</Button>
            </TableCell>
        ))
      )}
       <TableCell className="text-center font-bold">
            <Button variant="link" disabled={!total} onClick={onTotalClick} className="p-0 h-auto font-bold">{total}</Button>
       </TableCell>
    </TableRow>
);

const FinancialAmountRow = ({ label, data, total, onCellClick, onTotalClick }: { label: string; data: Record<string, any>; total: number; onCellClick: (rigType: RigType | "Agency") => void; onTotalClick: () => void; }) => {
    const isAgencyRow = label.toLowerCase().includes('agency');
    
    return (
    <TableRow>
      <TableHead>{label}</TableHead>
      {isAgencyRow ? (
         <TableCell colSpan={rigTypeColumns.length} className="text-right font-mono font-bold">
              <Button variant="link" disabled={total === 0} onClick={() => onCellClick("Agency")} className="p-0 h-auto font-mono text-right w-full block font-bold">{(data["Agency"] || 0).toLocaleString('en-IN')}</Button>
         </TableCell>
      ) : (
        rigTypeColumns.map(rigType => (
            <TableCell key={rigType} className="text-right font-mono font-bold">
                <Button variant="link" disabled={!data[rigType]} onClick={() => onCellClick(rigType as RigType)} className="p-0 h-auto font-mono text-right w-full block font-bold">{(data[rigType] || 0).toLocaleString('en-IN')}</Button>
            </TableCell>
        ))
      )}
       <TableCell className="text-right font-bold font-mono">
            <Button variant="link" disabled={!total} onClick={onTotalClick} className="p-0 h-auto font-mono font-bold text-right w-full block">{total.toLocaleString('en-IN')}</Button>
       </TableCell>
    </TableRow>
)};


export default function RigFinancialSummary({ applications, onCellClick }: RigFinancialSummaryProps) {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const summaryData: SummaryData = useMemo(() => {
        const sDate = startDate ? startOfDay(startDate) : null;
        const eDate = endDate ? endOfDay(endDate) : null;
        const isDateFilterActive = sDate && eDate;

        const checkDate = (date: Date | string | null | undefined): boolean => {
            if (!date) return false;
            const d = safeParseDate(date);
            if (!d || !isValid(d)) return false;
            if (!isDateFilterActive) return true;
            return isWithinInterval(d, { start: sDate!, end: eDate! });
        };
        
        const checkRegDate = (date: Date | string | null | undefined): boolean => {
          if(!isDateFilterActive) return true;
          if (!date) return false;
          const d = safeParseDate(date);
          if (!d || !isValid(d)) return false;
          return isWithinInterval(d, { start: sDate!, end: eDate! });
        }
        
        const initialCounts: Record<string, number> = rigTypeColumns.reduce((acc, r) => ({...acc, [r]: 0}), {});

        let data: SummaryData = {
            agencyRegCount: { Agency: 0 }, 
            rigRegCount: {...initialCounts}, 
            renewalCount: {...initialCounts},
            agencyRegAppFee: { Agency: 0 }, 
            rigRegAppFee: { Agency: 0 }, 
            agencyRegFee: { Agency: 0 }, 
            rigRegFee: {...initialCounts}, 
            renewalFee: {...initialCounts},
            totals: {},
            grandTotalOfFees: 0,
            
            agencyRegData: [], 
            rigRegData: rigTypeColumns.reduce((acc, rt) => ({...acc, [rt]: []}), {} as Record<string, any[]>), 
            renewalData: rigTypeColumns.reduce((acc, rt) => ({...acc, [rt]: []}), {} as Record<string, any[]>),
            agencyRegAppFeeData: [], 
            rigRegAppFeeData: [], 
            agencyRegFeeData: [],
            rigRegFeeData: rigTypeColumns.reduce((acc, rt) => ({...acc, [rt]: []}), {} as Record<string, any[]>), 
            renewalFeeData: rigTypeColumns.reduce((acc, rt) => ({...acc, [rt]: []}), {} as Record<string, any[]>),
        };

        const completedApps = applications.filter(app => app.status === 'Active');

        // Application fees from ALL applications
        applications.forEach(app => {
            app.applicationFees?.forEach(fee => {
                if(checkDate(fee.applicationFeePaymentDate)) {
                    const amount = Number(fee.applicationFeeAmount) || 0;
                    const feeData = { agencyName: app.agencyName, feeType: fee.applicationFeeType, paymentDate: fee.applicationFeePaymentDate, amount };

                    if (fee.applicationFeeType === "Agency Registration") {
                        data.agencyRegAppFee["Agency"] += amount;
                        data.agencyRegAppFeeData.push(feeData);
                    } else if (fee.applicationFeeType === "Rig Registration") {
                         data.rigRegAppFee["Agency"] += amount;
                         data.rigRegAppFeeData.push(feeData);
                    }
                }
            });
        });

        completedApps.forEach(app => {
            const hasRegDateInRange = checkRegDate(app.agencyRegistrationDate);
            if (hasRegDateInRange) {
              data.agencyRegCount["Agency"]++;
              data.agencyRegData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, regDate: app.agencyRegistrationDate });
            }

            if (checkDate(app.agencyPaymentDate)) {
                const mainFee = Number(app.agencyRegistrationFee) || 0;
                data.agencyRegFee["Agency"] += mainFee;
                data.agencyRegFeeData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyPaymentDate, fee: mainFee });
            }
            if (checkDate(app.agencyAdditionalPaymentDate)) {
                const addlFee = Number(app.agencyAdditionalRegFee) || 0;
                data.agencyRegFee["Agency"] += addlFee;
                data.agencyRegFeeData.push({ agencyName: app.agencyName, regNo: app.agencyRegistrationNo, paymentDate: app.agencyAdditionalPaymentDate, fee: addlFee });
            }

            app.rigs?.forEach(rig => {
                const rigType = rig.typeOfRig;
                if (!rigType || !rigTypeColumns.includes(rigType)) return;
                
                let rigHasFeePaymentInDate = false;
                if (checkDate(rig.paymentDate)) {
                    const feeAmount = Number(rig.registrationFee) || 0;
                    data.rigRegFee[rigType] += feeAmount;
                    data.rigRegFeeData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, paymentDate: rig.paymentDate, fee: feeAmount });
                    rigHasFeePaymentInDate = true;
                }
                 if (checkDate(rig.additionalPaymentDate)) {
                    const feeAmount = Number(rig.additionalRegistrationFee) || 0;
                    data.rigRegFee[rigType] += feeAmount;
                    data.rigRegFeeData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, paymentDate: rig.additionalPaymentDate, fee: feeAmount });
                    rigHasFeePaymentInDate = true;
                }
                
                if (rigHasFeePaymentInDate || checkRegDate(rig.registrationDate)) {
                  data.rigRegCount[rigType]++;
                  data.rigRegData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, regDate: rig.registrationDate });
                }

                rig.renewals?.forEach(renewal => {
                    if (checkDate(renewal.renewalDate)) {
                        data.renewalCount[rigType]++;
                        data.renewalData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, renewalDate: renewal.renewalDate });
                    }
                    if (checkDate(renewal.paymentDate)) {
                        const feeAmount = Number(renewal.renewalFee) || 0;
                        data.renewalFee[rigType] += feeAmount;
                        data.renewalFeeData[rigType].push({ agencyName: app.agencyName, rigType: rigType, regNo: rig.rigRegistrationNo, paymentDate: renewal.paymentDate, renewalFee: feeAmount });
                    }
                });
            });
        });
        
        const totals: Record<string, any> = {};
        (Object.keys(data) as Array<keyof Omit<SummaryData, 'totals' | 'grandTotalOfFees'>>).forEach(key => {
            if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
                totals[key] = Object.values(data[key]).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
            }
        });

        const grandTotalOfFees =
            (totals.agencyRegAppFee || 0) +
            (totals.rigRegAppFee || 0) +
            (totals.agencyRegFee || 0) +
            (totals.rigRegFee || 0) +
            (totals.renewalFee || 0);

        return { ...data, totals, grandTotalOfFees };

    }, [applications, startDate, endDate]);

    const handleCellClick = (dataType: keyof SummaryData, rigType: RigType | 'Agency', title: string) => {
        const dataSet = summaryData[dataType];
        if (!dataSet) return;
    
        let records: any[] = [];
        if (rigType === 'Agency') {
             if (dataType === 'agencyRegData' || dataType === 'agencyRegAppFeeData' || dataType === 'agencyRegFeeData' || dataType === 'rigRegAppFeeData') {
                records = (dataSet as any[]) || [];
            }
        } else if(dataSet && typeof dataSet === 'object' && !Array.isArray(dataSet)) {
            records = (dataSet as Record<string, any[]>)[rigType] || [];
        }
    
        if (!records || records.length === 0) return;
    
        const getSortDateKey = (type: keyof SummaryData): string => {
            if (type.includes('renewal')) return type.includes('Fee') ? 'paymentDate' : 'renewalDate';
            if (type.includes('FeeData')) return 'paymentDate';
            if (type.includes('AppFeeData')) return 'paymentDate';
            return 'regDate';
        };
        const sortKey = getSortDateKey(dataType);
    
        records.sort((a, b) => {
            const dateA = safeParseDate(a[sortKey]);
            const dateB = safeParseDate(b[sortKey]);
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA.getTime() - dateB.getTime();
        });
    
        let columns: any[] = [];
        if (dataType === 'agencyRegData') columns = [{ key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'regNo', label: 'Reg No.'}, {key: 'regDate', label: 'Reg Date'}];
        else if (dataType === 'rigRegData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig Reg No.'}, {key: 'regDate', label: 'Reg Date'}];
        else if (dataType === 'renewalData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig No.'}, {key: 'renewalDate', label: 'Renewal Date'}];
        else if (dataType.includes('AppFeeData')) columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'amount', label: 'Amount', isNumeric: true}];
        else if (dataType === 'agencyRegFeeData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'regNo', label: 'Reg No.'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'fee', label: 'Fee', isNumeric: true}];
        else if (dataType === 'rigRegFeeData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig No.'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'fee', label: 'Fee', isNumeric: true}];
        else if (dataType === 'renewalFeeData') columns = [{ key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig No.'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'renewalFee', label: 'Fee', isNumeric: true}];
    
        const processedData = records.map((row, index) => {
            const newRow: any = { slNo: index + 1 };
            columns.slice(1).forEach(col => {
                const value = row[col.key];
                if (col.key.toLowerCase().includes('date')) {
                    newRow[col.key] = formatDateSafe(value);
                } else if (col.isNumeric) {
                    newRow[col.key] = (Number(value) || 0).toLocaleString('en-IN');
                } else {
                    newRow[col.key] = value || 'N/A';
                }
            });
            return newRow;
        });
    
        onCellClick(processedData, title, columns);
    };

    const handleTotalClick = (dataType: keyof Omit<SummaryData, 'totals' | 'grandTotalOfFees'>, title: string) => {
        let allRecords: any[] = [];
    
        const gatherFeeData = (sourceData: any) => {
            if (Array.isArray(sourceData)) {
                allRecords.push(...sourceData.filter(item => item.paymentDate));
            } else if (typeof sourceData === 'object' && sourceData !== null) {
                Object.values(sourceData).forEach(value => {
                    if (Array.isArray(value)) {
                        allRecords.push(...value.filter(item => item.paymentDate));
                    }
                });
            }
        };

        if (dataType === 'agencyRegFeeData') {
            gatherFeeData(summaryData.agencyRegFeeData);
        } else if (dataType === 'rigRegFeeData') {
            gatherFeeData(summaryData.rigRegFeeData);
        } else {
            // Existing logic for non-fee data
            if (dataType === 'agencyRegData' || dataType === 'agencyRegAppFeeData' || dataType === 'rigRegAppFeeData') {
                allRecords = (summaryData as any)[dataType] || [];
            } else {
                const dataSet = summaryData[dataType];
                if (dataSet && typeof dataSet === 'object' && !Array.isArray(dataSet)) {
                    allRecords = Object.values(dataSet).flat();
                }
            }
        }
        
        if (allRecords.length === 0) return;
    
        let columns: any[] = [];
        if (dataType === 'agencyRegData') columns = [{ key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'regNo', label: 'Reg No.'}, {key: 'regDate', label: 'Reg Date'}];
        else if (dataType === 'rigRegData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig Reg No.'}, {key: 'regDate', label: 'Reg Date'}];
        else if (dataType === 'renewalData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig No.'}, {key: 'renewalDate', label: 'Renewal Date'}];
        else if (dataType.includes('AppFeeData')) columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'amount', label: 'Amount', isNumeric: true}];
        else if (dataType === 'agencyRegFeeData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'regNo', label: 'Reg No.'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'fee', label: 'Fee', isNumeric: true}];
        else if (dataType === 'rigRegFeeData') columns = [ { key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig No.'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'fee', label: 'Fee', isNumeric: true}];
        else if (dataType === 'renewalFeeData') columns = [{ key: 'slNo', label: 'Sl.No.'}, {key: 'agencyName', label: 'Agency Name'}, {key: 'rigType', label: 'Rig Type'}, {key: 'regNo', label: 'Rig No.'}, {key: 'paymentDate', label: 'Payment Date'}, {key: 'renewalFee', label: 'Fee', isNumeric: true}];
    
        const sortKey = (dataType.includes('renewal') && !dataType.includes('Fee')) ? 'renewalDate' : (dataType.includes('Fee') || dataType.includes('AppFee')) ? 'paymentDate' : 'regDate';
        allRecords.sort((a, b) => {
            const dateA = safeParseDate(a[sortKey]);
            const dateB = safeParseDate(b[sortKey]);
            if (!dateA) return 1; if (!dateB) return -1;
            return dateA.getTime() - dateB.getTime();
        });
        
        const processedData = allRecords.map((row, index) => {
            const newRow: any = { slNo: index + 1 };
            columns.slice(1).forEach(col => {
                const value = row[col.key];
                if (col.key.toLowerCase().includes('date')) { newRow[col.key] = formatDateSafe(value); } 
                else if (col.isNumeric) { newRow[col.key] = (Number(value) || 0).toLocaleString('en-IN'); }
                else { newRow[col.key] = value || 'N/A'; }
            });
            return newRow;
        });

        onCellClick(processedData, title, columns);
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Rig Registration Financials</CardTitle>
                <CardDescription>Financial summary for rig and agency registrations, filterable by date.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t mt-4">
                    <Input type="date" className="w-[240px]" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={(e) => setStartDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)}/>
                    <Input type="date" className="w-[240px]" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={(e) => setEndDate(e.target.value ? parse(e.target.value, 'yyyy-MM-dd', new Date()) : undefined)}/>
                    <Button onClick={() => { setStartDate(undefined); setEndDate(undefined); }} variant="ghost" className="h-9 px-3"><XCircle className="mr-2 h-4 w-4"/>Clear</Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px]">Service</TableHead>
                                {rigTypeColumns.map(rigType => <TableHead key={rigType} className="text-center">{rigType}</TableHead>)}
                                <TableHead className="text-center font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <FinancialRow label="No. of Agency Registrations" data={summaryData.agencyRegCount} total={summaryData.totals.agencyRegCount} onCellClick={(rt) => handleCellClick('agencyRegData', rt, 'Agency Registrations')} onTotalClick={() => handleTotalClick('agencyRegData', 'Total Agency Registrations')} />
                            <FinancialRow label="No. of Rig Registrations" data={summaryData.rigRegCount} total={summaryData.totals.rigRegCount} onCellClick={(rt) => handleCellClick('rigRegData', rt, `${rt} Registrations`)} onTotalClick={() => handleTotalClick('rigRegData', 'Total Rig Registrations')}/>
                            <FinancialRow label="No. of Renewals" data={summaryData.renewalCount} total={summaryData.totals.renewalCount} onCellClick={(rt) => handleCellClick('renewalData', rt, `${rt} Renewals`)} onTotalClick={() => handleTotalClick('renewalData', 'Total Rig Renewals')}/>
                            
                            <TableRow className="bg-secondary/50 font-semibold"><TableCell colSpan={8} className="p-2">fees details (₹)</TableCell></TableRow>
                            
                            <FinancialAmountRow label="Agency Registration Application Fee" data={summaryData.agencyRegAppFee} total={summaryData.totals.agencyRegAppFee} onCellClick={(rt) => handleCellClick('agencyRegAppFeeData', rt, 'Agency Application Fees')} onTotalClick={() => handleTotalClick('agencyRegAppFeeData', 'Total Agency Application Fees')} />
                            <FinancialAmountRow label="Rig Registration Application Fee" data={summaryData.rigRegAppFee} total={summaryData.totals.rigRegAppFee} onCellClick={(rt) => handleCellClick('rigRegAppFeeData', rt, 'Rig Application Fees')} onTotalClick={() => handleTotalClick('rigRegAppFeeData', 'Total Rig Application Fees')} />
                            <FinancialAmountRow label="Agency Registration Fee" data={summaryData.agencyRegFee} total={summaryData.totals.agencyRegFee} onCellClick={(rt) => handleCellClick('agencyRegFeeData', rt, 'Agency Registration Fees')} onTotalClick={() => handleTotalClick('agencyRegFeeData', 'Total Agency Registration Fees')} />
                            <FinancialAmountRow label="Rig Registration Fee" data={summaryData.rigRegFee} total={summaryData.totals.rigRegFee} onCellClick={(rt) => handleCellClick('rigRegFeeData', rt, `${rt} Registration Fees`)} onTotalClick={() => handleTotalClick('rigRegFeeData', 'Total Rig Registration Fees')} />
                            <FinancialAmountRow label="Rig Registration Renewal Fee" data={summaryData.renewalFee} total={summaryData.totals.renewalFee} onCellClick={(rt) => handleCellClick('renewalFeeData', rt, `${rt} Renewal Fees`)} onTotalClick={() => handleTotalClick('renewalFeeData', 'Total Rig Renewal Fees')} />
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableHead colSpan={rigTypeColumns.length + 1} className="text-right font-bold">Grand Total (₹)</TableHead>
                                <TableCell className="text-right font-bold text-lg text-primary font-mono">{summaryData.grandTotalOfFees.toLocaleString('en-IN')}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
