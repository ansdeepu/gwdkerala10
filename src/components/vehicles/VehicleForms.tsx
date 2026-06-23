
// src/components/vehicles/VehicleForms.tsx
"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { DepartmentVehicleSchema, HiredVehicleSchema, RigCompressorSchema, rcStatusOptions, rigStatusOptions } from "@/lib/schemas";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { ScrollArea } from "../ui/scroll-area";
import { format, isValid } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const districts = ["Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Workshop & Store"];

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

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    const d = safeParseDate(date);
    if (d && isValid(d)) {
        return format(d, 'yyyy-MM-dd');
    }
    return '';
};

interface FormProps<T> {
    initialData: T | null;
    onFormSubmit: (data: T) => Promise<void>;
    onClose: () => void;
}

export function DepartmentVehicleForm({ initialData, onFormSubmit, onClose }: FormProps<DepartmentVehicle>) {
    const form = useForm<DepartmentVehicle>({
        resolver: zodResolver(DepartmentVehicleSchema),
        defaultValues: {
            id: initialData?.id || undefined,
            registrationNumber: initialData?.registrationNumber || '',
            model: initialData?.model || '',
            typeOfVehicle: initialData?.typeOfVehicle || '',
            vehicleClass: initialData?.vehicleClass || '',
            rcStatus: initialData?.rcStatus || undefined,
            fuelConsumptionRate: initialData?.fuelConsumptionRate || '',
            registrationDate: formatDateForInput(initialData?.registrationDate),
            fitnessExpiry: formatDateForInput(initialData?.fitnessExpiry),
            taxExpiry: formatDateForInput(initialData?.taxExpiry),
            insuranceExpiry: formatDateForInput(initialData?.insuranceExpiry),
            pollutionExpiry: formatDateForInput(initialData?.pollutionExpiry),
            fuelTestExpiry: formatDateForInput(initialData?.fuelTestExpiry),
        } as any,
    });

    const { reset, control, handleSubmit, formState: { isSubmitting } } = form;

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                registrationDate: formatDateForInput(initialData.registrationDate),
                fitnessExpiry: formatDateForInput(initialData.fitnessExpiry),
                taxExpiry: formatDateForInput(initialData.taxExpiry),
                insuranceExpiry: formatDateForInput(initialData.insuranceExpiry),
                pollutionExpiry: formatDateForInput(initialData.pollutionExpiry),
                fuelTestExpiry: formatDateForInput(initialData.fuelTestExpiry),
            } as any);
        } else {
            reset({
                registrationNumber: '',
                model: '',
                typeOfVehicle: '',
                vehicleClass: '',
                rcStatus: 'Active',
                fuelConsumptionRate: '',
                registrationDate: '',
                fitnessExpiry: '',
                taxExpiry: '',
                insuranceExpiry: '',
                pollutionExpiry: '',
                fuelTestExpiry: '',
            } as any);
        }
    }, [initialData, reset]);

    const handleInternalSubmit = async (data: DepartmentVehicle) => {
        await onFormSubmit(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(handleInternalSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{initialData?.id ? 'Edit' : 'Add'} Department Vehicle</DialogTitle>
                    <DialogDescription>Fill in the details for the vehicle.</DialogDescription>
                </DialogHeader>
                <div className="px-6 py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField name="registrationNumber" control={control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="model" control={control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="typeOfVehicle" control={control} render={({ field }) => ( <FormItem><FormLabel>Type of Vehicle</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="vehicleClass" control={control} render={({ field }) => ( <FormItem><FormLabel>Vehicle Class</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="registrationDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                         <FormField
                            name="rcStatus"
                            control={control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>RC Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {rcStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField name="fuelConsumptionRate" control={control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption Rate</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                        <h4 className="font-medium text-sm text-primary">Certificate Validity</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="fitnessExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Fitness</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="taxExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="insuranceExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="pollutionExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Pollution</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="fuelTestExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Fuel Test</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function HiredVehicleForm({ initialData, onFormSubmit, onClose }: FormProps<HiredVehicle>) {
    const form = useForm<HiredVehicle>({
        resolver: zodResolver(HiredVehicleSchema),
        defaultValues: {
            id: initialData?.id || undefined,
            registrationNumber: initialData?.registrationNumber || '',
            model: initialData?.model || '',
            ownerName: initialData?.ownerName || '',
            ownerAddress: initialData?.ownerAddress || '',
            agreementValidity: formatDateForInput(initialData?.agreementValidity),
            vehicleClass: initialData?.vehicleClass || '',
            registrationDate: formatDateForInput(initialData?.registrationDate),
            rcStatus: initialData?.rcStatus || undefined,
            hireCharges: initialData?.hireCharges || undefined,
            fitnessExpiry: formatDateForInput(initialData?.fitnessExpiry),
            taxExpiry: formatDateForInput(initialData?.taxExpiry),
            insuranceExpiry: formatDateForInput(initialData?.insuranceExpiry),
            pollutionExpiry: formatDateForInput(initialData?.pollutionExpiry),
            permitExpiry: formatDateForInput(initialData?.permitExpiry),
        } as any,
    });

    const { reset, control, handleSubmit, formState: { isSubmitting } } = form;

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                agreementValidity: formatDateForInput(initialData.agreementValidity),
                registrationDate: formatDateForInput(initialData.registrationDate),
                fitnessExpiry: formatDateForInput(initialData.fitnessExpiry),
                taxExpiry: formatDateForInput(initialData.taxExpiry),
                insuranceExpiry: formatDateForInput(initialData.insuranceExpiry),
                pollutionExpiry: formatDateForInput(initialData.pollutionExpiry),
                permitExpiry: formatDateForInput(initialData.permitExpiry),
            } as any);
        } else {
            reset({
                registrationNumber: '',
                model: '',
                ownerName: '',
                ownerAddress: '',
                agreementValidity: '',
                vehicleClass: '',
                registrationDate: '',
                rcStatus: 'Active',
                hireCharges: undefined,
                fitnessExpiry: '',
                taxExpiry: '',
                insuranceExpiry: '',
                pollutionExpiry: '',
                permitExpiry: '',
            } as any);
        }
    }, [initialData, reset]);

    const handleInternalSubmit = async (data: HiredVehicle) => {
        await onFormSubmit(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(handleInternalSubmit)} className="flex flex-col h-full">
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>{initialData?.id ? 'Edit' : 'Add'} Hired Vehicle</DialogTitle>
                </DialogHeader>
                 <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="registrationNumber" control={control} render={({ field }) => ( <FormItem><FormLabel>Registration Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="model" control={control} render={({ field }) => ( <FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="ownerName" control={control} render={({ field }) => ( <FormItem><FormLabel>Owner Name</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="ownerAddress" control={control} render={({ field }) => ( <FormItem><FormLabel>Owner Address</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="min-h-[40px]" /></FormControl><FormMessage/></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="agreementValidity" control={control} render={({ field }) => ( <FormItem><FormLabel>Agreement Validity</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="vehicleClass" control={control} render={({ field }) => ( <FormItem><FormLabel>Vehicle Class</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                                <FormField name="registrationDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Registration Date</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                <FormField
                                    name="rcStatus"
                                    control={control}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>RC Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {rcStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField name="hireCharges" control={control} render={({ field }) => ( <FormItem><FormLabel>Hire Charges</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} /></FormControl><FormMessage/></FormItem> )}/>
                            </div>
                            <div className="space-y-2 pt-4 border-t">
                                <h4 className="font-medium text-sm text-primary">Certificate Validity</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="fitnessExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Fitness</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                    <FormField name="taxExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Tax</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                    <FormField name="insuranceExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Insurance</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                    <FormField name="pollutionExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Pollution</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                    <FormField name="permitExpiry" control={control} render={({ field }) => ( <FormItem><FormLabel>Permit</FormLabel><FormControl><Input type="date" value={formatDateForInput(field.value)} onChange={(e) => field.onChange(e.target.value || undefined)}/></FormControl><FormMessage/></FormItem> )}/>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export function RigCompressorForm({ initialData, onFormSubmit, onClose }: FormProps<RigCompressor>) {
    const form = useForm<RigCompressor>({
        resolver: zodResolver(RigCompressorSchema),
        defaultValues: {
            id: initialData?.id || undefined,
            typeOfRigUnit: initialData?.typeOfRigUnit || '',
            status: initialData?.status || 'Active',
            fuelConsumption: initialData?.fuelConsumption || '',
            rigVehicleRegNo: initialData?.rigVehicleRegNo || '',
            compressorVehicleRegNo: initialData?.compressorVehicleRegNo || '',
            supportingVehicleRegNo: initialData?.supportingVehicleRegNo || '',
            compressorDetails: initialData?.compressorDetails || '',
            remarks: initialData?.remarks || '',
            isExternal: initialData?.isExternal || false,
            externalOffice: initialData?.externalOffice || null,
        },
    });

    const { reset, control, handleSubmit, watch, formState: { isSubmitting } } = form;

    useEffect(() => {
        if (initialData) {
            reset({
                id: initialData.id || undefined,
                typeOfRigUnit: initialData.typeOfRigUnit || '',
                status: initialData.status || 'Active',
                fuelConsumption: initialData.fuelConsumption || '',
                rigVehicleRegNo: initialData.rigVehicleRegNo || '',
                compressorVehicleRegNo: initialData.compressorVehicleRegNo || '',
                supportingVehicleRegNo: initialData.supportingVehicleRegNo || '',
                compressorDetails: initialData.compressorDetails || '',
                remarks: initialData.remarks || '',
                isExternal: initialData.isExternal || false,
                externalOffice: initialData.externalOffice || null,
            });
        } else {
            reset({
                typeOfRigUnit: '',
                status: 'Active',
                fuelConsumption: '',
                rigVehicleRegNo: '',
                compressorVehicleRegNo: '',
                supportingVehicleRegNo: '',
                compressorDetails: '',
                remarks: '',
                isExternal: false,
                externalOffice: null,
            });
        }
    }, [initialData, reset]);

    const isExternal = watch('isExternal');

    const handleInternalSubmit = async (data: RigCompressor) => {
        await onFormSubmit(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(handleInternalSubmit)}>
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>{isExternal ? "External Rig Unit" : (initialData?.id ? 'Edit' : 'Add') + ' Rig & Compressor Unit'}</DialogTitle>
                </DialogHeader>
                <div className="p-6 pt-0 space-y-4">
                    {isExternal && (
                        <div className="grid grid-cols-1 gap-4">
                            <FormField name="externalOffice" control={control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Owning Office <span className="text-destructive">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Office" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {districts.map(d => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField name="typeOfRigUnit" control={control} render={({ field }) => ( <FormItem><FormLabel>Type of Rig Unit {!isExternal && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="status" control={control} render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {rigStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                        <FormField name="fuelConsumption" control={control} render={({ field }) => ( <FormItem><FormLabel>Fuel Consumption</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField name="rigVehicleRegNo" control={control} render={({ field }) => ( <FormItem><FormLabel>Rig Vehicle Reg. No</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="compressorVehicleRegNo" control={control} render={({ field }) => ( <FormItem><FormLabel>Compressor Vehicle Reg. No</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="supportingVehicleRegNo" control={control} render={({ field }) => ( <FormItem><FormLabel>Supporting Vehicle Reg. No</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="compressorDetails" control={control} render={({ field }) => ( <FormItem><FormLabel>Compressor Details</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="min-h-[80px]" /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="remarks" control={control} render={({ field }) => ( <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} className="min-h-[80px]" /></FormControl><FormMessage/></FormItem> )}/>
                    </div>
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
