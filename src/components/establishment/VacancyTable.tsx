
// src/components/establishment/VacancyTable.tsx
"use client";

import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataStore } from '@/hooks/use-data-store';
import { designationOptions } from '@/lib/schemas';
import { Eye, Save, PlusCircle, Trash2, Search, FileDown, Loader2, Briefcase, Users, UserMinus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/hooks/useAuth';

interface VacancyTableProps {
    canManage: boolean;
    user?: UserProfile | null;
}

export default function VacancyTable({ canManage, user }: VacancyTableProps) {
    const { allStaffMembers, allSanctionedStrength, updateSanctionedStrength, officeAddress } = useDataStore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [configData, setConfigData] = useState<{ designation: string; count: number }>({ designation: '', count: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Detail Dialog State
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [detailTitle, setDetailTitle] = useState("");
    const [detailType, setDetailType] = useState<'sanctioned' | 'active' | 'vacancy' | null>(null);
    const [detailSearch, setDetailSearch] = useState("");

    const filteredDesignations = useMemo(() => {
        const allDesignations = (designationOptions || []);

        if (user?.role === 'superAdmin') {
            return allDesignations;
        }

        // For sub-office admin, show only from Executive Engineer onwards
        const subOfficeStartIndex = allDesignations.indexOf("Executive Engineer");
        if (subOfficeStartIndex !== -1) {
            return allDesignations.slice(subOfficeStartIndex);
        }

        return allDesignations; // Fallback
    }, [user]);

    const vacancyData = useMemo(() => {
        const activeStaff = (allStaffMembers || []).filter(s => s.status === 'Active');
        const sanctionedStrength = allSanctionedStrength || {};
        
        const data = filteredDesignations.map(designation => {
            const sanctioned = sanctionedStrength[designation] || 0;
            const current = activeStaff.filter(s => s.designation === designation).length;
            const vacancy = Math.max(0, sanctioned - current);
            return {
                designation,
                sanctioned,
                current,
                vacancy,
                staff: activeStaff.filter(s => s.designation === designation)
            };
        });

        return data;
    }, [allStaffMembers, allSanctionedStrength, filteredDesignations]);

    const displayedVacancyData = useMemo(() => {
        if (!searchTerm) return vacancyData;
        return vacancyData.filter(row => 
            row.designation.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [vacancyData, searchTerm]);

    const totals = useMemo(() => {
        return vacancyData.reduce((acc, curr) => ({
            sanctioned: acc.sanctioned + curr.sanctioned,
            current: acc.current + curr.current,
            vacancy: acc.vacancy + curr.vacancy
        }), { sanctioned: 0, current: 0, vacancy: 0 });
    }, [vacancyData]);

    const handleSaveStrength = async () => {
        if (!configData.designation) return;
        setIsSubmitting(true);
        try {
            await updateSanctionedStrength(configData.designation, configData.count);
            setIsConfigDialogOpen(false);
            setConfigData({ designation: '', count: 0 });
            toast({ title: "Configuration Saved", description: `Sanctioned strength for ${configData.designation} updated.` });
        } catch (error: any) {
            toast({
                title: "Save Failed",
                description: error.message || "Could not update the sanctioned strength. Check permissions.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (designation: string, currentStrength: number) => {
        setConfigData({ designation, count: currentStrength });
        setIsConfigDialogOpen(true);
    };

    const handleOpenDetail = (type: 'sanctioned' | 'active' | 'vacancy', title: string) => {
        setDetailType(type);
        setDetailTitle(title);
        setDetailSearch("");
        setIsDetailDialogOpen(true);
    };

    const detailFilteredData = useMemo(() => {
        if (!detailType) return [];
        const lowerSearch = detailSearch.toLowerCase();

        if (detailType === 'sanctioned') {
            return vacancyData
                .filter(row => row.sanctioned > 0)
                .filter(row => row.designation.toLowerCase().includes(lowerSearch));
        }
        if (detailType === 'active') {
            const allActiveStaff = (allStaffMembers || []).filter(s => s.status === 'Active');
            return allActiveStaff.filter(s => 
                s.name.toLowerCase().includes(lowerSearch) || 
                s.designation?.toLowerCase().includes(lowerSearch) ||
                s.pen?.toLowerCase().includes(lowerSearch)
            );
        }
        if (detailType === 'vacancy') {
            return vacancyData
                .filter(row => row.vacancy > 0)
                .filter(row => row.designation.toLowerCase().includes(lowerSearch));
        }
        return [];
    }, [detailType, detailSearch, vacancyData, allStaffMembers]);

    const handleExportVacancyExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Vacancy_Report');
        
        worksheet.addRow([`Vacancy Report - Ground Water Department, ${officeAddress?.officeLocation || ''}`]).font = { bold: true, size: 14 };
        worksheet.addRow([`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
        worksheet.addRow([]);

        const headers = ['Sl. No.', 'Designation', 'Sanctioned Strength', 'Current Strength', 'Vacancy'];
        const headerRow = worksheet.addRow(headers);
        headerRow.font = { bold: true };
        headerRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        vacancyData.forEach((row, index) => {
            const newRow = worksheet.addRow([
                index + 1,
                row.designation,
                row.sanctioned,
                row.current,
                row.vacancy
            ]);
            newRow.eachCell(cell => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });
        });

        worksheet.addRow([]);
        const footerRow = worksheet.addRow(['', 'TOTAL', totals.sanctioned, totals.current, totals.vacancy]);
        footerRow.font = { bold: true };

        worksheet.columns.forEach((column, i) => {
            if (i === 1) column.width = 40;
            else column.width = 20;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `GWD_Vacancy_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Report Exported" });
    };

    return (
        <div className="space-y-6">
            {/* Vacancy Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50/50 border-blue-200 transition-colors hover:bg-blue-100/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" /> Total Sanctioned Posts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            variant="link" 
                            className="p-0 h-auto text-3xl font-bold text-blue-700 hover:no-underline"
                            onClick={() => handleOpenDetail('sanctioned', "Sanctioned Strength Breakdown")}
                            disabled={totals.sanctioned === 0}
                        >
                            {totals.sanctioned}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 border-green-200 transition-colors hover:bg-green-100/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                            <Users className="h-4 w-4" /> Total Strength (Active)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            variant="link" 
                            className="p-0 h-auto text-3xl font-bold text-green-700 hover:no-underline"
                            onClick={() => handleOpenDetail('active', "Active Personnel List")}
                            disabled={totals.current === 0}
                        >
                            {totals.current}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="bg-red-50/50 border-red-200 transition-colors hover:bg-red-100/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                            <UserMinus className="h-4 w-4" /> Total Vacancies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            variant="link" 
                            className="p-0 h-auto text-3xl font-bold text-red-700 hover:no-underline"
                            onClick={() => handleOpenDetail('vacancy', "Vacancy Breakdown")}
                            disabled={totals.vacancy === 0}
                        >
                            {totals.vacancy}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary/20 p-4 rounded-lg">
                <div className="relative flex-grow w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by designation..."
                        className="pl-10 bg-background"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {canManage && (
                        <Button onClick={() => setIsConfigDialogOpen(true)} size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Configure Sanctioned Strength
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExportVacancyExcel}>
                        <FileDown className="mr-2 h-4 w-4" /> Export Vacancy Report
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-secondary/50">
                        <TableRow>
                            <TableHead className="w-[60px] text-center">#</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead className="text-center">Sanctioned Strength</TableHead>
                            <TableHead className="text-center">Current Strength</TableHead>
                            <TableHead className="text-center">Vacancy</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            {canManage && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayedVacancyData.length > 0 ? displayedVacancyData.map((row, index) => (
                            <TableRow key={row.designation} className={cn(row.vacancy > 0 && "bg-red-50/30")}>
                                <TableCell className="text-center font-mono text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-semibold">{row.designation}</TableCell>
                                <TableCell className="text-center font-mono">{row.sanctioned || '0'}</TableCell>
                                <TableCell className="text-center font-mono text-green-600 font-bold">{row.current}</TableCell>
                                <TableCell className="text-center">
                                    <span className={cn(
                                        "font-mono font-bold px-2 py-1 rounded-sm",
                                        row.vacancy > 0 ? "text-red-700" : "text-green-700"
                                    )}>
                                        {row.vacancy}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={row.vacancy > 0 ? "destructive" : "secondary"}>
                                        {row.vacancy > 0 ? "Open" : "Filled"}
                                    </Badge>
                                </TableCell>
                                {canManage && (
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(row.designation, row.sanctioned)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={canManage ? 7 : 6} className="h-24 text-center text-muted-foreground">
                                    {searchTerm ? "No matching designations found." : "No vacancy data configured yet."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Drill-down Detail Dialog */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="max-w-3xl flex flex-col p-0 h-[80vh]">
                    <DialogHeader className="p-6 pb-4 border-b shrink-0">
                        <DialogTitle className={cn(
                            detailType === 'vacancy' ? "text-red-600" : detailType === 'active' ? "text-green-600" : "text-blue-600"
                        )}>{detailTitle}</DialogTitle>
                        <DialogDescription>Review the detailed breakdown below.</DialogDescription>
                    </DialogHeader>
                    <div className="p-4 border-b bg-secondary/10 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search results..." 
                                className="pl-10" 
                                value={detailSearch} 
                                onChange={(e) => setDetailSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <ScrollArea className="h-full">
                            <div className="p-6 pt-0">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center">#</TableHead>
                                            {detailType === 'active' ? (
                                                <>
                                                    <TableHead>Staff Name</TableHead>
                                                    <TableHead>PEN</TableHead>
                                                    <TableHead>Designation</TableHead>
                                                </>
                                            ) : (
                                                <>
                                                    <TableHead>Designation</TableHead>
                                                    <TableHead className="text-center">{detailType === 'sanctioned' ? 'Sanctioned' : 'Vacancy'}</TableHead>
                                                    {detailType === 'vacancy' && <TableHead className="text-center">Current</TableHead>}
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {detailFilteredData.length > 0 ? detailFilteredData.map((item: any, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-center font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                                                {detailType === 'active' ? (
                                                    <>
                                                        <TableCell className="font-semibold text-sm">{item.name}</TableCell>
                                                        <TableCell className="font-mono text-xs">{item.pen}</TableCell>
                                                        <TableCell className="text-xs">{item.designation}</TableCell>
                                                    </>
                                                ) : (
                                                    <>
                                                        <TableCell className="font-semibold text-sm">{item.designation}</TableCell>
                                                        <TableCell className="text-center font-mono font-bold">
                                                            {detailType === 'sanctioned' ? item.sanctioned : item.vacancy}
                                                        </TableCell>
                                                        {detailType === 'vacancy' && (
                                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                {item.current}
                                                            </TableCell>
                                                        )}
                                                    </>
                                                )}
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">No matching records found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </ScrollArea>
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t shrink-0">
                        <DialogClose asChild>
                            <Button>Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Configuration Dialog */}
            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md p-0 flex flex-col h-auto">
                    <DialogHeader className="p-6 pb-4 shrink-0">
                        <DialogTitle>Sanctioned Strength Configuration</DialogTitle>
                        <DialogDescription>Set the authorized headcount for a specific designation.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 px-6 py-4 flex-1">
                        <div className="space-y-2">
                            <Label>Designation</Label>
                            <Select 
                                value={configData.designation} 
                                onValueChange={(v) => setConfigData(prev => ({ ...prev, designation: v, count: vacancyData.find(d => d.designation === v)?.sanctioned || 0 }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Designation" />
                                </SelectTrigger>
                                <SelectContent className="max-h-80">
                                    {filteredDesignations.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Authorized Count (Sanctioned Strength)</Label>
                            <Input 
                                type="number" 
                                min={0} 
                                value={configData.count || ''} 
                                onChange={(e) => setConfigData(prev => ({ ...prev, count: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-4 border-t shrink-0">
                        <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveStrength} disabled={!configData.designation || isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="mr-2 h-4 mr-2" />}
                            Save Configuration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
