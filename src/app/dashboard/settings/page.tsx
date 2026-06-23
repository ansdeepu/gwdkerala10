
// src/app/dashboard/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePageHeader } from '@/hooks/usePageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, doc, writeBatch, updateDoc, getDocs, setDoc, where, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useDataStore } from '@/hooks/use-data-store';
import type { OfficeAddress, LsgConstituencyMap, StaffMember, Designation } from '@/lib/schemas';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ExcelJS from 'exceljs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatCase } from '@/lib/utils';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Loader2, Trash2, Building, FileUp, Download, ShieldAlert, MapPin, Save, X, Info, PlusCircle, Eye } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getInitials } from '@/lib/utils';

const db = getFirestore(app);

const districts = ["Directorate TVM", "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Lab TVM", "Lab EKM", "Lab KKD"];

const OfficeAddressSchema = z.object({
  officeName: z.string().min(1, "Office Name is required."),
  officeLocation: z.string().min(1, "Office Location is required."),
  officeCode: z.string().optional(),
  officeNameMalayalam: z.string().optional(),
  address: z.string().optional(),
  addressMalayalam: z.string().optional(),
  phoneNo: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  districtOfficerStaffId: z.string().optional(),
  districtOfficer: z.string().optional(),
  districtOfficerPhotoUrl: z.string().url().optional().or(z.literal('')).nullable(),
  gstNo: z.string().optional(),
  panNo: z.string().optional(),
  stsbAccountNo: z.string().optional(),
  nameOfTreasury: z.string().optional(),
  bankAccountNo: z.string().optional(),
  nameOfBank: z.string().optional(),
  bankBranch: z.string().optional(),
  bankIfsc: z.string().optional(),
  otherDetails: z.string().optional(),
});
type OfficeAddressFormData = z.infer<typeof OfficeAddressSchema>;

const officerDesignations: Designation[] = [
    "Executive Engineer", "Senior Hydrogeologist", "Assistant Executive Engineer", "Hydrogeologist"
];

const DetailRow = ({ label, value, isUppercase = false }: { label: string, value?: string | number | null, isUppercase?: boolean }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="text-sm">
            <span className="font-medium text-muted-foreground">{label}:</span>{" "}
            <span className={cn("font-semibold text-foreground", isUppercase && "uppercase")}>{value}</span>
        </div>
    );
};

const capitalize = (str?: string | null) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const OfficeAddressDialog = ({ isOpen, onClose, onSubmit, isSubmitting, initialData, staffMembers }: { isOpen: boolean; onClose: () => void; onSubmit: (data: OfficeAddressFormData) => void; isSubmitting: boolean; initialData?: Partial<OfficeAddress> | null; staffMembers: StaffMember[]; }) => {
    const officerList = staffMembers.filter(s => 
        officerDesignations.includes(s.designation as Designation) && s.status === 'Active'
    );
    
    const form = useForm<OfficeAddressFormData>({
        resolver: zodResolver(OfficeAddressSchema),
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                officeName: initialData.officeName ?? '',
                officeLocation: initialData.officeLocation ?? '',
                officeCode: initialData.officeCode ?? '',
                officeNameMalayalam: initialData.officeNameMalayalam ?? '',
                address: initialData.address ?? '',
                addressMalayalam: initialData.addressMalayalam ?? '',
                phoneNo: initialData.phoneNo ?? '',
                email: initialData.email ?? '',
                districtOfficerStaffId: initialData.districtOfficerStaffId ?? '',
                districtOfficer: initialData.districtOfficer ?? '',
                districtOfficerPhotoUrl: initialData.districtOfficerPhotoUrl ?? '',
                gstNo: initialData.gstNo ?? '',
                panNo: initialData.panNo ?? '',
                stsbAccountNo: initialData.stsbAccountNo ?? '',
                nameOfTreasury: initialData.nameOfTreasury ?? '',
                bankAccountNo: initialData.bankAccountNo ?? '',
                nameOfBank: initialData.nameOfBank ?? '',
                bankBranch: initialData.bankBranch ?? '',
                bankIfsc: initialData.bankIfsc ?? '',
                otherDetails: initialData.otherDetails ?? '',
            });
        }
    }, [initialData, form]);

    const handleOfficerChange = (staffId: string) => {
        if (staffId === '_clear_') {
            form.setValue('districtOfficerStaffId', '');
            form.setValue('districtOfficer', '');
            form.setValue('districtOfficerPhotoUrl', '');
            return;
        }
        const selectedStaff = officerList.find(s => s.id === staffId);
        form.setValue('districtOfficerStaffId', staffId);
        form.setValue('districtOfficer', selectedStaff?.name || '');
        form.setValue('districtOfficerPhotoUrl', selectedStaff?.photoUrl || '');
    };
    
    const handleFormSubmit = (data: OfficeAddressFormData) => {
        onSubmit(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-4xl flex flex-col p-0 h-[90vh]">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle>{initialData?.officeName ? 'Edit Office Details' : 'Add New Office Details'}</DialogTitle>
                        <DialogDescription>Fill in the contact and official details for the office.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                        <ScrollArea className="h-full px-6 py-4">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="officeLocation" control={form.control} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Office Location</FormLabel>
                                            <FormControl><Input {...field} value={field.value ?? ''} readOnly className="bg-muted/50" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField
                                      name="officeCode"
                                      control={form.control}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Office Code</FormLabel>
                                          <FormControl>
                                            <Input
                                              {...field}
                                              value={field.value ?? ''}
                                              readOnly
                                              className="bg-muted/50"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <FormField name="officeName" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Office Name</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name="address" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} className="min-h-[80px]" value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                    <div className="space-y-4">
                                        <FormField name="officeNameMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Office Name (In Malayalam)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField name="addressMalayalam" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Address (In Malayalam)</FormLabel><FormControl><Textarea {...field} className="min-h-[80px]" value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
                                    </div>
                                </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField name="districtOfficerStaffId" control={form.control} render={({ field }) => (<FormItem><FormLabel>Name of District Officer</FormLabel><Select onValueChange={(value) => handleOfficerChange(value)} value={field.value || ""}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an Officer" /></SelectTrigger></FormControl>
                                    <SelectContent position="popper">
                                        <SelectItem value="_clear_">-- Clear Selection --</SelectItem>
                                        {officerList.map(officer => <SelectItem key={officer.id} value={officer.id}>{officer.name} ({officer.designation})</SelectItem>)}
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>)}/>
                                <FormField name="phoneNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Phone No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="email" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="gstNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>GST No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                <FormField name="panNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>PAN No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                            <Card className="mt-4">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base">Special Treasury Savings Account</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                    <FormField name="stsbAccountNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Account No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name="nameOfTreasury" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Treasury</FormLabel><FormControl><Input {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )}/>
                                </CardContent>
                            </Card>
                            <Card className="mt-4">
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base">Bank Account</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                                    <FormField name="bankAccountNo" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Account No.</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name="nameOfBank" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Name of Bank</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name="bankBranch" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Branch</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                    <FormField name="bankIfsc" control={form.control} render={({ field }) => ( <FormItem><FormLabel>IFSC</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                                </CardContent>
                            </Card>
                            <FormField name="otherDetails" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Other Details</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter className="p-6 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Save
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
        </Dialog>
    );
};

export default function SettingsPage() {
    const { setHeader } = usePageHeader();
    const { user, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const { allLsgConstituencyMaps, allStaffMembers, officeAddress, allOfficeAddresses, setSelectedOffice, selectedOffice } = useDataStore();
    const isAdmin = user?.role === 'admin';
    const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
    const canManage = isAdmin || isSuperAdmin;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
    const [isClearingData, setIsClearingData] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const router = useRouter();

    const [isListDialogOpen, setIsListDialogOpen] = useState(false);
    const [listDialogContent, setListDialogContent] = useState<{ title: string; items: string[] }>({ title: '', items: [] });
    
    const [mergedOfficeDetails, setMergedOfficeDetails] = useState<Partial<OfficeAddress> | null>(null);

    useEffect(() => {
        setHeader('General Settings', 'Manage dropdown options and other application-wide settings.');
    }, [setHeader]);

    const handleOpenEditDialog = () => {
        if (officeAddress) {
            const detailsToEdit = { ...officeAddress };
            if (!detailsToEdit.address) {
                detailsToEdit.address = "Office of the District Officer\nGround Water Department\nDistrict Office";
            }
            if (!detailsToEdit.addressMalayalam) {
                detailsToEdit.addressMalayalam = "ജില്ലാ ഓഫീസറുടെ കാര്യാലയം\nഭൂജലവകുപ്പ്\nജില്ലാ ഓഫീസ്";
            }
            setMergedOfficeDetails(detailsToEdit);
            setIsOfficeDialogOpen(true);
        } else {
            toast({ title: "No Office Data", description: "Office details are not available to edit.", variant: "destructive" });
        }
    };


    const handleOfficeSubmit = async (data: OfficeAddressFormData) => {
        if (!canManage || !officeAddress) return;
        
        setIsSubmitting(true);
        try {
            const payload: { [key: string]: any } = { 
              ...data,
              officeName: formatCase(data.officeName) ?? data.officeName,
              address: formatCase(data.address) ?? data.address,
            };
            
            // We use a fixed document ID "settings" in the sub-collection to ensure consistency
            // However, keeping them for redundancy/metadata is fine as long as we merge them back correctly in use-data-store
            const docId = "settings";
            const docRef = doc(db, `offices/${officeAddress.officeLocation.toLowerCase()}/officeAddresses`, docId);
            payload.updatedAt = serverTimestamp();
            
            await setDoc(docRef, payload, { merge: true });
            
            toast({ title: 'Office Address Saved', description: 'The office details have been updated.' });
            setIsOfficeDialogOpen(false);
        } catch (error: any) {
            toast({ title: 'Error Saving Office', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.officeLocation) return;
        setIsSubmitting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const buffer = e.target?.result;
                if (!buffer) throw new Error("Failed to read file.");
                const workbook = new ExcelJS.Workbook();
                await workbook.xlsx.load(buffer as ArrayBuffer);
                const worksheet = workbook.getWorksheet(1);
                if (!worksheet) throw new Error("No worksheet found in the Excel file.");
                const lsgDataMap = new Map<string, Set<string>>();
                const maxConstituencyColumns = 5;
                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        const lsgValue = row.getCell(1).value?.toString().trim();
                        if (lsgValue) {
                            if (!lsgDataMap.has(lsgValue)) lsgDataMap.set(lsgValue, new Set());
                            for (let i = 2; i <= 1 + maxConstituencyColumns; i++) {
                                const constituencyValue = row.getCell(i).value?.toString().trim();
                                if (constituencyValue) lsgDataMap.get(lsgValue)!.add(constituencyValue);
                            }
                        }
                    }
                });
                if (lsgDataMap.size === 0) throw new Error("No valid data found.");
                const collectionPath = `offices/${user.officeLocation!.toLowerCase()}/localSelfGovernments`;
                const batch = writeBatch(db);
                const existingLsgDocs = await getDocs(query(collection(db, collectionPath)));
                const existingLsgMap = new Map(existingLsgDocs.docs.map(d => [d.data().name, d.id]));
                lsgDataMap.forEach((constituenciesSet, lsgName) => {
                    const data = { name: lsgName, constituencies: Array.from(constituenciesSet) };
                    const existingId = existingLsgMap.get(lsgName);
                    const docRef = existingId ? doc(db, collectionPath, existingId) : doc(collection(db, collectionPath));
                    batch.set(docRef, data, { merge: !!existingId });
                });
                await batch.commit();
                toast({ title: 'Import Successful', description: `${lsgDataMap.size} LSGs imported/updated.` });
            } catch (error: any) {
                toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
            } finally {
                setIsSubmitting(false);
                if(fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("LSG_Constituency_Template");
        const headers = ['Local Self Government'];
        for (let i = 1; i <= 5; i++) { headers.push('Constituency (LAC)'); }
        worksheet.getRow(1).values = headers;
        worksheet.getRow(1).font = { bold: true };
        worksheet.addRow(["Chavara Grama Panchayath", "Chavara"]);
        worksheet.addRow(["Neendakara Grama Panchayath", "Chavara"]);
        worksheet.addRow(["Kollam Corporation", "Chavara", "Kollam", "Eravipuram"]);
        worksheet.columns = [ { header: headers[0], key: 'lsg', width: 40 }, { header: headers[1], key: 'c1', width: 30 }, { header: headers[2], key: 'c2', width: 30 }, { header: headers[3], key: 'c3', width: 30 }, { header: headers[4], key: 'c4', width: 30 }, { header: headers[5], key: 'c5', width: 30 }, ];
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "GWD_LSG_Constituency_Template.xlsx";
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Template Downloaded" });
    };

    const handleClearAllData = async () => {
        setIsClearingData(true);
        try {
            if (!user?.officeLocation) throw new Error("Office location not found.");
            const collectionPath = `offices/${user.officeLocation.toLowerCase()}/localSelfGovernments`;
            const q = query(collection(db, collectionPath));
            const snapshot = await getDocs(q);
            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            toast({ title: 'Data Cleared', description: `All LSG data has been deleted.` });
        } catch (error: any) {
            toast({ title: 'Error Clearing Data', description: error.message, variant: 'destructive' });
        } finally {
            setIsClearingData(false);
            setIsClearConfirmOpen(false);
        }
    };

    const allConstituencies = useMemo(() => {
        const constituencySet = new Set<string>();
        allLsgConstituencyMaps.forEach(map => { map.constituencies.forEach(con => constituencySet.add(con)); });
        return Array.from(constituencySet).sort();
    }, [allLsgConstituencyMaps]);
  
    const handleCountClick = (type: 'lsg' | 'constituency') => {
        if (type === 'lsg') {
            setListDialogContent({ title: 'Local Self Governments', items: allLsgConstituencyMaps.map(m => m.name).sort() });
        } else {
            setListDialogContent({ title: 'Constituencies (LAC)', items: allConstituencies });
        }
        setIsListDialogOpen(true);
    };
    
    const handleDeleteOffice = async () => {
        if (!officeAddress || !canManage) return;
        setIsDeleting(true);
        const officeLocation = officeAddress.officeLocation.toLowerCase();
        
        try {
            const batch = writeBatch(db);
    
            const officeUsersQuery = query(collection(db, "users"), where("officeLocation", "==", officeLocation));
            const officeUsersSnapshot = await getDocs(officeUsersQuery);
            officeUsersSnapshot.forEach(userDoc => {
                batch.delete(userDoc.ref);
                batch.delete(doc(db, `offices/${officeLocation}/users`, userDoc.id));
            });
            
            if(officeAddress.id) {
                const globalDocRef = allOfficeAddresses.find(g => g.officeLocation.toLowerCase() === officeLocation.toLowerCase())?.id;
                if (globalDocRef) {
                  batch.delete(doc(db, 'officeAddresses', globalDocRef));
                }
            }
            
            await batch.commit();
            
            toast({ title: 'Office Deactivated', description: `Successfully deactivated office '${officeAddress.officeLocation}'. User accounts are removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: `Could not deactivate office: ${error.message}`, variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setIsDeleteConfirmOpen(false);
        }
    };

    const hasBankDetails = useMemo(() => {
        if (!officeAddress) return false;
        return !!(officeAddress.stsbAccountNo || officeAddress.nameOfTreasury || officeAddress.bankAccountNo || officeAddress.nameOfBank || officeAddress.bankBranch || officeAddress.bankIfsc);
    }, [officeAddress]);


    if (authLoading) {
        return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }
  
    return (
      <div className="space-y-6">
        {isSuperAdmin && (
            <Card className="mb-6">
                <CardHeader><CardTitle className="flex items-center gap-2 text-primary"><MapPin className="h-5 w-5"/>Current Office Location</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold">{capitalize(selectedOffice) || 'All Offices'}</p><p className="text-sm text-muted-foreground">This is the office you are currently viewing data for.</p></CardContent>
            </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-primary" />Office Details</CardTitle>
                            <CardDescription>Manage contact and official details for the <span className="font-semibold text-primary">{capitalize(isSuperAdmin && officeAddress ? officeAddress.officeLocation : user?.officeLocation || 'department')}</span> office.</CardDescription>
                        </div>
                        {canManage && (
                            <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handleOpenEditDialog} disabled={!officeAddress}><Eye className="h-4 w-4 mr-2" /> {officeAddress?.officeName ? 'Edit Details' : 'Add Details'}</Button>
                                {isSuperAdmin && officeAddress && <Button variant="destructive" size="sm" onClick={() => setIsDeleteConfirmOpen(true)} disabled={isDeleting}>{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Deactivate</Button>}
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {officeAddress ? (
                        <div className="space-y-3 p-4 border rounded-lg bg-secondary/30">
                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground whitespace-pre-wrap">{officeAddress.officeName || "Office Name Pending"}, <span className="text-primary">{capitalize(officeAddress.officeLocation)}</span></h3>
                                        {officeAddress.address && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{officeAddress.address}</p>}
                                    </div>
                                    <div>
                                        {officeAddress.officeNameMalayalam && <h3 className="font-bold text-lg text-foreground whitespace-pre-wrap">{officeAddress.officeNameMalayalam}</h3>}
                                        {officeAddress.addressMalayalam && <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{officeAddress.addressMalayalam}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {officeAddress.districtOfficerPhotoUrl && (
                                        <Avatar><AvatarImage src={officeAddress.districtOfficerPhotoUrl} alt={officeAddress.districtOfficer || 'District Officer'} data-ai-hint="person face" /><AvatarFallback>{getInitials(officeAddress.districtOfficer)}</AvatarFallback></Avatar>
                                    )}
                                    <DetailRow label="District Officer" value={officeAddress.districtOfficer} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 pt-3 border-t">
                                <DetailRow label="Office Code" value={officeAddress.officeCode} isUppercase />
                                <DetailRow label="Phone No." value={officeAddress.phoneNo} />
                                <DetailRow label="Email" value={officeAddress.email} />
                                <DetailRow label="GST No." value={officeAddress.gstNo} />
                                <DetailRow label="PAN No." value={officeAddress.panNo} />
                            </div>
                            
                            {hasBankDetails && (
                                <>
                                    <Separator className="my-4"/>
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Treasury & Bank Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                                        <DetailRow label="STSB Account No." value={officeAddress.stsbAccountNo} />
                                        <DetailRow label="Name of Treasury" value={officeAddress.nameOfTreasury} />
                                        <DetailRow label="Bank Account No." value={officeAddress.bankAccountNo} />
                                        <DetailRow label="Name of Bank" value={officeAddress.nameOfBank} />
                                        <DetailRow label="Branch" value={officeAddress.bankBranch} />
                                        <DetailRow label="IFSC" value={officeAddress.bankIfsc} />
                                    </div>
                                </>
                            )}
                            
                            {officeAddress.otherDetails && (
                                <div className="pt-3 border-t"><DetailRow label="Other Details" value={officeAddress.otherDetails} /></div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            {isSuperAdmin && !selectedOffice ? (
                                <p>Select a specific office to view or edit its details.</p>
                            ) : (
                                <><p>No office details have been configured for {capitalize(user?.officeLocation || 'your location')} yet.</p>{canManage && <p className="text-sm mt-1">Click &quot;Add Details&quot; to set them up.</p>}</>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
    
            <Card className="lg:col-span-2">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" />Bulk Data Management</CardTitle>
                            <CardDescription>View Local Self Governments and their associated Constituencies.</CardDescription>
                        </div>
                        {isAdmin && (
                            <div className="flex items-center gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleExcelImport} className="hidden" accept=".xlsx, .xls" />
                            <Button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="mr-2 h-4 w-4" />}Import Excel</Button>
                            <Button variant="outline" onClick={handleDownloadTemplate}><Download className="mr-2 h-4 w-4"/>Template</Button>
                            <Button variant="destructive" onClick={() => setIsClearConfirmOpen(true)} disabled={isClearingData}><Trash2 className="mr-2 h-4 w-4"/>{isClearingData ? "Clearing..." : "Clear All Data"}</Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => handleCountClick('lsg')} disabled={allLsgConstituencyMaps.length === 0} className="p-4 border rounded-lg bg-blue-50/10 hover:bg-blue-50/20 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><h4 className="text-sm font-medium text-muted-foreground">Local Self Governments</h4><p className="text-4xl font-bold text-blue-600">{allLsgConstituencyMaps.length}</p></button>
                    <button onClick={() => handleCountClick('constituency')} disabled={allConstituencies.length === 0} className="p-4 border rounded-lg bg-purple-50/10 hover:bg-purple-50/20 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><h4 className="text-sm font-medium text-muted-foreground">Constituencies (LAC)</h4><p className="text-4xl font-bold text-purple-600">{allConstituencies.length}</p></button>
                </CardContent>
            </Card>
        </div>

        <OfficeAddressDialog
            isOpen={isOfficeDialogOpen}
            onClose={() => setIsOfficeDialogOpen(false)}
            onSubmit={handleOfficeSubmit}
            isSubmitting={isSubmitting}
            initialData={mergedOfficeDetails}
            staffMembers={allStaffMembers}
        />
        <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete ALL Local Self Governments. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isClearingData}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAllData} disabled={isClearingData} className="bg-destructive hover:bg-destructive/90">
                    {isClearingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete All"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will deactivate the office <strong>{officeAddress?.officeLocation}</strong> by removing all its user accounts. All historical data will be preserved but the office will be hidden from management lists.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteOffice} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Deactivate Office"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
            <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md p-0 flex flex-col h-[70vh]">
            <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>{listDialogContent.title}</DialogTitle>
                <DialogDescription>Total count: {listDialogContent.items.length}</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full px-6 py-4">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Sl. No.</TableHead>
                        <TableHead>{listDialogContent.title}</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {listDialogContent.items.map((item, index) => (
                        <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </ScrollArea>
            </div>
            </DialogContent>
        </Dialog>
      </div>
    );
}
