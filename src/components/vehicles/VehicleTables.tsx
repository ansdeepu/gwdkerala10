
// src/components/vehicles/VehicleTables.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Building, Truck, AlertTriangle, Loader2, Pencil, ArrowUpDown } from "lucide-react";
import type { DepartmentVehicle, HiredVehicle, RigCompressor } from "@/lib/schemas";
import { format, isValid, isBefore, addDays } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import Image from "next/image";
import { useDataStore } from '@/hooks/use-data-store';

interface DepartmentVehicleTableProps {
    data: DepartmentVehicle[];
    onEdit: (v: DepartmentVehicle) => void;
    onDelete: (id: string, name: string) => Promise<void>;
    canEdit: boolean;
    onView: (vehicle: DepartmentVehicle | HiredVehicle | RigCompressor) => void;
}

interface HiredVehicleTableProps {
    data: HiredVehicle[];
    onEdit: (v: HiredVehicle) => void;
    onDelete: (id: string, name: string) => Promise<void>;
    canEdit: boolean;
    onView: (vehicle: DepartmentVehicle | HiredVehicle | RigCompressor) => void;
}

interface RigCompressorTableProps {
    data: RigCompressor[];
    onEdit: (v: RigCompressor) => void;
    onDelete: (id: string, name: string) => Promise<void>;
    canEdit: boolean;
    onView: (vehicle: DepartmentVehicle | HiredVehicle | RigCompressor) => void;
}

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

const formatDateSafe = (d: any): string => {
    if (!d) return '-';
    const date = safeParseDate(d);
    return date ? format(date, 'dd/MM/yyyy') : '-';
};

const getExpiryStatus = (expiryDate: Date | null): { status: 'Expired' | 'Expiring Soon' | 'Valid'; colorClass: string; } => {
    if (!expiryDate || !isValid(expiryDate)) {
        return { status: 'Valid', colorClass: 'text-black' };
    }
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    if (isBefore(expiryDate, today)) {
        return { status: 'Expired', colorClass: 'text-red-600 font-bold' };
    }
    if (isBefore(expiryDate, thirtyDaysFromNow)) {
        return { status: 'Expiring Soon', colorClass: 'text-orange-500 font-semibold' };
    }
    return { status: 'Valid', colorClass: 'text-black' };
};

const DetailRow = ({ label, value, isUppercase = false }: { label: string, value?: string | number | null, isUppercase?: boolean }) => {
    const displayValue = (value === null || value === undefined || value === '') ? '-' : String(value);
    
    return (
        <div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className={cn("font-bold text-sm text-black", isUppercase && 'uppercase')}>{displayValue}</p>
        </div>
    );
};

const CertificateItem = ({ label, date }: { label: string, date?: any }) => {
    const displayDate = formatDateSafe(date);
    const dateObject = safeParseDate(date);
    const { colorClass } = getExpiryStatus(dateObject);

    return (
        <div className="flex flex-col items-center">
            <span className="text-sm text-gray-500">{label}</span>
            <span className={cn("font-bold text-sm mt-1", colorClass)}>
                {displayDate}
            </span>
        </div>
    );
};

export function VehicleViewDialog({ vehicle, onClose }: { vehicle: DepartmentVehicle | HiredVehicle | RigCompressor | null, onClose: () => void }) {
    const { officeAddress } = useDataStore();
    if (!vehicle) return null;

    const isRigCompressor = !('registrationNumber' in vehicle);
    const dialogWidthClass = isRigCompressor ? "max-w-2xl" : "max-w-xl";
    const title = isRigCompressor ? (vehicle as RigCompressor).typeOfRigUnit : (vehicle as DepartmentVehicle).registrationNumber;
    let details: React.ReactNode;

    if ('registrationNumber' in vehicle) {
        const v = vehicle as DepartmentVehicle | HiredVehicle;
        const isHired = 'ownerName' in v;
        const isDepartment = !isHired;

        details = (
            <div className="w-full mx-auto border-2 border-black bg-white p-4 font-serif text-black">
                <DialogHeader className="sr-only">
                    <DialogTitle>Details for {title}</DialogTitle>
                    <DialogDescription>Viewing details for vehicle or unit {title}.</DialogDescription>
                </DialogHeader>
                {/* Header */}
                <div className="text-center space-y-1 mb-4">
                    <h2 className="font-bold text-sm tracking-wider">VEHICLE REGISTRATION</h2>
                    <p className="text-xs font-semibold">GROUND WATER DEPARTMENT, {officeAddress?.officeLocation || ''}</p>
                    <p className="text-3xl font-bold tracking-widest pt-2">{v.registrationNumber}</p>
                    <p className="text-base font-semibold">
                        {isDepartment ? (v as DepartmentVehicle).typeOfVehicle || v.model || 'N/A' : v.model || 'N/A'}
                    </p>
                </div>
                
                <div className="space-y-2">
                    {/* Top Details Grid */}
                    <div className="grid grid-cols-4 gap-x-6 gap-y-3 py-2">
                        <DetailRow label="Regd. date" value={formatDateSafe(v.registrationDate)} />
                        <DetailRow label="Owner" value={isHired ? (v as HiredVehicle).ownerName || 'N/A' : 'Ground Water Department'} />
                        <DetailRow label="Address" value={isHired ? (v as HiredVehicle).ownerAddress || 'N/A' : `${officeAddress?.officeLocation || ''}, Kerala`} />
                        <DetailRow label="Class" value={v.vehicleClass} isUppercase={true} />
                        
                        <DetailRow label="Mfg" value={v.model || '-'} />
                        <DetailRow label="Rc status" value={v.rcStatus || '-'} />
                        
                        {isDepartment && (
                            <DetailRow label="Fuel consumption" value={(v as DepartmentVehicle).fuelConsumptionRate || '-'} />
                        )}
                         {isHired && (
                             <>
                                <DetailRow label="Agreement Validity" value={formatDateSafe((v as HiredVehicle).agreementValidity)} />
                                 <DetailRow label="Hire Charges" value={(v as HiredVehicle).hireCharges ? `Rs. ${(v as HiredVehicle).hireCharges?.toLocaleString('en-IN')}` : '-'} />
                             </>
                        )}
                    </div>
                </div>

                {/* Certificate Section */}
                <div className="pt-4 mt-4 mb-4 border-t-2 border-black">
                    <h3 className="text-center font-bold text-sm mb-4">Certificate Validity</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-x-4">
                            <CertificateItem label="Fitness" date={v.fitnessExpiry} />
                            <CertificateItem label="Tax" date={v.taxExpiry} />
                            <CertificateItem label="Insurance" date={v.insuranceExpiry} />
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 pt-2">
                            <CertificateItem label="Pollution" date={v.pollutionExpiry} />
                             {isDepartment ? (
                                <CertificateItem label="Fuel Test" date={(v as DepartmentVehicle).fuelTestExpiry} />
                            ) : isHired ? (
                                <CertificateItem label="Permit" date={(v as HiredVehicle).permitExpiry}/>
                            ) : <div />}
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="mt-8 pt-4 border-t-2 border-black">
                    <p className="text-right text-sm">signing authority</p>
                </div>
            </div>
        );
    } else {
        const u = vehicle as RigCompressor;
        details = (
             <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl font-bold">{u.typeOfRigUnit}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <DetailRow label="Status" value={u.status} isUppercase />
                        <DetailRow label="Fuel Consumption" value={u.fuelConsumption} />
                    </div>
                    {u.isExternal && (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-md text-center">
                            <p className="text-xs font-semibold text-primary uppercase">Engaged from Other Office</p>
                            <p className="text-sm font-bold text-primary">{u.externalOffice}</p>
                        </div>
                    )}
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground text-center">Associated Vehicles</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <DetailRow label="Rig Vehicle Reg. No" value={u.rigVehicleRegNo} />
                            <DetailRow label="Compressor Vehicle Reg. No" value={u.compressorVehicleRegNo} />
                            <DetailRow label="Supporting Vehicle Reg. No" value={u.supportingVehicleRegNo} />
                        </div>
                    </div>
                    <Separator/>
                    <div className="space-y-2 text-center">
                        <DetailRow label="Compressor Details" value={u.compressorDetails} />
                        <DetailRow label="Remarks" value={u.remarks} />
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <DialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            className={cn("p-0 border-0 bg-transparent shadow-none w-auto", dialogWidthClass)}
        >
             {details}
        </DialogContent>
    );
}

export function DepartmentVehicleTable({ data, onEdit, onDelete, canEdit, onView }: DepartmentVehicleTableProps) {
    const [itemToDelete, setItemToDelete] = useState<DepartmentVehicle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.registrationNumber);
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-sm">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm">Vehicle Details</TableHead>
                        <TableHead className="p-2 text-sm">Fuel Consumption</TableHead>
                        <TableHead className="p-2 text-sm">Fitness</TableHead>
                        <TableHead className="p-2 text-sm">Tax</TableHead>
                        <TableHead className="p-2 text-sm">Insurance</TableHead>
                        <TableHead className="p-2 text-sm">Pollution</TableHead>
                        <TableHead className="p-2 text-sm">Fuel Test</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm font-medium">
                                <button onClick={() => onView(v)} className="text-left hover:underline">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{v.registrationNumber}</span>
                                        {v.model && <span className="text-muted-foreground text-xs">{v.model}</span>}
                                        {v.typeOfVehicle && <span className="text-muted-foreground text-xs">{v.typeOfVehicle}</span>}
                                        {v.vehicleClass && <span className="text-muted-foreground text-xs">{v.vehicleClass}</span>}
                                        {v.registrationDate && <span className="text-muted-foreground text-xs">Reg: {formatDateSafe(v.registrationDate)}</span>}
                                    </div>
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{v.fuelConsumptionRate || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fitnessExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.taxExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.insuranceExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.pollutionExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fuelTestExpiry)}</TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <div className="flex justify-end gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => onEdit(v)}><Pencil className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Edit</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(v)}><Trash2 className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Delete</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.registrationNumber} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

export function HiredVehicleTable({ data, onEdit, onDelete, canEdit, onView }: HiredVehicleTableProps) {
     const [itemToDelete, setItemToDelete] = useState<HiredVehicle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.registrationNumber);
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-sm">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm">Vehicle Details</TableHead>
                        <TableHead className="p-2 text-sm">Agreement Validity</TableHead>
                        <TableHead className="p-2 text-sm">Hire Charges</TableHead>
                        <TableHead className="p-2 text-sm">Fitness</TableHead>
                        <TableHead className="p-2 text-sm">Tax</TableHead>
                        <TableHead className="p-2 text-sm">Insurance</TableHead>
                        <TableHead className="p-2 text-sm">Pollution</TableHead>
                        <TableHead className="p-2 text-sm">Permit</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((v, index) => (
                        <TableRow key={v.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm font-medium">
                                <button onClick={() => onView(v)} className="text-left hover:underline">
                                     <div className="flex flex-col">
                                        <span className="font-bold">{v.registrationNumber}</span>
                                        {v.model && <span className="text-muted-foreground text-xs">{v.model}</span>}
                                        {v.vehicleClass && <span className="text-muted-foreground text-xs">{v.vehicleClass}</span>}
                                        {v.registrationDate && <span className="text-muted-foreground text-xs">Reg: {formatDateSafe(v.registrationDate)}</span>}
                                    </div>
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.agreementValidity)}</TableCell>
                            <TableCell className="p-2 text-sm">{v.hireCharges?.toLocaleString('en-IN') || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.fitnessExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.taxExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.insuranceExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.pollutionExpiry)}</TableCell>
                            <TableCell className="p-2 text-sm">{formatDateSafe(v.permitExpiry)}</TableCell>
                             {canEdit && (
                                <TableCell className="text-right p-1">
                                    <div className="flex justify-end gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => onEdit(v)}><Pencil className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Edit</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(v)}><Trash2 className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Delete</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.registrationNumber} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

export function RigCompressorTable({ data, onEdit, onDelete, canEdit, onView }: RigCompressorTableProps) {
     const [itemToDelete, setItemToDelete] = useState<RigCompressor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.typeOfRigUnit || 'Unnamed Unit');
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-sm whitespace-normal">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Type of Rig Unit</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Rig Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Compressor Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Supporting Vehicle Reg. No</TableHead>
                        <TableHead className="p-2 text-sm whitespace-normal">Compressor Details</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm whitespace-normal">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((u, index) => (
                        <TableRow key={u.id}>
                            <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm">
                                <button onClick={() => onView(u)} className="text-left hover:underline font-bold">
                                    {u.typeOfRigUnit || '-'}
                                </button>
                            </TableCell>
                            <TableCell className="p-2 text-sm">{u.rigVehicleRegNo || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{u.compressorVehicleRegNo || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{u.supportingVehicleRegNo || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">{u.compressorDetails || '-'}</TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <div className="flex justify-end gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => onEdit(u)}><Pencil className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Edit</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(u)}><Trash2 className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Delete</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.typeOfRigUnit} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

export function EngagedRigTable({ data, onEdit, onDelete, canEdit, onView }: RigCompressorTableProps) {
    const [itemToDelete, setItemToDelete] = useState<RigCompressor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        await onDelete(itemToDelete.id!, itemToDelete.typeOfRigUnit || 'Unnamed Unit');
        setIsDeleting(false);
        setItemToDelete(null);
    };

    return (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="p-2 text-sm w-[80px]">Sl. No</TableHead>
                        <TableHead className="p-2 text-sm">Office</TableHead>
                        <TableHead className="p-2 text-sm">Type of Rig</TableHead>
                        {canEdit && <TableHead className="text-right p-2 text-sm">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data || []).map((u, index) => (
                        <TableRow key={u.id}>
                            <TableCell className="p-2 text-sm text-center font-mono">{index + 1}</TableCell>
                            <TableCell className="p-2 text-sm font-bold text-primary">{u.externalOffice || '-'}</TableCell>
                            <TableCell className="p-2 text-sm">
                                <button onClick={() => onView(u)} className="text-left hover:underline font-semibold">
                                    {u.typeOfRigUnit || '-'}
                                </button>
                            </TableCell>
                            {canEdit && (
                                <TableCell className="text-right p-1">
                                    <div className="flex justify-end gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => onEdit(u)}><Pencil className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>View / Edit</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setItemToDelete(u)}><Trash2 className="h-4 w-4"/></Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Delete</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                    {(data || []).length === 0 && (
                        <TableRow>
                            <TableCell colSpan={canEdit ? 4 : 3} className="h-24 text-center text-muted-foreground italic">
                                No external rigs engaged for drilling work.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <ConfirmDeleteDialog isOpen={!!itemToDelete} onOpenChange={() => setItemToDelete(null)} onConfirm={handleDelete} itemName={itemToDelete?.typeOfRigUnit} isDeleting={isDeleting} />
        </TooltipProvider>
    );
}

const ConfirmDeleteDialog = ({ isOpen, onOpenChange, onConfirm, itemName, isDeleting }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, itemName?: string, isDeleting: boolean }) => (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action will permanently delete <strong>{itemName || 'this item'}</strong>. This cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
);
