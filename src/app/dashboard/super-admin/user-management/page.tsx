// src/app/dashboard/super-admin/user-management/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, type UserProfile } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import UserManagementTable from '@/components/admin/UserManagementTable';
import { useDataStore } from '@/hooks/use-data-store';
import { usePageHeader } from '@/hooks/usePageHeader';
import type { UserRole } from '@/lib/schemas';

export default function DirectorateUserManagementPage() {
  const { setHeader } = usePageHeader();
  const { fetchAllUsers, deleteUserDocument, updateUserApproval, updateUserRole, user: currentUser } = useAuth();
  const { allStaffMembers, isLoading: isDataLoading } = useDataStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHeader("Directorate User Management", "Manage users for the directorate office.");
  }, [setHeader]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await fetchAllUsers();
      // Filter for users without an officeLocation (Directorate users)
      const directorateOnlyUsers = allUsers.filter(u => !u.officeLocation && u.email !== SUPER_ADMIN_EMAIL);
      setUsers(directorateOnlyUsers);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load users: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllUsers, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
           <UserManagementTable
              users={users}
              isLoading={isLoading}
              onDataChange={loadUsers}
              currentUser={currentUser}
              isViewer={false} // Super admin can manage
              updateUserApproval={updateUserApproval}
              updateUserRole={updateUserRole}
              deleteUserDocument={deleteUserDocument}
              staffMembers={allStaffMembers}
           />
        </CardContent>
      </Card>
    </div>
  );
}
