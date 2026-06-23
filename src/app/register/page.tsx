// src/app/register/page.tsx
"use client";

import RegisterForm from "@/components/auth/RegisterForm";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";


export const dynamic = 'force-dynamic';

export default function AdminRegisterPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is loaded but is not a super admin, show access denied
  if (user && user.role !== 'superAdmin') {
    return (
       <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <div className="space-y-6 p-6 text-center bg-card rounded-lg shadow-lg">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to create new users.
          </p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  // Only render the form if the user is a super admin
  if (user && user.role === 'superAdmin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <div className="flex w-full max-w-4xl flex-col items-center space-y-8 rounded-xl bg-card p-8 shadow-2xl md:flex-row md:space-y-0 md:space-x-10 md:p-12">
          <div className="flex w-full flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
            <Image
              src="https://placehold.co/120x120/2563EB/FFFFFF.png?text=GWD%0AKOLLAM&font=lato&fontWeight=900&font-size=24"
              alt="GWD Kollam Logo"
              width={100}
              height={100}
              className="mb-6 rounded-lg shadow-md"
              data-ai-hint="abstract logo"
              priority
            />
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              Create a New User
            </h1>
            <p className="mb-6 text-muted-foreground md:text-lg">
              As an administrator, you can create new user accounts here.
            </p>
            <div className="mt-4 rounded-md border border-accent/30 bg-accent/10 p-3 text-center md:text-left">
              <p className="text-sm font-medium text-accent">Important:</p>
              <p className="text-xs text-accent/80">
                Newly created users will have the {`'viewer'`} role and will need to be approved before they can log in.
              </p>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <RegisterForm />
          </div>
        </div>
      </div>
    );
  }

  // Fallback for the case where user is null but not loading (should be handled by useEffect redirect, but good to have)
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
