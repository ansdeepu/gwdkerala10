
// src/components/investigation/LoggingPumpingTestSiteDialog.tsx
"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Save, X, Expand } from "lucide-react";
import {
  SiteDetailSchema,
  type SiteDetailFormData,
  type StaffMember,
  type Constituency,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS,
  typeOfWellOptions,
  Designation
} from '@/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import MediaManager from '@/components/shared/MediaManager';
import { Separator } from '@/components/ui/separator';

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try { 
        const d = new Date(date);
        return isValidDate(d) ? d.toISOString().split('T')[0] : ''; 
    } catch { return ''; }
};

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

interface LoggingPumpingTestSiteDialogProps {
    initialData: Partial<SiteDetailFormData>;
    onConfirm: (data: SiteDetailFormData) => void;
    onCancel: () => void;
    isReadOnly: boolean;
    isInvestigator: boolean;
    isSupervisor: boolean;
    allLsgConstituencyMaps: any[];
    allStaffMembers: StaffMember[];
    workTypeContext: string | null;
    userDesignation: Designation | null;
}

export default function LoggingPumpingTestSiteDialog({ initialData, onConfirm, onCancel, isReadOnly, isInvestigator, isSupervisor, allLsgConstituencyMaps, allStaffMembers, userDesignation }: LoggingPumpingTestSiteDialogProps) {
    const form = useForm<SiteDetailFormData>({
        resolver: zodResolver(SiteDetailSchema),
        defaultValues: {
            ...initialData,
            dateOfInvestigation: formatDateForInput(initialData?.dateOfInvestigation),
            dateOfCompletion: formatDateForInput(initialData?.dateOfCompletion),
            workImages: initialData?.workImages || [],
            workVideos: initialData?.workVideos || [],
        },
    });

    const { control, handleSubmit, watch, setValue, getValues } = form;
    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });
    
    const watchedLsg = watch("localSelfGovt");
    const watchedWorkStatus = watch('workStatus');

    const isFieldReadOnly = (fieldName: string): boolean => {
        if (isReadOnly) return true;

        if (isSupervisor) {
            const supervisorEditable = ['latitude', 'longitude'];
            return !supervisorEditable.includes(fieldName);
        }

        if (isInvestigator) {
            const editableFields = ['descriptionOfWork', 'workRemarks', 'workStatus', 'dateOfCompletion', 'latitude', 'longitude'];
            return !editableFields.includes(fieldName);
        }
        
        return false; // Not read-only for admin/scientist
    };
    
    useEffect(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) {
            return;
        }
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        const constituencies = map?.constituencies || [];
        
        if (constituencies.length === 1) {
            const autoValue = constituencies[0];
            if (getValues('constituency') !== autoValue) {
                setValue('constituency', autoValue as Constituency, { shouldDirty: true, shouldValidate: true });
            }
        } else {
            const current = getValues('constituency');
            if (current && !constituencies.includes(current)) {
                setValue('constituency', undefined);
            }
        }
    }, [watchedLsg, allLsgConstituencyMaps, setValue, getValues]);

    const investigatorList = useMemo(() => 
        allStaffMembers.filter(s => 
            s.status === 'Active' && 
            ['Hydrogeologist', 'Junior Hydrogeologist', 'Junior Geophysicist', 'Geological Assistant', 'Geophysical Assistant'].includes(s.designation as any)
        ).sort((a, b) => a.name.localeCompare(b.name)), 
    [allStaffMembers]);

    const handleFormSubmit = (data: SiteDetailFormData) => onConfirm(data);
    
    const sortedLsgMaps = useMemo(() => [...(allLsgConstituencyMaps || [])].sort((a, b) => a.name.localeCompare(b.name)), [allLsgConstituencyMaps]);
    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        if (!map || !map.constituencies) return [];
        return [...map.constituencies].sort((a, b) => a.localeCompare(b));
    }, [watchedLsg, allLsgConstituencyMaps]);

    const isConstituencyDisabled = useMemo(() => {
        if (isFieldReadOnly('constituency')) return true;
        if (!watchedLsg) return true;
        if (constituencyOptionsForLsg.length <= 1) return true;
        return false;
    }, [isFieldReadOnly, watchedLsg, constituencyOptionsForLsg]);

    const isCompletionDateRequired = watchedWorkStatus === 'Completed';

    const handleLsgChange = useCallback((lsgName: string, fieldOnChange: (v: string) => void) => {
        const normalized = lsgName === '_clear_' ? '' : lsgName;
        fieldOnChange(normalized);
    }, []);

    return (
        <FormProvider {...form}>
            <form id="logging-pumping-site-dialog-form" onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full overflow-hidden">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                    <DialogTitle>{initialData?.nameOfSite ? `Edit Site: ${initialData.nameOfSite}` : 'Add New Site'}</DialogTitle>
                    <DialogDescription>Enter site specific details for the Logging & Pumping Test work.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full px-6 py-4">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Main Details</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField name="nameOfSite" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel>
                                            <FormControl><Input {...field} value={field.value ?? ''} readOnly={isFieldReadOnly('nameOfSite')} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="purpose" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Purpose <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly('purpose')}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-80">
                                                    <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                    {LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="localSelfGovt" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Local Self Govt. <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={(value) => handleLsgChange(value, field.onChange)} value={field.value || ""} disabled={isFieldReadOnly('localSelfGovt')}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select LSG" /></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-80">
                                                    <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                    {sortedLsgMaps.map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                    <FormField name="constituency" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Constituency (LAC)</FormLabel>
                                            <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isConstituencyDisabled}>
                                                <FormControl><SelectTrigger><SelectValue placeholder={!watchedLsg ? "Select LSG first" : "Select Constituency"}/></SelectTrigger></FormControl>
                                                <SelectContent className="max-h-80">
                                                    <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                    {constituencyOptionsForLsg.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage/>
                                        </FormItem>
                                    )} />
                                    <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('latitude')} /></FormControl><FormMessage /></FormItem>} />
                                    <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isFieldReadOnly('longitude')} /></FormControl><FormMessage /></FormItem>} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Work Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="typeOfWell" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type of Well <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isFieldReadOnly('typeOfWell')}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Well Type" /></SelectTrigger></FormControl>
                                                    <SelectContent>{typeOfWellOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="nameOfInvestigator" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name of Staff</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={isFieldReadOnly('nameOfInvestigator')}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Staff Member" /></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        {investigatorList.map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.designation})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField name="descriptionOfWork" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description of Work</FormLabel>
                                            <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly('descriptionOfWork')} className="min-h-[80px]" placeholder="Detailed description of the logging or pumping test work..." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField name="workRemarks" control={control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Remarks</FormLabel>
                                            <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly('workRemarks')} className="min-h-[60px]" placeholder="Add any technical or site observations..." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Work Status</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField name="workStatus" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldReadOnly('workStatus')}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        {LOGGING_PUMPING_TEST_WORK_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly('dateOfCompletion')}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField name="workRemarks" control={control} render={({ field }) => (
                                        <FormItem className="mt-4">
                                            <FormLabel>Status Remarks</FormLabel>
                                            <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly('workRemarks')} placeholder="Remarks regarding completion or pending status..." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Media Gallery</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <MediaManager title="Work Images" type="image" fields={imageFields} append={appendImage} remove={removeImage} update={updateImage} isReadOnly={isFieldReadOnly('workImages')} />
                                    <Separator />
                                    <MediaManager title="Work Videos" type="video" fields={videoFields} append={appendVideo} remove={removeVideo} update={updateVideo} isReadOnly={isFieldReadOnly('workVideos')} />
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>
                </div>
                <div className="flex justify-end p-6 pt-4 shrink-0 border-t gap-2">
                    <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                    {!isReadOnly && <Button type="submit" form="logging-pumping-site-dialog-form">Save Changes</Button>}
                </div>
            </form>
        </FormProvider>
    );
}
