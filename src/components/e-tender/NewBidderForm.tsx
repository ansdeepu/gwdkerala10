// src/components/e-tender/NewBidderForm.tsx
"use client";

import React, { useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { type Bidder, NewBidderSchema, type NewBidderFormData } from '@/lib/schemas/eTenderSchema';
import { formatCase } from '@/lib/utils';


const createDefaultBidder = (): NewBidderFormData => ({
    name: '',
    address: '',
    phoneNo: '',
    secondaryPhoneNo: '',
    email: '',
    order: 0,
});

interface NewBidderFormProps {
    onSubmit: (data: NewBidderFormData) => Promise<void>;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Bidder | null;
}

export default function NewBidderForm({ onSubmit, onCancel, isSubmitting, initialData }: NewBidderFormProps) {
    const form = useForm<NewBidderFormData>({
        resolver: zodResolver(NewBidderSchema),
        defaultValues: initialData || createDefaultBidder(),
    });

    useEffect(() => {
        if (initialData) {
            form.reset(initialData);
        } else {
            form.reset(createDefaultBidder());
        }
    }, [initialData, form]);

    const handleInternalSubmit = (data: NewBidderFormData) => {
        const formattedData = {
            ...data,
            name: formatCase(data.name) ?? data.name,
            address: formatCase(data.address) ?? data.address
        };
        onSubmit(formattedData);
    };

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleInternalSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData ? 'Edit Bidder Details' : 'Add New Bidder'}</DialogTitle>
                    <DialogDescription>Enter the contact information for the bidder.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 p-6 py-4">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Bidder Name</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[60px]" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="phoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            <FormField name="secondaryPhoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Secondary Phone No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                         </div>
                         <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Email ID</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4 mt-auto">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {initialData ? 'Save Changes' : 'Add Bidder'}
                    </Button>
                </DialogFooter>
            </form>
        </FormProvider>
    );
}
