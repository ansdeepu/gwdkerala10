
// src/components/admin/UserManagementTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Eye, UserCog } from "lucide-react";
import type { UserProfile } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { userRoleOptions, type UserRole, type StaffMember } from "@/lib/schemas";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

const hashCode = (str: string): number => {
    let hash = 0;
    const s = str || 'user';
    for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; 
    }
    return hash;
};

const getColorClass = (nameOrEmail: string): string => {
    const colors = [
        "bg-red-200 text-red-800", "bg-orange-200 text-orange-800", "bg-amber-200 text-amber-800",
        "bg-yellow-200 text-yellow-800", "bg-lime-200 text-lime-800", "bg-green-200 text-green-800",
        "bg-emerald-200 text-emerald-800", "bg-teal-200 text-teal-800", "bg-cyan-200 text-cyan-800",
        "bg-sky-200 text-sky-800", "bg-blue-200 text-blue-800", "bg-indigo-200 text-indigo-800",
        "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800", "bg-fuchsia-200 text-fuchsia-800",
        "bg-pink-200 text-pink-800", "bg-rose-200 text-rose-800"
    ];
    const hash = hashCode(nameOrEmail || 'user');
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

interface UserManagementTableProps {
  currentUser: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
  onDataChange: () => void;
  isViewer: boolean;
  updateUserApproval: (uid: string, isApproved: boolean, officeLocation?: string) => Promise<void>;
  updateUserRole: (uid: string, newRole: UserRole, staffId?: string, officeLocation?: string) => Promise<void>;
  deleteUserDocument: (uid: string, officeLocation?: string) => Promise<void>;
  staffMembers: StaffMember[];
  onEditUser?: (user: UserProfile) => void;
  officeCode?: string;
}

export default function UserManagementTable({
  currentUser,
  users,
  isLoading,
  onDataChange,
  isViewer,
  updateUserApproval,
  updateUserRole,
  deleteUserDocument,
  staffMembers,
  onEditUser,
  officeCode,
}: UserManagementTableProps) {
  const { toast } = useToast();
  const [updatingUsers, setUpdatingUsers] = useState<Record<string, { approval?: boolean, role?: boolean }>>({});
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const isSuperAdmin = currentUser?.role === 'superAdmin';

  const sortedUsers = useMemo(() => {
    const roleOrder: Record<string, number> = { 'superAdmin': 0, 'admin': 1, 'scientist': 2, 'engineer': 3, 'investigator': 4, 'supervisor': 5, 'viewer': 6 };
    return [...(users || [])].sort((a, b) => {
      const roleA = a.role ? (roleOrder[a.role] ?? 10) : 10;
      const roleB = b.role ? (roleOrder[b.role] ?? 10) : 10;
      if (roleA !== roleB) return roleA - roleB;
      const timeA = a.createdAt?.getTime() ?? 0;
      const timeB = b.createdAt?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [users]);


  const handleApprovalChange = async (userRow: UserProfile) => {
    const targetUid = userRow.uid;
    if (!targetUid) {
        toast({ title: "Error", description: "Target user ID is missing.", variant: "destructive" });
        return;
    }

    const isEditingRestricted = currentUser?.uid === targetUid || (!isSuperAdmin && (userRow.role === 'admin' || userRow.role === 'scientist' || userRow.role === 'engineer'));
    
    if (isEditingRestricted) {
      toast({ title: "Action Restricted", description: "This account status can only be modified by Super Admin.", variant: "default" });
      return;
    }
    setUpdatingUsers(prev => ({ ...prev, [targetUid]: { ...prev[targetUid], approval: true } }));
    try {
      await updateUserApproval(targetUid, !userRow.isApproved, userRow.officeLocation);
      toast({ title: "Approval Updated", description: `User approval status changed to ${!userRow.isApproved ? 'Approved' : 'Pending'}.` });
      onDataChange();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update approval status.", variant: "destructive" });
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [targetUid]: { ...prev[targetUid], approval: false } }));
    }
  };

  const handleRoleChange = async (userRow: UserProfile, newRole: UserRole) => {
    const targetUid = userRow.uid;
    if (!targetUid) {
        toast({ title: "Error", description: "Target user ID is missing.", variant: "destructive" });
        return;
    }

    const isEditingRestricted = currentUser?.uid === targetUid || (!isSuperAdmin && (userRow.role === 'admin' || userRow.role === 'scientist' || userRow.role === 'engineer'));

    if (isEditingRestricted) {
      toast({ title: "Action Restricted", description: "This account role can only be modified by Super Admin.", variant: "default" });
      return;
    }

    let staffIdToLink: string | undefined = undefined;
    if (!userRow.staffId && (newRole === 'supervisor' || newRole === 'investigator' || newRole === 'admin')) {
        const matchingStaffMember = (staffMembers || []).find(staff => staff.name === userRow.name);
        if (matchingStaffMember) {
            staffIdToLink = matchingStaffMember.id;
        }
    }

    setUpdatingUsers(prev => ({ ...prev, [targetUid]: { ...prev[targetUid], role: true } }));
    try {
      await updateUserRole(targetUid, newRole, staffIdToLink, userRow.officeLocation);
      toast({ title: "Role Updated", description: `User role for ${userRow?.name || 'user'} changed to ${newRole}.` });
      onDataChange();
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update role.", variant: "destructive" });
    } finally {
      setUpdatingUsers(prev => ({ ...prev, [targetUid]: { ...prev[targetUid], role: false } }));
    }
  };

  const handleDeleteUserClick = (user: UserProfile) => {
    const targetUid = user.uid;
    const isEditingRestricted = currentUser?.uid === targetUid || (!isSuperAdmin && (user.role === 'admin' || user.role === 'scientist' || user.role === 'engineer'));

    if (isEditingRestricted) {
      toast({ title: "Action Restricted", description: "This account can only be removed by Super Admin.", variant: "default" });
      return;
    }
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetUid = userToDelete.uid;
    if (!targetUid) return;

    setIsDeletingUser(true);
    try {
      await deleteUserDocument(targetUid, userToDelete.officeLocation);
      toast({ title: "User Removed", description: `Profile for ${userToDelete.name || userToDelete.email} has been removed.` });
      onDataChange();
    } catch (error: any) {
      toast({ title: "Removal Failed", description: error.message || "Could not remove user profile.", variant: "destructive" });
    } finally {
      setIsDeletingUser(false);
      setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading user accounts...</p>
      </div>
    );
  }

  if (!sortedUsers || sortedUsers.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground border rounded-lg bg-secondary/30">
         <UserCog className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
        <p className="text-lg font-medium">No Users Found</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative w-full max-h-[70vh] overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-secondary z-10">
            <TableRow>
              <TableHead className="w-[60px] px-3 py-2.5">Sl. No.</TableHead>
              <TableHead className="w-[70px] px-3 py-2.5 text-center">Photo</TableHead>
              <TableHead className="px-3 py-2.5">Name</TableHead>
              <TableHead className="px-3 py-2.5">Email</TableHead>
              <TableHead className="px-3 py-2.5">Registered</TableHead>
              <TableHead className="px-3 py-2.5 text-center">Role</TableHead>
              <TableHead className="px-3 py-2.5 text-center">Status</TableHead>
              {!isViewer && <TableHead className="px-3 py-2.5 text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((userRow, index) => {
              const targetUid = userRow.uid;
              const isCurrentUserTheUserInRow = currentUser?.uid === targetUid;
              const isEditingRestricted = isCurrentUserTheUserInRow || (!isSuperAdmin && (userRow.role === 'admin' || userRow.role === 'scientist' || userRow.role === 'engineer'));
              
              const disableActions = updatingUsers[targetUid]?.approval || updatingUsers[targetUid]?.role || isEditingRestricted;
              const staffInfo = (staffMembers || []).find(s => s.id === userRow.staffId);
              const photoUrl = staffInfo?.photoUrl;
              const avatarColorClass = getColorClass(userRow.name || userRow.email || 'user');


              return (
              <TableRow key={targetUid} className="hover:bg-primary/5">
                <TableCell className="px-3 py-2 font-medium text-center">{index + 1}</TableCell>
                <TableCell className="px-3 py-2">
                  <Avatar className="h-9 w-9 mx-auto">
                      <AvatarImage src={photoUrl || undefined} alt={userRow.name || 'User'} data-ai-hint="person user" />
                      <AvatarFallback className={cn("font-semibold", avatarColorClass)}>{getInitials(userRow.name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium px-3 py-2 whitespace-normal break-words">{userRow.name || "N/A"}</TableCell>
                <TableCell className="px-3 py-2 text-muted-foreground whitespace-normal break-words">{userRow.email}</TableCell>
                <TableCell className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {userRow.createdAt ? (
                    <Tooltip>
                      <TooltipTrigger>{formatDistanceToNowStrict(userRow.createdAt, { addSuffix: true })}</TooltipTrigger>
                      <TooltipContent>{format(userRow.createdAt, "dd MMM yyyy, hh:mm a")}</TooltipContent>
                    </Tooltip>
                  ) : "Unknown"}
                </TableCell>
                <TableCell className="px-3 py-2 text-center">
                    <Select
                      value={userRow.role || ''}
                      onValueChange={(newRole) => handleRoleChange(userRow, newRole as UserRole)}
                      disabled={isViewer || disableActions || updatingUsers[targetUid]?.role}
                    >
                      <SelectTrigger className="w-[120px] h-8 text-xs focus:ring-primary" aria-label={`Change role for ${userRow.name}`}>
                         {updatingUsers[targetUid]?.role ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        {(userRoleOptions || [])
                          .filter(roleOption => {
                            // 1. Never show superAdmin
                            if (roleOption === 'superAdmin') return false;
                            
                            // 2. Always show the current role so the picker has a value
                            if (roleOption === userRow.role) return true;

                            // 3. If current user is superAdmin, they can see everything else
                            if (isSuperAdmin) {
                                return true;
                            } 
                            
                            // 4. If current user is sub-office admin (admin)
                            if (currentUser?.role === 'admin') {
                                // Only show investigator, supervisor, viewer
                                return ['investigator', 'supervisor', 'viewer'].includes(roleOption);
                            }

                            return false;
                          })
                          .map(roleOption => (
                          <SelectItem key={roleOption} value={roleOption} className="text-xs">
                            {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </TableCell>
                <TableCell className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Switch
                      checked={userRow.isApproved || false}
                      onCheckedChange={() => handleApprovalChange(userRow)}
                      disabled={isViewer || disableActions || updatingUsers[targetUid]?.approval}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-destructive/30"
                    />
                    <Badge variant={userRow.isApproved ? "secondary" : "outline"} className={cn("text-xs", userRow.isApproved ? "border-green-600/50 text-green-700 bg-green-500/10" : "border-destructive/50 text-destructive bg-destructive/10")}>
                      {userRow.isApproved ? "Approved" : "Pending"}
                    </Badge>
                  </div>
                </TableCell>
                {!isViewer && 
                    <TableCell className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center space-x-0.5">
                            {isEditingRestricted ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center justify-center gap-1 opacity-50 cursor-not-allowed">
                                            <Button variant="ghost" size="icon" disabled><Eye className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" disabled className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{isCurrentUserTheUserInRow ? "You cannot modify your own account." : "Admin, Scientist, and Engineer accounts can only be managed by Super Admin."}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <>
                                    {onEditUser && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => onEditUser(userRow)} disabled={disableActions || isDeletingUser}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Edit User Details</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        onClick={() => handleDeleteUserClick(userRow)}
                                        disabled={disableActions || isDeletingUser}
                                        >
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Remove User Profile</p></TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                        </div>
                    </TableCell>
                }
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>

      {userToDelete && (
        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm User Removal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove the user profile for <strong>{userToDelete.name || userToDelete.email}</strong>?
                This action is permanent and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isDeletingUser}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteUser}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                disabled={isDeletingUser}
              >
                {isDeletingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Remove Profile"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </TooltipProvider>
  );
}
