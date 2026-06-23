// src/components/e-tender/TenderOpeningDetailsForm.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X, Trash2 } from 'lucide-react';
import { TenderOpeningDetailsSchema, type E_tenderFormData, type TenderOpeningDetailsFormData } from '@/lib/schemas/eTenderSchema';
import type { Designation } from '@/lib/schemas/DataEntrySchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateForInput } from './utils';
import { useDataStore } from '@/hooks/use-data-store';

interface TenderOpeningDetailsFormProps {
    initialData?: Partial<E_tenderFormData>;
    onSubmit: (data: Partial<E_tenderFormData>) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
}

const committeeMemberDesignations: Designation[] = [
    "Assistant Executive Engineer",
    "Assistant Engineer",
    "Master Driller",
    "Senior Driller",
];

const committeeMemberFields = [
  "technicalCommitteeMember1",
  "technicalCommitteeMember2",
  "technicalCommitteeMember3",
] as const;

export default function TenderOpeningDetailsForm({ initialData, onSubmit, onCancel, isSubmitting }: TenderOpeningDetailsFormProps) {
    const { allStaffMembers } = useDataStore();

    const committeeMemberList = useMemo(() => {
        return allStaffMembers
            .filter(staff => committeeMemberDesignations.includes(staff.designation as Designation) && staff.status === 'Active')
            .sort((a, b) => {
                const orderA = committeeMemberDesignations.indexOf(a.designation as Designation);
                const orderB = committeeMemberDesignations.indexOf(b.designation as Designation);
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name);
            });
    }, [allStaffMembers]);
    
    const form = useForm<TenderOpeningDetailsFormData>({
        resolver: zodResolver(TenderOpeningDetailsSchema),
        defaultValues: {
            dateOfOpeningBid: null,
            dateOfTechnicalAndFinancialBidOpening: null,
            technicalCommitteeMember1: undefined,
            technicalCommitteeMember2: undefined,
            technicalCommitteeMember3: undefined,
            ...(initialData ? {
                ...initialData,
                dateOfOpeningBid: formatDateForInput(initialData?.dateOfOpeningBid),
                dateOfTechnicalAndFinancialBidOpening: formatDateForInput(initialData?.dateOfTechnicalAndFinancialBidOpening),
            } : {})
        },
    });

     useEffect(() => {
        const defaultValues = {
            dateOfOpeningBid: null,
            dateOfTechnicalAndFinancialBidOpening: null,
            technicalCommitteeMember1: undefined,
            technicalCommitteeMember2: undefined,
            technicalCommitteeMember3: undefined,
        };
        const valuesToSet = {
            ...defaultValues,
            ...(initialData || {}),
            dateOfOpeningBid: formatDateForInput(initialData?.dateOfOpeningBid),
            dateOfTechnicalAndFinancialBidOpening: formatDateForInput(initialData?.dateOfTechnicalAndFinancialBidOpening),
        };
        form.reset(valuesToSet);
    }, [initialData, form]);

    const handleFormSubmit = async (data: TenderOpeningDetailsFormData) => {
        await onSubmit(data);
        onCancel(); // Close the dialog on successful submission
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>Tender Opening Details</DialogTitle>
                    <DialogDescription>Manage dates and committee members for the tender opening process.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <FormField name="dateOfOpeningBid" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Opening Bid</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="dateOfTechnicalAndFinancialBidOpening" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date of Technical and Financial Bid Opening</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl><FormMessage /></FormItem> )}/>
                            
                            {committeeMemberFields.map((fieldName, index) => (
                                <FormField
                                    key={fieldName}
                                    name={fieldName}
                                    control={form.control}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Committee Member {index + 1}</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a Member" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                {committeeMemberList.map(staff => <SelectItem key={staff.id} value={staff.name}>{staff.name} ({staff.designation})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0 mt-auto">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
