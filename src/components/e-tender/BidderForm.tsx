// src/components/e-tender/BidderForm.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { BidderSchema, type Bidder } from '@/lib/schemas/eTenderSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useDataStore } from '@/hooks/use-data-store';
import { v4 as uuidv4 } from 'uuid';

interface BidderFormProps {
    onSubmit: (data: Bidder) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Bidder | null;
    tenderAmount?: number;
}

const createDefaultBidder = (): Bidder => ({
    id: uuidv4(), // Assign a temporary client-side ID
    name: '',
    address: '',
    quotedAmount: undefined,
    quotedPercentage: undefined,
    aboveBelow: undefined,
    status: undefined,
    remarks: '',
});

export default function BidderForm({ onSubmit, onCancel, isSubmitting, initialData, tenderAmount }: BidderFormProps) {
    const { allBidders } = useDataStore();
    
    const form = useForm<Bidder>({
        resolver: zodResolver(BidderSchema),
        defaultValues: initialData ?? createDefaultBidder(),
    });

    const { control, setValue, watch, reset } = form;
    const [quotedPercentage, aboveBelow, selectedBidderName, status] = watch(['quotedPercentage', 'aboveBelow', 'name', 'status']);


    useEffect(() => {
        reset(initialData ?? createDefaultBidder());
    }, [initialData, reset]);

    useEffect(() => {
        if (tenderAmount && quotedPercentage != null && aboveBelow) {
            const percentage = quotedPercentage / 100;
            let calculatedAmount = 0;
            if (aboveBelow === 'Above') {
                calculatedAmount = tenderAmount * (1 + percentage);
            } else {
                calculatedAmount = tenderAmount * (1 - percentage);
            }
            const roundedAmount = Math.round(calculatedAmount * 100) / 100;
            if (watch('quotedAmount') !== roundedAmount) {
              setValue('quotedAmount', roundedAmount);
            }
        }
    }, [tenderAmount, quotedPercentage, aboveBelow, setValue, watch]);
    
    const handleBidderSelect = (bidderName: string) => {
        const selected = allBidders.find(b => b.name === bidderName);
        if (selected) {
            setValue('name', selected.name, { shouldValidate: true });
            setValue('address', selected.address, { shouldValidate: true });
        } else {
            setValue('name', '', { shouldValidate: true });
            setValue('address', '', { shouldValidate: true });
        }
    };

    const handleFormSubmit = (data: Bidder) => {
        onSubmit(data);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>{initialData ? 'Edit Bidder' : 'Add New Bidder'}</DialogTitle>
                    <DialogDescription>Enter the details for the bidder.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <FormField
                                  name="name"
                                  control={form.control}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Bidder Name</FormLabel>
                                      <Select onValueChange={(value) => handleBidderSelect(value)} value={field.value ?? undefined}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a Bidder"/></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); handleBidderSelect(''); }}>-- Clear Selection --</SelectItem>
                                          {allBidders.filter(b => b.name).map(bidder => <SelectItem key={bidder.id} value={bidder.name ?? ""}>{bidder.name ?? ""}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                               <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]" readOnly disabled={!!selectedBidderName} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="quotedPercentage" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Percentage</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="aboveBelow" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Above/Below</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Above">Above</SelectItem><SelectItem value="Below">Below</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="quotedAmount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="status" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Accepted">Accepted</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                           </div>
                           {status === 'Rejected' && (
                                <FormField name="remarks" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rejection Remarks</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} value={field.value ?? ""} placeholder="Enter reason for rejection..." />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                           )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0 mt-auto">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Bidder
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
