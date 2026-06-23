// src/components/e-tender/ManageBiddersForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, type UseFormReturn, useFieldArray, FormProvider } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X, PlusCircle, Trash2 } from 'lucide-react';
import type { E_tenderFormData, Bidder } from '@/lib/schemas/eTenderSchema';
import { Separator } from '@/components/ui/separator';
import { formatDateForInput } from './utils';
import { v4 as uuidv4 } from 'uuid';

interface ManageBiddersFormProps {
    onSubmit: (data: Partial<E_tenderFormData>) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Partial<E_tenderFormData>;
}

const createDefaultBidder = (): Bidder => ({
    id: uuidv4(),
    name: '',
    address: '',
    quotedAmount: undefined,
    quotedPercentage: undefined,
    aboveBelow: undefined,
    status: undefined,
    order: undefined,
    phoneNo: '',
    secondaryPhoneNo: '',
    email: '',
    securityDepositType: '',
    securityDepositAmount: undefined,
    agreementAmount: undefined,
    additionalSecurityDeposit: undefined,
    dateSelectionNotice: undefined,
});

export default function ManageBiddersForm({ initialData, onSubmit, onCancel, isSubmitting }: ManageBiddersFormProps) {
    const form = useForm<E_tenderFormData>({
        defaultValues: initialData,
    });
    
    useEffect(() => {
        form.reset(initialData);
    }, [initialData, form]);

    const { control, getValues } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "bidders"
    });

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
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
                                    <FormField name={`bidders.${index}.name`} control={control} render={({ field }) => ( <FormItem><FormLabel>Bidder Name</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name={`bidders.${index}.address`} control={control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[40px]" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormField name={`bidders.${index}.quotedAmount`} control={control} render={({ field }) => ( <FormItem><FormLabel>Quoted Amount</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )}/>
                                        {/* Fields removed as per request */}
                                    </div>
                                </div>
                            ))}
                            {fields.length === 0 && <p className="text-center text-muted-foreground py-8">No bidders added.</p>}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4">
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
