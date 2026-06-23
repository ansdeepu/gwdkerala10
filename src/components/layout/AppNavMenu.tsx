
// src/components/layout/AppNavMenu.tsx
"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/schemas';
import { usePendingUpdates } from '@/hooks/usePendingUpdates'; 
import { Badge } from '@/components/ui/badge'; 
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { useEffect, useState, useMemo } from 'react';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { LayoutDashboard, Users, FileText, BarChart3, Briefcase, Truck, ClipboardList, Waves, Landmark, HelpCircle, Settings, FolderOpen, Building, DollarSign, Hammer, Hourglass, ArrowUpRight, TestTube2, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataStore } from '@/hooks/use-data-store';


export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
  subItems?: NavItem[];
}

export const regularNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/gw-investigation', label: 'GW Investigation', icon: TestTube2, roles: ['admin', 'scientist', 'investigator', 'viewer'] },
  { href: '/dashboard/logging-pumping-test', label: 'Logging & Pumping Test', icon: Droplets, roles: ['admin', 'scientist', 'investigator', 'viewer'] },
  { href: '/dashboard/file-room', label: 'Deposit Works', icon: FolderOpen, roles: ['admin', 'engineer', 'supervisor', 'viewer'] },
  { href: '/dashboard/collectors-deposit-works', label: "Collector's Deposit Works", icon: Landmark, roles: ['admin', 'engineer', 'supervisor', 'viewer'] },
  { href: '/dashboard/private-deposit-works', label: 'Private Deposit Works', icon: Building, roles: ['admin', 'engineer', 'supervisor', 'viewer'] },
  { href: '/dashboard/plan-fund-works', label: 'Plan Fund Works', icon: Landmark, roles: ['admin', 'engineer', 'supervisor', 'viewer'] },
  { href: '/dashboard/ars', label: 'ARS', icon: Waves, roles: ['admin', 'engineer', 'supervisor', 'viewer'] },
  { href: '/dashboard/agency-registration', label: 'Rig Registration', icon: ClipboardList, roles: ['admin', 'engineer', 'viewer'] },
  { href: '/dashboard/e-tender', label: 'e-Tender', icon: Hammer, roles: ['admin', 'engineer', 'viewer'] },
  { href: '/dashboard/vehicles', label: 'Vehicle & Rig', icon: Truck, roles: ['admin', 'engineer', 'viewer'] },
  { href: '/dashboard/pending-updates', label: 'Pending Actions', icon: Hourglass, roles: ['admin', 'scientist', 'engineer'] },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/progress-report', label: 'Progress Reports', icon: BarChart3 },
  { href: '/dashboard/report-format-suggestion', label: 'Report Builders', icon: ClipboardList },
  { href: '/dashboard/gwd-rates', label: 'GWD Rates', icon: DollarSign },
  { href: '/dashboard/establishment', label: 'Establishment', icon: Briefcase, roles: ['admin', 'engineer', 'scientist', 'viewer'] },
  { href: '/dashboard/user-management', label: 'User Management', icon: Users, roles: ['admin'] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  { href: '/dashboard/help', label: 'Help & About', icon: HelpCircle },
];

export const superAdminNavItems: NavItem[] = [
    { href: '/dashboard/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/plan-fund-works?code=4702-02-102-94', label: 'GWBDWS (4702)', icon: Landmark },
    { href: '/dashboard/plan-fund-works?code=2702-02-103-99', label: 'GWBDWS (2702)', icon: Landmark },
    { href: '/dashboard/super-admin/ars-plan', label: 'ARS - Plan', icon: Waves },
    { href: '/dashboard/super-admin/technical-sanction', label: 'Technical Sanction', icon: FileText },
    { href: '/dashboard/super-admin/rig-registration', label: 'Rig Registration', icon: ClipboardList },
    { href: '/dashboard/super-admin/vehicles', label: 'Vehicle & Rig', icon: Truck },
    { href: '/dashboard/super-admin/reports', label: 'Reports', icon: FileText },
    { href: '/dashboard/super-admin/progress-reports', label: 'Progress Reports', icon: BarChart3 },
    { href: '/dashboard/super-admin/gwd-rates', label: 'GWD Rates', icon: DollarSign },
    { href: '/dashboard/super-admin/establishment', label: 'Establishment', icon: Briefcase },
    { href: '/dashboard/super-admin/office-management', label: 'Office Management', icon: Building },
    { href: '/dashboard/super-admin/user-management', label: 'Directorate Users', icon: Users },
    { href: '/dashboard/super-admin/settings', label: 'Settings', icon: Settings },
    { href: '/dashboard/help', label: 'Help & About', icon: HelpCircle },
];

const navItemColors = [
  "text-sky-700", "text-blue-700", "text-indigo-700", "text-violet-700",
  "text-purple-700", "text-fuchsia-700", "text-pink-700", "text-rose-700",
  "text-red-700", "text-orange-700", "text-amber-700",
  "text-lime-700", "text-green-700", "text-emerald-700", "text-teal-700", "text-cyan-700"
];


export default function AppNavMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { clearAllSearchTerms } = useDataStore();
  const { subscribeToPendingUpdates } = usePendingUpdates();
  const { setIsNavigating } = usePageNavigation();
  const [pendingCount, setPendingCount] = useState(0);

  const isSuperAdmin = user?.role === 'superAdmin';

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'scientist' && user.role !== 'engineer' && !isSuperAdmin)) {
        setPendingCount(0);
        return;
    }
    const unsubscribe = subscribeToPendingUpdates((updates) => {
        setPendingCount(updates.length);
    });
    return () => unsubscribe();
  }, [user, isSuperAdmin, subscribeToPendingUpdates]);

  const navItems = useMemo(() => {
      const sourceItems = isSuperAdmin ? superAdminNavItems : regularNavItems;
      return sourceItems.filter(item => {
        if (!user || !user.isApproved) return false;
        if (!item.roles || item.roles.length === 0) return true;
        return item.roles.includes(user.role);
      });
  }, [user, isSuperAdmin]);

  const handleNavigation = (href: string) => {
    const targetPath = href.split('?')[0];
    if (targetPath !== pathname) {
      setIsNavigating(true);
      // Clear all search terms when navigating between different modules via the sidebar
      clearAllSearchTerms();
    }
  };

  return (
    <SidebarMenu>
      {navItems.map((item, index) => {
        const cleanHref = item.href.split('?')[0];
        const isDashboard = cleanHref === '/dashboard' || cleanHref === '/dashboard/super-admin';
        
        let isActive;

        if (cleanHref === '/dashboard/plan-fund-works') {
            const itemQuery = new URLSearchParams(item.href.split('?')[1] || '');
            const itemCode = itemQuery.get('code');
            const currentCode = searchParams.get('code');
            isActive = pathname === cleanHref && itemCode === currentCode;
        } else if (pathname.startsWith('/dashboard/data-entry')) {
            const workType = searchParams.get('workType');
            const workTypeMapping: Record<string, string> = {
                'gwInvestigation': '/dashboard/gw-investigation',
                'loggingPumpingTest': '/dashboard/logging-pumping-test',
                'public': '/dashboard/file-room',
                'private': '/dashboard/private-deposit-works',
                'collector': '/dashboard/collectors-deposit-works',
                'planFund': '/dashboard/plan-fund-works',
            };
            isActive = workType ? workTypeMapping[workType] === cleanHref : false;
        } else if (pathname.startsWith('/dashboard/e-tender/')) {
            isActive = cleanHref === '/dashboard/e-tender';
        } else if (pathname.startsWith('/dashboard/agency-registration')) {
            isActive = cleanHref === '/dashboard/agency-registration' || cleanHref === '/dashboard/super-admin/rig-registration';
        } else {
            isActive = isDashboard ? pathname === cleanHref : pathname.startsWith(cleanHref);
            // If not active, and user is super-admin, check for shared page paths
            if (!isActive && isSuperAdmin) {
                const sharedPath = cleanHref.replace('/super-admin', '');
                if (pathname === sharedPath) {
                    isActive = true;
                }
            }
        }

        return (
          <SidebarMenuItem key={item.href}>
              <div className="flex items-center w-full group">
                <Link href={item.href} passHref onClick={() => handleNavigation(item.href)} className="flex-grow">
                  <SidebarMenuButton
                    asChild
                    size="compact"
                    isActive={isActive}
                    tooltip={{ children: item.label, side: "right", align: "center" }}
                    className={cn(
                        "justify-start pr-8 transition-all relative overflow-hidden",
                        isActive ? "bg-primary/10 text-primary border-l-4 border-primary rounded-none shadow-inner" : "hover:bg-sidebar-accent"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : navItemColors[index % navItemColors.length])} />
                        <span className={cn("font-medium", isActive ? "text-primary font-bold" : navItemColors[index % navItemColors.length])}>{item.label}</span>
                      </div>
                      {item.href === '/dashboard/pending-updates' && pendingCount > 0 && (
                        <Badge className="h-5 px-2 text-xs font-semibold leading-none rounded-full bg-destructive text-destructive-foreground group-data-[collapsible=icon]:hidden">
                          {pendingCount}
                        </Badge>
                      )}
                    </div>
                  </SidebarMenuButton>
                </Link>
                 <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Link 
                            href={item.href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
                          >
                              <ArrowUpRight className="h-4 w-4" />
                          </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right"><p>Open in New Window</p></TooltipContent>
                  </Tooltip>
                 </TooltipProvider>
              </div>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
