
// src/app/dashboard/establishment/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffForm from "@/components/establishment/StaffForm";
import StaffTable from "@/components/establishment/StaffTable";
import TransferredStaffTable from "@/components/establishment/TransferredStaffTable";
import RetiredStaffTable from "@/components/establishment/RetiredStaffTable";
import VacancyTable from "@/components/establishment/VacancyTable";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import type { StaffMember, StaffMemberFormData, StaffStatusType, BloodGroup } from "@/lib/schemas";
import { designationOptions, bloodGroupOptions } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import ExcelJS from "exceljs";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useDataStore } from "@/hooks/use-data-store";
import { Loader2, Search, FileDown, UserPlus, ShieldAlert, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export const dynamic = 'force-dynamic';

const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};

const formatDateSafe = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return "";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isValid(date) ? format(date, "dd/MM/yyyy") : "";
};

const exportableStaffFields = [
  { id: 'name', label: 'Name' },
  { id: 'nameMalayalam', label: 'Name (Malayalam)' },
  { id: 'designation', label: 'Designation' },
  { id: 'designationMalayalam', label: 'Designation (Malayalam)' },
  { id: 'pen', label: 'PEN' },
  { id: 'email', label: 'Email' },
  { id: 'phoneNo', label: 'Phone Number' },
  { id: 'bloodGroup', label: 'Blood Group' },
  { id: 'dateOfBirth', label: 'Date of Birth' },
  { id: 'serviceStartDate', label: 'Service Period Start' },
  { id: 'serviceEndDate', label: 'Service Period End' },
  { id: 'status', label: 'Current Status' },
  { id: 'roles', label: 'Roles/Responsibilities' },
  { id: 'remarks', label: 'Remarks' },
];

export default function EstablishmentPage() {
  const { setHeader } = usePageHeader();
  const { officeAddress, allOfficeAddresses, allUsers, allSanctionedStrength, searchTerms, setModuleSearchTerm } = useDataStore();
  
  const searchTerm = searchTerms['establishment'] || "";
  const setSearchTerm = (term: string) => setModuleSearchTerm('establishment', term);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setHeader('Establishment', `Manage all staff members of the Ground Water Department, ${officeAddress?.officeLocation || ''}.`);
  }, [setHeader, officeAddress]);

  const { user, isLoading: authLoading, createUserByAdmin } = useAuth();
  const { 
    staffMembers, 
    isLoading: staffLoadingHook, 
    addStaffMember, 
    updateStaffMember, 
    deleteStaffMember,
    updateStaffStatus 
  } = useStaffMembers();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); 
  const [designationFilter, setDesignationFilter] = useState('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);

  const [imageForModal, setImageForModal] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(['name', 'designation', 'pen', 'status', 'phoneNo']);

  const [currentPage, setCurrentPage] = useState(1);
  const pageFromUrl = searchParams?.get('page');

  useEffect(() => {
    const pageNum = pageFromUrl ? parseInt(pageFromUrl, 10) : 1;
    if (!isNaN(pageNum)) {
      setCurrentPage(pageNum);
    } else {
      setCurrentPage(1);
    }
  }, [pageFromUrl]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', '1');
    router.push(`?${params.toString()}`, { scroll: false });
  };
  
  const isAdmin = user?.role === 'admin';
  const isEngineer = user?.role === 'engineer';
  const canManage = (isAdmin || isEngineer) && user?.isApproved;
  const isViewer = user?.role === 'viewer' || user?.role === 'scientist';

  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setIsViewOnly(false);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: StaffMember, viewOnly: boolean = false) => {
    setEditingStaff(staff);
    setIsViewOnly(viewOnly || !canManage);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: StaffMemberFormData) => {
    if (!canManage || isViewOnly) {
        toast({ title: "Permission Denied", variant: "destructive"});
        return;
    }
    
    if (data.createUserAccount && data.email) {
        const emailExists = allUsers.some(u => u.email?.toLowerCase().trim() === data.email?.toLowerCase().trim());
        if (emailExists) {
            toast({ title: "Email Taken", description: "A user with this email already exists.", variant: "destructive" });
            return;
        }
    }

    setIsSubmittingForm(true);
    
    try {
        let staffId: string | undefined = editingStaff?.id;
        if (editingStaff) {
            await updateStaffMember(editingStaff.id, data);
            toast({ title: "Staff Record Updated" });
        } else {
            staffId = await addStaffMember(data); 
            toast({ title: "Staff Record Added" });
        }

        if (data.createUserAccount && data.email && staffId && user?.officeLocation) {
            const result = await createUserByAdmin(data.email, "123456", data.name, staffId, user.officeLocation);
            if (result.success) {
                toast({ title: "User Account Created" });
            } else {
                throw new Error(result.error?.message || "Failed to create user account.");
            }
        }

        setIsFormOpen(false);
        setEditingStaff(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  const handleOpenImageModal = (imageUrl: string | null) => {
    if (imageUrl && !isPlaceholderUrl(imageUrl)) {
      setImageForModal(imageUrl);
      setIsImageModalOpen(true);
    }
  };

  const handleExportExcel = useCallback(async () => {
    if (filteredStaff.length === 0) {
      toast({ title: "No Data", description: "There is no data to export." });
      return;
    }

    if (selectedExportFields.length === 0) {
      toast({ title: "No Fields Selected", description: "Please select at least one field to export.", variant: "destructive" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Staff Report");

    const activeFields = exportableStaffFields.filter(f => selectedExportFields.includes(f.id));
    const headers = ["Sl. No.", ...activeFields.map(f => f.label)];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    filteredStaff.forEach((staff, index) => {
      const row = [index + 1];
      activeFields.forEach(field => {
        let value = (staff as any)[field.id];
        if (field.id === 'dateOfBirth' || field.id === 'serviceStartDate' || field.id === 'serviceEndDate') {
          value = formatDateSafe(value);
        }
        row.push(value || 'N/A');
      });
      const newRow = worksheet.addRow(row);
      newRow.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    worksheet.columns.forEach((column, i) => {
      column.width = i === 0 ? 8 : 20;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GWD_Staff_Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Excel Exported" });
    setIsExportDialogOpen(false);
  }, [filteredStaff, selectedExportFields, toast]);

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300); 
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  useEffect(() => {
    if (staffLoadingHook) return;
    setIsFiltering(true);
    const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
    
    requestAnimationFrame(() => {
      let tempFilteredStaff = [...staffMembers];

      if (designationFilter !== 'all') {
        tempFilteredStaff = tempFilteredStaff.filter(s => s.designation === designationFilter);
      }

      if (bloodGroupFilter !== 'all') {
        tempFilteredStaff = tempFilteredStaff.filter(s => s.bloodGroup === bloodGroupFilter);
      }

      if (lowerSearchTerm) {
        tempFilteredStaff = tempFilteredStaff.filter(staff => 
            (staff.name?.toLowerCase().includes(lowerSearchTerm)) ||
            (staff.designation?.toLowerCase().includes(lowerSearchTerm)) ||
            (staff.pen?.toLowerCase().includes(lowerSearchTerm))
        );
      }

      // Priority sort to ensure 'Active' records are preferred during deduplication
      tempFilteredStaff.sort((a, b) => {
        const priority: Record<string, number> = { 'Active': 0, 'Pending Transfer': 1, 'Transferred': 2, 'Retired': 3 };
        return (priority[a.status] ?? 10) - (priority[b.status] ?? 10);
      });

      // Deduplicate by PEN or fallback to ID
      const seen = new Set();
      const unique = tempFilteredStaff.filter(item => {
          const key = (item.pen && item.pen.trim() !== "") ? item.pen.trim() : item.id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
      });
      
      setFilteredStaff(unique);
      setIsFiltering(false);
    });
  }, [debouncedSearchTerm, staffMembers, staffLoadingHook, designationFilter, bloodGroupFilter]);


  const activeStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Active' || s.status === 'Pending Transfer'), [filteredStaff]);
  const transferredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Transferred'), [filteredStaff]);
  const retiredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Retired'), [filteredStaff]);

  const vacancyCount = useMemo(() => {
    const activeStaff = staffMembers.filter(s => s.status === 'Active');
    const sanctionedStrength = allSanctionedStrength || {};
    
    const allDesignations = Array.from(designationOptions);
    let targetDesignations = allDesignations;
    
    if (user?.role !== 'superAdmin') {
        const subOfficeStartIndex = allDesignations.indexOf("Executive Engineer");
        if (subOfficeStartIndex !== -1) {
            targetDesignations = allDesignations.slice(subOfficeStartIndex);
        }
    }

    return targetDesignations.reduce((acc, designation) => {
        const sanctioned = sanctionedStrength[designation] || 0;
        const current = activeStaff.filter(s => s.designation === designation).length;
        const vacancy = Math.max(0, sanctioned - current);
        return acc + vacancy;
    }, 0);
  }, [staffMembers, allSanctionedStrength, user]);

  if (authLoading || staffLoadingHook) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!user || !user.isApproved) {
     return <div className="p-10 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-4" /><h1 className="text-2xl font-bold">Access Denied</h1></div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="staff-search"
                name="staffSearch"
                placeholder="Search staff members..."
                className="w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
              <Select value={designationFilter} onValueChange={setDesignationFilter}>
                <SelectTrigger className="w-full sm:w-[180px] lg:w-[160px] xl:w-[200px] shrink-0">
                  <SelectValue placeholder="Filter by Designation" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All Designations</SelectItem>
                  {designationOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
                <SelectTrigger className="w-full sm:w-[130px] lg:w-[124px] xl:w-[140px] shrink-0">
                  <SelectValue placeholder="Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blood Groups</SelectItem>
                  {bloodGroupOptions.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>

              {canManage && (
                <Button onClick={handleAddNewStaff} size="sm" className="w-full sm:w-auto shrink-0 whitespace-nowrap">
                  <UserPlus className="mr-2 h-4 w-4" /> Add New Staff
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)} className="w-full sm:w-auto shrink-0 whitespace-nowrap">
                <FileDown className="mr-2 h-4 w-4" /> Export Excel
              </Button>
            </div>
          </div>
          <Tabs defaultValue="activeStaff" onValueChange={handleTabChange} className="w-full pt-4 border-t">
            <TabsList className="grid w-full grid-cols-4 sm:w-[800px]">
              <TabsTrigger value="activeStaff">Active ({activeStaffList.length})</TabsTrigger>
              <TabsTrigger value="transferredStaff">Transferred ({transferredStaffList.length})</TabsTrigger>
              <TabsTrigger value="retiredStaff">Retired ({retiredStaffList.length})</TabsTrigger>
              <TabsTrigger value="vacancy">Vacancy ({vacancyCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="activeStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <StaffTable
                  staffData={activeStaffList}
                  onEdit={(s) => handleEditStaff(s, s.status === 'Pending Transfer')}
                  onDelete={isAdmin ? deleteStaffMember : undefined}
                  onSetStatus={canManage ? updateStaffStatus : undefined}
                  isViewer={isViewer || !canManage}
                  onImageClick={handleOpenImageModal}
                  isLoading={isFiltering}
                  searchActive={!!debouncedSearchTerm}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            </TabsContent>
            <TabsContent value="transferredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <TransferredStaffTable
                    staffData={transferredStaffList}
                    onEdit={(s) => handleEditStaff(s, true)}
                    onSetStatus={canManage ? updateStaffStatus : undefined}
                    isViewer={isViewer || !canManage}
                    onImageClick={handleOpenImageModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                />
              </div>
            </TabsContent>
            <TabsContent value="retiredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <RetiredStaffTable
                    staffData={retiredStaffList}
                    onEdit={(s) => handleEditStaff(s, true)}
                    onSetStatus={canManage ? updateStaffStatus : undefined}
                    isViewer={isViewer || !canManage}
                    onImageClick={handleOpenImageModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                />
              </div>
            </TabsContent>
            <TabsContent value="vacancy" className="mt-4">
                <div className="max-h-[70vh] overflow-auto">
                    <VacancyTable canManage={isAdmin} user={user} />
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && setIsFormOpen(false)}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>{editingStaff ? (isViewer || isViewOnly ? "Staff Details" : "Edit Staff Details") : "Add New Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 flex-1 min-h-0 overflow-hidden">
            <StaffForm
                key={editingStaff?.id || 'new'}
                onSubmit={handleFormSubmit}
                initialData={editingStaff}
                isSubmitting={isSubmittingForm}
                onCancel={() => setIsFormOpen(false)}
                isViewer={isViewer || isViewOnly}
                allOfficeAddresses={allOfficeAddresses}
                allUsers={allUsers}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="p-0 border-0 bg-transparent shadow-none w-auto max-w-[90vw]">
          <div className="flex justify-center items-center max-h-[90vh] overflow-hidden">
            {imageForModal && <img src={imageForModal} alt="Enlarged staff photo" className="max-w-full max-h-full object-contain rounded-lg"/>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Customize Staff Export</DialogTitle>
            <DialogDescription>Select the fields you want to include in the Excel report.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exportableStaffFields.map((field) => (
                  <div key={field.id} className="flex items-center space-x-3 p-3 rounded-md border bg-secondary/10 hover:bg-secondary/20 transition-colors">
                    <Checkbox 
                      id={`export-field-${field.id}`}
                      checked={selectedExportFields.includes(field.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExportFields(prev => [...prev, field.id]);
                        } else {
                          setSelectedExportFields(prev => prev.filter(id => id !== field.id));
                        }
                      }}
                    />
                    <Label htmlFor={`export-field-${field.id}`} className="flex-1 cursor-pointer font-medium text-sm">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedExportFields(exportableStaffFields.map(f => f.id))}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExportFields([])}>Deselect All</Button>
            </div>
            <div className="flex items-center gap-2">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleExportExcel}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
