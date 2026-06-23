// src/components/e-tender/WorkOrderDetailsForm.tsx
"use client";

import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, X } from 'lucide-react';
import { WorkOrderDetailsSchema, type E_tenderFormData, type WorkOrderDetailsFormData, type Designation, designationOptions } from '@/lib/schemas';
import { formatDateForInput } from './utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useDataStore } from '@/hooks/use-data-store';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const assistantEngineerDesignations: Designation[] = ["Senior Driller", "Master Driller", "Assistant Engineer"];
const supervisorDesignations: Designation[] = ["Drilling Assistant", "Driller", "Driller Mechanic", "Senior Driller", "Master Driller"];

interface WorkOrderDetailsFormProps {
    initialData?: Partial<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    tenderType?: 'Work' | 'Purchase';
}

export default function WorkOrderDetailsForm({ initialData, onSubmit, onCancel, isSubmitting, tenderType }: WorkOrderDetailsFormProps) {
    const { allStaffMembers } = useDataStore();

    const getSortedStaffList = useCallback((designations: Designation[]) => {
        return allStaffMembers
            .filter(staff => staff.designation && designations.includes(staff.designation as Designation) && staff.status === 'Active')
            .sort((a, b) => {
                const orderA = designationOptions.indexOf(a.designation as Designation);
                const orderB = designationOptions.indexOf(b.designation as Designation);
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
    }, [allStaffMembers]);

    const assistantEngineerList = useMemo(() => getSortedStaffList(assistantEngineerDesignations), [getSortedStaffList]);
    const supervisorList = useMemo(() => getSortedStaffList(supervisorDesignations), [getSortedStaffList]);
    
    const form = useForm<WorkOrderDetailsFormData>({
        resolver: zodResolver(WorkOrderDetailsSchema),
        defaultValues: {
            ...initialData,
            agreementDate: formatDateForInput(initialData?.agreementDate),
            dateWorkOrder: formatDateForInput(initialData?.dateWorkOrder),
            securityDepositRemarks: initialData?.securityDepositRemarks || '',
            isPerformanceGuaranteeSubmitted: initialData?.isPerformanceGuaranteeSubmitted || false,
            performanceGuaranteeReleaseStatus: initialData?.performanceGuaranteeReleaseStatus || 'Withheld',
            performanceGuaranteeReleaseDate: formatDateForInput(initialData?.performanceGuaranteeReleaseDate),
            performanceGuaranteeReleaseRemarks: initialData?.performanceGuaranteeReleaseRemarks || '',
            isAdditionalPerformanceGuaranteeSubmitted: initialData?.isAdditionalPerformanceGuaranteeSubmitted || false,
            additionalPerformanceGuaranteeReleaseStatus: initialData?.additionalPerformanceGuaranteeReleaseStatus || 'Withheld',
            additionalPerformanceGuaranteeReleaseDate: formatDateForInput(initialData?.additionalPerformanceGuaranteeReleaseDate),
            additionalPerformanceGuaranteeReleaseRemarks: initialData?.additionalPerformanceGuaranteeReleaseRemarks || '',
        }
    });
    
    const { setValue, reset, handleSubmit, control } = form;

    useEffect(() => {
        reset({
            ...initialData,
            agreementDate: formatDateForInput(initialData?.agreementDate),
            dateWorkOrder: formatDateForInput(initialData?.dateWorkOrder),
            securityDepositRemarks: initialData?.securityDepositRemarks || '',
            isPerformanceGuaranteeSubmitted: initialData?.isPerformanceGuaranteeSubmitted || false,
            performanceGuaranteeReleaseStatus: initialData?.performanceGuaranteeReleaseStatus || 'Withheld',
            performanceGuaranteeReleaseDate: formatDateForInput(initialData?.performanceGuaranteeReleaseDate),
            performanceGuaranteeReleaseRemarks: initialData?.performanceGuaranteeReleaseRemarks || '',
            isAdditionalPerformanceGuaranteeSubmitted: initialData?.isAdditionalPerformanceGuaranteeSubmitted || false,
            additionalPerformanceGuaranteeReleaseStatus: initialData?.additionalPerformanceGuaranteeReleaseStatus || 'Withheld',
            additionalPerformanceGuaranteeReleaseDate: formatDateForInput(initialData?.additionalPerformanceGuaranteeReleaseDate),
            additionalPerformanceGuaranteeReleaseRemarks: initialData?.additionalPerformanceGuaranteeReleaseRemarks || '',
        });
    }, [initialData, reset]);

    const title = tenderType === 'Purchase' ? 'Supply Order Details' : 'Work Order Details';
    
    const handleSupervisorChange = (staffId: string | null, fieldIndex: 1 | 2 | 3) => {
        const selectedStaff = staffId ? supervisorList.find(s => s.id === staffId) : null;
        setValue(`supervisor${fieldIndex}Id`, selectedStaff?.id || null);
        setValue(`supervisor${fieldIndex}Name`, selectedStaff?.name || null);
        setValue(`supervisor${fieldIndex}Phone`, selectedStaff?.phoneNo || null);
    };

    const handleFormSubmit = async (data: WorkOrderDetailsFormData) => {
        await onSubmit(data);
        onCancel();
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>Enter details related to the final order.</DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column for Financials and Dates (2/3 width) */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-base">Security Deposit & Stamp Paper (Submitted)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormField name="stampPaperAmountSubmitted" control={control} render={({ field }) => ( 
                                            <FormItem>
                                                <FormLabel>Stamp Paper (₹)</FormLabel>
                                                <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                                <FormMessage />
                                            </FormItem> 
                                        )}/>
                                        
                                        <div className="space-y-3">
                                            <FormField name="performanceGuaranteeAmountSubmitted" control={control} render={({ field }) => ( 
                                                <FormItem>
                                                    <FormLabel>Performance Guarantee (₹)</FormLabel>
                                                    <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                                    <FormMessage />
                                                </FormItem> 
                                            )}/>
                                            <FormField name="performanceGuaranteeReleaseStatus" control={control} render={({ field }) => (
                                                <FormItem className="flex items-center justify-between border rounded-md px-3 py-1.5 bg-muted/5 h-10 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none">Release Status</span>
                                                        <span className={`text-[11px] font-bold ${field.value === 'Released' ? 'text-green-600' : 'text-amber-600'}`}>
                                                            {field.value === 'Released' ? 'Released to Bidder' : 'Withheld'}
                                                        </span>
                                                    </div>
                                                    <FormControl>
                                                        <Switch 
                                                            checked={field.value === 'Released'} 
                                                            onCheckedChange={(checked) => field.onChange(checked ? 'Released' : 'Withheld')} 
                                                            className="scale-75 origin-right"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}/>
                                        </div>

                                        <div className="space-y-3">
                                            <FormField name="additionalPerformanceGuaranteeAmountSubmitted" control={control} render={({ field }) => ( 
                                                <FormItem>
                                                    <FormLabel>Additional PG (₹)</FormLabel>
                                                    <FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl>
                                                    <FormMessage />
                                                </FormItem> 
                                            )}/>
                                            <FormField name="additionalPerformanceGuaranteeReleaseStatus" control={control} render={({ field }) => (
                                                <FormItem className="flex items-center justify-between border rounded-md px-3 py-1.5 bg-muted/5 h-10 shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none">Release Status</span>
                                                        <span className={`text-[11px] font-bold ${field.value === 'Released' ? 'text-green-600' : 'text-amber-600'}`}>
                                                            {field.value === 'Released' ? 'Released to Bidder' : 'Withheld'}
                                                        </span>
                                                    </div>
                                                    <FormControl>
                                                        <Switch 
                                                            checked={field.value === 'Released'} 
                                                            onCheckedChange={(checked) => field.onChange(checked ? 'Released' : 'Withheld')} 
                                                            className="scale-75 origin-right"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}/>
                                        </div>
                                    </div>
                                    <FormField name="securityDepositRemarks" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Deposit Remarks</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} value={field.value ?? ""} placeholder="Enter any notes about submitted deposits..." className="min-h-[80px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Agreement & Order Dates</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="agreementDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Agreement Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name="dateWorkOrder" control={control} render={({ field }) => ( <FormItem><FormLabel>Date - {tenderType === 'Purchase' ? 'Supply Order' : 'Work Order'}</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)}/></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column for Staff Assignments (1/3 width) */}
                        <div className="lg:col-span-1 space-y-4">
                            <Card>
                                    <CardHeader>
                                    <CardTitle className="text-base">Measurer</CardTitle>
                                </CardHeader>
                                    <CardContent>
                                    <FormField
                                        name="nameOfAssistantEngineer"
                                        control={control}
                                        render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an Engineer" /></SelectTrigger></FormControl>
                                                    <SelectContent position="popper">
                                                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                        {assistantEngineerList.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    </CardContent>
                                </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Supervisors</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {([1, 2, 3] as const).map((i) => (
                                        <div key={i} className="space-y-2">
                                                <FormField name={`supervisor${i}Id`} control={control} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Supervisor {i}</FormLabel>
                                                    <Select onValueChange={(value) => handleSupervisorChange(value === '_clear_' ? null : value, i)} value={field.value || ""}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder={`Select Supervisor ${i}`} /></SelectTrigger></FormControl>
                                                        <SelectContent position="popper" className="max-h-80">
                                                            <SelectItem value="_clear_" >-- Clear Selection --</SelectItem>
                                                            {supervisorList.map(staff => <SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.designation})</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0 mt-auto border-t">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Update Details
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
