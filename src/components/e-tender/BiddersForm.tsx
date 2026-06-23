// src/components/e-tender/BiddersForm.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, FormProvider, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import { BidderSchema, type Bidder, E_tenderSchema } from '@/lib/schemas/eTenderSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useDataStore } from '@/hooks/use-data-store';
import { v4 as uuidv4 } from 'uuid';

interface BiddersFormProps {
    onSubmit: (bidders: Bidder[]) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialBidders?: Bidder[] | null;
    tenderAmount?: number;
}

const createDefaultBidder = (): Bidder => ({
    id: uuidv4(),
    name: '',
    address: '',
    quotedAmount: undefined,
    quotedPercentage: undefined,
    aboveBelow: undefined,
    status: undefined,
    remarks: '',
});

export default function BiddersForm({ onSubmit, onCancel, isSubmitting, initialBidders, tenderAmount }: BiddersFormProps) {
    const { allBidders } = useDataStore();

    const form = useForm<{ bidders: Bidder[] }>({
        defaultValues: { bidders: initialBidders || [] },
    });

    const { control, setValue, watch, handleSubmit } = form;
    const { fields, append, remove } = useFieldArray({ control, name: "bidders" });

    const watchedBidders = watch('bidders');

    useEffect(() => {
        watchedBidders.forEach((bidder, index) => {
            if (tenderAmount && bidder.quotedPercentage != null && bidder.aboveBelow) {
                const percentage = bidder.quotedPercentage / 100;
                let calculatedAmount = 0;
                if (bidder.aboveBelow === 'Above') {
                    calculatedAmount = tenderAmount * (1 + percentage);
                } else {
                    calculatedAmount = tenderAmount * (1 - percentage);
                }
                const roundedAmount = Math.round(calculatedAmount * 100) / 100;
                if (bidder.quotedAmount !== roundedAmount) {
                  setValue(`bidders.${index}.quotedAmount`, roundedAmount);
                }
            }
        });
    }, [watchedBidders, tenderAmount, setValue]);
    
    const handleBidderSelect = (bidderName: string, index: number) => {
        const selected = allBidders.find(b => b.name === bidderName);
        if (selected) {
            setValue(`bidders.${index}.name`, selected.name, { shouldValidate: true });
            setValue(`bidders.${index}.address`, selected.address, { shouldValidate: true });
        } else {
            setValue(`bidders.${index}.name`, '', { shouldValidate: true });
            setValue(`bidders.${index}.address`, '', { shouldValidate: true });
        }
    };

    const handleFormSubmit = (data: { bidders: Bidder[] }) => {
        onSubmit(data.bidders);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>Manage Bidders</DialogTitle>
                    <DialogDescription>Add, edit, or remove bidders for this tender.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="flex justify-end mb-4">
                            <Button type="button" variant="outline" size="sm" onClick={() => append(createDefaultBidder())}>
                                <PlusCircle className="h-4 w-4 mr-2"/> Add New Bidder
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-secondary/30 relative">
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <FormField
                                          name={`bidders.${index}.name`}
                                          control={control}
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormLabel>Bidder Name</FormLabel>
                                              <Select onValueChange={(value) => handleBidderSelect(value, index)} value={field.value ?? ''}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a Bidder"/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                  <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); handleBidderSelect('', index); }}>-- Clear Selection --</SelectItem>
                                                  {allBidders.filter(b => b.name).map(bidder => <SelectItem key={bidder.id} value={bidder.name ?? ""}>{bidder.name ?? ""}</SelectItem>)}
                                                </SelectContent>
                                              </Select>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                       <FormField name={`bidders.${index}.address`} control={control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]" readOnly disabled={!!field.value && allBidders.some(b => b.name === watch(`bidders.${index}.name`))} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name={`bidders.${index}.quotedPercentage`} control={control} render={({ field }) => ( <FormItem><FormLabel>Quoted Percentage</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name={`bidders.${index}.aboveBelow`} control={control} render={({ field }) => ( <FormItem><FormLabel>Above/Below</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Above">Above</SelectItem><SelectItem value="Below">Below</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name={`bidders.${index}.quotedAmount`} control={control} render={({ field }) => ( <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} readOnly className="bg-muted/50" /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name={`bidders.${index}.status`} control={control} render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Accepted">Accepted</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                                   </div>
                                   {watch(`bidders.${index}.status`) === 'Rejected' && (
                                        <FormField name={`bidders.${index}.remarks`} control={control} render={({ field }) => (
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
                            ))}
                            {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No bidders added.</p>}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Bidders
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
