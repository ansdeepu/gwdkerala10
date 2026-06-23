
// src/components/establishment/StaffTable.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, ArrowRightLeft, UserMinus, Eye, Expand, FileArchive, Loader2, Clock } from "lucide-react";
import type { StaffMember, StaffStatusType } from "@/lib/schemas";
import { format, isValid } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PaginationControls from "@/components/shared/PaginationControls";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


interface StaffTableProps {
  staffData: StaffMember[];
  onEdit?: (staff: StaffMember) => void;
  onDelete?: (staffId: string, staffName: string) => Promise<void>;
  onSetStatus?: (staffId: string, newStatus: StaffStatusType, staffName: string) => void;
  isViewer: boolean;
  onImageClick?: (imageUrl: string | null) => void;
  isLoading?: boolean; 
  searchActive?: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const ITEMS_PER_PAGE = 20;

const formatDateSafe = (dateInput: Date | string | null | undefined): string => {
  if (!dateInput) return "";
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return isValid(date) ? format(date, "dd/MM/yyyy") : "";
};

const isPlaceholderUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith("https://placehold.co");
};

export default function StaffTable({ 
    staffData, 
    onEdit, 
    onDelete, 
    onSetStatus, 
    isViewer, 
    onImageClick,
    isLoading = false,
    searchActive = false,
    currentPage,
    onPageChange
}: StaffTableProps) {
  const [staffToDelete, setStaffToDelete] = useState<{ id: string; name: string } | null>(null);

  const paginatedStaff = staffData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(staffData.length / ITEMS_PER_PAGE);
  
  const handleDeleteClick = (id: string, name: string) => {
    setStaffToDelete({ id, name });
  };

  const confirmDelete = () => {
    if (staffToDelete && onDelete) {
      onDelete(staffToDelete.id, staffToDelete.name);
    }
    setStaffToDelete(null);
  };


  return (
    <TooltipProvider>
      <div className="space-y-4">
        {isLoading && (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Filtering staff...</p>
            </div>
        )}
        {!isLoading && (
          <Table>
            <TableHeader className="bg-secondary sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[50px]">Sl. No.</TableHead>
                <TableHead className="w-[80px] px-2 py-2 text-center">Photo</TableHead>
                <TableHead className="px-2 py-2 text-left">Name</TableHead>
                <TableHead className="px-2 py-2 text-left">Designation</TableHead>
                <TableHead className="px-2 py-2 text-left">PEN</TableHead>
                <TableHead className="px-2 py-2 text-left text-xs">Period of Service (From)</TableHead>
                <TableHead className="px-2 py-2 text-left text-xs">Period of Service (To)</TableHead>
                <TableHead className="px-2 py-2 text-left">Roles</TableHead>
                <TableHead className="px-2 py-2 text-left">Phone No.</TableHead>
                <TableHead className="text-center w-[130px] px-2 py-2">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStaff.length > 0 ? paginatedStaff.map((staff, index) => {
                const canExpandAvatar = staff.photoUrl && !isPlaceholderUrl(staff.photoUrl) && onImageClick;
                const isPendingTransfer = staff.status === 'Pending Transfer';
                const serviceStart = formatDateSafe(staff.serviceStartDate);
                const serviceEnd = formatDateSafe(staff.serviceEndDate);
                
                return (
                  <TableRow key={staff.id} className={cn("hover:bg-primary/5", isPendingTransfer && "opacity-60 bg-amber-50/30")}>
                    <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                    <TableCell className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => canExpandAvatar && onImageClick(staff.photoUrl ?? null)}
                        disabled={!canExpandAvatar}
                        className={cn(
                          "relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mx-auto", 
                          canExpandAvatar && "cursor-pointer"
                        )}
                        aria-label={canExpandAvatar ? "View larger image" : "Staff photo"}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={staff.photoUrl ? staff.photoUrl : `https://placehold.co/96x96.png?text=${getInitials(staff.name)}`} alt={staff.name} data-ai-hint="person user"/>
                          <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                         {canExpandAvatar && (
                          <div className="absolute bottom-0 right-0 bg-black/50 p-0.5 rounded-sm">
                            <Expand className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className={cn("font-medium whitespace-normal break-words max-w-[150px] px-2 py-2 text-left")}>
                      <div className="flex flex-col gap-1">
                        {staff.name}
                        {isPendingTransfer && (
                            <Badge variant="outline" className="w-fit text-[10px] font-bold border-amber-500 text-amber-700 bg-amber-100 flex items-center gap-1">
                                <Clock className="h-3 w-3"/> Pending Transfer
                            </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn("whitespace-normal break-words max-w-[180px] px-2 py-2 text-left")}>
                      {staff.designation}
                    </TableCell>
                    <TableCell className={cn("whitespace-normal break-words max-w-[100px] px-2 py-2 text-left")}>{staff.pen}</TableCell>
                    <TableCell className="text-[10px] px-2 py-2 text-left">
                        {serviceStart || 'N/A'}
                    </TableCell>
                    <TableCell className="text-[10px] px-2 py-2 text-left">
                        {serviceEnd || 'Present'}
                    </TableCell>
                    <TableCell className="text-xs px-2 py-2 text-left max-w-[150px]">
                      {staff.roles ? (
                        <Tooltip>
                          <TooltipTrigger className="text-left">
                            <p className="line-clamp-2">{staff.roles}</p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="whitespace-pre-wrap">{staff.roles}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : "N/A"}
                    </TableCell>
                    <TableCell className="text-xs px-2 py-2 text-left">{staff.phoneNo || "N/A"}</TableCell>
                    <TableCell className="text-center px-2 py-2">
                      <div className="flex items-center justify-center space-x-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => onEdit && onEdit(staff)}>
                               <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{(isViewer || isPendingTransfer) ? "View Details" : "View / Edit Staff"}</p></TooltipContent>
                        </Tooltip>
                        {!isViewer && onDelete && !isPendingTransfer && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDeleteClick(staff.id, staff.name)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Delete Staff</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              }) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center px-2 py-2">
                    {searchActive ? "No staff members found matching your search." : "No staff members found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
             {paginatedStaff.length > 0 && totalPages > 1 && (
               <TableCaption className="py-2">
                  <div className="flex items-center justify-center">
                      <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={onPageChange}
                      />
                  </div>
              </TableCaption>
             )}
          </Table>
        )}

        {staffToDelete && (
            <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently delete <strong>{staffToDelete.name}</strong>. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setStaffToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
      </div>
    </TooltipProvider>
  );
}
