// src/app/dashboard/super-admin/layout.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Loader2 } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && (!user || user.email !== SUPER_ADMIN_EMAIL)) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // This layout no longer provides the page structure. 
  // It only acts as a route guard. The main dashboard layout provides the shell.
  return <>{children}</>;
}
