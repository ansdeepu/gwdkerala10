
// src/app/dashboard/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFileEntries } from "@/hooks/useFileEntries";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useAgencyApplications } from '@/hooks/useAgencyApplications';
import { useAuth, type UserProfile, updateUserLastActive } from '@/hooks/useAuth';
import { useAllFileEntriesForReports } from '@/hooks/useAllFileEntriesForReports';
import { usePageHeader } from '@/hooks/usePageHeader';
import type { SiteWorkStatus, DataEntryFormData } from '@/lib/schemas';
import { format, isValid, isWithinInterval, startOfMonth, endOfMonth, parse } from 'date-fns';
import FileStatusOverview from '@/components/dashboard/FileStatusOverview';
import NoticeBoard from '@/components/dashboard/NoticeBoard';
import ImportantUpdates from '@/components/dashboard/ImportantUpdates';
import ETenderNoticeBoard from '@/components/dashboard/ETenderNoticeBoard'; 
import WorkStatusByService from '@/components/dashboard/WorkStatusByService';
import ArsStatusOverview from '@/components/dashboard/ArsStatusOverview';
import RigRegistrationOverview from '@/components/dashboard/RigRegistrationOverview';
import WorkProgress from '@/components/dashboard/WorkProgress';
import SupervisorWork from '@/components/dashboard/SupervisorWork';
import DepartmentalRigWorks from '@/components/dashboard/DepartmentalRigWorks';
import DashboardDialogs from '@/components/dashboard/DashboardDialogs';
import FinanceOverview from '@/components/dashboard/FinanceOverview';
import RigFinancialSummary from '@/components/dashboard/RigFinancialSummary';
import ConstituencyWiseOverview from '@/components/dashboard/ConstituencyWiseOverview';
import PresentWorkDetails from '@/components/dashboard/PresentWorkDetails';
import { useDataStore } from '@/hooks/use-data-store';
import { Button } from '@/components/ui/button';
import { PRIVATE_APPLICATION_TYPES, LOGGING_PUMPING_TEST_PURPOSE_OPTIONS, PUBLIC_DEPOSIT_APPLICATION_TYPES, COLLECTOR_APPLICATION_TYPES, PLAN_FUND_APPLICATION_TYPES } from '@/lib/schemas';
import { Loader2, ArrowUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

const navLinks = [
    { id: 'updates', label: 'Updates' },
    { id: 'present-work', label: 'Present Work' },
    { id: 'file-status', label: 'File Status' },
    { id: 'work-status', label: 'Work Status' },
    { id: 'constituency', label: 'Constituency' },
    { id: 'finance', label: 'Finance' },
    { id: 'ars', label: 'ARS' },
    { id: 'rig-registration', label: 'Rig Registration' },
    { id: 'rig-financials', label: 'Rig Financials' },
    { id: 'work-progress', label: 'Work Progress' },
    { id: 'supervisor-work', label: 'Field Staff' },
    { id: 'rig-works', label: 'Rig Works' },
];

const scrollTo = (id: string) => {
    const scrollContainer = document.querySelector('main.overflow-y-auto');
    const element = document.getElementById(id);
    const dashboardNav = document.querySelector('.dashboard-nav-sticky') as HTMLElement;

    if (scrollContainer && element && dashboardNav) {
        const offset = dashboardNav.offsetHeight;
        const elementPosition = element.offsetTop;
        const offsetPosition = elementPosition - offset;

        scrollContainer.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

const DashboardNav = () => (
    <div className="dashboard-nav-sticky sticky top-0 z-20 bg-background/95 backdrop-blur-sm print:hidden">
        <div className="flex items-center overflow-x-auto no-scrollbar border-b px-2">
            {navLinks.map(link => (
                <button
                    key={link.id}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-2 shrink-0"
                    onClick={() => scrollTo(link.id)}
                >
                    {link.label}
                </button>
            ))}
        </div>
    </div>
);

const COMPLETED_WORK_STATUSES: string[] = ["Work Completed", "Work Failed", "Completed"];

export default function DashboardPage() {
  const { setHeader } = usePageHeader();
  const { fileEntries: filteredFileEntries, isLoading: filteredEntriesLoading } = useFileEntries();
  const { reportEntries: allFileEntries, isReportLoading } = useAllFileEntriesForReports();
  const { staffMembers, isLoading: staffLoading } = useStaffMembers();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { applications: agencyApplications, isLoading: agenciesLoading } = useAgencyApplications();
  const { 
    allRigCompressors,
    allArsEntries: arsEntries, 
    allUsers,
    isLoading: storeLoading 
  } = useDataStore();

  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    data: [] as any[],
    columns: [] as { key: string; label: string; isNumeric?: boolean; }[],
    type: 'detail' as 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance'
  });
  
  const [financeDates, setFinanceDates] = useState<{ start?: Date, end?: Date }>({});
  const [arsDates, setArsDates] = useState<{ start?: Date, end?: Date }>({});
  const [constituencyDates, setConstituencyDates] = useState<{ start?: Date, end?: Date }>({});
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    setHeader('Dashboard', 'A high-level overview of all departmental activities and key metrics.');
    if (currentUser?.uid) {
        updateUserLastActive(currentUser.uid, currentUser.officeLocation);
    }
  }, [setHeader, currentUser]);

  useEffect(() => {
    const handleScroll = () => {
      const mainElement = document.querySelector('main.overflow-y-auto');
      if (mainElement && mainElement.scrollTop > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    const mainElement = document.querySelector('main.overflow-y-auto');
    mainElement?.addEventListener('scroll', handleScroll, { passive: true });

    return () => mainElement?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
     const mainElement = document.querySelector('main.overflow-y-auto');
     mainElement?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dashboardData = useMemo(() => {
    if (filteredEntriesLoading || isReportLoading || staffLoading || authLoading || storeLoading || !currentUser) return null;

    return {
        allFileEntriesForSupervisor: filteredFileEntries || [],
        allFileEntries: allFileEntries || [],
        staffMembers: staffMembers || []
    };
  }, [filteredEntriesLoading, isReportLoading, staffLoading, authLoading, storeLoading, currentUser, filteredFileEntries, allFileEntries, staffMembers]);

  const {
      constituencyWorks,
      depositWorksCount,
      collectorWorksCount,
      planFundWorksCount,
      arsWorksCount,
      totalCompletedCount
  } = useMemo(() => {
      const relevantFileEntries = (allFileEntries || []).filter(entry => {
          const isInvestigationCategory = ['Govt', 'Private', 'Complaints'].includes((entry as any).category);
          const hasGwPurpose = entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
          const hasLpPurpose = entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

          if (isInvestigationCategory || hasGwPurpose || hasLpPurpose) return false;
          if (entry.applicationType && (PRIVATE_APPLICATION_TYPES as readonly string[]).includes(entry.applicationType as any)) return false;
          return true;
      });

      const allWorksFromFiles = relevantFileEntries.flatMap(entry =>
          (entry.siteDetails || [])
          .filter(site => site.workStatus !== 'Work Cancelled')
          .map(site => ({
              ...site,
              fileNo: entry.fileNo,
              applicantName: entry.applicantName,
              applicationType: entry.applicationType,
              constituency: site.constituency,
              purpose: site.purpose || 'N/A',
              dateOfCompletion: site.dateOfCompletion,
              totalExpenditure: site.totalExpenditure || 0,
              workStatus: site.workStatus
          }))
      );

      const arsWorks = (arsEntries || [])
          .filter(entry => entry.arsStatus !== 'Work Cancelled')
          .map(entry => ({
          nameOfSite: entry.nameOfSite,
          constituency: entry.constituency,
          purpose: entry.arsTypeOfScheme || 'ARS',
          fileNo: entry.fileNo,
          applicantName: 'ARS Scheme',
          workStatus: entry.arsStatus,
          dateOfCompletion: entry.dateOfCompletion,
          totalExpenditure: entry.totalExpenditure || 0,
      }));

      const allConstituencyWorks = [...allWorksFromFiles, ...arsWorks];
      const completedCount = allConstituencyWorks.filter(w => w.workStatus && COMPLETED_WORK_STATUSES.includes(w.workStatus)).length;

      let depositWorksCount = 0;
      let collectorWorksCount = 0;
      let planFundWorksCount = 0;

      relevantFileEntries.forEach(entry => {
          const siteCount = entry.siteDetails?.filter(s => s.workStatus !== 'Work Cancelled').length || 0;
          if (siteCount === 0) return;

          if (entry.applicationType) {
              if ((PUBLIC_DEPOSIT_APPLICATION_TYPES as readonly string[]).includes(entry.applicationType as any)) depositWorksCount += siteCount;
              else if ((COLLECTOR_APPLICATION_TYPES as readonly string[]).includes(entry.applicationType as any)) collectorWorksCount += siteCount;
              else if ((PLAN_FUND_APPLICATION_TYPES as readonly string[]).includes(entry.applicationType as any)) planFundWorksCount += siteCount;
          } else {
              depositWorksCount += siteCount;
          }
      });

      return {
          constituencyWorks: allConstituencyWorks,
          depositWorksCount,
          collectorWorksCount,
          planFundWorksCount,
          arsWorksCount: arsWorks.length,
          totalCompletedCount: completedCount
      };
  }, [allFileEntries, arsEntries]);

  const handleOpenDialog = useCallback((
    data: any[],
    title: string,
    columns: { key: string; label: string; isNumeric?: boolean; }[] = [],
    type: 'detail' | 'rig' | 'age' | 'month' | 'fileStatus' | 'finance' = 'detail'
  ) => {
    setDialogState({ isOpen: true, data, title, columns, type });
  }, []);

  const isPageLoading = authLoading || storeLoading || isReportLoading || agenciesLoading || filteredEntriesLoading || !dashboardData;

  if (isPageLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="-mt-6">
      <DashboardNav />
      <div className="p-6 space-y-6">
        <div id="updates" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ETenderNoticeBoard />
          <ImportantUpdates allFileEntries={dashboardData.allFileEntries} />
          <NoticeBoard staffMembers={dashboardData.staffMembers} />
        </div>

        <div id="present-work">
          <PresentWorkDetails 
            allFileEntries={dashboardData.allFileEntries} 
            allArsEntries={arsEntries} 
            onOpenDialog={handleOpenDialog} 
          />
        </div>

        <div id="file-status">
          <FileStatusOverview 
              nonArsEntries={dashboardData.allFileEntries.filter(e => !e.applicationType?.includes("ARS"))}
              onOpenDialog={handleOpenDialog}
          />
        </div>

        <div id="work-status">
          <WorkStatusByService 
            allFileEntries={dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            currentUserRole={currentUser?.role}
          />
        </div>

        <div id="constituency">
          <ConstituencyWiseOverview
            allWorks={constituencyWorks}
            depositWorksCount={depositWorksCount}
            collectorWorksCount={collectorWorksCount}
            planFundWorksCount={planFundWorksCount}
            arsWorksCount={arsWorksCount}
            totalCompletedCount={totalCompletedCount}
            onOpenDialog={handleOpenDialog}
            dates={constituencyDates}
            onSetDates={setConstituencyDates}
          />
        </div>

        <div id="finance">
          <FinanceOverview 
            allFileEntries={dashboardData.allFileEntries}
            onOpenDialog={handleOpenDialog}
            dates={financeDates}
            onSetDates={setFinanceDates}
          />
        </div>

        <div id="ars">
          <ArsStatusOverview 
            onOpenDialog={handleOpenDialog}
            dates={arsDates}
            onSetDates={setArsDates}
          />
        </div>

        <div id="rig-registration">
          <RigRegistrationOverview 
            agencyApplications={agencyApplications}
            onOpenDialog={handleOpenDialog}
          />
        </div>

        <div id="rig-financials">
          <RigFinancialSummary
              applications={agencyApplications}
              onCellClick={handleOpenDialog}
            />
        </div>

        <div id="work-progress">
          <WorkProgress
            allFileEntries={dashboardData.allFileEntries}
            allArsEntries={arsEntries}
            onOpenDialog={handleOpenDialog}
            currentUser={currentUser}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div id="supervisor-work">
                <SupervisorWork
                    allFileEntries={dashboardData.allFileEntries}
                    allArsEntries={arsEntries}
                    allUsers={allUsers}
                    staffMembers={dashboardData.staffMembers}
                    onOpenDialog={handleOpenDialog}
                />
            </div>
            <div id="rig-works">
                <DepartmentalRigWorks
                    allFileEntries={dashboardData.allFileEntries}
                    rigCompressors={allRigCompressors}
                    onOpenDialog={handleOpenDialog}
                />
            </div>
        </div>

        <DashboardDialogs 
          dialogState={dialogState}
          setDialogState={setDialogState}
          allFileEntries={dashboardData.allFileEntries}
          allArsEntries={arsEntries}
          financeDates={financeDates}
          currentUser={currentUser}
        />

        {showScrollTop && (
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
