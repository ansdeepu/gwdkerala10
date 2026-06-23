
// src/components/shared/SiteDialogContent.tsx
"use client";

import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Save, X, Info, Loader2, UserPlus, Users } from "lucide-react";
import {
  SiteDetailSchema,
  type SiteDetailFormData,
  siteWorkStatusOptions,
  sitePurposeOptions,
  type SitePurpose,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  siteConditionsOptions,
  type Constituency,
  type StaffMember,
  type Bidder,
  designationOptions,
  type RigCompressor
} from '@/lib/schemas';
import type { E_tender } from '@/hooks/useE_tenders';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MediaManager from '@/components/shared/MediaManager';

const toDateOrNull = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && typeof (value as any).seconds === 'number') {
        return new Date((value as any).seconds * 1000);
    }
    if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return null;
};

const formatDateForInput = (date: any): string => {
    if (!date) return '';
    const d = toDateOrNull(date);
    return d ? format(d, 'yyyy-MM-dd') : '';
};

// Filtered status options as requested by the user
const SITE_DIALOG_WORK_STATUS_OPTIONS = [
  "Under Process",
  "Additional Fund Awaited",
  "TS Pending",
  "Refund Pending",
  "Department Rig Allotted",
  "Tendered",
  "Selection Notice Issued",
  "Work Order Issued",
  "Work in Progress",
  "Work Failed",
  "Work Cancelled",
  "Work Completed"
] as const;

export default function SiteDialogContent({ initialData, onConfirm, onCancel, isReadOnly, isSupervisor, supervisorList, allLsgConstituencyMaps, allE_tenders, allStaffMembers, allBidders, allRigCompressors, workTypeContext }: {
    initialData: Partial<SiteDetailFormData>;
    onConfirm: (data: SiteDetailFormData) => void;
    onCancel: () => void;
    isReadOnly: boolean;
    isSupervisor: boolean;
    supervisorList: (StaffMember & { uid: string; name: string; })[];
    allLsgConstituencyMaps: any[];
    allE_tenders: E_tender[];
    allStaffMembers: StaffMember[];
    allBidders: Bidder[];
    allRigCompressors: RigCompressor[];
    workTypeContext: 'public' | 'private' | 'collector' | 'planFund' | 'gwInvestigation' | 'loggingPumpingTest' | null;
}) {
    const form = useForm<SiteDetailFormData>({
        resolver: zodResolver(SiteDetailSchema),
        defaultValues: {
            ...initialData,
            dateOfCompletion: formatDateForInput(initialData?.dateOfCompletion),
            arsSanctionedDate: formatDateForInput(initialData?.arsSanctionedDate),
            workImages: initialData?.workImages || [],
            workVideos: initialData?.workVideos || [],
        },
    });
    
    const { control, setValue, watch, handleSubmit, getValues } = form;

    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });

    const watchedPurpose = watch('purpose');
    const watchedWorkStatus = watch('workStatus');
    const watchedLsg = watch("localSelfGovt");
    const watchedTenderNo = watch('tenderNo');
    const watchedContractorName = watch('contractorName');
    const watchedSupervisorName = watch('supervisorName');
    const watchedSiteConditions = watch('siteConditions');

    const isPrivateWork = workTypeContext === 'private';
    const isDeptRigWork = watchedSiteConditions === 'Accessible to Dept. Rig';
    const isQuotation = watchedTenderNo === 'Quotation';

    const [isManualSupervisor, setIsManualSupervisor] = useState(false);

    const supervisorListNames = useMemo(() => {
        const targetDesignations = ["Master Driller", "Senior Driller", "Driller", "Driller Mechanic", "Drilling Assistant", "Tracer", "Draftsman"];
        const filtered = (allStaffMembers || []).filter(s => 
            s.status === 'Active' && 
            s.designation && 
            targetDesignations.includes(s.designation as any)
        );

        const designationOrder = (designationOptions as unknown as string[]) || [];
        return filtered.sort((a, b) => {
            const indexA = a.designation ? designationOrder.indexOf(a.designation) : 999;
            const indexB = b.designation ? designationOrder.indexOf(b.designation) : 999;
            if (indexA !== indexB) return indexA - indexB;
            return a.name.localeCompare(b.name);
        });
    }, [allStaffMembers]);

    // Initialize manual entry state if current name isn't in the list
    useEffect(() => {
        if (initialData?.supervisorName && (isQuotation || isPrivateWork || isDeptRigWork)) {
            const isInList = supervisorListNames.some(s => s.name === initialData.supervisorName);
            if (!isInList) {
                setIsManualSupervisor(true);
            }
        }
    }, [initialData, supervisorListNames, isQuotation, isPrivateWork, isDeptRigWork]);

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
    
    const isCompletionDateRequired = watchedWorkStatus === 'Work Completed' || watchedWorkStatus === 'Work Failed';

    const isWellPurpose = useMemo(() => ['BWC', 'TWC', 'FPW'].includes(watchedPurpose as any), [watchedPurpose]);
    const isDevPurpose = useMemo(() => ['BW Dev', 'TW Dev', 'FPW Dev'].includes(watchedPurpose as any), [watchedPurpose]);
    const isMWSSPurpose = useMemo(() => ['MWSS', 'MWSS Ext', 'Pumping Scheme', 'MWSS Pump Reno'].includes(watchedPurpose as any), [watchedPurpose]);
    const isHPSPurpose = useMemo(() => ['HPS', 'HPR'].includes(watchedPurpose as any), [watchedPurpose]);
    const isARSPurpose = useMemo(() => watchedPurpose === 'ARS', [watchedPurpose]);

    const filteredPurposeOptions = useMemo(() => {
        if (isPrivateWork) {
            return ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
        }
        const arsIndex = (sitePurposeOptions || []).indexOf("ARS");
        if (arsIndex === -1) return sitePurposeOptions;
        return sitePurposeOptions.slice(0, arsIndex + 1);
    }, [isPrivateWork]);

    const isFieldReadOnly = useCallback((isSupervisorEditable: boolean) => {
        if (isReadOnly) {
            if (isSupervisor && isSupervisorEditable) {
                return false; // Supervisors can edit this specific field
            }
            return true;
        }
        if (isSupervisor) {
            return !isSupervisorEditable;
        }
        return false;
    }, [isReadOnly, isSupervisor]);

    const sortedLsgMaps = useMemo(() => {
        return [...(allLsgConstituencyMaps || [])].sort((a, b) => a.name.localeCompare(b.name));
    }, [allLsgConstituencyMaps]);
    
    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        if (!map || !map.constituencies) return [];
        return [...map.constituencies].sort((a, b) => a.localeCompare(b));
    }, [watchedLsg, allLsgConstituencyMaps]);
    
    const handleLsgChange = useCallback((lsgName: string, fieldOnChange: (v: string) => void) => {
        const normalized = lsgName === '_clear_' ? '' : lsgName;
        fieldOnChange(normalized);
    }, []);

    const isConstituencyDisabled = useMemo(() => {
        if (isFieldReadOnly(false)) return true;
        if (!watchedLsg) return true;
        if (constituencyOptionsForLsg.length <= 1) return true;
        return false;
    }, [isFieldReadOnly, watchedLsg, constituencyOptionsForLsg]);

    const isTenderSelected = watchedTenderNo && watchedTenderNo !== 'Quotation' && watchedTenderNo !== '_clear_';

    useEffect(() => {
        if (isTenderSelected) {
            const selectedTender = (allE_tenders || []).find(t => t.eTenderNo === watchedTenderNo);
            if (selectedTender) {
                const validBidders = (selectedTender.bidders || []).filter((b: Bidder) => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
                const l1Bidder = validBidders.length > 0 ? validBidders.reduce((lowest: Bidder, current: Bidder) => (lowest.quotedAmount! < current.quotedAmount!) ? lowest : current) : null;
                setValue('contractorName', l1Bidder ? `${l1Bidder.name}, ${l1Bidder.address}` : '');

                const staffIdentities: string[] = [];
                const addStaffInfo = (name?: string | null) => {
                    if (!name) return;
                    const staff = (allStaffMembers || []).find(s => s.name === name);
                    if (staff) {
                        staffIdentities.push(`${staff.name} (${staff.designation})`);
                    } else {
                        staffIdentities.push(name);
                    }
                };

                addStaffInfo(selectedTender.nameOfAssistantEngineer);
                addStaffInfo(selectedTender.supervisor1Name);
                addStaffInfo(selectedTender.supervisor2Name);
                addStaffInfo(selectedTender.supervisor3Name);
                
                const joinedInfo = staffIdentities.join(', ');
                setValue('supervisorName', joinedInfo);
                setValue('supervisorUid', null); 
            }
        } else if (watchedTenderNo === '_clear_' || !watchedTenderNo) {
            if (!isPrivateWork && !isDeptRigWork) {
                setValue('contractorName', '');
                setValue('supervisorName', '');
                setValue('supervisorUid', undefined);
            }
        }
    }, [watchedTenderNo, isTenderSelected, isQuotation, allE_tenders, allStaffMembers, setValue, isPrivateWork, isDeptRigWork]);

    const rigOptions = useMemo(() => {
        const allUnits = allRigCompressors || [];
        
        // 1. Active Internal Rigs
        const activeInternal = allUnits
            .filter(r => !r.isExternal && r.status !== 'Garaged')
            .map(r => r.typeOfRigUnit || '')
            .filter(Boolean);
            
        // 2. Active External Rigs
        const activeExternal = allUnits
            .filter(r => r.isExternal && r.status !== 'Garaged')
            .map(r => `${r.typeOfRigUnit} - ${r.externalOffice || 'Unknown'}`)
            .filter(val => val && !val.startsWith('undefined'));

        // 3. Fixed Private Options
        const privateOptions = ["Private Rig - DTH", "Private Rig - Rotary", "Private Rig - Calyx"];

        // 4. Garaged Rigs (To be placed at the bottom)
        const garaged = allUnits
            .filter(r => r.status === 'Garaged')
            .map(r => {
                const base = r.isExternal 
                    ? `${r.typeOfRigUnit} - ${r.externalOffice || 'Unknown'}`
                    : (r.typeOfRigUnit || '');
                return `${base} (Garaged)`;
            })
            .filter(val => val && !val.startsWith('undefined') && val !== ' (Garaged)');

        return [
            ...Array.from(new Set(activeInternal)).sort(),
            ...Array.from(new Set(activeExternal)).sort(),
            ...privateOptions,
            ...Array.from(new Set(garaged)).sort()
        ];
    }, [allRigCompressors]);

    const handleDialogSubmit = (data: SiteDetailFormData) => {
        onConfirm(data);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                <DialogTitle>{initialData?.nameOfSite ? `Edit Site Details: ${initialData.nameOfSite}` : 'Add New Site'}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                    <Form {...form}>
                        <form id="site-dialog-form" onSubmit={handleSubmit(handleDialogSubmit)} className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg text-primary">Main Details</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField name="nameOfSite" control={control} render={({ field }) => <FormItem><FormLabel>Name of Site <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="purpose" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Purpose <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(false)}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Purpose" /></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                        {(filteredPurposeOptions || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="localSelfGovt" control={control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Local Self Govt. <span className="text-destructive">*</span></FormLabel>
                                                <Select onValueChange={(value) => handleLsgChange(value, field.onChange)} value={field.value || ""} disabled={isFieldReadOnly(false)}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl>
                                                    <SelectContent className="max-h-80">
                                                        <SelectItem value="_clear_" onSelect={(e) => { e.preventDefault(); field.onChange(undefined); }}>-- Clear Selection --</SelectItem>
                                                        {(sortedLsgMaps || []).map(map => <SelectItem key={map.id} value={map.name}>{map.name}</SelectItem>)}
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
                                                        {(constituencyOptionsForLsg || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage/>
                                            </FormItem>
                                        )} />
                                        <FormField name="latitude" control={control} render={({ field }) => <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                        <FormField name="longitude" control={control} render={({ field }) => <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                    </div>
                                </CardContent>
                            </Card>

                                            {isWellPurpose && (
                                                <Card>
                                                    <CardHeader><CardTitle className="text-lg text-primary">Investigation Details (Recommended)</CardTitle></CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <FormField name="surveyRecommendedDiameter" control={control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Diameter (mm)</FormLabel>
                                                                    <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(false)}>
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                            {(siteDiameterOptions || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}/>
                                                            <FormField name="surveyRecommendedTD" control={control} render={({ field }) => <FormItem><FormLabel>Total Depth (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                            
                                                            {watchedPurpose === 'BWC' && (
                                                                <>
                                                                    <FormField name="surveyRecommendedOB" control={control} render={({ field }) => <FormItem><FormLabel>OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="surveyRecommendedCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                                </>
                                                            )}

                                                            {watchedPurpose === 'TWC' && (
                                                                <>
                                                                    <FormField name="surveyRecommendedPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="surveyRecommendedSlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="surveyRecommendedMsCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                                </>
                                                            )}

                                                            {watchedPurpose === 'FPW' && (
                                                                <FormField name="casingPipeUsed" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)}/></FormControl><FormMessage /></FormItem>} />
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <FormField name="surveyLocation" control={control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Well Location</FormLabel>
                                                                    <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} className="min-h-[40px]" /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}/>
                                                            <FormField name="surveyRemarks" control={control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Investigation Remarks</FormLabel>
                                                                    <FormControl><Textarea {...field} value={field.value || ''} readOnly={isFieldReadOnly(false)} className="min-h-[40px]" /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}/>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            <Card>
                                                <CardHeader><CardTitle className="text-lg text-primary">Work Implementation</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                        <FormField name="siteConditions" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Rig and Site Accessibility</FormLabel>
                                                                <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(false)}>
                                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Conditions" /></SelectTrigger></FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                        {(siteConditionsOptions || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                        <FormField name="estimateAmount" control={control} render={({ field }) => <FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                        <FormField name="remittedAmount" control={control} render={({ field }) => <FormItem><FormLabel>Remitted Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                        <FormField name="tsAmount" control={control} render={({ field }) => <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(false)} /></FormControl><FormMessage /></FormItem>} />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {!isPrivateWork && !isDeptRigWork && (
                                                            <>
                                                                <FormField name="tenderNo" control={control} render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Tender No.</FormLabel>
                                                                        <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(false)}>
                                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Tender or Quotation" /></SelectTrigger></FormControl>
                                                                            <SelectContent className="max-h-80">
                                                                                <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                                <SelectItem value="Quotation">Quotation</SelectItem>
                                                                                {(allE_tenders || []).filter(t => t.eTenderNo).map(t => <SelectItem key={t.id} value={t.eTenderNo!}>{t.eTenderNo}</SelectItem>)}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )} />
                                                                <FormField name="contractorName" control={control} render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Contractor</FormLabel>
                                                                        {isQuotation ? (
                                                                            <Select 
                                                                                onValueChange={(val) => {
                                                                                    if (val === '_clear_') {
                                                                                        field.onChange('');
                                                                                    } else {
                                                                                        const bidder = allBidders?.find(b => b.name === val);
                                                                                        field.onChange(bidder ? `${bidder.name}, ${bidder.address || ''}` : val);
                                                                                    }
                                                                                }} 
                                                                                value={watchedContractorName ? watchedContractorName.split(',')[0].trim() : ""}
                                                                                disabled={isFieldReadOnly(false)}
                                                                            >
                                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Contractor" /></SelectTrigger></FormControl>
                                                                                <SelectContent className="max-h-80">
                                                                                    <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                                    {(allBidders || []).filter(b => b.name).map(b => <SelectItem key={b.id} value={b.name!}>{b.name}</SelectItem>)}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        ) : (
                                                                            <FormControl><Textarea {...field} value={field.value ?? ''} readOnly={isTenderSelected || isFieldReadOnly(false)} className={cn((isTenderSelected || isFieldReadOnly(false)) && "bg-muted min-h-[40px]")} /></FormControl>
                                                                        )}
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )} />
                                                            </>
                                                        )}
                                                        <FormField name="supervisorName" control={control} render={({ field }) => (
                                                            <FormItem className={isPrivateWork || isDeptRigWork ? "md:col-span-1" : ""}>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <FormLabel>Supervisor</FormLabel>
                                                                    {(isQuotation || isPrivateWork || isDeptRigWork) && !isFieldReadOnly(false) && (
                                                                        <Button 
                                                                            type="button" 
                                                                            variant="link" 
                                                                            className="h-auto p-0 text-[10px] font-bold text-primary" 
                                                                            onClick={() => {
                                                                                setIsManualSupervisor(!isManualSupervisor);
                                                                                if (!isManualSupervisor) {
                                                                                    setValue('supervisorUid', null);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isManualSupervisor ? "Pick from List" : "Manual Entry"}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                {((isQuotation || isPrivateWork || isDeptRigWork) && !isManualSupervisor) ? (
                                                                    <Select 
                                                                        onValueChange={(val) => {
                                                                            if (val === '_clear_') {
                                                                                field.onChange('');
                                                                                setValue('supervisorUid', undefined);
                                                                                setValue('supervisorDesignation', undefined);
                                                                            } else {
                                                                                const staff = supervisorListNames.find(s => s.name === val);
                                                                                if (staff) {
                                                                                    field.onChange(staff.name);
                                                                                    const linkedUser = supervisorList.find(u => u.name === staff.name);
                                                                                    setValue('supervisorUid', linkedUser?.uid || null);
                                                                                    setValue('supervisorDesignation', staff.designation);
                                                                                }
                                                                            }
                                                                        }} 
                                                                        value={watchedSupervisorName || ""}
                                                                        disabled={isFieldReadOnly(false)}
                                                                    >
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Supervisor" /></SelectTrigger></FormControl>
                                                                        <SelectContent className="max-h-80">
                                                                            <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                            {(supervisorListNames || []).map(s => <SelectItem key={s.id} value={s.name}>{s.name} ({s.designation})</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <FormControl>
                                                                        <Input 
                                                                            {...field} 
                                                                            value={field.value ?? ''} 
                                                                            readOnly={(!isManualSupervisor && isTenderSelected) || isFieldReadOnly(false)} 
                                                                            className={cn(((!isManualSupervisor && isTenderSelected) || isFieldReadOnly(false)) && "bg-muted")} 
                                                                            placeholder={isManualSupervisor ? "Enter external staff name..." : ""}
                                                                        />
                                                                    </FormControl>
                                                                )}
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                    </div>
                                                    <FormField name="implementationRemarks" control={control} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Implementation Remarks</FormLabel>
                                                            <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about implementation..." readOnly={isFieldReadOnly(false)} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}/>
                                                </CardContent>
                                            </Card>

                                            {isWellPurpose && (
                                                <Card>
                                                    <CardHeader><CardTitle className="text-lg text-primary">Drilling Details (Actuals)</CardTitle></CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <FormField name="diameter" control={control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Actual Diameter <span className="text-destructive">*</span></FormLabel>
                                                                    <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(true)}>
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                            {(siteDiameterOptions || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}/>
                                                            <FormField name="totalDepth" control={control} render={({ field }) => <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            
                                                            {watchedPurpose === 'BWC' && (
                                                                <>
                                                                    <FormField name="surveyOB" control={control} render={({ field }) => <FormItem><FormLabel>Actual OB (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="casingPipeUsed" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="outerCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Outer Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="innerCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>Inner Casing (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                </>
                                                            )}

                                                            {watchedPurpose === 'TWC' && (
                                                                <>
                                                                    <FormField name="pilotDrillingDepth" control={control} render={({ field }) => <FormItem><FormLabel>Pilot Drilling (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="surveyPlainPipe" control={control} render={({ field }) => <FormItem><FormLabel>Plain Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="surveySlottedPipe" control={control} render={({ field }) => <FormItem><FormLabel>Slotted Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                    <FormField name="outerCasingPipe" control={control} render={({ field }) => <FormItem><FormLabel>MS Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                                </>
                                                            )}

                                                            {watchedPurpose === 'FPW' && (
                                                                <FormField name="casingPipeUsed" control={control} render={({ field }) => <FormItem><FormLabel>Casing Pipe (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            )}

                                                            <FormField name="yieldDischarge" control={control} render={({ field }) => <FormItem><FormLabel>Yield (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="zoneDetails" control={control} render={({ field }) => <FormItem><FormLabel>Zone Details (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="waterLevel" control={control} render={({ field }) => <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            
                                                            <FormField name="typeOfRig" control={control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Type of Rig</FormLabel>
                                                                    <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(true)}>
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Rig" /></SelectTrigger></FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                            {(rigOptions || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}/>
                                                        </div>
                                                        <FormField name="drillingRemarks" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Drilling Remarks</FormLabel>
                                                                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about drilling actuals..." readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {isDevPurpose && (
                                                <Card>
                                                    <CardHeader><CardTitle className="text-lg text-primary">Developing Details</CardTitle></CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <FormField name="diameter" control={control} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Actual Diameter <span className="text-destructive">*</span></FormLabel>
                                                                    <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(true)}>
                                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Diameter" /></SelectTrigger></FormControl>
                                                                        <SelectContent>
                                                                            <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                            {(siteDiameterOptions || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}/>
                                                            <FormField name="totalDepth" control={control} render={({ field }) => <FormItem><FormLabel>Actual TD (m)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="yieldDischarge" control={control} render={({ field }) => <FormItem><FormLabel>Discharge (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="waterLevel" control={control} render={({ field }) => <FormItem><FormLabel>Static Water (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                        </div>
                                                        <FormField name="developingRemarks" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Developing Remarks</FormLabel>
                                                                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about developing..." readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {isMWSSPurpose && (
                                                <Card>
                                                    <CardHeader><CardTitle className="text-lg text-primary">Scheme Details</CardTitle></CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <FormField name="yieldDischarge" control={control} render={({ field }) => <FormItem><FormLabel>Well Discharge (LPH)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="pumpDetails" control={control} render={({ field }) => <FormItem><FormLabel>Pump Details</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="pumpingLineLength" control={control} render={({ field }) => <FormItem><FormLabel>Pumping Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="deliveryLineLength" control={control} render={({ field }) => <FormItem><FormLabel>Delivery Line (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="waterTankCapacity" control={control} render={({ field }) => <FormItem><FormLabel>Tank Capacity (L)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="noOfTapConnections" control={control} render={({ field }) => <FormItem><FormLabel># Taps</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="noOfBeneficiary" control={control} render={({ field }) => <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                        </div>
                                                        <FormField name="schemeRemarks" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Scheme Remarks</FormLabel>
                                                                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about the scheme..." readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {isHPSPurpose && (
                                                <Card>
                                                    <CardHeader><CardTitle className="text-lg text-primary">Scheme Details</CardTitle></CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <FormField name="totalDepth" control={control} render={({ field }) => <FormItem><FormLabel>Depth Erected (m)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="waterLevel" control={control} render={({ field }) => <FormItem><FormLabel>Water Level (m)</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="noOfBeneficiary" control={control} render={({ field }) => <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                        </div>
                                                        <FormField name="schemeRemarks" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Scheme Remarks</FormLabel>
                                                                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about the scheme..." readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            {isARSPurpose && (
                                                <Card>
                                                    <CardHeader><CardTitle className="text-lg text-primary">Scheme Details</CardTitle></CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            <FormField name="arsNumberOfStructures" control={control} render={({ field }) => <FormItem><FormLabel>Number of Structures</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="arsStorageCapacity" control={control} render={({ field }) => <FormItem><FormLabel>Storage Capacity (m³)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)}/></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="arsNumberOfFillings" control={control} render={({ field }) => <FormItem><FormLabel>Number of Fillings</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                            <FormField name="noOfBeneficiary" control={control} render={({ field }) => <FormItem><FormLabel># Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                        </div>
                                                        <FormField name="schemeRemarks" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Scheme Remarks</FormLabel>
                                                                <FormControl><Textarea {...field} value={field.value || ''} placeholder="Any specific remarks about the ARS scheme..." readOnly={isFieldReadOnly(true)} className="min-h-[40px]" /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}/>
                                                    </CardContent>
                                                </Card>
                                            )}

                                            <Card>
                                                <CardHeader><CardTitle className="text-lg text-primary">Work Status</CardTitle></CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <FormField name="workStatus" control={control} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Work Status <span className="text-destructive">*</span></FormLabel>
                                                                <Select onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value || ""} disabled={isFieldReadOnly(true)}>
                                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                                    <SelectContent className="max-h-80">
                                                                        <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                                                        {(SITE_DIALOG_WORK_STATUS_OPTIONS || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <FormField name="dateOfCompletion" control={control} render={({ field }) => <FormItem><FormLabel>Completion Date {isCompletionDateRequired && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                        <FormField name="totalExpenditure" control={control} render={({ field }) => <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isFieldReadOnly(true)} /></FormControl><FormMessage /></FormItem>} />
                                                        <FormField name="workRemarks" control={control} render={({ field }) => (
                                                            <FormItem className="md:col-span-3">
                                                                <FormLabel>Work Remarks</FormLabel>
                                                                <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Add any final remarks about the work status..." readOnly={isFieldReadOnly(true)} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card>
                                                <CardHeader><CardTitle className="text-lg text-primary">Media Gallery</CardTitle></CardHeader>
                                                <CardContent className="space-y-6">
                                                    <MediaManager
                                                        title="Work Images"
                                                        type="image"
                                                        fields={imageFields}
                                                        append={appendImage}
                                                        remove={removeImage}
                                                        update={updateImage}
                                                        isReadOnly={isFieldReadOnly(true)}
                                                    />
                                                    <Separator />
                                                    <MediaManager
                                                        title="Work Videos"
                                                        type="video"
                                                        fields={videoFields}
                                                        append={appendVideo}
                                                        remove={removeVideo}
                                                        update={updateVideo}
                                                        isReadOnly={isFieldReadOnly(true)}
                                                    />
                                                </CardContent>
                                            </Card>
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            <div className="flex justify-end p-6 pt-4 shrink-0 border-t gap-2">
                <Button variant="outline" type="button" onClick={onCancel}>{isReadOnly ? 'Close' : 'Cancel'}</Button>
                {!isReadOnly && <Button type="submit" form="site-dialog-form">Save Changes</Button>}
            </div>
        </div>
    );
}
