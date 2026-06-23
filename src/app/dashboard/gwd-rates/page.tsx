
// src/app/dashboard/gwd-rates/page.tsx
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
import { useDataStore, type RateDescriptionId } from "@/hooks/use-data-store";
import { useRouter } from "next/navigation";
import { DollarSign, PlusCircle, Trash2, Loader2, Save, X, ShieldAlert, Eye } from 'lucide-react';
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

const RateCategoryTable = ({ title, items, canManage, handleOpenItemForm, setItemToDelete }: { title: string, items: GwdRateItem[], canManage: boolean, handleOpenItemForm: (item: GwdRateItem | null) => void, setItemToDelete: (item: GwdRateItem | null) => void }) => {
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
  const { allRateDescriptions, refetchRateDescriptions } = useDataStore();
  const router = useRouter();


  const [rateItems, setRateItems] = useState<GwdRateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GwdRateItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<GwdRateItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = false; // District admins can only view this page
  
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
       <Card className="rounded-lg">
        <CardContent className="p-4">
          <Tabs defaultValue="gwdRates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gwdRates">GWD Rates</TabsTrigger>
              <TabsTrigger value="rigRegFees">Rig Registration Fee Details</TabsTrigger>
              <TabsTrigger value="eTenderRates">e-Tender Rates</TabsTrigger>
            </TabsList>
            <TabsContent value="gwdRates" className="mt-4">
               <Card>
                <CardContent className="pt-6">
                  <Accordion type="multiple" className="w-full space-y-4">
                      {gwdRateCategories.map(category => (
                          <RateCategoryTable
                              key={category}
                              title={category}
                              items={categorizedItems[category] || []}
                              canManage={canManage}
                              handleOpenItemForm={() => {}}
                              setItemToDelete={() => {}}
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
                <RateDescriptionCard
                    title="Tender Fee"
                    description={allRateDescriptions.tenderFee}
                />
                <RateDescriptionCard
                    title="Earnest Money Deposit (EMD)"
                    description={allRateDescriptions.emd}
                />
                <RateDescriptionCard
                    title="Performance Guarantee"
                    description={allRateDescriptions.performanceGuarantee}
                />
                <RateDescriptionCard
                    title="Additional Performance Guarantee"
                    description={allRateDescriptions.additionalPerformanceGuarantee}
                />
                <RateDescriptionCard
                    title="Stamp Paper"
                    description={allRateDescriptions.stampPaper}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// New component for the rate description card
const RateDescriptionCard = ({ title, description, onEditClick }: { title: string; description: string; onEditClick?: () => void }) => (
    <div className="border rounded-lg p-4 bg-background">
        <div className="flex flex-row items-start justify-between mb-2">
            <h4 className="text-lg font-semibold text-foreground">{title}</h4>
            {onEditClick && <Button variant="outline" size="sm" onClick={onEditClick}><Eye className="mr-2 h-4 w-4"/>Update Rate</Button>}
        </div>
        <div className="border-t pt-3">
             <p className="text-sm text-muted-foreground whitespace-pre-wrap" style={{ textAlign: 'justify' }}>{description || "No description provided."}</p>
        </div>
    </div>
);
