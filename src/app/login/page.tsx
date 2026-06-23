
// src/app/login/page.tsx
"use client";

import LoginForm from "@/components/auth/LoginForm";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { SUPER_ADMIN_EMAIL } from "@/lib/config";


export const dynamic = 'force-dynamic';

const Loader2 = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);


export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If the authentication state is resolved and the user is authenticated, redirect.
    if (!isLoading && isAuthenticated && user) {
      if (user.email === SUPER_ADMIN_EMAIL) {
        router.replace('/dashboard/super-admin');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, user]);

  // Show a loading screen only while the initial check is happening.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Render the login form if not loading and not yet authenticated.
  // The useEffect above will handle redirecting authenticated users.
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-4 font-sans">
      <div className="flex-1 flex items-center justify-center w-full my-8">
        <div className="flex w-full max-w-4xl flex-col items-center space-y-8 rounded-xl bg-card p-8 shadow-2xl md:flex-row md:space-y-0 md:space-x-10 md:p-12">
          {/* Left Column: Branding */}
          <div className="flex w-full flex-col items-center text-center md:w-1/2">
            <Image
              src="https://placehold.co/120x120/2563EB/FFFFFF.png?text=GWD&font=lato&fontWeight=900&font-size=24"
              alt="GWD Logo"
              width={100}
              height={100}
              className="mb-6 rounded-lg shadow-md"
              data-ai-hint="abstract logo"
              priority
            />
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-primary md:text-4xl">
              GWD Dashboard
            </h1>
            <p className="mb-6 text-muted-foreground md:text-lg">
              Efficiently manage and monitor ground water resources.
            </p>
            <p className="text-xs text-muted-foreground">
              Access requires an authorized account.
            </p>
          </div>
          {/* Right Column: Login Form */}
          <div className="w-full md:w-1/2">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-6 mt-auto border-t border-border/40 text-center text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} Ground Water Department, Government of Kerala. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
          <span className="text-muted-foreground/35 select-none">•</span>
          <span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span>
          <span className="text-muted-foreground/35 select-none">•</span>
          <span className="hover:text-primary transition-colors cursor-pointer">Technical Support: 8547650853</span>
        </div>
      </footer>
    </div>
  );
}
