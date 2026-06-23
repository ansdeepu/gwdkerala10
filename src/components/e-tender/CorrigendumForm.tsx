// src/components/e-tender/CorrigendumForm.tsx
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
import { Loader2, Save, X } from 'lucide-react';
import { CorrigendumSchema, type Corrigendum, corrigendumTypeOptions } from '@/lib/schemas/eTenderSchema';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { formatDateForInput, toDateOrNull } from './utils';
import { format, isValid } from 'date-fns';

interface CorrigendumFormProps {
    onSubmit: (data: Corrigendum) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    initialData?: Corrigendum | null;
}

const createDefaultCorrigendum = (): Corrigendum => ({
    id: uuidv4(),
    corrigendumType: undefined,
    corrigendumDate: null,
    reason: '',
    lastDateOfReceipt: null,
    dateOfOpeningTender: null,
});

const DateTimePicker12h = ({ 
    label, 
    value, 
    onChange,
    disabled
}: { 
    label: string, 
    value: any, 
    onChange: (date: Date | null) => void,
    disabled?: boolean
}) => {
    const d = toDateOrNull(value);
    const datePart = d ? format(d, 'yyyy-MM-dd') : '';
    
    const h = d ? (d.getHours() % 12 || 12) : 10;
    const m = d ? d.getMinutes() : 0;
    const ampm = d ? (d.getHours() >= 12 ? 'PM' : 'AM') : 'AM';

    const handleDateChange = (newDate: string) => {
        if (!newDate) {
            onChange(null);
            return;
        }
        const hour24 = ampm === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
        const date = new Date(newDate);
        date.setHours(hour24, m, 0, 0);
        onChange(date);
    };

    const handleTimeChange = (newH: number, newM: number, newAmpm: string) => {
        if (!datePart) return;
        const hour24 = newAmpm === 'PM' ? (newH === 12 ? 12 : newH + 12) : (newH === 12 ? 0 : newH);
        const date = new Date(datePart);
        date.setHours(hour24, newM, 0, 0);
        onChange(date);
    };

    return (
        <FormItem className="space-y-1">
            <FormLabel>{label}</FormLabel>
            <div className="flex flex-wrap items-center gap-2">
                <FormControl>
                    <Input 
                        type="date" 
                        className="w-[150px]" 
                        value={datePart} 
                        onChange={(e) => handleDateChange(e.target.value)}
                        disabled={disabled}
                    />
                </FormControl>
                <div className="flex items-center gap-1">
                    <Select 
                        value={String(h)} 
                        onValueChange={(val) => handleTimeChange(parseInt(val), m, ampm)}
                        disabled={disabled || !datePart}
                    >
                        <SelectTrigger className="w-[65px] h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(hour => (
                                <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="font-bold">:</span>
                    <Select 
                        value={String(m).padStart(2, '0')} 
                        onValueChange={(val) => handleTimeChange(h, parseInt(val), ampm)}
                        disabled={disabled || !datePart}
                    >
                        <SelectTrigger className="w-[65px] h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-60">
                            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(min => (
                                <SelectItem key={min} value={min}>{min}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select 
                        value={ampm} 
                        onValueChange={(val) => handleTimeChange(h, m, val)}
                        disabled={disabled || !datePart}
                    >
                        <SelectTrigger className="w-[75px] h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <FormMessage />
        </FormItem>
    );
};

export default function CorrigendumForm({ onSubmit, onCancel, isSubmitting, initialData }: CorrigendumFormProps) {
    const form = useForm<Corrigendum>({
        resolver: zodResolver(CorrigendumSchema),
        defaultValues: createDefaultCorrigendum(),
    });

    const { reset, control, watch } = form;
    const watchedType = watch("corrigendumType");

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                corrigendumType: initialData.corrigendumType || undefined,
                corrigendumDate: formatDateForInput(initialData.corrigendumDate),
                lastDateOfReceipt: initialData.lastDateOfReceipt,
                dateOfOpeningTender: initialData.dateOfOpeningTender,
                reason: initialData.reason || '',
            });
        } else {
            reset(createDefaultCorrigendum());
        }
    }, [initialData, reset]);

    return (
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                    <DialogTitle>{initialData?.id ? 'Edit Corrigendum' : 'Add New Corrigendum'}</DialogTitle>
                    <DialogDescription>Enter the details for the corrigendum.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="corrigendumType" control={control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select key={field.value || "empty"} onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Type"/></SelectTrigger></FormControl>
                                            <SelectContent>{corrigendumTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField name="corrigendumDate" control={control} render={({ field }) => (
                                    <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value) || ''} onChange={(e) => field.onChange(e.target.value || null)}/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            {watchedType === 'Date Extension' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField 
                                        name="lastDateOfReceipt" 
                                        control={control} 
                                        render={({ field }) => (
                                            <DateTimePicker12h 
                                                label="New Last Date & Time" 
                                                value={field.value} 
                                                onChange={field.onChange} 
                                            />
                                        )}
                                    />
                                    <FormField 
                                        name="dateOfOpeningTender" 
                                        control={control} 
                                        render={({ field }) => (
                                            <DateTimePicker12h 
                                                label="New Opening Date & Time" 
                                                value={field.value} 
                                                onChange={field.onChange} 
                                            />
                                        )}
                                    />
                                </div>
                            )}
                            <FormField name="reason" control={control} render={({ field }) => (
                                <FormItem><FormLabel>Reason</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0 mt-auto border-t">
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
