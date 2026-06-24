// src/app/dashboard/super-admin/gwd-rates/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDocs, query, writeBatch, setDoc, orderBy } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { GwdRateItemFormDataSchema, type GwdRateItem, type GwdRateItemFormData, gwdRateCategories } from "@/lib/schemas";
import { z } from 'zod';
import { usePageHeader } from "@/hooks/usePageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useDataStore, type RateDescriptionId, type RateDescriptionDetail } from "@/hooks/use-data-store";
import { useRouter } from "next/navigation";
import { DollarSign, PlusCircle, Trash2, Loader2, Save, X, ShieldAlert, Eye, Move, Clock, History, FileText, Calendar } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";


export const dynamic = 'force-dynamic';

const db = getFirestore(app);
const RATES_COLLECTION = 'gwdRates';
const RATE_DESCRIPTIONS_COLLECTION = 'rateDescriptions';

const calculateFeeForYear = (baseAmount: number, baseYear: number, targetYear: number) => {
    let fee = baseAmount;
    const roundUpToNearest10 = (num: number) => Math.ceil(num / 10) * 10;

    for (let i = baseYear; i < targetYear; i++) {
        fee = roundUpToNearest10(fee * 1.05);
    }
    return fee;
};

const calculateRenewalFee = (baseAmount: number, renewalNum: number) => {
    let fee = baseAmount;
    const roundUpToNearest10 = (num: number) => Math.ceil(num / 10) * 10;
    
    for (let i = 1; i < renewalNum; i++) {
        fee = roundUpToNearest10(fee * 1.05);
    }
    return fee;
};


// Fee Details Dialog Component
const RigFeeDetailsContent = () => {
    const currentYear = new Date().getFullYear();
    const [selectedRegYear, setSelectedRegYear] = useState<number>(currentYear);
    const [selectedRenewalNum, setSelectedRenewalNum] = useState<number>(1);

    const registrationYears = Array.from({ length: 28 }, (_, i) => 2023 + i); // 2023 to 2050
    const renewalNumbers = Array.from({ length: 30 }, (_, i) => i + 1);
    
    const staticFees = [
        { description: 'Application Fee - Agency Registration', amount: 1000 },
        { description: 'Application Fee - Rig Registration', amount: 1000 },
        { description: 'Fine without valid registration as on 24-01-2023', amount: 100000 },
    ];
    
    const registrationFeeItems = [
        { description: 'Agency Registration Fee', baseAmount: 60000, baseYear: 2023 },
        { description: 'Rig Registration Fee - DTH, Rotary, Dismantling Rig, Calyx', baseAmount: 12000, baseYear: 2023 },
        { description: 'Agency Registration Fee - Filterpoint, Hand bore', baseAmount: 15000, baseYear: 2023 },
        { description: 'Rig Registration Fee - Filterpoint, Hand bore', baseAmount: 5000, baseYear: 2023 },
    ];
    
    const renewalFeeItems = [
        { description: 'Rig Registration Renewal Fee - DTH, Rotary, Dismantling Rig, Calyx', baseAmount: 6000 },
        { description: 'Rig Registration Renewal Fee - Filterpoint, Hand bore', baseAmount: 3000 },
    ];
    
    return (
        <div className="space-y-8 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">One-time Fees</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Amount (₹)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staticFees.map(item => (
                                    <TableRow key={item.description}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right font-mono">{item.amount.toLocaleString('en-IN')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Yearly Registration Fees</CardTitle>
                    <CardDescription>Fees with a 5% yearly increment, rounded up to the nearest ₹10.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Label htmlFor="reg-year-select" className="shrink-0">Select Year:</Label>
                        <Select value={String(selectedRegYear)} onValueChange={(val) => setSelectedRegYear(Number(val))}>
                            <SelectTrigger id="reg-year-select" className="w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {registrationYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Fee for {selectedRegYear}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrationFeeItems.map(item => (
                                    <TableRow key={item.description}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {calculateFeeForYear(item.baseAmount, item.baseYear, selectedRegYear).toLocaleString('en-IN')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Yearly Renewal Fees</CardTitle>
                    <CardDescription>Renewal fees with a 5% yearly increment, rounded up to the nearest ₹10.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <Label htmlFor="renewal-num-select" className="shrink-0">Select Renewal:</Label>
                        <Select value={String(selectedRenewalNum)} onValueChange={(val) => setSelectedRenewalNum(Number(val))}>
                            <SelectTrigger id="renewal-num-select" className="w-[180px]">
                                <SelectValue placeholder="Select Renewal No." />
                            </SelectTrigger>
                            <SelectContent>
                                {renewalNumbers.map(num => <SelectItem key={num} value={String(num)}>{num}{num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Renewal</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Fee for Renewal #{selectedRenewalNum}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renewalFeeItems.map(item => (
                                    <TableRow key={item.description}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {calculateRenewalFee(item.baseAmount, selectedRenewalNum).toLocaleString('en-IN')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const RateCategoryTable = ({ title, items, canManage, handleOpenItemForm, setItemToReorder, setItemToDelete }: { title: string, items: GwdRateItem[], canManage: boolean, handleOpenItemForm: (item: GwdRateItem | null) => void, setItemToReorder: (item: GwdRateItem) => void, setItemToDelete: (item: GwdRateItem | null) => void }) => {
    return (
        <AccordionItem value={title.toLowerCase().replace(/ /g, '-').replace(/[."()]/g, '')} className="border rounded-lg bg-background">
            <AccordionTrigger className="text-lg font-semibold text-primary p-4 hover:no-underline">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {title} <Badge variant="secondary">{items.length}</Badge>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
                <div className="border-t p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Sl. No.</TableHead>
                                <TableHead>Name of Item</TableHead>
                                <TableHead className="text-right">Rate (₹)</TableHead>
                                {canManage && <TableHead className="w-[140px] text-center">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length > 0 ? items.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{item.itemName}</TableCell>
                                    <TableCell className="text-right">{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    {canManage && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenItemForm(item)}><Eye className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => setItemToReorder(item)}><Move className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setItemToDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={canManage ? 4 : 3} className="text-center h-24 text-muted-foreground">No items in this category.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
};


export default function GwdRatesPage() {
  const { setHeader } = usePageHeader();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { allRateDescriptions, allRateDescriptionDetails, refetchRateDescriptions } = useDataStore();
  const router = useRouter();


  const [rateItems, setRateItems] = useState<GwdRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GwdRateItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GwdRateItem | null>(null);
  const [itemToReorder, setItemToReorder] = useState<GwdRateItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = user?.role === 'superAdmin';
  
  const [editingRate, setEditingRate] = useState<{id: RateDescriptionId, title: string} | null>(null);

  useEffect(() => {
    setHeader('GWD Rates', 'A master list of all standard items and their approved rates used by the department.');
  }, [setHeader]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const itemsQuery = query(collection(db, RATES_COLLECTION), orderBy("order"));
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const items = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();
        return {
          id: doc.id,
          itemName: data.itemName || "",
          rate: data.rate ?? 0,
          order: data.order,
          category: data.category,
          createdAt,
          updatedAt,
        } as GwdRateItem;
      });
      
      const finalItems = items.map((item, index) => ({...item, order: item.order ?? index}));
      setRateItems(finalItems);
      
    } catch (error: any) {
      console.error("Firestore Error (GWD Rates): ", error);
      if (error.code === 'resource-exhausted') {
        toast({ title: "Quota Exceeded", description: "The database has reached its usage limit for today. Please try again later.", variant: "destructive", duration: 9000 });
      } else {
        toast({ title: "Error Loading Data", description: "Could not load rate data. Check permissions or data integrity.", variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading, fetchData]);

  const itemForm = useForm<GwdRateItemFormData>({ resolver: zodResolver(GwdRateItemFormDataSchema) });

  const handleOpenItemForm = (item: GwdRateItem | null) => {
    if (!canManage) return;
    setEditingItem(item);
    itemForm.reset(item ? { itemName: item.itemName, rate: item.rate, category: item.category } : { itemName: "", rate: undefined, category: undefined });
    setIsItemFormOpen(true);
  };

  const onItemFormSubmit = async (data: GwdRateItemFormData) => {
    if (!canManage) {
        toast({ title: "Permission Denied", description: "You do not have permission to perform this action.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        itemName: data.itemName,
        rate: Number(data.rate),
        category: data.category,
      };

      if (editingItem) {
        const itemDocRef = doc(db, RATES_COLLECTION, editingItem.id);
        await updateDoc(itemDocRef, { ...payload, updatedAt: serverTimestamp() });
        toast({ title: "Item Updated", description: "The rate item has been successfully updated." });
      } else {
        const newOrder = rateItems.length > 0 ? Math.max(...rateItems.map(item => item.order ?? -1)) + 1 : 0;
        await addDoc(collection(db, RATES_COLLECTION), { ...payload, order: newOrder, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: "Item Added", description: "The new rate item has been added." });
      }
      setIsItemFormOpen(false);
      setEditingItem(null);
      await fetchData();
    } catch (error: any) {
      console.error("Item form submission error:", error);
      toast({ title: "Error", description: error.message || "Could not save the item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!canManage || !itemToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, RATES_COLLECTION, itemToDelete.id));
      toast({ title: "Item Deleted", description: `"${itemToDelete.itemName}" has been removed.` });
      setItemToDelete(null);
      await fetchData();
    } catch (error: any) {
      console.error("Item deletion error:", error);
      toast({ title: "Error", description: error.message || "Could not delete the item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenRateDescriptionEditor = (id: RateDescriptionId, title: string, section?: 'works' | 'purchase') => {
    if (!canManage) return;
    setEditingRate({ id, title, section });
  };
  
  const handleSaveRateDescription = async (
    newDescription: string, 
    newRate?: string, 
    effectiveDate?: Date,
    orderNo?: string,
    orderDate?: Date,
    effectiveTo?: Date,
    structuredData?: any
  ) => {
    if (!editingRate || !canManage) return;

    setIsSubmitting(true);
    try {
        const docRef = doc(db, RATE_DESCRIPTIONS_COLLECTION, editingRate.id);
        const currentDetail = allRateDescriptionDetails[editingRate.id];
        
        let history = currentDetail?.history || [];
        
        // Updated logic: Only create a history entry if "effectiveTo" (With Effect To) date is provided.
        // This signifies the current rate is ending and should be archived.
        if (currentDetail && effectiveTo) {
            history = [
                {
                    description: currentDetail.description || '',
                    rate: currentDetail.rate || '',
                    orderNo: currentDetail.orderNo || '',
                    orderDate: currentDetail.orderDate || null,
                    effectiveDate: currentDetail.effectiveDate || (currentDetail.updatedAt ? (currentDetail.updatedAt instanceof Timestamp ? currentDetail.updatedAt.toDate() : new Date(currentDetail.updatedAt)) : new Date()),
                    effectiveTo: Timestamp.fromDate(effectiveTo),
                    structuredData: currentDetail.structuredData || null,
                    updatedAt: new Date(),
                },
                ...history
            ];
        }

        let updatedData: any = {
            orderNo: orderNo || '',
            orderDate: orderDate ? Timestamp.fromDate(orderDate) : null,
            effectiveDate: effectiveDate ? Timestamp.fromDate(effectiveDate) : serverTimestamp(),
            effectiveTo: effectiveTo ? Timestamp.fromDate(effectiveTo) : null,
            history: history,
            updatedAt: serverTimestamp() 
        };

        if (effectiveTo) {
            // Clear current fields because this rate is now archived
            updatedData.description = "";
            updatedData.rate = "";
            updatedData.orderNo = "";
            updatedData.orderDate = null;
            updatedData.effectiveDate = serverTimestamp();
            updatedData.effectiveTo = null;
            updatedData.structuredData = null;
        } else if (editingRate.section) {
            // Partial update for structured data
            const existingStructuredData = currentDetail?.structuredData || { works: [], purchase: [] };
            const newStructuredData = { 
                works: Array.isArray(existingStructuredData.works) ? existingStructuredData.works : [], 
                purchase: Array.isArray(existingStructuredData.purchase) ? existingStructuredData.purchase : [],
                worksMetadata: existingStructuredData.worksMetadata || null,
                purchaseMetadata: existingStructuredData.purchaseMetadata || null
            };

            const sectionMetadata = {
                orderNo: orderNo || '',
                orderDate: orderDate ? Timestamp.fromDate(orderDate) : null,
                effectiveDate: effectiveDate ? Timestamp.fromDate(effectiveDate) : serverTimestamp(),
                effectiveTo: null,
            };

            if (editingRate.section === 'works') {
                newStructuredData.works = structuredData?.works || [];
                newStructuredData.worksMetadata = sectionMetadata;
            } else {
                newStructuredData.purchase = structuredData?.purchase || [];
                newStructuredData.purchaseMetadata = sectionMetadata;
            }
            updatedData.structuredData = newStructuredData;
            
            // Re-generate description
            const rateTitle = editingRate.id === 'tenderFee' ? 'Tender Fee' : 'EMD';
            let desc = `${rateTitle} For Works:\n`;
            newStructuredData.works.forEach((row: any) => {
                desc += `- ${row.label}: ${row.rate || "N/A"}\n`;
            });
            desc += `\n${rateTitle} For Purchase:\n`;
            newStructuredData.purchase.forEach((row: any) => {
                desc += `- ${row.label}: ${row.rate || "N/A"}\n`;
            });
            updatedData.description = desc;
            updatedData.rate = '';
        } else {
            updatedData.description = newDescription;
            updatedData.rate = newRate || '';
            updatedData.structuredData = structuredData || null;
        }

        // Deeply clean undefined values just in case
        const cleanForFirestore = (obj: any): any => {
            if (obj === undefined) return null;
            if (obj === null || typeof obj !== 'object' || obj instanceof Timestamp || obj instanceof Date) return obj;
            if (Array.isArray(obj)) return obj.map(cleanForFirestore);
            
            const cleaned: any = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = cleanForFirestore(obj[key]);
                    if (value !== undefined) {
                        cleaned[key] = value;
                    }
                }
            }
            return cleaned;
        };

        await setDoc(docRef, cleanForFirestore(updatedData), { merge: true });
        
        refetchRateDescriptions();
        toast({ title: `${editingRate.title} Updated`, description: 'The rate and history have been updated.' });
    } catch (error: any) {
        console.error("Error saving rate description:", error);
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setEditingRate(null);
        setIsSubmitting(false);
    }
  };

  const handleDeleteHistory = async (rateId: RateDescriptionId, historyIndex: number) => {
    if (!canManage) return;
    
    // Deeply clean undefined values for Firestore
    const cleanForFirestore = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null || typeof obj !== 'object' || obj instanceof Timestamp || obj instanceof Date) return obj;
        if (Array.isArray(obj)) return obj.map(cleanForFirestore);
        
        const cleaned: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = cleanForFirestore(obj[key]);
                if (value !== undefined) {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    };

    setIsSubmitting(true);
    try {
        const docRef = doc(db, RATE_DESCRIPTIONS_COLLECTION, rateId);
        const currentDetail = allRateDescriptionDetails[rateId];
        if (!currentDetail?.history) return;
        
        const newHistory = [...currentDetail.history];
        newHistory.splice(historyIndex, 1);
        
        await updateDoc(docRef, { history: cleanForFirestore(newHistory) });
        refetchRateDescriptions();
        toast({ title: "History Deleted", description: "The history entry has been removed." });
    } catch (error: any) {
        console.error("Error deleting history:", error);
        toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditHistory = async (rateId: RateDescriptionId, historyIndex: number) => {
    // For simplicity, we'll swap current with history entry
    if (!canManage) return;
    
    // Deeply clean undefined values for Firestore
    const cleanForFirestore = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null || typeof obj !== 'object' || obj instanceof Timestamp || obj instanceof Date) return obj;
        if (Array.isArray(obj)) return obj.map(cleanForFirestore);
        
        const cleaned: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = cleanForFirestore(obj[key]);
                if (value !== undefined) {
                    cleaned[key] = value;
                }
            }
        }
        return cleaned;
    };

    setIsSubmitting(true);
    try {
        const docRef = doc(db, RATE_DESCRIPTIONS_COLLECTION, rateId);
        const currentDetail = allRateDescriptionDetails[rateId];
        if (!currentDetail?.history) return;
        
        const historyItem = currentDetail.history[historyIndex];
        
        // Swap
        const currentData = {
            description: currentDetail.description || '',
            rate: currentDetail.rate || '',
            orderNo: currentDetail.orderNo || '',
            orderDate: currentDetail.orderDate || null,
            effectiveDate: currentDetail.effectiveDate || new Date(),
            effectiveTo: currentDetail.effectiveTo || null,
            structuredData: currentDetail.structuredData || null,
            updatedAt: new Date(),
        };
        
        const newHistory = [...currentDetail.history];
        newHistory[historyIndex] = currentData;
        
        const updatePayload = {
            description: historyItem.description || '',
            rate: historyItem.rate || '',
            orderNo: historyItem.orderNo || '',
            orderDate: historyItem.orderDate ? Timestamp.fromDate(historyItem.orderDate) : null,
            effectiveDate: historyItem.effectiveDate ? Timestamp.fromDate(historyItem.effectiveDate) : null,
            effectiveTo: historyItem.effectiveTo ? Timestamp.fromDate(historyItem.effectiveTo) : null,
            structuredData: historyItem.structuredData || null,
            history: newHistory,
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(docRef, cleanForFirestore(updatePayload));
        
        refetchRateDescriptions();
        toast({ title: "Restored from History", description: "Current rate has been replaced with history entry." });
    } catch (error: any) {
        console.error("Error restoring history:", error);
        toast({ title: "Restore Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const categorizedItems = useMemo(() => {
      const categories: Record<string, GwdRateItem[]> = {};
      gwdRateCategories.forEach(cat => categories[cat] = []);
      
      rateItems.forEach(item => {
          if (item.category && gwdRateCategories.includes(item.category as any)) {
              categories[item.category].push(item);
          }
      });

      // Sort items within each category
      for (const category in categories) {
          categories[category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }

      return categories;
  }, [rateItems]);

  const handleReorderSubmit = useCallback(async (newPosition: number) => {
    if (!itemToReorder || isSubmitting) return;
    const category = itemToReorder.category;
    if (!category) {
        toast({ title: "Error", description: "Item has no category.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    const categoryItems = categorizedItems[category];
    if (!categoryItems || categoryItems.length === 0) {
        toast({ title: "Error", description: "Category not found or is empty.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const fromIndex = categoryItems.findIndex(i => i.id === itemToReorder.id);
    if (fromIndex === -1) {
        toast({ title: "Error", description: "Item to move not found in its category.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    if (newPosition < 1 || newPosition > categoryItems.length) {
        toast({ title: "Invalid Position", description: `Please enter a number between 1 and ${categoryItems.length}.`, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const reorderedCategoryItems = [...categoryItems];
    const [movedItem] = reorderedCategoryItems.splice(fromIndex, 1);
    reorderedCategoryItems.splice(newPosition - 1, 0, movedItem);

    const originalOrders = categoryItems.map(item => item.order).sort((a,b) => (a ?? 0) - (b ?? 0));

    try {
        const batch = writeBatch(db);
        reorderedCategoryItems.forEach((item, index) => {
            const docRef = doc(db, RATES_COLLECTION, item.id);
            batch.update(docRef, { order: originalOrders[index] });
        });

        await batch.commit();
        setItemToReorder(null);
        toast({ title: "Reorder Successful", description: `Item moved to position ${newPosition} in its category.` });
        await fetchData();
    } catch (error: any) {
        console.error("Could not reorder item:", error);
        toast({ title: "Error Reordering", description: `Could not move item: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }, [itemToReorder, isSubmitting, categorizedItems, toast, fetchData]);


  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user?.isApproved) {
    return (
       <div className="space-y-6 p-6 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="p-4">
          <Tabs defaultValue="gwdRates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gwdRates">GWD Rates</TabsTrigger>
              <TabsTrigger value="rigRegFees">Rig Registration Fee Details</TabsTrigger>
              <TabsTrigger value="eTenderRates">e-Tender Rates</TabsTrigger>
            </TabsList>
            <TabsContent value="gwdRates" className="mt-4">
               <Card>
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Master Rate List</CardTitle>
                        {canManage && <Button size="sm" onClick={() => handleOpenItemForm(null)}><PlusCircle className="mr-2 h-4 w-4"/>Add New Item</Button>}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Accordion type="multiple" className="w-full space-y-4">
                      {gwdRateCategories.map(category => (
                          <RateCategoryTable
                              key={category}
                              title={category}
                              items={categorizedItems[category] || []}
                              canManage={canManage}
                              handleOpenItemForm={handleOpenItemForm}
                              setItemToReorder={setItemToReorder}
                              setItemToDelete={setItemToDelete}
                          />
                      ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="rigRegFees">
              <RigFeeDetailsContent />
            </TabsContent>
            <TabsContent value="eTenderRates">
               <div className="grid grid-cols-1 gap-6 mt-6">
                {(['tenderFee', 'emd', 'performanceGuarantee', 'additionalPerformanceGuarantee', 'stampPaper'] as const).map((id) => (
                    <RateDescriptionCard
                        key={id}
                        rateId={id}
                        title={id === 'tenderFee' ? "Tender Fee" : id === 'emd' ? "Earnest Money Deposit (EMD)" : id === 'performanceGuarantee' ? "Performance Guarantee" : id === 'additionalPerformanceGuarantee' ? "Additional Performance Guarantee" : "Stamp Paper"}
                        detail={allRateDescriptionDetails[id]}
                        onEditClick={canManage ? (section) => handleOpenRateDescriptionEditor(id, id === 'tenderFee' ? "Tender Fee" : id === 'emd' ? "Earnest Money Deposit (EMD)" : id === 'performanceGuarantee' ? "Performance Guarantee" : id === 'additionalPerformanceGuarantee' ? "Additional Performance Guarantee" : "Stamp Paper", section) : undefined}
                        onDeleteHistory={(idx) => handleDeleteHistory(id, idx)}
                        onEditHistory={(idx) => handleEditHistory(id, idx)}
                    />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onItemFormSubmit)} className="space-y-4">
                <FormField name="category" control={itemForm.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                            <SelectContent className="max-h-80">
                                {gwdRateCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField name="itemName" control={itemForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name of Item</FormLabel>
                    <FormControl><Input placeholder="e.g., BWC 110mm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField name="rate" control={itemForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (₹)</FormLabel>
                    <FormControl><Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                      value={field.value ?? ''}
                    /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsItemFormOpen(false)} disabled={isSubmitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the item &quot;{itemToDelete?.itemName}&quot;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {itemToReorder && (
          <Dialog open={!!itemToReorder} onOpenChange={() => setItemToReorder(null)}>
              <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md">
                  <DialogHeader className="p-6 pb-2">
                      <DialogTitle>Move Item</DialogTitle>
                      <DialogDescription>Move &quot;{itemToReorder?.itemName}&quot; to a new position in its category.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const newPosition = parseInt((e.target as any).position.value);
                      handleReorderSubmit(newPosition);
                  }}>
                      <div className="p-6 pt-2 space-y-2">
                          <Label htmlFor="position">New Position (1 to {categorizedItems[itemToReorder.category!]?.length || 1})</Label>
                          <Input id="position" type="number" min="1" max={categorizedItems[itemToReorder.category!]?.length || 1} required />
                      </div>
                      <DialogFooter className="p-6 pt-4">
                          <Button type="button" variant="outline" onClick={() => setItemToReorder(null)} disabled={isSubmitting}>Cancel</Button>
                          <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Move"}
                          </Button>
                      </DialogFooter>
                  </form>
              </DialogContent>
          </Dialog>
      )}

      {editingRate && (
        <EditRateDescriptionDialog
            isOpen={!!editingRate}
            onClose={() => setEditingRate(null)}
            title={editingRate.title}
            section={editingRate.section}
            initialDetail={allRateDescriptionDetails[editingRate.id]}
            onSave={handleSaveRateDescription}
            isSaving={isSubmitting}
        />
      )}
    </div>
  );
}

// New component for the rate description card
const RateDescriptionCard = ({ 
    rateId, 
    title, 
    detail, 
    onEditClick,
    onDeleteHistory,
    onEditHistory
}: { 
    rateId: RateDescriptionId;
    title: string; 
    detail: RateDescriptionDetail; 
    onEditClick?: (section?: 'works' | 'purchase') => void;
    onDeleteHistory?: (index: number) => void;
    onEditHistory?: (index: number) => void;
}) => {
    const hasStructuredData = !!detail?.structuredData;
    const isMultiSection = hasStructuredData || rateId === 'tenderFee' || rateId === 'emd';

    return (
        <Card className="border rounded-lg overflow-hidden shadow-sm">
            <CardHeader className="bg-muted/30 border-b py-3 px-4">
                <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-col">
                        <CardTitle className="text-lg font-bold text-primary">{title}</CardTitle>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            {!isMultiSection && detail?.effectiveDate && (
                                <CardDescription className="flex items-center gap-1.5 text-xs">
                                    <Clock className="h-3 w-3" />
                                    Effective: {format(detail.effectiveDate, 'dd-MM-yyyy')}
                                    {detail.effectiveTo && ` to ${format(detail.effectiveTo, 'dd-MM-yyyy')}`}
                                </CardDescription>
                            )}
                            {!isMultiSection && detail?.orderNo && (
                                <CardDescription className="flex items-center gap-1.5 text-xs">
                                    <ShieldAlert className="h-3 w-3" />
                                    Order: {detail.orderNo} {detail.orderDate && `(${format(detail.orderDate, 'dd-MM-yyyy')})`}
                                </CardDescription>
                            )}
                        </div>
                    </div>
                    {onEditClick && !isMultiSection && (
                        <Button variant="outline" size="sm" onClick={() => onEditClick()} className="bg-background">
                            <PlusCircle className="mr-2 h-4 w-4"/>Update Rate
                        </Button>
                    )}
                    {onEditClick && isMultiSection && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => onEditClick('works')} className="bg-background">
                                <PlusCircle className="mr-2 h-4 w-4"/>Update Works
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onEditClick('purchase')} className="bg-background">
                                <PlusCircle className="mr-2 h-4 w-4"/>Update Purchase
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 space-y-4">
                    {!hasStructuredData && detail?.rate && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Current Rate:</span>
                            <span className="text-xl font-bold text-foreground">₹{detail.rate}</span>
                        </div>
                    )}
                    
                    {hasStructuredData ? (
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h5 className="text-xs font-bold text-primary uppercase tracking-tight">{title} - Works Rates</h5>
                                    {(detail.structuredData?.worksMetadata || (!detail.structuredData?.worksMetadata && detail.effectiveDate)) && (
                                        <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-[10px] uppercase font-bold">
                                            {(detail.structuredData?.worksMetadata?.orderNo || detail.orderNo) && (
                                                <span className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                                    <FileText className="h-2.5 w-2.5" />
                                                    Order No: {detail.structuredData?.worksMetadata?.orderNo || detail.orderNo}
                                                </span>
                                            )}
                                            {(detail.structuredData?.worksMetadata?.effectiveDate || detail.effectiveDate) && (
                                                <span className="flex items-center gap-1 bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
                                                    <Calendar className="h-2.5 w-2.5" />
                                                    Effective Date: {format(detail.structuredData?.worksMetadata?.effectiveDate ? (detail.structuredData.worksMetadata.effectiveDate instanceof Timestamp ? detail.structuredData.worksMetadata.effectiveDate.toDate() : new Date(detail.structuredData.worksMetadata.effectiveDate)) : detail.effectiveDate, 'dd-MM-yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="border rounded overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="p-1.5 text-left font-semibold">Range</th>
                                                <th className="p-1.5 text-right font-semibold">Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detail.structuredData?.works?.map((row: any, i: number) => (
                                                <tr key={i} className="border-b last:border-0 odd:bg-background even:bg-muted/10">
                                                    <td className="p-1.5">{row.label}</td>
                                                    <td className="p-1.5 text-right font-medium">{row.rate}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h5 className="text-xs font-bold text-primary uppercase tracking-tight">{title} - Purchase Rates</h5>
                                    {(detail.structuredData?.purchaseMetadata || (!detail.structuredData?.purchaseMetadata && detail.effectiveDate)) && (
                                        <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-[10px] uppercase font-bold">
                                            {(detail.structuredData?.purchaseMetadata?.orderNo || detail.orderNo) && (
                                                <span className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                                    <FileText className="h-2.5 w-2.5" />
                                                    Order No: {detail.structuredData?.purchaseMetadata?.orderNo || detail.orderNo}
                                                </span>
                                            )}
                                            {(detail.structuredData?.purchaseMetadata?.effectiveDate || detail.effectiveDate) && (
                                                <span className="flex items-center gap-1 bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
                                                    <Calendar className="h-2.5 w-2.5" />
                                                    Effective Date: {format(detail.structuredData?.purchaseMetadata?.effectiveDate ? (detail.structuredData.purchaseMetadata.effectiveDate instanceof Timestamp ? detail.structuredData.purchaseMetadata.effectiveDate.toDate() : new Date(detail.structuredData.purchaseMetadata.effectiveDate)) : detail.effectiveDate, 'dd-MM-yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="border rounded overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="p-1.5 text-left font-semibold">Range</th>
                                                <th className="p-1.5 text-right font-semibold">Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detail.structuredData?.purchase?.map((row: any, i: number) => (
                                                <tr key={i} className="border-b last:border-0 odd:bg-background even:bg-muted/10">
                                                    <td className="p-1.5">{row.label}</td>
                                                    <td className="p-1.5 text-right font-medium">{row.rate}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-muted/10 rounded-md p-3 border border-dashed">
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Description</h5>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                {detail?.description || "No description provided."}
                            </p>
                        </div>
                    )}

                    {detail?.history && detail.history.length > 0 && (
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="history" className="border-none">
                                <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <History className="h-4 w-4" />
                                        View Rate History ({detail.history.length})
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2">
                                    <div className="space-y-3">
                                        {detail.history.map((h, i) => (
                                            <div key={i} className="bg-muted/20 rounded p-3 border text-xs space-y-2 group relative">
                                                <div className="flex flex-wrap justify-between items-center gap-2 font-semibold text-primary/80">
                                                    <div className="flex items-center gap-2">
                                                        <span>Eff: {format(h.effectiveDate, 'dd-MM-yyyy')}</span>
                                                        {h.effectiveTo && <span>to {format(h.effectiveTo, 'dd-MM-yyyy')}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {h.orderNo && <span>Order: {h.orderNo}</span>}
                                                        {h.rate && <span>Rate: ₹{h.rate}</span>}
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 absolute top-2 right-2">
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => onEditHistory?.(i)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDeleteHistory?.(i)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{h.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// New component for the edit description dialog
const EditRateDescriptionDialog = ({ isOpen, onClose, title, section, initialDetail, onSave, isSaving }: { isOpen: boolean; onClose: () => void; title: string; section?: 'works' | 'purchase'; initialDetail: RateDescriptionDetail; onSave: (newDescription: string, newRate?: string, effectiveDate?: Date, orderNo?: string, orderDate?: Date, effectiveTo?: Date, structuredData?: any) => void, isSaving: boolean }) => {
    const [description, setDescription] = useState("");
    const [rate, setRate] = useState("");
    const [orderNo, setOrderNo] = useState("");
    const [orderDate, setOrderDate] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [effectiveTo, setEffectiveTo] = useState("");
    
    // Structured data for Tender Fee
    const [worksRows, setWorksRows] = useState<{ label: string, rate: string }[]>([]);
    const [purchaseRows, setPurchaseRows] = useState<{ label: string, rate: string }[]>([]);

    const isTenderFee = title === "Tender Fee";
    const isEMD = title === "Earnest Money Deposit (EMD)";
    const useStructuredData = isTenderFee || isEMD;

    const isPerformanceGuarantee = title === "Performance Guarantee";
    const isAdditionalPerformanceGuarantee = title === "Additional Performance Guarantee";
    const isStampPaper = title === "Stamp Paper";
    const hideRateField = useStructuredData || isPerformanceGuarantee || isAdditionalPerformanceGuarantee || isStampPaper;
    
    useEffect(() => {
        if (isOpen && initialDetail) {
            setDescription(initialDetail.description || "");
            setRate(initialDetail.rate || "");
            
            // Load section specific metadata if editing a section
            const sd = initialDetail.structuredData;
            const sectionMeta = section === 'works' ? sd?.worksMetadata : (section === 'purchase' ? sd?.purchaseMetadata : null);
            
            if (sectionMeta) {
                setOrderNo(sectionMeta.orderNo || "");
                setOrderDate(sectionMeta.orderDate ? format(sectionMeta.orderDate instanceof Timestamp ? sectionMeta.orderDate.toDate() : new Date(sectionMeta.orderDate), 'yyyy-MM-dd') : "");
                setEffectiveDate(sectionMeta.effectiveDate ? format(sectionMeta.effectiveDate instanceof Timestamp ? sectionMeta.effectiveDate.toDate() : new Date(sectionMeta.effectiveDate), 'yyyy-MM-dd') : "");
                setEffectiveTo(sectionMeta.effectiveTo ? format(sectionMeta.effectiveTo instanceof Timestamp ? sectionMeta.effectiveTo.toDate() : new Date(sectionMeta.effectiveTo), 'yyyy-MM-dd') : "");
            } else {
                setOrderNo(initialDetail.orderNo || "");
                setOrderDate(initialDetail.orderDate ? format(initialDetail.orderDate, 'yyyy-MM-dd') : "");
                setEffectiveDate(initialDetail.effectiveDate ? format(initialDetail.effectiveDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
                setEffectiveTo(initialDetail.effectiveTo ? format(initialDetail.effectiveTo, 'yyyy-MM-dd') : "");
            }
            
            if (useStructuredData) {
                if (initialDetail.structuredData) {
                    setWorksRows(initialDetail.structuredData.works || []);
                    setPurchaseRows(initialDetail.structuredData.purchase || []);
                } else if (isTenderFee) {
                    // Default rows for Works
                    setWorksRows([
                        { label: "Upto Rs. 50,000", rate: "No Fee" },
                        { label: "Above Rs. 50,000 - upto Rs. 10 Lakh", rate: "" },
                        { label: "Above Rs. 10 Lakh - upto Rs. 1 crore", rate: "" },
                        { label: "Above Rs. 1 crore - upto Rs. 2 Crore", rate: "" },
                        { label: "Above Rs. 2 crore - upto Rs. 5 crore", rate: "" },
                        { label: "Above Rs. 5 crore - upto Rs. 10 crore", rate: "" },
                        { label: "Above Rs. 10 crore", rate: "" },
                    ]);
                    // Default rows for Purchase
                    setPurchaseRows([
                        { label: "Over 1 Lakh up to 10 Lakhs", rate: "" },
                        { label: "Over 10 Lakhs up to 25 Lakhs", rate: "" },
                        { label: "Above 25 Lakhs", rate: "" },
                    ]);
                } else if (isEMD) {
                    // Default rows for Works EMD
                    setWorksRows([
                        { label: "Up to Rs. 2 Crore", rate: "2.5% (Max Rs. 50,000)" },
                        { label: "Above Rs. 2 Crore up to Rs. 5 Crore", rate: "Rs. 1 Lakh" },
                        { label: "Above Rs. 5 Crore up to Rs. 10 Crore", rate: "Rs. 2 Lakh" },
                        { label: "Above Rs. 10 Crore", rate: "Rs. 5 Lakh" },
                    ]);
                    // Default rows for Purchase EMD
                    setPurchaseRows([
                        { label: "Up to 2 Crore", rate: "1%" },
                        { label: "Above 2 Crore", rate: "No EMD" },
                    ]);
                }
            }
        }
    }, [isOpen, initialDetail, isTenderFee, isEMD, useStructuredData, section]);

    const handleAddWorksRow = () => setWorksRows([...worksRows, { label: "", rate: "" }]);
    const handleRemoveWorksRow = (index: number) => setWorksRows(worksRows.filter((_, i) => i !== index));
    const handleWorksRowChange = (index: number, field: 'label' | 'rate', value: string) => {
        const newRows = [...worksRows];
        newRows[index][field] = value;
        setWorksRows(newRows);
    };

    const handleAddPurchaseRow = () => setPurchaseRows([...purchaseRows, { label: "", rate: "" }]);
    const handleRemovePurchaseRow = (index: number) => setPurchaseRows(purchaseRows.filter((_, i) => i !== index));
    const handlePurchaseRowChange = (index: number, field: 'label' | 'rate', value: string) => {
        const newRows = [...purchaseRows];
        newRows[index][field] = value;
        setPurchaseRows(newRows);
    };

    const handleSave = () => {
        let finalDescription = description;
        let structuredData = null;

        if (useStructuredData) {
            structuredData = { works: worksRows, purchase: purchaseRows };
            // Generate description from structured data for backward compatibility
            let desc = "For Works:\n";
            worksRows.forEach(row => {
                desc += `- ${row.label}: ${row.rate || "N/A"}\n`;
            });
            desc += "\nFor Purchase:\n";
            purchaseRows.forEach(row => {
                desc += `- ${row.label}: ${row.rate || "N/A"}\n`;
            });
            finalDescription = desc;
        }

        onSave(
            finalDescription, 
            hideRateField ? "" : rate,
            effectiveDate ? new Date(effectiveDate) : undefined,
            orderNo,
            orderDate ? new Date(orderDate) : undefined,
            effectiveTo ? new Date(effectiveTo) : undefined,
            structuredData
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle>Update Rate: {title} {section ? `(${section === 'works' ? 'Works' : 'Purchase'})` : ''}</DialogTitle>
                    <DialogDescription>
                        Update the current rate and terms. Previous values will be archived in history.
                    </DialogDescription>
                </DialogHeader>
                <div className="px-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="orderNo">Order No</Label>
                            <Input
                                id="orderNo"
                                value={orderNo}
                                onChange={(e) => setOrderNo(e.target.value)}
                                placeholder="e.g., G.O(P) No. 45/2024/WRD"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="orderDate">Order Date</Label>
                            <Input
                                id="orderDate"
                                type="date"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="effectiveDate">With Effect From</Label>
                            <Input
                                id="effectiveDate"
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="effectiveTo">With Effect To (Optional)</Label>
                            <Input
                                id="effectiveTo"
                                type="date"
                                value={effectiveTo}
                                onChange={(e) => setEffectiveTo(e.target.value)}
                            />
                        </div>
                    </div>

                    {!hideRateField && (
                        <div className="space-y-2">
                            <Label htmlFor="rate">Rate (₹)</Label>
                            <Input
                                id="rate"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                placeholder="e.g., 2500, 5% etc."
                            />
                        </div>
                    )}

                    {useStructuredData ? (
                        <div className="space-y-8">
                            {(!section || section === 'works') && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-md font-bold text-primary">Works Section</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddWorksRow}>
                                            <PlusCircle className="h-4 w-4 mr-2" /> Add Row
                                        </Button>
                                    </div>
                                    <div className="border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="p-2 text-left">Description/Range</th>
                                                    <th className="p-2 text-left w-1/3">Rate (₹)</th>
                                                    <th className="p-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {worksRows.map((row, idx) => (
                                                    <tr key={idx} className="border-b last:border-0">
                                                        <td className="p-2">
                                                            <Input 
                                                                value={row.label} 
                                                                onChange={(e) => handleWorksRowChange(idx, 'label', e.target.value)}
                                                                className="h-8"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <Input 
                                                                value={row.rate} 
                                                                onChange={(e) => handleWorksRowChange(idx, 'rate', e.target.value)}
                                                                className="h-8"
                                                                placeholder="Amount or %"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveWorksRow(idx)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {(!section || section === 'purchase') && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-md font-bold text-primary">Purchase Section</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={handleAddPurchaseRow}>
                                            <PlusCircle className="h-4 w-4 mr-2" /> Add Row
                                        </Button>
                                    </div>
                                    <div className="border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="p-2 text-left">Description/Range</th>
                                                    <th className="p-2 text-left w-1/3">Rate (₹)</th>
                                                    <th className="p-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {purchaseRows.map((row, idx) => (
                                                    <tr key={idx} className="border-b last:border-0">
                                                        <td className="p-2">
                                                            <Input 
                                                                value={row.label} 
                                                                onChange={(e) => handlePurchaseRowChange(idx, 'label', e.target.value)}
                                                                className="h-8"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <Input 
                                                                value={row.rate} 
                                                                onChange={(e) => handlePurchaseRowChange(idx, 'rate', e.target.value)}
                                                                className="h-8"
                                                                placeholder="Amount or %"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemovePurchaseRow(idx)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={8}
                                placeholder="Enter the detailed description of the rate application..."
                            />
                        </div>
                    )}
                </div>
                <DialogFooter className="p-6 pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Update Rate & Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
