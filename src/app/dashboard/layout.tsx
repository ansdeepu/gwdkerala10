
// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useCallback, useState, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/AppSidebar';
import { useToast } from "@/hooks/use-toast";
import { PageNavigationProvider, usePageNavigation } from '@/hooks/usePageNavigation';
import { PageHeaderProvider, usePageHeader } from '@/hooks/usePageHeader';
import { DataStoreProvider } from '@/hooks/use-data-store';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth, type UserProfile, updateUserLastActive } from '@/hooks/useAuth';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';
import { Loader2, Clock, Building, ChevronRight, Home } from 'lucide-react';
import OfficeSwitcher from '@/components/layout/OfficeSwitcher';

const IDLE_TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const LAST_ACTIVE_UPDATE_INTERVAL = 5 * 60 * 1000; // Update Firestore lastActiveAt at most once per 5 minutes

function HeaderContent({ user }: { user: UserProfile | null }) {
  const { title, description } = usePageHeader();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  useEffect(() => {
    setCurrentTime(new Date());
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  return (
    <div className="flex items-center justify-between w-full gap-4 px-6 py-3">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Toggle Sidebar (Ctrl+B)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex flex-col min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate leading-tight">{title}</h1>
          {description && <p className="text-[10px] text-muted-foreground truncate hidden lg:block">{description}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-4 shrink-0">
         {isSuperAdmin ? (
              <OfficeSwitcher />
          ) : user?.officeLocation ? (
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="whitespace-nowrap font-bold">{user.officeLocation.charAt(0).toUpperCase() + user.officeLocation.slice(1).toLowerCase()}</span>
              </div>
          ) : null}
        <div className={cn("flex items-center gap-2 text-sm font-medium text-primary whitespace-nowrap")}>
          <Clock className="h-4 w-4" />
          {currentTime ? (
            <span className="font-mono font-bold">{format(currentTime, 'dd/MM/yyyy, hh:mm:ss a')}</span>
          ) : (
            <span className="w-40 h-4 bg-muted-foreground/20 rounded-md animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function BreadcrumbNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { title } = usePageHeader();

  const breadcrumbs = useMemo(() => {
    if (pathname === '/dashboard/bidders') {
        return [
            { href: '/dashboard/e-tender', label: 'e-Tender', isLast: false },
            { href: '/dashboard/bidders', label: 'Bidders Management', isLast: true },
        ];
    }
    
    if (!pathname) return [];

    const labelMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'gw-investigation': 'GW Investigation',
      'logging-pumping-test': 'Logging & Pumping Test',
      'file-room': 'Deposit Works',
      'collectors-deposit-works': "Collector's Deposit Works",
      'private-deposit-works': 'Private Deposit Works',
      'plan-fund-works': 'Plan Fund Works',
      'agency-registration': 'Rig Registration',
      'rig-registration': 'Rig Registration',
      'e-tender': 'e-Tender',
      'vehicles': 'Vehicle & Rig',
      'pending-updates': 'Pending Actions',
      'report-format-suggestion': 'Report Builders',
      'gwd-rates': 'GWD Rates',
      'super-admin': 'Super Admin',
      'establishment': 'Establishment',
      'user-management': 'User Management',
      'settings': 'Settings',
      'help': 'Help & About',
      'ars': 'ARS',
      'ars-plan': 'ARS - Plan',
      'office-management': 'Office Management',
      'progress-reports': 'Progress Reports',
      'report-builder': 'Report Builder',
      'profile': 'My Profile',
      'entry': 'Entry',
    };

    const segments = pathname.split('/').filter(Boolean);
    const result: Array<{ href: string; label: string; isLast: boolean }> = [];
    
    const detailIdFromUrl = searchParams?.get('id');
    const pageNum = searchParams?.get('page');
    const tabName = searchParams?.get('tab');
    const workType = searchParams?.get('workType');

    // Helper to append current navigation context to a return link
    const withContext = (url: string, currentDetailId?: string) => {
        const p = new URLSearchParams();
        if (pageNum) p.set('page', pageNum);
        if (tabName) p.set('tab', tabName);
        
        // Use either the URL id or the extracted path ID
        const idToPass = currentDetailId || detailIdFromUrl;
        if (idToPass && idToPass !== 'new') p.set('lastId', idToPass);
        
        const qs = p.toString();
        return qs ? `${url}?${qs}` : url;
    };
    
    segments.forEach((segment, index) => {
      let href = `/${segments.slice(0, index + 1).join('/')}`;
      const isLast = index === segments.length - 1;
      const prevSegment = index > 0 ? segments[index - 1] : null;
      const nextSegment = segments[index + 1];
      
      let label = labelMap[segment] || segment.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Handle the specialized data-entry path
      if (segment === 'data-entry') {
          const workTypeMapping: Record<string, { label: string, href: string }> = {
              'gwInvestigation': { label: 'GW Investigation', href: '/dashboard/gw-investigation' },
              'loggingPumpingTest': { label: 'Logging & Pumping Test', href: '/dashboard/logging-pumping-test' },
              'public': { label: 'Deposit Works', href: '/dashboard/file-room' },
              'private': { label: 'Private Deposit Works', href: '/dashboard/private-deposit-works' },
              'collector': { label: "Collector's Deposit Works", href: '/dashboard/collectors-deposit-works' },
              'planFund': { label: 'Plan Fund Works', href: '/dashboard/plan-fund-works' },
          };
          
          if (workType && workTypeMapping[workType]) {
              result.push({ 
                href: withContext(workTypeMapping[workType].href), 
                label: workTypeMapping[workType].label, 
                isLast: false 
              });
          }
          
          if (isLast) {
              result.push({ href: '#', label: title, isLast: true });
          }
          return;
      }

      // Check if this segment represents a list page that currently has an active detail child
      const hasDetailComing = detailIdFromUrl || nextSegment === 'new' || nextSegment === 'entry' || (segment === 'e-tender' && nextSegment && nextSegment.length > 5);
      
      const isIdSegment = segment.length > 15 || segment === 'new' || (prevSegment && ['e-tender', 'ars', 'agency-registration'].includes(prevSegment));

      if (isLast && (isIdSegment || detailIdFromUrl)) {
          // Clean up the label for the current detail page
          let detailLabel = title;
          const prefixes = [
            /^Edit e-Tender: /, /^Create New e-Tender/, /^Edit File: /, /^View File: /,
            /^Approve Update: /, /^Approve ARS Update/, /^Edit: /, /^View: /, /^Update: /,
            /^New Rig Registration/
          ];
          prefixes.forEach(p => detailLabel = detailLabel.replace(p, ''));
          
          if (!detailLabel || detailLabel.includes('Loading')) {
              detailLabel = (detailIdFromUrl === 'new' || segment === 'new') ? 'New' : 'Details';
          }
          
          result.push({ href: '#', label: detailLabel, isLast: true });
      } else {
          // If this is a parent list page, append the context so clicking it preserves state
          const extractedId = (segment === 'e-tender' && nextSegment) ? nextSegment : undefined;
          
          const finalHref = (segment !== 'dashboard' && segment !== 'super-admin' && hasDetailComing) 
            ? withContext(href, extractedId) 
            : href;
            
          result.push({ href: finalHref, label, isLast: false });
      }
    });

    return result;
  }, [pathname, title, searchParams]);

  const isSuperAdminPath = pathname?.startsWith('/dashboard/super-admin');
  const homeHref = isSuperAdminPath ? '/dashboard/super-admin' : '/dashboard';

  if (pathname === '/dashboard' || pathname === '/dashboard/super-admin') return null;

  return (
    <nav className="flex items-center space-x-1 text-xs text-muted-foreground mb-4 px-1" aria-label="Breadcrumb">
      <Link href={homeHref} className="hover:text-primary transition-colors flex items-center">
        <Home className="h-3 w-3 mr-1" />
        <span>Dashboard</span>
      </Link>
      {breadcrumbs.filter(b => b.href !== '/dashboard' && b.href !== '/dashboard/super-admin').map((crumb, idx) => (
        <React.Fragment key={crumb.href + idx}>
          <ChevronRight className="h-3 w-3 shrink-0" />
          {crumb.isLast ? (
            <span className="font-medium text-primary truncate max-w-[300px]">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-primary transition-colors truncate max-w-[200px]">
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

function InnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading, logout } = useAuth();
  const idleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityFirestoreUpdateRef = React.useRef<number>(0); 
  const { toast } = useToast();
  const { isNavigating, setIsNavigating } = usePageNavigation();

  const isDashboardPage = pathname === '/dashboard' || pathname === '/dashboard/super-admin';

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
        router.replace('/login');
        return;
    } 

    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

    if (isSuperAdmin && pathname === '/dashboard') {
        router.replace('/dashboard/super-admin');
        return;
    }
    
    if (!isSuperAdmin && pathname.startsWith('/dashboard/super-admin')) {
        router.replace('/dashboard');
        return;
    }

  }, [user, isLoading, pathname, router]);

  const performIdleLogout = useCallback(() => {
    toast({
      title: "Session Expired",
      description: "You have been signed out due to inactivity.",
      duration: 5000,
    });
    logout();
  }, [logout, toast]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    if (user?.uid) { 
      idleTimerRef.current = setTimeout(performIdleLogout, IDLE_TIMEOUT_DURATION);
      const now = Date.now();
      if (now - lastActivityFirestoreUpdateRef.current > LAST_ACTIVE_UPDATE_INTERVAL) {
        lastActivityFirestoreUpdateRef.current = now;
        updateUserLastActive(user.uid, user.officeLocation);
      }
    }
  }, [user, performIdleLogout]);


  useEffect(() => {
    if (user) {
      const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
      const handleUserActivity = () => resetIdleTimer();
      
      activityEvents.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));
      resetIdleTimer(); 
      
      return () => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
      };
    } else {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [user, resetIdleTimer]);

  useEffect(() => {
      setIsNavigating(false);
  }, [pathname, searchParams, setIsNavigating]);

  const isRedirecting = !isLoading && user && (
    (user.email === SUPER_ADMIN_EMAIL && pathname === '/dashboard') ||
    (user.email !== SUPER_ADMIN_EMAIL && pathname.startsWith('/dashboard/super-admin'))
  );

  if (isLoading || !user || isRedirecting) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
      <SidebarProvider defaultOpen>
        {isNavigating && (
          <div className="page-transition-spinner">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <FirebaseErrorListener />
            <header className="sticky top-0 z-30 flex items-center border-b bg-background/95 backdrop-blur-sm w-full min-h-[64px]">
                  <HeaderContent user={user} />
              </header>
            <main className={cn(
              "flex-1 overflow-x-hidden overflow-y-auto bg-background",
              !isDashboardPage ? "p-6 pt-4" : "p-0"
            )}>
              {!isDashboardPage && <BreadcrumbNav />}
              <div id="main-content-wrapper">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
  return (
    <PageNavigationProvider>
      <PageHeaderProvider>
        <DataStoreProvider user={user}>
            <TooltipProvider>
              <Suspense fallback={
                  <div className="flex h-screen w-screen items-center justify-center bg-background">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  </div>
              }>
                <InnerDashboardLayout>{children}</InnerDashboardLayout>
              </Suspense>
            </TooltipProvider>
        </DataStoreProvider>
      </PageHeaderProvider>
    </PageNavigationProvider>
  );
}
