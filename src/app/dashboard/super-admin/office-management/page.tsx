
// src/app/dashboard/super-admin/office-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import UserManagementTable from '@/components/admin/UserManagementTable';

const db = getFirestore(app);

const districts = ["Directorate TVM", "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Lab TVM", "Lab EKM", "Lab KKD"];

const NewOfficeAdminSchema = z.object({
  name: z.string().min(2, "Name is required."),
  officeLocation: z.string().min(2, "Office Location is required."),
  officeCode: z.string().min(1, "Office Code is required.").max(10, "Code is too long."),
  email: z.string().email("Invalid email address."),
});
type NewOfficeAdminFormData = z.infer<typeof NewOfficeAdminSchema>;

const EditUserSchema = z.object({
  name: z.string().min(2, "Name is required."),
  officeLocation: z.string().optional(),
});
type EditUserFormData = z.infer<typeof EditUserSchema>;

export default function OfficeManagementPage() {
  const { setHeader } = usePageHeader();
  const { user: currentUser, createOfficeAdmin, deleteUserDocument, updateUserApproval, updateUserRole, updateUserProfileByAdmin } = useAuth();
  const { allStaffMembers, allUsers, isLoading: isDataLoading, allOfficeAddresses, selectedOffice } = useDataStore();
  const { toast } = useToast();
  const [isOfficeUserDialogOpen, setIsOfficeUserDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const [officeToDelete, setOfficeToDelete] = useState<string | null>(null);
  const [usersToDelete, setUsersToDelete] = useState<UserProfile[]>([]);
  const [isDeletingOfficeUsers, setIsDeletingOfficeUsers] = useState(false);

  useEffect(() => {
    setHeader("Office Management", "Create and manage accounts for each office location.");
  }, [setHeader]);

  const officeAdminForm = useForm<NewOfficeAdminFormData>({
    resolver: zodResolver(NewOfficeAdminSchema),
    defaultValues: { name: "", officeLocation: "", officeCode: "", email: "" },
  });

  const editUserForm = useForm<EditUserFormData>({
    resolver: zodResolver(EditUserSchema),
  });

  useEffect(() => {
    if (userToEdit) {
      editUserForm.reset({
        name: userToEdit.name || '',
        officeLocation: userToEdit.officeLocation || '',
      });
    }
  }, [userToEdit, editUserForm]);


  const offices = useMemo(() => {
    const usersToProcess = selectedOffice
      ? allUsers.filter(u => u.officeLocation && u.officeLocation.toLowerCase() === selectedOffice.toLowerCase())
      : allUsers;

    const officeUsers = usersToProcess.filter(u => u.role !== 'superAdmin' && u.officeLocation);
    const officeMap = new Map<string, UserProfile[]>();
    officeUsers.forEach(user => {
        if(user.officeLocation) {
            const loc = user.officeLocation.toLowerCase();
            if (!officeMap.has(loc)) {
                officeMap.set(loc, []);
            }
            officeMap.get(loc)!.push(user);
        }
    });

    const customOfficeOrder = districts.map(d => d.toLowerCase());

    return Array.from(officeMap.entries()).sort((a, b) => {
        const indexA = customOfficeOrder.indexOf(a[0].toLowerCase());
        const indexB = customOfficeOrder.indexOf(b[0].toLowerCase());

        if (indexA === -1 && indexB === -1) return a[0].localeCompare(b[0]);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
    });
  }, [allUsers, selectedOffice]);

  const handleCreateOfficeSetup = async (data: NewOfficeAdminFormData) => {
    setIsSubmitting(true);
    const lowerCaseOfficeLocation = data.officeLocation.toLowerCase();
    const formattedName = formatCase(data.name) ?? data.name;
    try {
        const result = await createOfficeAdmin(data.email, formattedName, data.officeLocation);
        if (result.success) {
            const batch = writeBatch(db);

            // 1. Create document in top-level `officeAddresses`
            const globalOfficeAddressDocRef = doc(collection(db, "officeAddresses"));
            batch.set(globalOfficeAddressDocRef, {
                officeLocation: lowerCaseOfficeLocation,
                officeCode: data.officeCode.toUpperCase(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 2. Create document in nested `offices/{officeId}/officeAddresses`
            const officeSubCollectionPath = `offices/${lowerCaseOfficeLocation}/officeAddresses`;
            const newOfficeSubDocRef = doc(collection(db, officeSubCollectionPath));
            batch.set(newOfficeSubDocRef, {
                officeName: `Ground Water Department, ${data.officeLocation}`,
                officeLocation: lowerCaseOfficeLocation, // Redundant but good for consistency
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 3. Create the main office document
            const officeDocRef = doc(db, "offices", lowerCaseOfficeLocation);
            batch.set(officeDocRef, {
                name: `Ground Water Department, ${data.officeLocation}`,
                createdAt: serverTimestamp(),
            }, { merge: true });

            await batch.commit();

            toast({ title: "Office Accounts & Records Created", description: `Setup for ${data.officeLocation} is complete.` });
            setIsOfficeUserDialogOpen(false);
            officeAdminForm.reset();
        } else {
            throw new Error(result.error?.message || "Failed to create users.");
        }
    } catch (error: any) {
        toast({ title: "Error", description: `Could not create office setup: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleUpdateUser = async (data: EditUserFormData) => {
    if (!userToEdit) return;
    setIsSubmitting(true);
    try {
        await updateUserProfileByAdmin(userToEdit.uid, { name: formatCase(data.name) ?? data.name, officeLocation: data.officeLocation });
        toast({ title: "User Updated", description: `Profile for ${data.name} has been updated.` });
        setUserToEdit(null);
        // Data will refresh automatically via onSnapshot
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };
  
    const handleDeleteAllUsersInOffice = async () => {
        if (!officeToDelete || usersToDelete.length === 0) return;
        setIsDeletingOfficeUsers(true);
        try {
            await Promise.all(usersToDelete.map(userToDelete => {
                if (userToDelete.email === SUPER_ADMIN_EMAIL) return Promise.resolve();
                return deleteUserDocument(userToDelete.uid, userToDelete.officeLocation);
            }));

            toast({ title: "Users Deleted", description: `All users for ${officeToDelete} have been removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: `Could not delete all users: ${error.message}`, variant: "destructive" });
        } finally {
            setIsDeletingOfficeUsers(false);
            setOfficeToDelete(null);
            setUsersToDelete([]);
        }
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setIsOfficeUserDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Setup New Office Accounts</Button>
      </div>
      <div className="space-y-4">
        {isDataLoading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>
        ) : offices.length > 0 ? (
            offices.map(([officeLocation, officeUsers]) => {
                const officeCode = allOfficeAddresses.find(oa => oa.officeLocation.toLowerCase() === officeLocation.toLowerCase())?.officeCode;
                return (
                <Card key={officeLocation} className="bg-secondary/50">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg capitalize">{officeLocation}</CardTitle>
                            <Button variant="destructive" size="sm" onClick={() => { setOfficeToDelete(officeLocation); setUsersToDelete(officeUsers); }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete All Users
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <UserManagementTable
                            users={officeUsers}
                            isLoading={isDataLoading}
                            onDataChange={() => {}} // No need to manually reload
                            currentUser={currentUser}
                            isViewer={false}
                            updateUserApproval={updateUserApproval}
                            updateUserRole={updateUserRole}
                            deleteUserDocument={deleteUserDocument}
                            staffMembers={allStaffMembers}
                            onEditUser={(user) => setUserToEdit(user)}
                            officeCode={officeCode}
                        />
                    </CardContent>
                </Card>
            )})
        ) : (
              <p className="text-center text-muted-foreground py-10">No offices found.</p>
        )}
      </div>
      
      <Dialog open={isOfficeUserDialogOpen} onOpenChange={setIsOfficeUserDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Setup New Office Accounts</DialogTitle>
            <DialogDescription>
              This will automatically create 3 accounts for the office: Admin, Scientist, and Engineer.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-4">
            <Form {...officeAdminForm}>
              <form onSubmit={officeAdminForm.handleSubmit(handleCreateOfficeSetup)} className="space-y-4">
                <FormField name="name" control={officeAdminForm.control} render={({ field }) => (
                    <FormItem>
                        <FormLabel>Admin Name</FormLabel>
                        <FormControl><Input placeholder="Full name of the Office Admin" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                    name="officeLocation"
                    control={officeAdminForm.control}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Office Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {districts.map(district => (
                                <SelectItem key={district} value={district}>{district}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField name="officeCode" control={officeAdminForm.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Office Code</FormLabel>
                            <FormControl><Input placeholder="e.g., KLM" {...field} /></FormControl>
                            <FormDescription className="text-xs">Short code for file numbers.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField name="email" control={officeAdminForm.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g. gwdklm@gmail.com" {...field} /></FormControl>
                    <FormDescription>Scientist &amp; Engineer emails will be generated from this prefix.</FormDescription>
                     <div className="!mt-2 flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
                        <Info className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>Default password for all auto-created accounts: <strong>123456</strong></p>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}/>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOfficeUserDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Create Office Accounts
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {userToEdit && (
        <Dialog open={!!userToEdit} onOpenChange={(open) => !open && setUserToEdit(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {userToEdit.name}</DialogTitle>
                    <DialogDescription>
                        Modify the user&apos;s name or reassign their office location.
                    </DialogDescription>
                </DialogHeader>
                <Form {...editUserForm}>
                    <form onSubmit={editUserForm.handleSubmit(handleUpdateUser)}>
                        <div className="space-y-6 px-6 py-4">
                            <FormField name="name" control={editUserForm.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input placeholder="Enter user's full name" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField
                                name="officeLocation"
                                control={editUserForm.control}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Office Location</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder="Select an office location" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {districts.map(district => (
                                        <SelectItem key={district} value={district}>{district}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setUserToEdit(null)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!officeToDelete} onOpenChange={() => setOfficeToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete all {usersToDelete.length} users in the <strong>{officeToDelete}</strong> office. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingOfficeUsers}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllUsersInOffice} disabled={isDeletingOfficeUsers} className="bg-destructive hover:bg-destructive/90">
                      {isDeletingOfficeUsers ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete All"}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
