
// src/app/dashboard/ars/entry/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useArsEntries, type ArsEntry } from '@/hooks/useArsEntries';
import { usePendingUpdates } from '@/hooks/usePendingUpdates';
import { useDataStore } from '@/hooks/use-data-store';
import { 
    ArsEntrySchema,
    type ArsEntryFormData, 
    arsTypeOfSchemeOptions, 
    arsWorkStatusOptions, 
    constituencyOptions,
    type Constituency,
    type StaffMember,
    type Designation,
    type Bidder,
} from '@/lib/schemas';
import { z } from 'zod';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, X, Eye, Info, PlusCircle } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import MediaManager from '@/components/shared/MediaManager';
import { useFieldArray } from 'react-hook-form';
import { Separator } from '@/components/ui/separator';


export const dynamic = 'force-dynamic';

// Helper function to format date for input fields
const formatDateForInput = (date: any): string => {
    if (!date) return '';
    try {
        const d = date instanceof Date ? date : new Date(date);
        if (isValid(d)) {
            return format(d, 'yyyy-MM-dd');
        }
    } catch (e) {
        // ignore invalid dates
    }
    return '';
};

// Main Component
export default function ArsEntryPage() {
    const { setHeader } = usePageHeader();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const { getArsEntryById, addArsEntry, updateArsEntry, isLoading: arsLoading } = useArsEntries();
    const { createArsPendingUpdate } = usePendingUpdates();
    const { allStaffMembers, allUsers, allLsgConstituencyMaps, allE_tenders, allBidders, isLoading: dataStoreLoading } = useDataStore();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [arsEntry, setArsEntry] = useState<ArsEntry | null>(null);
    const [fetchInitiated, setFetchInitiated] = useState(false);

    const id = searchParams.get('id');
    const readOnlyParam = searchParams.get('readOnly');
    const approveUpdateId = searchParams.get('approveUpdateId');
    const page = searchParams.get('page');
    const tab = searchParams.get('tab');

    const isReadOnly = readOnlyParam === 'true' || user?.role === 'viewer' || !!(user?.role === 'supervisor' && arsEntry && user.uid !== arsEntry.supervisorUid);

    const returnPath = useMemo(() => {
        const params = new URLSearchParams();
        if (page) params.set('page', page);
        if (tab) params.set('tab', tab);
        if (id && id !== 'new') params.set('lastId', id);
        const qs = params.toString();
        return `/dashboard/ars${qs ? `?${qs}` : ''}`;
    }, [page, tab, id]);
    
    useEffect(() => {
        if (arsLoading || dataStoreLoading || authLoading) return;

        if (!id || id === 'new') {
            setHeader('New ARS Entry', 'Create a new Artificial Recharge Scheme entry.');
            return;
        }

        const fetchEntry = async () => {
            const entry = await getArsEntryById(id);
            if (entry) {
                setArsEntry(entry);
                setHeader(`Edit ARS: ${entry.fileNo}`, `Viewing details for ${entry.nameOfSite}`);
            } else {
                toast({ title: 'Error', description: 'ARS entry not found.', variant: 'destructive' });
                router.replace('/dashboard/ars');
            }
            setFetchInitiated(true);
        };
        fetchEntry();
    }, [id, getArsEntryById, setHeader, toast, router, arsLoading, dataStoreLoading, authLoading]);

    const form = useForm<ArsEntryFormData>({
        resolver: zodResolver(ArsEntrySchema),
        defaultValues: {},
    });

    const { control, handleSubmit, setValue, getValues, watch, reset, formState: { isDirty } } = form;
    const { fields: imageFields, append: appendImage, remove: removeImage, update: updateImage } = useFieldArray({ control, name: "workImages" });
    const { fields: videoFields, append: appendVideo, remove: removeVideo, update: updateVideo } = useFieldArray({ control, name: "workVideos" });
    const watchedLsg = watch("localSelfGovt");
    const watchedArsStatus = watch("arsStatus");

    useEffect(() => {
        if (id === null || id === 'new') {
            reset({}); // Reset to empty for a new entry
            return;
        }

        if (arsEntry) {
            // When an existing entry is loaded, reset the form with its data.
            reset(arsEntry);
        }
    }, [arsEntry, id, reset]);

    // Supervisor selection logic for Quotation
    const quotationSupervisorList = useMemo(() => {
        const targetDesignations: Designation[] = ["Master Driller", "Senior Driller", "Driller", "Driller Mechanic", "Drilling Assistant", "Tracer", "Draftsman"];
        return allStaffMembers
            .filter(s => s.status === 'Active' && s.designation && targetDesignations.includes(s.designation as any))
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [allStaffMembers]);
    
    const handleSupervisorChange = (staffId: string) => {
        const staff = quotationSupervisorList.find(s => s.id === staffId);
        if (staff) {
            const userForStaff = allUsers.find(u => u.staffId === staff.id);
            setValue('supervisorName', staff.name);
            setValue('supervisorUid', userForStaff?.uid || null);
        } else {
            setValue('supervisorName', null);
            setValue('supervisorUid', null);
        }
    };
    
    const sortedLsgMaps = useMemo(() => 
        [...(allLsgConstituencyMaps || [])].sort((a,b) => a.name.localeCompare(b.name)), 
    [allLsgConstituencyMaps]);
    
    // Auto-populate constituency logic
    const constituencyOptionsForLsg = useMemo(() => {
        if (!watchedLsg || !allLsgConstituencyMaps) return [];
        const map = allLsgConstituencyMaps.find(m => m.name === watchedLsg);
        return map?.constituencies?.sort((a: string, b: string) => a.localeCompare(b)) || [];
    }, [watchedLsg, allLsgConstituencyMaps]);

    useEffect(() => {
        if (!watchedLsg) {
            if (getValues('constituency')) {
                setValue('constituency', undefined);
            }
            return;
        }
        const currentConstituency = getValues('constituency');

        if (constituencyOptionsForLsg.length === 1) {
            if (currentConstituency !== constituencyOptionsForLsg[0]) {
                setValue('constituency', constituencyOptionsForLsg[0] as Constituency);
            }
        } else {
            if (currentConstituency && !constituencyOptionsForLsg.includes(currentConstituency)) {
                setValue('constituency', undefined);
            }
        }
    }, [watchedLsg, constituencyOptionsForLsg, setValue, getValues]);
    
    const constituencyPlaceholder = useMemo(() => {
        if (!watchedLsg) return "Select LSG first";
        if (constituencyOptionsForLsg.length > 1) return "Select Constituency";
        if (constituencyOptionsForLsg.length === 0) return "No Constituencies Mapped";
        return constituencyOptionsForLsg[0] || "Select Constituency";
    }, [watchedLsg, constituencyOptionsForLsg]);

    const isConstituencyDisabled = isReadOnly || !watchedLsg || constituencyOptionsForLsg.length <= 1;

    // Contractor and Tender Logic
    const watchedTenderNo = watch("arsTenderNo");
    const isTenderSelected = watchedTenderNo && watchedTenderNo !== 'Quotation' && watchedTenderNo !== '_clear_';
    const isQuotation = watchedTenderNo === 'Quotation';

    useEffect(() => {
        if (isTenderSelected) {
            const selectedTender = (allE_tenders || []).find(t => t.eTenderNo === watchedTenderNo);
            if (selectedTender) {
                const validBidders = (selectedTender.bidders || []).filter((b: Bidder) => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
                const l1Bidder = validBidders.length > 0 ? validBidders.reduce((lowest: Bidder, current: Bidder) => (lowest.quotedAmount! < current.quotedAmount!) ? lowest : current) : null;
                setValue('arsContractorName', l1Bidder ? `${l1Bidder.name}, ${l1Bidder.address || ''}` : '');

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
                const joinedInfo = staffIdentities.join('\n');
                setValue('supervisorName', joinedInfo);
                setValue('supervisorUid', null);
            }
        } else if (watchedTenderNo === '_clear_' || !watchedTenderNo) {
            setValue('arsContractorName', '');
            setValue('supervisorName', '');
            setValue('supervisorUid', undefined);
        }
    }, [watchedTenderNo, isTenderSelected, isQuotation, allE_tenders, allStaffMembers, setValue]);


    const onSubmit = async (data: ArsEntryFormData) => {
        setIsSubmitting(true);
        try {
            if (id && id !== 'new') {
                if (user?.role === 'supervisor') {
                    await createArsPendingUpdate(id, data, user);
                    toast({ title: "Update Submitted", description: "Your changes have been submitted for approval." });
                } else {
                    await updateArsEntry(id, data, approveUpdateId || undefined, user || undefined);
                    toast({ title: "ARS Entry Updated", description: "The ARS details have been saved." });
                }
                // Reset form with current data to clear isDirty flag
                reset(data);
            } else {
                const newId = await addArsEntry(data);
                toast({ title: "ARS Entry Created", description: "The new ARS entry has been saved." });
                // For new entries, we redirect to the edit page for the newly created ID to ensure stayed-on-page functionality
                router.replace(`${pathname}?id=${newId}`);
            }
        } catch (error: any) {
            toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (arsLoading || dataStoreLoading || authLoading || (id && id !== 'new' && !arsEntry && !fetchInitiated)) {
        return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>1. Site Identification</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <FormField name="fileNo" control={control} render={({ field }) => ( <FormItem><FormLabel>File No *</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="nameOfSite" control={control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Name of Site *</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="localSelfGovt" control={control} render={({ field }) => ( <FormItem><FormLabel>Local Self Govt.</FormLabel><Select key={field.value} onValueChange={field.onChange} value={field.value ?? undefined} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select LSG"/></SelectTrigger></FormControl><SelectContent className="max-h-80">{sortedLsgMaps.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        <FormField name="constituency" control={control} render={({ field }) => ( <FormItem><FormLabel>Constituency (LAC)</FormLabel><Select key={field.value} onValueChange={field.onChange} value={field.value ?? undefined} disabled={isConstituencyDisabled}><FormControl><SelectTrigger><SelectValue placeholder={constituencyPlaceholder}/></SelectTrigger></FormControl><SelectContent className="max-h-80">{constituencyOptionsForLsg.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        <FormField name="arsBlock" control={control} render={({ field }) => ( <FormItem><FormLabel>Block</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="latitude" control={control} render={({ field }) => ( <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="longitude" control={control} render={({ field }) => ( <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>2. Scheme Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField name="arsTypeOfScheme" control={control} render={({ field }) => ( <FormItem><FormLabel>Type of Scheme</FormLabel><Select key={field.value} onValueChange={field.onChange} value={field.value ?? undefined} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select Scheme"/></SelectTrigger></FormControl><SelectContent>{arsTypeOfSchemeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                        <FormField name="arsNumberOfStructures" control={control} render={({ field }) => ( <FormItem><FormLabel>No. of Structures</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="arsStorageCapacity" control={control} render={({ field }) => ( <FormItem><FormLabel>Storage Capacity (m³)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        <FormField name="arsNumberOfFillings" control={control} render={({ field }) => ( <FormItem><FormLabel>No. of Fillings</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>3. Financials & Implementation</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <FormField name="estimateAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>Estimate Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsAsTsDetails" control={control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>AS/TS Details</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} readOnly={isReadOnly} className="min-h-[40px]" /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsSanctionedDate" control={control} render={({ field }) => ( <FormItem><FormLabel>Sanctioned Date</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="tsAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>TS Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsTenderNo" control={control} render={({ field }) => ( <FormItem><FormLabel>Tender No.</FormLabel>
                            <Select key={field.value} onValueChange={(val) => field.onChange(val === '_clear_' ? undefined : val)} value={field.value ?? undefined} disabled={isReadOnly}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Tender or Quotation" /></SelectTrigger></FormControl>
                                <SelectContent className="max-h-80"><SelectItem value="_clear_">-- Clear Selection --</SelectItem><SelectItem value="Quotation">Quotation</SelectItem>{(allE_tenders || []).filter(t => t.eTenderNo).map(t => <SelectItem key={t.id} value={t.eTenderNo!}>{t.eTenderNo}</SelectItem>)}</SelectContent>
                            </Select>
                         <FormMessage/></FormItem> )}/>
                         <FormField name="arsTenderedAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>Tendered Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsAwardedAmount" control={control} render={({ field }) => ( <FormItem><FormLabel>Awarded Amount (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                         <FormField name="arsContractorName" control={control} render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>Contractor</FormLabel>
                                {isQuotation ? (
                                    <Select key={field.value} onValueChange={field.onChange} value={field.value ?? undefined}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Contractor" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {(allBidders || []).map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <FormControl><Textarea {...field} value={field.value ?? ''} readOnly={isTenderSelected || isReadOnly} className={cn("min-h-[40px]", isTenderSelected ? 'bg-muted' : '')} /></FormControl>
                                )}
                                <FormMessage/>
                            </FormItem>
                         )}/>
                         <FormField name="supervisorUid" control={control} render={({ field }) => ( 
                            <FormItem className="md:col-span-2">
                                <FormLabel>Supervisor</FormLabel>
                                {isQuotation ? (
                                     <Select key={field.value} onValueChange={(staffId) => handleSupervisorChange(staffId)} value={field.value ?? undefined} disabled={isReadOnly}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Assign a supervisor" /></SelectTrigger></FormControl>
                                        <SelectContent>{quotationSupervisorList.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.designation})</SelectItem>)}</SelectContent>
                                    </Select>
                                ) : (
                                    <FormControl><Textarea value={watch('supervisorName') || ''} readOnly={isTenderSelected || isReadOnly} className={cn("min-h-[40px]", isTenderSelected ? 'bg-muted' : '')} /></FormControl>
                                )}
                                <FormMessage/>
                            </FormItem>
                         )}/>
                         <FormField name="noOfBeneficiary" control={control} render={({ field }) => ( <FormItem><FormLabel>No. of Beneficiaries</FormLabel><FormControl><Input {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader><CardTitle>4. Work Status & Completion</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="arsStatus" control={control} render={({ field }) => ( <FormItem><FormLabel>Work Status *</FormLabel><Select key={field.value} onValueChange={field.onChange} value={field.value ?? undefined} disabled={isReadOnly}><FormControl><SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger></FormControl><SelectContent>{arsWorkStatusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem> )}/>
                            <FormField name="dateOfCompletion" control={control} render={({ field }) => ( <FormItem><FormLabel>Date of Completion {watchedArsStatus === 'Work Completed' && <span className="text-destructive">*</span>}</FormLabel><FormControl><Input type="date" {...field} value={formatDateForInput(field.value)} readOnly={isReadOnly}/></FormControl><FormMessage/></FormItem> )}/>
                            <FormField name="totalExpenditure" control={control} render={({ field }) => ( <FormItem><FormLabel>Total Expenditure (₹)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                        </div>
                        <FormField name="workRemarks" control={control} render={({ field }) => ( <FormItem><FormLabel>Work Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} readOnly={isReadOnly} /></FormControl><FormMessage/></FormItem> )}/>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle>5. Media Gallery</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <MediaManager title="Work Images" type="image" fields={imageFields} append={appendImage} remove={removeImage} update={updateImage} isReadOnly={isReadOnly} />
                        <Separator />
                        <MediaManager title="Work Videos" type="video" fields={videoFields} append={appendVideo} remove={removeVideo} update={updateVideo} isReadOnly={isReadOnly} />
                    </CardContent>
                </Card>

                <CardFooter className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}>
                        <X className="mr-2 h-4 w-4" /> Close
                    </Button>
                    {!isReadOnly && (
                        <Button type="submit" disabled={isSubmitting || !isDirty}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>} {isSubmitting ? "Saving..." : 'Save'}
                        </Button>
                    )}
                </CardFooter>
            </form>
        </FormProvider>
    );
}
