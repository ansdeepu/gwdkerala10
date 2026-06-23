
// src/app/dashboard/super-admin/establishment/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { StaffMember, StaffMemberFormData, StaffStatusType, Designation } from "@/lib/schemas";
import { designationOptions, bloodGroupOptions } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatCase } from "@/lib/utils";
import { format, isValid } from "date-fns";
import ExcelJS from "exceljs";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useDataStore } from "@/hooks/use-data-store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Search, FileDown, UserPlus, Loader2, Expand, Edit, XCircle, Clock } from "lucide-react";
import PaginationControls from "@/components/shared/PaginationControls";

export const dynamic = 'force-dynamic';

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

const formatOfficeName = (s?: string | null) => {
    if (!s) return "";
    const normalized = s.toLowerCase().trim();
    if (normalized === 'directorate' || normalized === 'directorate tvm') return "Directorate TVM";
    if (normalized === 'lab tvm') return "Lab TVM";
    if (normalized === 'lab ekm') return "Lab EKM";
    if (normalized === 'lab kkd') return "Lab KKD";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

export default function SuperAdminEstablishmentPage() {
  const { setHeader } = usePageHeader();
  const { allOfficeAddresses, allUsers, allSanctionedStrength } = useDataStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setHeader('All Establishment', 'Manage all staff members across all offices.');
  }, [setHeader]);

  const { user, isLoading: authLoading, createUserByAdmin } = useAuth();
  const { 
    staffMembers, 
    isLoading: staffLoadingHook, 
    addStaffMember, 
    updateStaffMember, 
    updateStaffStatus,
    approveTransfer,
    cancelTransfer
  } = useStaffMembers();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState(""); 
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(""); 
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [designationFilter, setDesignationFilter] = useState('all');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('all');

  const [imageForModal, setImageForModal] = useState<string | null>(null);

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
  
  const canManage = user?.role === 'superAdmin' && user.isApproved;
  const isViewer = user?.role === 'viewer';

  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: StaffMemberFormData) => {
    if (!canManage) {
        toast({ title: "Permission Denied", variant: "destructive"});
        return;
    }
    setIsSubmittingForm(true);
    
    try {
      let staffId: string | undefined = editingStaff?.id;
      if (editingStaff) {
        await updateStaffMember(editingStaff.id, data);
        toast({ title: "Staff Updated" });
      } else {
        staffId = await addStaffMember(data); 
        toast({ title: "Staff Added" });
      }
      
      if (data.createUserAccount && data.email && staffId && data.officeLocation) {
        const emailExists = allUsers.some(u => u.email === data.email);
        if (emailExists) {
            throw new Error("A user with this email already exists.");
        }
        const result = await createUserByAdmin(data.email, "123456", data.name, staffId, data.officeLocation);
        if (!result.success) throw new Error(result.error?.message || "Failed to create user.");
      }

      setIsFormOpen(false);
      setEditingStaff(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  const handleApproveTransfer = async (staff: StaffMember) => {
    const currentOffice = (staff as any).officeLocationFromPath || staff.officeLocation;
    const targetOffice = (staff as any).targetOffice;
    if (!currentOffice || !targetOffice) {
        toast({ title: "Data Error", description: "Missing office location metadata.", variant: "destructive" });
        return;
    }
    setIsProcessingApproval(staff.id);
    try {
        await approveTransfer(staff.id, currentOffice, targetOffice);
    } catch (error: any) {
        toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessingApproval(null);
    }
  };

  const handleCancelTransfer = async (staff: StaffMember) => {
    setIsProcessingApproval(staff.id);
    try {
        await cancelTransfer(staff.id);
    } catch (error: any) {
        toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsProcessingApproval(null);
    }
  };

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

  const allActiveStaff = useMemo(() => filteredStaff.filter(s => s.status === 'Active'), [filteredStaff]);
        
  const directorateStaffList = useMemo(() => allActiveStaff.filter(s => {
      const loc = ((s as any).officeLocationFromPath || s.officeLocation || '').toLowerCase();
      return !loc || loc === 'directorate' || loc === 'directorate tvm';
  }), [allActiveStaff]);
  
  const otherOfficesStaffList = useMemo(() => allActiveStaff.filter(s => {
      const loc = ((s as any).officeLocationFromPath || s.officeLocation || '').toLowerCase();
      return loc && loc !== 'directorate' && loc !== 'directorate tvm';
  }), [allActiveStaff]);
  
  const transfersList = useMemo(() => filteredStaff.filter(s => s.status === 'Pending Transfer'), [filteredStaff]);
  const transferredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Transferred'), [filteredStaff]);
  const retiredStaffList = useMemo(() => filteredStaff.filter(s => s.status === 'Retired'), [filteredStaff]);

  const vacancyCount = useMemo(() => {
    const activeStaff = staffMembers.filter(s => s.status === 'Active');
    const sanctionedStrength = allSanctionedStrength || {};
    const allDesignations = Array.from(designationOptions);

    return allDesignations.reduce((acc, designation) => {
        const sanctioned = sanctionedStrength[designation] || 0;
        const current = activeStaff.filter(s => s.designation === designation).length;
        return acc + Math.max(0, sanctioned - current);
    }, 0);
  }, [staffMembers, allSanctionedStrength]);

  if (authLoading || staffLoadingHook) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 w-full">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all fields..."
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
                <SelectContent>
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

              <Button onClick={handleAddNewStaff} size="sm" className="w-full sm:w-auto shrink-0 whitespace-nowrap">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Staff
              </Button>
            </div>
          </div>
          <Tabs defaultValue="directorateStaff" onValueChange={handleTabChange} className="w-full pt-4 border-t">
            <TabsList className="grid w-full grid-cols-5 sm:w-[900px]">
              <TabsTrigger value="directorateStaff">Directorate Staff ({directorateStaffList.length})</TabsTrigger>
              <TabsTrigger value="allStaff">All Staff ({otherOfficesStaffList.length})</TabsTrigger>
              <TabsTrigger value="transfers" className="text-amber-700 data-[state=active]:bg-amber-50">Transfers ({transfersList.length})</TabsTrigger>
              <TabsTrigger value="retiredStaff">Retired ({retiredStaffList.length})</TabsTrigger>
              <TabsTrigger value="vacancy">Vacancy ({vacancyCount})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="directorateStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <StaffTable
                  staffData={directorateStaffList}
                  onEdit={handleEditStaff}
                  onSetStatus={updateStaffStatus}
                  isViewer={isViewer}
                  onImageClick={setImageForModal}
                  isLoading={isFiltering}
                  searchActive={!!debouncedSearchTerm}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="allStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <StaffTable
                  staffData={otherOfficesStaffList}
                  onEdit={handleEditStaff}
                  onSetStatus={updateStaffStatus}
                  isViewer={isViewer}
                  onImageClick={setImageForModal}
                  isLoading={isFiltering}
                  searchActive={!!debouncedSearchTerm}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="transfers" className="mt-4">
                <div className="max-h-[70vh] overflow-auto rounded-md border">
                    <Table>
                        <TableHeader className="bg-secondary sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Staff Name</TableHead>
                                <TableHead>Current Office</TableHead>
                                <TableHead>Target Office</TableHead>
                                <TableHead>Requested On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfersList.length > 0 ? transfersList.map((staff, index) => (
                                <TableRow key={staff.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-bold">{staff.name}</TableCell>
                                    <TableCell className="capitalize">{(staff as any).officeLocationFromPath || staff.officeLocation}</TableCell>
                                    <TableCell className="font-semibold text-primary capitalize">
                                        {formatOfficeName((staff as any).targetOffice)}
                                    </TableCell>
                                    <TableCell>{staff.updatedAt ? format(staff.updatedAt, 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleEditStaff(staff)}
                                            >
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700" 
                                                onClick={() => handleApproveTransfer(staff)}
                                                disabled={isProcessingApproval === staff.id}
                                            >
                                                {isProcessingApproval === staff.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                                Approve
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                                onClick={() => handleCancelTransfer(staff)}
                                                disabled={isProcessingApproval === staff.id}
                                            >
                                                {isProcessingApproval === staff.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                                                Cancel Request
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No pending transfer requests.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>

            <TabsContent value="retiredStaff" className="mt-4">
              <div className="max-h-[70vh] overflow-auto">
                <RetiredStaffTable
                    staffData={retiredStaffList}
                    onEdit={handleEditStaff}
                    onSetStatus={updateStaffStatus}
                    isViewer={isViewer}
                    onImageClick={setImageForModal}
                    isLoading={isFiltering}
                    searchActive={!!debouncedSearchTerm}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                />
              </div>
            </TabsContent>
            <TabsContent value="vacancy" className="mt-4">
              <VacancyTable canManage={canManage} user={user} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && setIsFormOpen(false)}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-5xl h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>{editingStaff ? "Edit Staff Details" : "Add New Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 flex-1 min-h-0 overflow-hidden">
            <StaffForm
                key={editingStaff?.id || 'new'}
                onSubmit={handleFormSubmit}
                initialData={editingStaff}
                isSubmitting={isSubmittingForm}
                onCancel={() => setIsFormOpen(false)}
                isViewer={isViewer}
                allOfficeAddresses={allOfficeAddresses}
                allUsers={allUsers}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!imageForModal} onOpenChange={(open) => !open && setImageForModal(null)}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="p-0 border-0 bg-transparent shadow-none w-auto max-w-[90vw]">
          <div className="flex justify-center items-center max-h-[90vh] overflow-hidden">
            {imageForModal && <img src={imageForModal} alt="Staff photo enlarged" className="max-w-full max-h-full object-contain rounded-md shadow-2xl"/>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
