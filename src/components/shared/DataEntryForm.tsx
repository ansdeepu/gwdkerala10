
// src/components/shared/DataEntryForm.tsx
"use client";

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type FieldErrors, FormProvider, useWatch } from "react-hook-form";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, Trash2, PlusCircle, X, Save, Clock, Eye, ArrowUpDown, Copy, Info, ChevronLeft, ChevronRight, Edit, Move, CheckCircle2, Activity } from "lucide-react";
import {
  DataEntrySchema,
  type DataEntryFormData,
  siteWorkStatusOptions,
  sitePurposeOptions,
  type SitePurpose,
  siteDiameterOptions,
  siteTypeOfRigOptions,
  allFileStatusOptions,
  remittedAccountOptions,
  paymentAccountOptions,
  type RemittanceDetailFormData,
  RemittanceDetailSchema,
  type PaymentDetailFormData,
  PaymentDetailSchema,
  SiteDetailSchema,
  type SiteDetailFormData,
  applicationTypeDisplayMap,
  type ApplicationType,
  siteConditionsOptions,
  type UserRole,
  type SiteWorkStatus,
  constituencyOptions,
  type Constituency,
  PUBLIC_DEPOSIT_APPLICATION_TYPES,
  PRIVATE_APPLICATION_TYPES,
  COLLECTOR_APPLICATION_TYPES,
  PLAN_FUND_APPLICATION_TYPES,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  ReappropriationDetailSchema,
  type ReappropriationDetailFormData,
  StaffMember
} from '@/lib/schemas';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { z } from "zod";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getFirestore, doc, query, collection, where, getDocs, Timestamp, serverTimestamp, writeBatch, updateDoc, addDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useDataStore } from "@/hooks/use-data-store";
import { ScrollArea } from "../ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as TableFooterComponent } from "@/components/ui/table";
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from "@/components/ui/badge";
import SiteDialogContent from "./SiteDialogContent";
import { MoveCopySiteDialog } from './MoveCopyDialogs';


const db = getFirestore(app);

const getStatusColorClass = (status: SiteWorkStatus | undefined | null): string => {
    if (!status) return 'text-muted-foreground';
    if (status === 'Work Cancelled') return 'text-gray-500 line-through';
    const completedOrFailed: string[] = ["Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Work Failed", "Completed", "Work Cancelled"];
    if (completedOrFailed.includes(status as SiteWorkStatus)) return 'text-red-600';
    if (status === 'Refund Pending') return 'text-yellow-600';
    return 'text-green-600';
};

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

const createDefaultRemittanceDetail = (): RemittanceDetailFormData => ({ id: uuidv4(), amountRemitted: undefined, dateOfRemittance: "", remittedAccount: "Bank", remittanceRemarks: "" });
const createDefaultReappropriationDetail = (): ReappropriationDetailFormData => ({ type: "Outward", refFileNo: "", amount: undefined, date: "", remarks: "", pageType: "Deposit Work", fileDetails: "" });
const createDefaultPaymentDetail = (): PaymentDetailFormData => ({ id: uuidv4(), remittanceId: null, dateOfPayment: "", paymentAccount: "Bank", revenueHead: undefined, contractorsPayment: undefined, gst: undefined, incomeTax: undefined, kbcwb: undefined, refundToParty: undefined, totalPaymentPerEntry: 0, paymentRemarks: "" });

const calculatePaymentEntryTotalGlobal = (payment: PaymentDetailFormData | undefined): number => {
  if (!payment) return 0;
  return (Number(payment.revenueHead) || 0) + (Number(payment.contractorsPayment) || 0) + (Number(payment.gst) || 0) + (Number(payment.incomeTax) || 0) + (Number(payment.kbcwb) || 0) + (Number(payment.refundToParty) || 0);
};

const getFormattedErrorMessages = (errors: FieldErrors<DataEntryFormData>): string[] => {
  const messages = new Set<string>();

  const formattedFieldName = (fieldName: string) => {
    return fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  function findMessages(obj: any, parentPath: string[] = []) {
    if (!obj) return;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const newPath = [...parentPath, key];
        
        if (value?.message && typeof value.message === 'string') {
          const pathString = newPath.map((part, index) => {
              if (!isNaN(parseInt(part))) {
                  const prevPart = newPath[index - 1];
                  const singular = prevPart.endsWith('s') ? prevPart.slice(0, -1) : prevPart;
                  return `${formattedFieldName(singular)} #${parseInt(part) + 1}`;
              }
              return formattedFieldName(part);
          }).join(' > ');
          messages.add(`${pathString}: ${value.message}`);
        } else if (value && typeof value === 'object' && key !== 'root') {
          findMessages(value, newPath);
        }
      }
    }
  }

  findMessages(errors);
  return Array.from(messages);
};


const DetailRow = ({ label, value, className }: { label: string; value: any, className?: string }) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return null;
    }

    let displayValue = String(value);
    
    if (label.toLowerCase().includes('date') && value) {
        try {
            displayValue = format(new Date(value), "dd/MM/yyyy");
        } catch (e) { /* Keep original string if formatting fails */ }
    } else if (typeof value === 'number') {
        displayValue = value.toLocaleString('en-IN');
    }

    return (
        <div className={className}>
            <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm font-semibold">{displayValue}</dd>
        </div>
    );
};


interface DataEntryFormProps {
    fileNoToEdit?: string;
    initialData: DataEntryFormData;
    supervisorList: (StaffMember & { uid: string; name: string; })[];
    userRole?: UserRole;
    workTypeContext: 'public' | 'private' | 'collector' | 'planFund' | 'gwInvestigation' | 'loggingPumpingTest' | null;
    returnPath: string; 
    pageToReturnTo: string | null;
    isFormDisabled?: boolean;
    formOptions: readonly ApplicationType[] | ApplicationType[];
}

const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    try { return format(new Date(date), 'yyyy-MM-dd'); } catch { return ""; }
};

const ApplicationDialogContent = ({ initialData, onConfirm, onCancel, formOptions, isEditing }: { 
    initialData: any, 
    onConfirm: (data: any) => void, 
    onCancel: () => void, 
    formOptions: readonly ApplicationType[] | ApplicationType[],
    isEditing: boolean
}) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [data, setData] = useState(initialData);
    const [errors, setErrors] = useState<{ fileNo?: string; applicantName?: string; applicationType?: string; }>();
    const [isChecking, setIsChecking] = useState(false);

    const uniqueOptions = useMemo(() => Array.from(new Set(formOptions || [])), [formOptions]);

    useEffect(() => {
        if (uniqueOptions.length === 1 && data.applicationType !== uniqueOptions[0]) {
            setData((prev: any) => ({ ...prev, applicationType: uniqueOptions[0] }));
        }
    }, [uniqueOptions, data.applicationType]);

    const handleChange = (key: string, value: any) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
        if (value && String(value).trim()) {
            setErrors(prev => prev ? ({...prev, [key]: undefined}) : undefined);
        }
    };
    
    const handleSave = async () => {
        const newErrors: { fileNo?: string; applicantName?: string; applicationType?: string; } = {};
        if (!data.fileNo?.trim()) {
            newErrors.fileNo = "File No is required.";
        }
        if (!data.applicantName?.trim()) {
            newErrors.applicantName = "Applicant Name is required.";
        }
        if (!data.applicationType) {
            newErrors.applicationType = "Type of Application is required.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (!isEditing && user?.officeLocation && data.fileNo) {
            setIsChecking(true);
            try {
                const fileNoTrimmed = data.fileNo.trim().toUpperCase();
                const q = query(
                    collection(db, `offices/${user.officeLocation.toLowerCase()}/fileEntries`), 
                    where("fileNo", "==", fileNoTrimmed)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    toast({
                        title: "Duplicate File Number",
                        description: `A file with the number "${data.fileNo}" already exists.`,
                        variant: "destructive",
                    });
                    setIsChecking(false);
                    return; 
                }
            } catch (error) {
                toast({ title: "Validation Error", description: "Could not verify file number.", variant: "destructive" });
                setIsChecking(false);
                return;
            }
            setIsChecking(false);
        }

        onConfirm(data);
    };

    return (
      <div className="flex flex-col h-auto">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Application Details</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-0 space-y-4 flex-1">
             <div className="grid grid-cols-3 gap-4 items-start">
                <div className="space-y-2 col-span-1">
                    <Label htmlFor="fileNo">File No *</Label>
                    <Input id="fileNo" value={data.fileNo || ''} onChange={(e) => handleChange('fileNo', e.target.value)} disabled={isChecking}/>
                    {errors?.fileNo && <p className="text-xs text-destructive mt-1">{errors.fileNo}</p>}
                </div>
                <div className="space-y-2 col-span-2">
                    <Label htmlFor="applicantName">Name & Address of Institution/Applicant *</Label>
                    <Textarea id="applicantName" value={data.applicantName || ''} onChange={(e) => handleChange('applicantName', e.target.value)} className="min-h-[40px]" disabled={isChecking}/>
                    {errors?.applicantName && <p className="text-xs text-destructive mt-1">{errors.applicantName}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Phone No.</Label><Input value={data.phoneNo || ''} onChange={(e) => handleChange('phoneNo', e.target.value)} disabled={isChecking} /></div>
                <div className="space-y-2"><Label>Secondary Mobile No.</Label><Input value={data.secondaryMobileNo || ''} onChange={(e) => handleChange('secondaryMobileNo', e.target.value)} disabled={isChecking}/></div>
                 <div className="space-y-2">
                    <Label>Type of Application *</Label>
                    {uniqueOptions.length === 1 ? (
                        <Input 
                            value={applicationTypeDisplayMap[uniqueOptions[0] as ApplicationType] || uniqueOptions[0]} 
                            readOnly 
                            className="bg-muted font-semibold"
                        />
                    ) : (
                        <Select onValueChange={(value) => handleChange('applicationType', value)} value={data.applicationType}>
                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                            <SelectContent className="max-h-80">
                                {uniqueOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o as ApplicationType] || o}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                     {errors?.applicationType && <p className="text-xs text-destructive mt-1">{errors.applicationType}</p>}
                </div>
            </div>
        </div>
        <DialogFooter className="px-6 pb-6"><Button variant="outline" onClick={onCancel} disabled={isChecking}>Cancel</Button><Button onClick={handleSave} disabled={isChecking}>{isChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save</Button></DialogFooter>
      </div>
    );
};

const RemittanceDialogContent = ({ initialData, onConfirm, onCancel, isDeferredFunding }: { initialData?: any, onConfirm: (data: any) => void, onCancel: () => void, isDeferredFunding: boolean; }) => {
    const form = useForm<RemittanceDetailFormData>({
      resolver: zodResolver(RemittanceDetailSchema),
      defaultValues: {
          ...createDefaultRemittanceDetail(),
          ...initialData,
          dateOfRemittance: formatDateForInput(initialData?.dateOfRemittance),
      },
    });

    const handleConfirmSubmit = (data: RemittanceDetailFormData) => {
        onConfirm(data);
    };
    
    const availableRemittanceAccounts = useMemo(() => {
        if (isDeferredFunding) {
            return remittedAccountOptions.filter(o => o === "Plan Fund");
        }
        return remittedAccountOptions.filter(o => o !== "Plan Fund");
    }, [isDeferredFunding]);

    return (
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            e.preventDefault();
            form.handleSubmit(handleConfirmSubmit)(e);
          }}
        >
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>{isDeferredFunding ? 'Administrative Sanction Details' : 'Remittance Details'}</DialogTitle>
                {isDeferredFunding && <DialogDescription className="text-amber-700 bg-amber-100/50 border border-amber-200 rounded-md">The amount entered here is the deferred amount, which the department has already received for this scheme.</DialogDescription>}
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
                <div className={cn("grid grid-cols-1 gap-4", isDeferredFunding ? "md:grid-cols-2" : "md:grid-cols-3")}>
                    <FormField name="dateOfRemittance" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="amountRemitted" control={form.control} render={({ field }) => ( 
                        <FormItem>
                            <FormLabel>Amount (₹)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    {...field} 
                                    value={field.value ?? ""} 
                                    onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem> 
                    )}/>
                    {!isDeferredFunding && (
                        <FormField name="remittedAccount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select Account"/></SelectTrigger></FormControl>
                            <SelectContent>
                                {availableRemittanceAccounts.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                            </SelectContent></Select><FormMessage /></FormItem> )}/>
                    )}
                </div>
                <FormField name="remittanceRemarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>{isDeferredFunding ? 'AS Remarks' : 'Remittance Remarks'}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Add any remarks for this entry..." /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter className="p-6 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
    </Form>
    );
};

const ReappropriationDialogContent = ({ initialData, onConfirm, onCancel }: { initialData?: any, onConfirm: (data: any) => void, onCancel: () => void }) => {
    const { allFileEntries, allArsEntries } = useDataStore();
    const form = useForm<ReappropriationDetailFormData>({
      resolver: zodResolver(ReappropriationDetailSchema),
      defaultValues: {
          ...createDefaultReappropriationDetail(),
          ...initialData,
          date: formatDateForInput(initialData?.date),
      },
    });

    const handleConfirmSubmit = (data: ReappropriationDetailFormData) => {
        onConfirm(data);
    };

    const watchedPageType = useWatch({ control: form.control, name: "pageType" });
    const watchedFileNo = useWatch({ control: form.control, name: "refFileNo" });

    const suggestions = useMemo(() => {
        if (!watchedPageType) return [];
        
        let filtered: string[] = [];
        if (watchedPageType === 'ARS') {
            filtered = allArsEntries.map(e => e.fileNo).filter(Boolean);
        } else {
            const source = allFileEntries.filter(entry => {
                const appType = entry.applicationType as any;
                if (watchedPageType === "Deposit Work") return PUBLIC_DEPOSIT_APPLICATION_TYPES.includes(appType) || PRIVATE_APPLICATION_TYPES.includes(appType) || COLLECTOR_APPLICATION_TYPES.includes(appType) || PLAN_FUND_APPLICATION_TYPES.includes(appType);
                
                const hasInvestigation = entry.siteDetails?.some(s => s.purpose === 'GW Investigation');
                const hasLoggingPumping = entry.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any));
                
                if (watchedPageType === "GW Investigation") return hasInvestigation && !hasLoggingPumping;
                if (watchedPageType === "Logging & Pumping Test") return hasLoggingPumping && !hasInvestigation;
                
                return false;
            });
            filtered = source.map(e => e.fileNo).filter(Boolean);
        }
        return Array.from(new Set(filtered)).sort();
    }, [watchedPageType, allFileEntries, allArsEntries]);

    useEffect(() => {
        if (!watchedPageType || !watchedFileNo) {
            form.setValue('fileDetails', '');
            return;
        }

        let foundEntry: any = null;
        if (watchedPageType === 'ARS') {
            foundEntry = allArsEntries.find(e => e.fileNo?.toLowerCase().trim() === watchedFileNo.toLowerCase().trim());
        } else {
            foundEntry = allFileEntries.find(e => e.fileNo?.toLowerCase().trim() === watchedFileNo.toLowerCase().trim());
        }

        if (foundEntry) {
            let details = '';
            if (watchedPageType === 'ARS') {
                details = `Site: ${foundEntry.nameOfSite || 'N/A'}\nScheme: ${foundEntry.arsTypeOfScheme || 'N/A'}`;
            } else {
                details = (foundEntry.siteDetails || []).map((s: any) => `Site: ${s.nameOfSite || 'N/A'} (${s.purpose || 'N/A'})`).join('\n');
            }
            form.setValue('fileDetails', details || 'No site details found.');
        } else {
            form.setValue('fileDetails', 'File not found in database.');
        }
    }, [watchedPageType, watchedFileNo, allFileEntries, allArsEntries, form]);

    const pageTypeOptions = [
        "Deposit Work",
        "GW Investigation",
        "Logging & Pumping Test"
    ];

    return (
      <Form {...form}>
        <form onSubmit={(e) => { e.stopPropagation(); e.preventDefault(); form.handleSubmit(handleConfirmSubmit)(e); }}>
            <DialogHeader className="p-6 pb-4">
                <DialogTitle>Re-appropriation Details</DialogTitle>
                <DialogDescription>Track funds transferred from this file to another file.</DialogDescription>
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField name="date" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Date <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField name="pageType" control={form.control} render={({ field }) => ( 
                        <FormItem>
                            <FormLabel>Type of Page</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {pageTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem> 
                    )}/>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField name="refFileNo" control={form.control} render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>File No. <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input list="file-no-suggestions" placeholder="e.g., GWD/KLM/123" {...field} />
                                </FormControl>
                                <datalist id="file-no-suggestions">
                                    {suggestions.map(no => <option key={no} value={no} />)}
                                </datalist>
                                <FormMessage />
                            </FormItem> 
                        )}/>
                        <FormField name="amount" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Amount (₹) <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                </div>
                <FormField name="fileDetails" control={form.control} render={({ field }) => ( 
                    <FormItem>
                        <FormLabel>File Details</FormLabel>
                        <FormControl><Textarea {...field} className="bg-muted resize-none" value={field.value || ""} readOnly disabled/></FormControl>
                        <FormMessage />
                    </FormItem> 
                )}/>
                <FormField name="remarks" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Add any specific reasons or notes..." /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            <DialogFooter className="p-6 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
      </Form>
    );
};

const PaymentDialogContent = ({ initialData, onConfirm, onCancel, isDeferredFunding }: { initialData: any, onConfirm: (data: any) => void, onCancel: () => void, isDeferredFunding: boolean }) => {
    const form = useForm<PaymentDetailFormData>({
      resolver: zodResolver(PaymentDetailSchema),
      defaultValues: {
        ...createDefaultPaymentDetail(),
        ...initialData,
        dateOfPayment: formatDateForInput(initialData?.dateOfPayment),
      },
    });
    
    const { watch } = form;

    const watchedValues = watch([
        "revenueHead",
        "contractorsPayment",
        "gst",
        "incomeTax",
        "kbcwb",
        "refundToParty"
    ]);

    const totalAmount = useMemo(() => {
        return watchedValues.reduce((sum: number, value) => sum + (Number(value) || 0), 0);
    }, [watchedValues]);
    
    const handleConfirmSubmit = (data: PaymentDetailFormData) => {
        onConfirm({ ...data, totalPaymentPerEntry: totalAmount });
    };

    const isLinkedToRemittance = !!initialData?.remittanceId;

    const availablePaymentAccounts = useMemo(() => {
        if (isDeferredFunding) {
            return paymentAccountOptions.filter(o => o === "Plan Fund");
        }
        return paymentAccountOptions.filter(o => o !== "Plan Fund");
    }, [isDeferredFunding]);

    return (
        <Form {...form}>
             <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(handleConfirmSubmit)(e); }}>
                <DialogHeader className="p-6 pb-4 shrink-0">
                    <DialogTitle>Payment Details</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full px-6 py-4">
                      <div className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField name="dateOfPayment" control={form.control} render={({ field }) => <FormItem><FormLabel>Date of Payment <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''} readOnly={isLinkedToRemittance} className={isLinkedToRemittance ? 'bg-muted/50' : ''}/></FormControl><FormMessage /></FormItem>} />
                              {!isDeferredFunding && (
                                <FormField name="paymentAccount" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Account <span className="text-destructive">*</span></FormLabel><Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Account"/></SelectTrigger></FormControl>
                                    <SelectContent>{availablePaymentAccounts.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>} />
                              )}
                          </div>
                          <Separator/>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <FormField 
                                  name="revenueHead" 
                                  control={form.control} 
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Revenue Head (₹)</FormLabel>
                                          <FormControl>
                                              <Input 
                                                  type="number" 
                                                  {...field} 
                                                  value={field.value ?? ""}
                                                  onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} 
                                                  readOnly={isLinkedToRemittance}
                                                  className={isLinkedToRemittance ? 'bg-muted/50' : ''}
                                              />
                                          </FormControl>
                                          {isLinkedToRemittance && <FormDescription className="text-xs">Auto-managed by a &apos;Revenue Head&apos; remittance.</FormDescription>}
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField name="contractorsPayment" control={form.control} render={({ field }) => <FormItem><FormLabel>Contractor&apos;s Payment (₹)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isLinkedToRemittance} className={isLinkedToRemittance ? 'bg-muted/50' : ''}/></FormControl><FormMessage /></FormItem>} />
                              <FormField name="gst" control={form.control} render={({ field }) => <FormItem><FormLabel>GST (₹)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isLinkedToRemittance} className={isLinkedToRemittance ? 'bg-muted/50' : ''}/></FormControl><FormMessage /></FormItem>} />
                              <FormField name="incomeTax" control={form.control} render={({ field }) => <FormItem><FormLabel>Income Tax (₹)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isLinkedToRemittance} className={isLinkedToRemittance ? 'bg-muted/50' : ''}/></FormControl><FormMessage /></FormItem>} />
                              <FormField name="kbcwb" control={form.control} render={({ field }) => <FormItem><FormLabel>KBCWB (₹)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isLinkedToRemittance} className={isLinkedToRemittance ? 'bg-muted/50' : ''}/></FormControl><FormMessage /></FormItem>} />
                              <FormField name="refundToParty" control={form.control} render={({ field }) => <FormItem><FormLabel>Refund to Party (₹)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} readOnly={isLinkedToRemittance} className={isLinkedToRemittance ? 'bg-muted/50' : ''}/></FormControl><FormMessage /></FormItem>} />
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center p-2 rounded-md bg-muted">
                            <span className="font-semibold text-lg">Total</span>
                            <span className="font-semibold text-lg font-mono">
                                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <Separator />
                          <FormField name="paymentRemarks" control={form.control} render={({ field }) => <FormItem><FormLabel>Payment Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Add any remarks for this payment entry..." /></FormControl><FormMessage /></FormItem>} />
                      </div>
                  </ScrollArea>
                </div>
                <DialogFooter className="p-6 pt-4 shrink-0">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="button" onClick={form.handleSubmit(handleConfirmSubmit)}>Save</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};

export default function DataEntryFormComponent({ fileNoToEdit, initialData, supervisorList, userRole, workTypeContext, returnPath, pageToReturnTo, isFormDisabled = false, formOptions = [] }: DataEntryFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fileIdToEdit = searchParams.get("id");
  const approveUpdateId = searchParams.get("approveUpdateId");

  const { addFileEntry, updateFileEntry, moveCopySite } = useFileEntries();
  const { createPendingUpdate } = usePendingUpdates();
  const { toast } = useToast();
  const { user } = useAuth();
  const { allFileEntries, allArsEntries, allLsgConstituencyMaps, allE_tenders, allStaffMembers, allBidders, allRigCompressors } = useDataStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);
  const [reappAccordionValue, setReappAccordionValue] = useState<string | undefined>(undefined);
  const [dialogState, setDialogState] = useState<{ type: null | 'application' | 'remittance' | 'reappropriation' | 'payment' | 'site' | 'reorderSite' | 'viewSite' | 'moveCopySite'; data: any, isView?: boolean }>({ type: null, data: null, isView: false });
  const [isReappInfoOpen, setIsReappInfoOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'remittance' | 'reappropriation' | 'payment' | 'site'; index: number } | null>(null);

  const isEditor = userRole === 'admin' || userRole === 'engineer';
  const isSupervisor = userRole === 'supervisor';
  const isViewer = userRole === 'viewer';
  const isEditing = !!fileNoToEdit;

  const showReappropriation = useMemo(() => {
    if (workTypeContext === 'collector' || workTypeContext === 'private' || workTypeContext === 'planFund') {
        return false;
    }
    return true;
  }, [workTypeContext]);

  const siteDetailsSectionNumber = showReappropriation ? 4 : 3;
  const paymentDetailsSectionNumber = showReappropriation ? 5 : 4;
  const finalDetailsSectionNumber = showReappropriation ? 6 : 5;
  
  const form = useForm<DataEntryFormData>({ resolver: zodResolver(DataEntrySchema), defaultValues: initialData });
  const { control, handleSubmit, setValue, getValues, watch, formState: { isDirty }, reset } = form;
  
  const currentFileNo = watch("fileNo");
  
  const { fields: remittanceFields, append: appendRemittance, remove: removeRemittance, update: updateRemittance } = useFieldArray({ control, name: "remittanceDetails" });
  const { fields: reappropriationFields, append: appendReappropriation, remove: removeReappropriation, update: updateReappropriation } = useFieldArray({ control, name: "reappropriationDetails" });
  const { fields: siteFields, append: appendSite, remove: removeSite, update: updateSite, move: moveSite } = useFieldArray({ control, name: "siteDetails" });
  const { fields: paymentFields, append: appendPayment, remove: removePayment, update: updatePayment, replace: replacePayments } = useFieldArray({ control, name: "paymentDetails" });

  const watchedRemittanceDetails = watch("remittanceDetails");
  const watchedReappropriationDetails = watch("reappropriationDetails");
  const watchedPaymentDetails = watch("paymentDetails");
  const watchedSiteDetails = useWatch({ control, name: "siteDetails" });

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  // AUTOMATIC FILE STATUS DETERMINATION
  useEffect(() => {
    if (!watchedSiteDetails || watchedSiteDetails.length === 0) return;

    const allStatuses = watchedSiteDetails.map(s => s.workStatus).filter(Boolean);
    if (allStatuses.length === 0) return;

    const processingGroup = ["Under Process", "Additional Fund Awaited", "TS Pending"];
    const tenderingGroup = ["Tendered", "Selection Notice Issued", "Work Order Issued"];
    const executionGroup = ["Work in Progress", "Department Rig Allotted", "Work Initiated"];
    const completionGroup = ["Work Failed", "Work Completed", "Completed"];
    const disputeGroup = ["Work Cancelled", "Refund Pending", "To be Refunded"];
    
    const isClosedSite = (s: any) => (s.workStatus === 'Work Completed' || s.workStatus === 'Work Failed') && (Number(s.totalExpenditure) || 0) > 0;
    
    const allFinalGroup = [...completionGroup, ...disputeGroup];
    const partialIndicators = [...allFinalGroup, "Work in Progress"];

    const allIn = (list: any[], group: string[]) => list.length > 0 && list.every(s => group.includes(s));
    const hasAny = (list: any[], group: string[]) => list.some(s => group.includes(s));

    // 1. Check for File Closed (Financial Closure)
    const allSitesClosed = watchedSiteDetails.every(isClosedSite);
    if (allSitesClosed) {
        setValue('fileStatus', 'File Closed', { shouldDirty: true });
        return;
    }

    let calculatedStatus: any = watch('fileStatus');

    // 2. Check for Final States (all sites completed/failed/cancelled/refund)
    if (allIn(allStatuses, allFinalGroup)) {
        const hasCompletion = hasAny(allStatuses, completionGroup);
        const hasDispute = hasAny(allStatuses, disputeGroup);

        if (hasCompletion && hasDispute) {
            calculatedStatus = "Fully Completed Except Disputed";
        } else if (hasCompletion) {
            calculatedStatus = "Fully Completed";
        } else if (hasDispute) {
            calculatedStatus = "Fully Disputed";
        }
    } 
    // 3. Ongoing States
    else if (allIn(allStatuses, processingGroup)) {
        calculatedStatus = "File Under Process";
    } else if (allIn(allStatuses, tenderingGroup)) {
        calculatedStatus = "Tender Process";
    } else if (allIn(allStatuses, executionGroup)) {
        calculatedStatus = "Work Initiated";
    } 
    // 4. Mixed Ongoing/Final States
    else if (hasAny(allStatuses, partialIndicators)) {
        calculatedStatus = "Partially Completed";
    }

    if (calculatedStatus !== getValues('fileStatus')) {
        setValue('fileStatus', calculatedStatus, { shouldDirty: true });
    }
  }, [watchedSiteDetails, setValue, getValues, watch]);

  const autoCredits = useMemo(() => {
    if (!currentFileNo) return [];
    const normalizedFileNo = currentFileNo.toLowerCase().trim();
    const credits: any[] = [];
    allFileEntries.forEach(entry => {
        if (entry.fileNo?.toLowerCase().trim() === normalizedFileNo) return;
        entry.reappropriationDetails?.forEach(reapp => {
            if (reapp.refFileNo?.toLowerCase().trim() === normalizedFileNo) {
                const hasInvestigation = entry.siteDetails?.some(s => s.purpose === 'GW Investigation');
                const hasLoggingPumping = entry.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any));
                let sourcePageType = "Deposit Work";
                if (hasInvestigation && !hasLoggingPumping) sourcePageType = "GW Investigation";
                else if (hasLoggingPumping && !hasInvestigation) sourcePageType = "Logging & Pumping Test";
                
                const parentRemittanceAccount = entry.remittanceDetails?.[0]?.remittedAccount || 'N/A';

                credits.push({
                    ...reapp,
                    sourceFileNo: entry.fileNo,
                    sourceApplicantName: entry.applicantName,
                    sourcePageType: sourcePageType,
                    parentRemittanceAccount: parentRemittanceAccount
                });
            }
        });
    });
    return credits;
  }, [currentFileNo, allFileEntries]);
  
  const sortedCombinedReappropriations = useMemo(() => {
    const manual = reappropriationFields.map((field, index) => ({
        ...field,
        _originalIndex: index,
        _source: 'manual' as const,
        dateObj: toDateOrNull(field.date)
    }));
    const auto = autoCredits.map((credit) => ({
        ...credit,
        _source: 'auto' as const,
        dateObj: toDateOrNull(credit.date)
    }));
    return [...manual, ...auto].sort((a, b) => {
        const timeA = a.dateObj?.getTime() ?? 0;
        const timeB = b.dateObj?.getTime() ?? 0;
        return timeB - timeA;
    });
  }, [reappropriationFields, autoCredits]);

  const hasReappropriations = useMemo(() => sortedCombinedReappropriations.length > 0, [sortedCombinedReappropriations.length]);

  useEffect(() => {
    if (hasReappropriations) {
      setReappAccordionValue("reappropriation-details");
    } else {
      setReappAccordionValue(undefined);
    }
  }, [hasReappropriations]);

   useEffect(() => {
        const currentRemittances = getValues('remittanceDetails') || [];
        const manualPayments = (getValues('paymentDetails') || []).filter(p => !p.remittanceId);
        
        const autoGeneratedPayments: PaymentDetailFormData[] = [];
        
        currentRemittances.forEach(remittance => {
            if (remittance.remittedAccount === 'Revenue Head' && remittance.id) {
                const amount = Number(remittance.amountRemitted) || 0;
                if (amount > 0) {
                    const newPayment: Partial<PaymentDetailFormData> = {
                        id: `auto-payment-${remittance.id}`,
                        remittanceId: remittance.id,
                        dateOfPayment: remittance.dateOfRemittance,
                        paymentAccount: 'Bank',
                        revenueHead: amount,
                        paymentRemarks: "Auto-entry from remittance to Revenue Head.",
                    };
                    newPayment.totalPaymentPerEntry = calculatePaymentEntryTotalGlobal(newPayment as PaymentDetailFormData);
                    autoGeneratedPayments.push(newPayment as PaymentDetailFormData);
                }
            }
        });
        
        const newPayments = [...manualPayments, ...autoGeneratedPayments];

        if (JSON.stringify((getValues('paymentDetails') || []).map(p => ({...p, id: ''}))) !== JSON.stringify(newPayments.map(p => ({...p, id: ''})))) {
             replacePayments(newPayments);
        }
    }, [watchedRemittanceDetails, getValues, replacePayments]);


  useEffect(() => {
    const totalRemittance = watchedRemittanceDetails?.reduce((sum, item) => {
        return sum + (Number(item.amountRemitted) || 0);
    }, 0) || 0;
    setValue("totalRemittance", totalRemittance);

    const totalReappDebit = watchedReappropriationDetails?.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
    }, 0) || 0;
    setValue("totalReappropriation", totalReappDebit);

    const totalReappCredit = autoCredits.reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
    }, 0);
    setValue("totalReappropriationCredit", totalReappCredit);
    
    const totalPayment = watchedPaymentDetails?.reduce((sum, item) => sum + calculatePaymentEntryTotalGlobal(item), 0) || 0;
    setValue("totalPaymentAllEntries", totalPayment);

    setValue("overallBalance", totalRemittance + totalReappCredit - totalPayment - totalReappDebit);
    
  }, [watchedRemittanceDetails, watchedReappropriationDetails, watchedPaymentDetails, autoCredits, setValue]);

    const paymentFieldsToDisplay = useMemo(() => {
        const fields: { key: keyof PaymentDetailFormData; label: string }[] = [
          { key: 'revenueHead', label: 'Revenue Head (₹)' },
          { key: 'contractorsPayment', label: "Contractor's (₹)" },
          { key: 'gst', label: 'GST (₹)' },
          { key: 'incomeTax', label: 'Income Tax (₹)' },
          { key: 'kbcwb', label: 'KBCWB (₹)' },
          { key: 'refundToParty', label: 'Refund to Party (₹)' }
        ];
        
        return fields.filter(field => 
            paymentFields.some(payment => {
                const value = payment[field.key];
                return typeof value === 'number' && value > 0;
            })
        );
    }, [paymentFields]);

  const onInvalid = (errors: FieldErrors<DataEntryFormData>) => {
    const messages = getFormattedErrorMessages(errors);
    toast({ title: "Validation Error", description: (<ul className="list-disc pl-5 mt-2 space-y-1">{messages.map((msg, i) => <li key={i} className="text-xs">{msg}</li>)}</ul>), variant: "destructive", duration: 10000 });
  };
  
  const onSubmit = async (data: DataEntryFormData) => {
    setIsSubmitting(true);
    try {
        const sanitizedData = {
          ...data,
          constituency: data.constituency === undefined ? null : data.constituency,
        };
        if (!user) throw new Error("Authentication error.");

        // Sort sites: Ongoing (0) -> Completed (1) -> Refund (2)
        if (sanitizedData.siteDetails && sanitizedData.siteDetails.length > 1) {
            const COMPLETED_GROUP: string[] = ["Work Completed", "Bill Prepared", "Payment Completed", "Utilization Certificate Issued", "Work Failed", "Completed", "Work Cancelled"];
            const REFUND_GROUP: string[] = ["To be Refunded", "Refund Pending"];
            
            sanitizedData.siteDetails.sort((a, b) => {
                const getPriority = (status?: string | null) => {
                    if (!status) return 0;
                    if (REFUND_GROUP.includes(status as any)) return 2;
                    if (COMPLETED_GROUP.includes(status as any)) return 1;
                    return 0; // Everything else is "Ongoing"
                };
                return getPriority(a.workStatus) - getPriority(b.workStatus);
            });
        }

        const fileLevelUpdates = {
            fileStatus: sanitizedData.fileStatus,
            remarks: sanitizedData.remarks
        }
        
        if (isSupervisor) {
            await createPendingUpdate(sanitizedData.fileNo, sanitizedData.siteDetails!, user, fileLevelUpdates);
            toast({ title: "Update Submitted" });
            reset(sanitizedData);
        } else if (fileIdToEdit) {
            await updateFileEntry(fileIdToEdit, sanitizedData, approveUpdateId || undefined);
            toast({ title: "File Updated" });
            reset(sanitizedData);
        } else {
            const newDocId = await addFileEntry(sanitizedData);
            toast({ title: "File Created" });
            if (newDocId) {
                router.push(`${pathname}?id=${newDocId}${workTypeContext ? `&workType=${workTypeContext}` : ''}${pageToReturnTo ? `&page=${pageToReturnTo}` : ''}`);
            }
        }
    } catch (error: any) { 
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const openDialog = (type: 'application' | 'remittance' | 'reappropriation' | 'payment' | 'site' | 'reorderSite' | 'viewSite' | 'moveCopySite', data: any, isView: boolean = false) => setDialogState({ type, data, isView });
  const closeDialog = () => setDialogState({ type: null, data: null, isView: false });

    const handleDialogConfirm = (data: any) => {
        const { type, data: originalData } = dialogState;
        if (!type) return;

        if (type === 'application') {
            setValue("fileNo", data.fileNo, { shouldDirty: true });
            setValue("applicantName", data.applicantName, { shouldDirty: true });
            setValue("phoneNo", data.phoneNo, { shouldDirty: true });
            setValue("secondaryMobileNo", data.secondaryMobileNo, { shouldDirty: true });
            setValue("applicationType", data.applicationType, { shouldDirty: true });
        } else if (type === 'remittance') {
            const isEditingRemittance = originalData && originalData.index !== undefined;
            if (isEditingRemittance) {
                updateRemittance(originalData.index, { ...originalData, ...data });
            } else {
                appendRemittance({ ...createDefaultRemittanceDetail(), ...data, id: uuidv4() });
            }
        } else if (type === 'reappropriation') {
            if (originalData.index !== undefined) {
                updateReappropriation(originalData.index, data);
            } else {
                appendReappropriation(data);
            }
        } else if (type === 'payment') {
            const paymentAmount = calculatePaymentEntryTotalGlobal(data);
            const paymentData = { ...data, totalPaymentPerEntry: paymentAmount };
            if (originalData.index !== undefined) {
                updatePayment(originalData.index, paymentData);
            } else {
                appendPayment(paymentData);
            }
        } else if (type === 'site') {
            if (originalData.index !== undefined) updateSite(originalData.index, data); else appendSite(data);
        } else if (type === 'reorderSite') {
            const reorderedSites = data as SiteDetailFormData[];
            replaceSites(reorderedSites);
        }
        closeDialog();
    };

    const replaceSites = useCallback((newSites: SiteDetailFormData[]) => {
        setValue("siteDetails", newSites, { shouldDirty: true });
    }, [setValue]);

    const handleDeleteItem = () => {
        if (!itemToDelete) return;
        const { type, index } = itemToDelete;

        if (type === 'remittance') {
            removeRemittance(index);
        } else if (type === 'reappropriation') {
            removeReappropriation(index);
        } else if (type === 'payment') {
            const paymentToDelete = paymentFields[index];
            if (paymentToDelete.remittanceId) {
                toast({ title: "Action Blocked", description: "This payment entry is linked to a 'Revenue Head' remittance and cannot be deleted directly. Delete the remittance entry instead.", variant: "destructive" });
                setItemToDelete(null);
                return;
            }
            removePayment(index);
        } else if (type === 'site') {
            removeSite(index);
        }
        toast({ title: "Removed locally" });
        setItemToDelete(null);
    };

    const handleMoveCopySiteConfirm = async (op: 'move' | 'copy', targetFileNo: string) => {
        const { index } = dialogState.data;
        if (!fileIdToEdit) return;
        try {
            await moveCopySite(fileIdToEdit, index, op, targetFileNo);
            toast({ title: op === 'move' ? "Site Moved" : "Site Copied" });
        } catch (error: any) {
            toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
        }
    };
    
    const DEPOSIT_WORK_FILE_STATUS_OPTIONS = allFileStatusOptions.filter(
      (status) => !["Pending", "VES Pending", "Completed", "Under Process"].includes(status)
    );

  const isDeferredFunding = workTypeContext === 'planFund' || workTypeContext === 'collector';
  const remittanceTitle = isDeferredFunding ? "2. Administrative Sanction" : "2. Remittance Details";
  const totalRemittanceWatched = watch('totalRemittance');
  const totalReappropriationCreditWatched = watch('totalReappropriationCredit');
  const totalPaymentWatched = watch('totalPaymentAllEntries');
  const totalReappropriationWatched = watch('totalReappropriation');

  const currentModuleKey = useMemo(() => {
    if (workTypeContext === 'public') return 'deposit';
    return workTypeContext || 'deposit';
  }, [workTypeContext]);

  const { activeSites, closedSites, totalActiveEstimate } = useMemo(() => {
    const active: { field: SiteDetailFormData; originalIndex: number }[] = [];
    const closed: { field: SiteDetailFormData; originalIndex: number }[] = [];
    let activeEstimateSum = 0;

    siteFields.forEach((field, index) => {
        const isClosed = (field.workStatus === 'Work Completed' || field.workStatus === 'Work Failed') && (Number(field.totalExpenditure) || 0) > 0;
        if (isClosed) {
            closed.push({ field, originalIndex: index });
        } else {
            active.push({ field, originalIndex: index });
            activeEstimateSum += (Number(field.estimateAmount) || 0);
        }
    });

    return { activeSites: active, closedSites: closed, totalActiveEstimate: activeEstimateSum };
  }, [siteFields]);

  return (
    <FormProvider {...form}>
      <div>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">1. Application Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('application', getValues(), false)} disabled={isSupervisor || isViewer}><Eye className="h-4 w-4 mr-2" />Edit</Button>}</CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"><DetailRow label="File No." value={watch('fileNo')} /><DetailRow label="Applicant Name &amp; Address" value={watch('applicantName')} /><DetailRow label="Phone No." value={watch('phoneNo')} /><DetailRow label="Secondary Mobile No." value={watch('secondaryMobileNo')} /><DetailRow label="Type of Application" value={watch('applicationType') ? applicationTypeDisplayMap[watch('applicationType') as ApplicationType] : ''} /></div></CardContent></Card>
            <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">{remittanceTitle}</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('remittance', createDefaultRemittanceDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Account</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{remittanceFields.length > 0 ? remittanceFields.map((item, index) => (
              <TableRow key={item.id}>
                  <TableCell>{item.dateOfRemittance ? format(new Date(item.dateOfRemittance), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                  <TableCell>{(Number(item.amountRemitted) || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell>{item.remittedAccount}</TableCell>
                  <TableCell>{item.remittanceRemarks}</TableCell>
                  {isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('remittance', { index, ...item }, false)}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'remittance', index})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}
              </TableRow>)) : <TableRow><TableCell colSpan={5} className="text-center h-24">No details added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={isEditor && !isFormDisabled ? 4 : 3} className="text-right font-bold">Total Remittance</TableCell><TableCell className="font-bold text-right">₹{totalRemittanceWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell></TableRow></TableFooterComponent></Table></CardContent></Card>
            
            {showReappropriation && (
                <Accordion type="single" collapsible className="w-full" value={reappAccordionValue} onValueChange={setReappAccordionValue}><AccordionItem value="reappropriation-details" className="border-b-0"><Card><div className="flex items-center justify-between border-b"><div className="flex-1"><AccordionTrigger className="w-full p-6 hover:no-underline [&[data-state=open]]:border-b-0"><CardTitle className="text-xl">3. Re-appropriation Details</CardTitle></AccordionTrigger></div><div className="flex items-center gap-2 pr-6 z-10 shrink-0"><Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setIsReappInfoOpen(true); }}><Info className="h-4 w-4 mr-2" />Info</Button>{isEditor && !isFormDisabled && (<Button type="button" variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openDialog('reappropriation', createDefaultReappropriationDetail()); }} disabled={isSupervisor || isViewer}><PlusCircle className="mr-2 h-4 w-4" />Add</Button>)}</div></div><AccordionContent><CardContent className="pt-6"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type of Page</TableHead><TableHead>File No</TableHead><TableHead>File Details</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Debit</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{sortedCombinedReappropriations.length > 0 ? sortedCombinedReappropriations.map((item, index) => {
                    if (item._source === 'auto') return (<TableRow key={`credit-${index}`} className="bg-green-50/50"><TableCell className="whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : 'N/A'}</TableCell><TableCell className="text-xs">{item.sourcePageType || 'N/A'}</TableCell><TableCell className="font-mono text-xs">{item.sourceFileNo}</TableCell><TableCell className="text-xs whitespace-normal break-words">{item.sourceApplicantName || 'N/A'}<br/><span className="font-semibold text-muted-foreground">({item.parentRemittanceAccount})</span></TableCell><TableCell className="text-right font-bold text-green-600">{(Number(item.amount) || 0).toLocaleString('en-IN')}</TableCell><TableCell className="text-right font-bold text-muted-foreground">-</TableCell><TableCell className="text-xs italic max-w-[150px] whitespace-normal break-words">{item.remarks}</TableCell>{isEditor && !isFormDisabled && <TableCell className="text-center"><TooltipProvider><Tooltip><TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground mx-auto" /></TooltipTrigger><TooltipContent><p>Inward transfer from another file. Non-editable.</p></TooltipContent></Tooltip></TooltipProvider></TableCell>}</TableRow>);
                    else return (<TableRow key={item.id}><TableCell className="whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : 'N/A'}</TableCell><TableCell className="text-xs">{item.pageType || 'N/A'}</TableCell><TableCell className="font-mono text-xs">{item.refFileNo}</TableCell><TableCell className="text-xs max-w-[200px] whitespace-normal break-words">{item.fileDetails || 'N/A'}</TableCell><TableCell className="text-right font-bold text-muted-foreground">-</TableCell><TableCell className="text-right font-bold text-red-600">{(Number(item.amount) || 0).toLocaleString('en-IN')}</TableCell><TableCell className="text-xs italic max-w-[150px] whitespace-normal break-words">{item.remarks}</TableCell>{isEditor && !isFormDisabled && <TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => openDialog('reappropriation', { index: item._originalIndex, ...item })} disabled={isSupervisor || isViewer}><Eye className="h-4 w-4"/></Button><Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'reappropriation', index: item._originalIndex})} disabled={isSupervisor || isViewer}><Trash2 className="h-4 w-4"/></Button></div></TableCell>}</TableRow>);
                    }) : <TableRow><TableCell colSpan={8} className="text-center h-24">No details added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow className="bg-muted/50 font-bold"><TableCell colSpan={4} className="text-right font-bold">Totals</TableCell><TableCell className="text-right text-green-600 font-bold">₹{(totalReappropriationCreditWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TableCell><TableCell className="text-right text-red-600 font-bold">₹{(totalReappropriationWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell><TableCell colSpan={isEditor && !isFormDisabled ? 2 : 1} className="text-right font-bold">Balance: <span className={cn((totalReappropriationCreditWatched - totalReappropriationWatched) >= 0 ? "text-green-600" : "text-red-600")}>₹{Math.abs(totalReappropriationCreditWatched - totalReappropriationWatched).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></TableCell></TableRow></TableFooterComponent></Table></div></CardContent></AccordionContent></Card></AccordionItem></Accordion>
            )}

            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="text-xl">{siteDetailsSectionNumber}. Site Details</CardTitle>
                    </div>
                    {isEditor && !isFormDisabled && (
                        <Button type="button" onClick={() => openDialog('site', {})} disabled={isSupervisor || isViewer}>
                            <PlusCircle className="h-4 w-4 mr-2" />Add Site
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Active Sites Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-green-600" />
                                <h3 className="font-bold text-base text-green-700 uppercase tracking-wide">Active Sites ({activeSites.length})</h3>
                            </div>
                            <div className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                Total Estimate: ₹{totalActiveEstimate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <Accordion type="single" collapsible className="w-full space-y-2" value={activeAccordionItem} onValueChange={setActiveAccordionItem}>
                            {activeSites.length > 0 ? activeSites.map((site, index) => (
                                <AccordionItem key={site.field.id} value={`site-${site.originalIndex}`} className="border bg-background rounded-lg shadow-sm">
                                    <div className="flex items-center justify-between pr-4">
                                        <div className="flex-1">
                                            <AccordionTrigger className="text-base font-semibold px-4 group hover:no-underline focus-visible:outline-none">
                                                <div className={cn("text-left", getStatusColorClass(site.field.workStatus))}>
                                                    Site #{index + 1}: {site.field.nameOfSite || "Unnamed Site"} ({site.field.purpose || 'N/A'})
                                                </div>
                                            </AccordionTrigger>
                                        </div>
                                        <div className="flex items-center space-x-1 ml-2 shrink-0 z-10 relative">
                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('site', { index: site.originalIndex, ...site.field }, !!dialogState.isView || !!isFormDisabled || isViewer); }}><Eye className="h-4 w-4"/></Button>
                                            </TooltipTrigger><TooltipContent><p>View / Edit Site</p></TooltipContent></Tooltip></TooltipProvider>
                                            {!isFormDisabled && !isViewer && (
                                                <>
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('moveCopySite', { index: site.originalIndex, name: site.field.nameOfSite }); }}><Move className="h-4 w-4"/></Button>
                                                    </TooltipTrigger><TooltipContent><p>Move or Copy Site</p></TooltipContent></Tooltip></TooltipProvider>
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete({type: 'site', index: site.originalIndex}); }}><Trash2 className="h-4 w-4" /></Button>
                                                    </TooltipTrigger><TooltipContent><p>Delete Site</p></TooltipContent></Tooltip></TooltipProvider>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <AccordionContent className="p-6 pt-0">
                                        <div className="border-t pt-6 space-y-4">
                                            <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
                                                <DetailRow label="Purpose" value={site.field.purpose} />
                                                <DetailRow label="Status" value={site.field.workStatus} />
                                                <DetailRow label="Contractor" value={site.field.contractorName} />
                                                <DetailRow label="Supervisor" value={site.field.supervisorName} />
                                            </dl>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )) : (
                                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg bg-secondary/10">No active sites added.</div>
                            )}
                        </Accordion>
                    </div>

                    {/* Closed Sites Section */}
                    {closedSites.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b">
                                <CheckCircle2 className="h-5 w-5 text-red-600" />
                                <h3 className="font-bold text-base text-red-700 uppercase tracking-wide">Closed Sites ({closedSites.length})</h3>
                            </div>
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                {closedSites.map((site, index) => (
                                    <AccordionItem key={site.field.id} value={`closed-site-${site.originalIndex}`} className="border bg-background rounded-lg shadow-sm">
                                        <div className="flex items-center justify-between pr-4">
                                            <div className="flex-1">
                                                <AccordionTrigger className="text-base font-semibold px-4 group opacity-80 hover:no-underline focus-visible:outline-none">
                                                    <div className="text-left text-red-700">
                                                        Site #{index + 1}: {site.field.nameOfSite || "Unnamed Site"} ({site.field.purpose || 'N/A'})
                                                    </div>
                                                </AccordionTrigger>
                                            </div>
                                            <div className="flex items-center space-x-1 ml-2 shrink-0 z-10 relative">
                                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDialog('site', { index: site.originalIndex, ...site.field }, !!dialogState.isView || !!isFormDisabled || isViewer); }}><Eye className="h-4 w-4"/></Button>
                                                </TooltipTrigger><TooltipContent><p>View Details</p></TooltipContent></Tooltip></TooltipProvider>
                                                {!isFormDisabled && !isViewer && (
                                                    <>
                                                        <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setItemToDelete({type: 'site', index: site.originalIndex}); }}><Trash2 className="h-4 w-4" /></Button>
                                                        </TooltipTrigger><TooltipContent><p>Delete Site</p></TooltipContent></Tooltip></TooltipProvider>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <AccordionContent className="p-6 pt-0">
                                            <div className="border-t pt-6 space-y-4">
                                                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4">
                                                    <DetailRow label="Purpose" value={site.field.purpose} />
                                                    <DetailRow label="Status" value={site.field.workStatus} />
                                                    <DetailRow label="Total Expenditure (₹)" value={site.field.totalExpenditure} />
                                                    <DetailRow label="Completion Date" value={site.field.dateOfCompletion} />
                                                </dl>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card><CardHeader className="flex flex-row justify-between items-start"><div><CardTitle className="text-xl">{paymentDetailsSectionNumber}. Payment Details</CardTitle></div>{isEditor && !isFormDisabled && <Button type="button" onClick={() => openDialog('payment', createDefaultPaymentDetail())} disabled={isSupervisor || isViewer}><PlusCircle className="h-4 w-4 mr-2" />Add</Button>}</CardHeader><CardContent><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Acct.</TableHead>
                {paymentFieldsToDisplay.map(field => (
                    <TableHead key={field.key} className="text-right">{field.label}</TableHead>
                ))}
            <TableHead className="text-right">Total (₹)</TableHead><TableHead>Remarks</TableHead>{isEditor && !isFormDisabled && <TableHead>Actions</TableHead>}</TableRow></TableHeader><TableBody>{paymentFields.length > 0 ? paymentFields.map((item, index) => (
                <TableRow key={item.id} className={item.remittanceId ? 'bg-muted/50' : ''}>
                    <TableCell>{item.dateOfPayment ? format(new Date(item.dateOfPayment), 'dd/MM/yy') : 'N/A'}</TableCell>
                    <TableCell>{item.remittanceId ? 'Revenue Head' : item.paymentAccount}</TableCell>
                    {paymentFieldsToDisplay.map(field => (
                        <TableCell key={field.key} className="text-right">{(Number((item as any)[field.key]) || 0).toLocaleString('en-IN')}</TableCell>
                    ))}
                    <TableCell className="text-right">{(Number(item.totalPaymentPerEntry) || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal break-words">{item.paymentRemarks}</TableCell>
                    {isEditor && !isFormDisabled && (
                        <TableCell>
                            <div className="flex gap-1">
                                {item.remittanceId ? (
                                    <TooltipProvider><Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex w-full justify-center">
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Auto-entry. Cannot be edited or deleted directly.</p></TooltipContent>
                                    </Tooltip></TooltipProvider>
                                ) : (
                                    <>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => openDialog('payment', { index, ...item }, false)}><Eye className="h-4 w-4"/></Button>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete({type: 'payment', index})}><Trash2 className="h-4 w-4"/></Button>
                                    </>
                                )}
                            </div>
                        </TableCell>
                    )}
                </TableRow>)) : <TableRow><TableCell colSpan={4 + paymentFieldsToDisplay.length + (isEditor && !isFormDisabled ? 1 : 0)} className="text-center h-24">No payments added.</TableCell></TableRow>}</TableBody><TableFooterComponent><TableRow><TableCell colSpan={2 + paymentFieldsToDisplay.length} className="text-right font-bold">Total Payment</TableCell><TableCell className="font-bold text-right">₹{totalPaymentWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</TableCell><TableCell colSpan={isEditor && !isFormDisabled ? 2 : 1}></TableCell></TableRow></TableFooterComponent></Table></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-xl">{finalDetailsSectionNumber}. Final Details</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 border rounded-lg space-y-4 bg-secondary/30"><h3 className="font-semibold text-lg text-primary">Financial Summary</h3><dl className="space-y-2">
                <div className="flex justify-between items-baseline"><dt>Total Remittance</dt><dd className="font-mono">₹{totalRemittanceWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
                {showReappropriation && (
                    <div className="flex justify-between items-baseline text-green-600 font-semibold"><dt>Total Re-appropriation credit</dt><dd className="font-mono font-bold">₹{(totalReappropriationCreditWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</dd></div>
                )}
                <div className="flex justify-between items-baseline"><dt>Total Payment</dt><dd className="font-mono">₹{totalPaymentWatched?.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
                {showReappropriation && (
                    <div className="flex justify-between items-baseline text-red-600 font-semibold"><dt>Total Re-appropriation debit</dt><dd className="font-mono font-bold">₹{(totalReappropriationWatched || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div>
                )}
                <Separator /><div className="flex justify-between items-baseline font-bold"><dt>Overall Balance</dt><dd className="font-mono text-xl">₹{(watch('overallBalance') || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '0.00'}</dd></div></dl></div><div className="p-4 border rounded-lg space-y-4 bg-secondary/30">
                <FormField control={control} name="fileStatus" render={({ field }) => (
                    <FormItem>
                        <FormLabel>File Status <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={true}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Status determined by sites" /></SelectTrigger></FormControl>
                            <SelectContent>{DEPOSIT_WORK_FILE_STATUS_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormDescription className="text-[10px]">Auto-determined based on site work statuses.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={control} name="remarks" render={({ field }) => <FormItem><FormLabel>Final Remarks</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Final remarks..." readOnly={isViewer || isFormDisabled || isSupervisor} /></FormControl><FormMessage /></FormItem>} /></div></CardContent></Card>
            <CardFooter className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(returnPath)} disabled={isSubmitting}>
                    <X className="mr-2 h-4 w-4" /> Close
                </Button>
                {!(isViewer || isFormDisabled) && (
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        <Save className="mr-2 h-4 w-4"/> {isSubmitting ? "Saving..." : 'Save'}
                    </Button>
                )}
            </CardFooter>
        </form>
        <Dialog open={dialogState.type === 'application'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl"><ApplicationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} formOptions={formOptions} isEditing={isEditing} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'remittance'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl"><RemittanceDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isDeferredFunding={isDeferredFunding} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'reappropriation'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl"><ReappropriationDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'site'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-6xl h-[90vh] flex flex-col p-0"><SiteDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isReadOnly={!!dialogState.isView || !!isFormDisabled} isSupervisor={isSupervisor} supervisorList={supervisorList} allLsgConstituencyMaps={allLsgConstituencyMaps} allE_tenders={allE_tenders} allStaffMembers={allStaffMembers} allBidders={allBidders} allRigCompressors={allRigCompressors} workTypeContext={workTypeContext} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'payment'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-4xl flex flex-col p-0"><PaymentDialogContent initialData={dialogState.data} onConfirm={handleDialogConfirm} onCancel={closeDialog} isDeferredFunding={isDeferredFunding} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'reorderSite'} onOpenChange={closeDialog}><DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-2xl flex flex-col p-0"><ReorderSitesDialog initialData={dialogState.data || []} onConfirm={handleDialogConfirm} onCancel={closeDialog} /></DialogContent></Dialog>
        <Dialog open={dialogState.type === 'moveCopySite'} onOpenChange={closeDialog}>
            <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md">
                <MoveCopySiteDialog 
                    isOpen={dialogState.type === 'moveCopySite'} 
                    onClose={closeDialog} 
                    onConfirm={handleMoveCopySiteConfirm} 
                    siteName={dialogState.data?.name || ''} 
                    currentModule={currentModuleKey}
                    currentFileNo={currentFileNo}
                />
            </DialogContent>
        </Dialog>
        <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>Delete this entry?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={isReappInfoOpen} onOpenChange={setIsReappInfoOpen}>
          <DialogContent className="sm:max-w-md p-0">
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle>Re-appropriation Credit Planning</DialogTitle>
            </DialogHeader>
            <div className="p-6 text-sm text-muted-foreground space-y-3">
              <p>Entry of re-appropriation credits cannot be added manually.</p>
              <p>If this work depends on funds from another file, please first save this file without adding site details. Then, go to the source file and perform an “Outward” re-appropriation, specifying this file number as the target.</p>
              <p>Once the credit appears here, you may return to add the site details.</p>
            </div>
            <DialogFooter className="p-6 pt-4 border-t shrink-0">
              <DialogClose asChild>
                <Button type="button">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FormProvider>
  );
}

function ReorderSitesDialog({ initialData, onConfirm, onCancel }: { initialData: SiteDetailFormData[], onConfirm: (data: SiteDetailFormData[]) => void, onCancel: () => void }) {
    const [sites, setSites] = useState(Array.isArray(initialData) ? [...initialData] : []);

    const move = (fromIndex: number, toIndex: number) => {
        const newSites = [...sites];
        const [movedItem] = newSites.splice(fromIndex, 1);
        newSites.splice(toIndex, 0, movedItem);
        setSites(newSites);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-4 shrink-0 border-b">
                <DialogTitle>Reorder Sites</DialogTitle>
                <DialogDescription>Adjust the sequence of sites using the up and down arrows.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 px-6 py-4">
                <ScrollArea className="h-[50vh]">
                    <div className="space-y-2">
                        {sites.map((site, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                                <div className="flex-1">
                                    <p className="text-sm font-bold">Site #{index + 1}: {site.nameOfSite || 'Unnamed Site'}</p>
                                    <p className="text-xs text-muted-foreground">{site.purpose}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, index - 1)}><ChevronLeft className="h-4 w-4 rotate-90"/></Button>
                                    <Button type="button" variant="ghost" size="icon" disabled={index === sites.length - 1} onClick={() => move(index, index + 1)}><ChevronRight className="h-4 w-4 rotate-90"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="p-6 pt-4 border-t shrink-0">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={() => onConfirm(sites)}>Save Order</Button>
            </DialogFooter>
        </div>
    );
}
