// src/app/dashboard/profile/page.tsx
"use client";

import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import { Badge } from "@/components/ui/badge";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useEffect } from "react";
import { cn } from '@/lib/utils';
import { getInitials } from "@/lib/utils";

export const dynamic = 'force-dynamic';

// Inline SVG components
const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);
const UserCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);
const ShieldCheck = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
const KeyRound = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/></svg>
);
const Briefcase = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
);

const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
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
    const hash = hashCode(nameOrEmail);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

export default function ProfilePage() {
  const { setHeader } = usePageHeader();
  useEffect(() => {
    setHeader('My Profile', 'View your account details and manage your password.');
  }, [setHeader]);

  const { user, isLoading: authLoading } = useAuth();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();

  const staffInfo = staffMembers.find(s => s.id === user?.staffId);
  const avatarColorClass = getColorClass(user?.name || user?.email || 'user');
  
  if (authLoading || staffLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
       <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">User not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={staffInfo?.photoUrl || undefined} alt={user.name || 'User'} data-ai-hint="person user" />
                <AvatarFallback className={cn("text-3xl", avatarColorClass)}>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{user.name || 'User'}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm space-y-3 text-center">
                <div className="flex items-center justify-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="font-medium">Role:</span>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'N/A'}
                    </Badge>
                </div>
                 {user.designation && (
                    <div className="flex items-center justify-center space-x-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span className="font-medium">Designation:</span>
                        <span className="text-foreground">{user.designation}</span>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-3">
                         <KeyRound className="h-5 w-5 text-primary" />
                        <CardTitle>Change Password</CardTitle>
                    </div>
                    <CardDescription>
                        Enter your current password and a new password to update your login credentials.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdatePasswordForm />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
