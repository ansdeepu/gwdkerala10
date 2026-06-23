
// src/app/dashboard/data-entry/page.tsx
"use client";
import DataEntryFormComponent from "@/components/shared/DataEntryForm";
import InvestigationDataEntryFormComponent from "@/components/investigation/InvestigationDataEntryForm";
import LoggingPumpingTestDataEntryFormComponent from "@/components/investigation/LoggingPumpingTestDataEntryForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/hooks/useAuth";
import { useMemo, useEffect, useState } from "react";
import type { DataEntryFormData, ApplicationType, StaffMember } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { usePendingUpdates } from "@/hooks/usePendingUpdates";
import { format, isValid, parseISO } from 'date-fns';
import { usePageHeader } from "@/hooks/usePageHeader";
import { useDataStore } from "@/hooks/use-data-store";
import { 
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    PRIVATE_APPLICATION_TYPES,
    COLLECTOR_APPLICATION_TYPES,
    PLAN_FUND_APPLICATION_TYPES,
    applicationTypeOptions,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS
} from '@/lib/schemas';
import { Timestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

const toDateOrNull = (value: any): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date && isValid(value)) return value;
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
        const d = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
        if (isValid(d)) return d;
    }
    if (typeof value === 'string') {
        let d = parseISO(value); 
        if (isValid(d)) return d;
        d = new Date(value);
        if (isValid(d)) return d;
    }
    return null;
 };

 const processDataForForm = (data: any): any => {
    const transform = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
  
      if (obj instanceof Timestamp) {
        return obj.toDate();
      }
  
      if (Array.isArray(obj)) {
        return obj.map(transform);
      }
  
      if (typeof obj === 'object' && !(obj instanceof Date)) {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            newObj[key] = transform(value);
          }
        }
        return newObj;
      }
      
      return obj;
    };
  
    const fullyProcessed = transform(data);
  
    const formatForInput = (obj: any): any => {
       if (obj === null || obj === undefined) return obj;
       if (Array.isArray(obj)) return obj.map(formatForInput);
  
       if (typeof obj === 'object' && !(obj instanceof Date)) {
          const newObj: { [key: string]: any } = {};
          const dateInputKeys = ['dateOfRemittance', 'dateOfPayment', 'dateOfCompletion', 'dateOfInvestigation', 'vesDate', 'arsSanctionedDate', 'serviceStartDate', 'serviceEndDate', 'dateOfBirth', 'date'];
  
          for (const key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  const value = obj[key];
                  if (dateInputKeys.includes(key) && value instanceof Date) {
                      newObj[key] = format(value, 'yyyy-MM-dd');
                  } else {
                      newObj[key] = formatForInput(value);
                  }
              }
          }
          return newObj;
       }
       return obj;
    };
  
    return formatForInput(fullyProcessed);
  };

const getFormDefaults = (workType: string | null): DataEntryFormData => {
  let fileStatus: any = 'File Under Process';
  if (workType === 'loggingPumpingTest') {
    fileStatus = 'Under Process';
  }

  return {
    fileNo: "", 
    applicantName: "", 
    phoneNo: "", 
    secondaryMobileNo: "",
    category: undefined,
    applicationType: undefined, 
    constituency: undefined,
    assignedSupervisorUids: [],
    remittanceDetails: [], 
    totalRemittance: 0, 
    reappropriationDetails: [],
    totalReappropriation: 0,
    totalReappropriationCredit: 0,
    siteDetails: [], 
    paymentDetails: [], 
    totalPaymentAllEntries: 0, 
    overallBalance: 0,
    fileStatus: fileStatus, 
    remarks: "",
  };
};

interface PageData {
  initialData: DataEntryFormData;
}

export default function DataEntryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileIdToEdit = searchParams?.get("id");
  const approveUpdateId = searchParams?.get("approveUpdateId");
  const pageToReturnTo = searchParams?.get('page') ?? null;
  const activeTab = searchParams?.get('tab') ?? null;
  const workTypeContext = searchParams?.get('workType') as 'public' | 'private' | 'collector' | 'planFund' | 'gwInvestigation' | 'loggingPumpingTest' | null;
  const readOnlyParam = searchParams?.get('readOnly');

  const { user, isLoading: authIsLoading } = useAuth();
  const { getPendingUpdateById, getPendingUpdates } = usePendingUpdates();
  const { toast } = useToast();
  const { setHeader } = usePageHeader();
  const { allLsgConstituencyMaps, allStaffMembers, allFileEntries, allUsers, isLoading: dataStoreLoading } = useDataStore();
  
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [fileNoForHeader, setFileNoForHeader] = useState<string | null>(null);
  const [isFormDisabledForFieldStaff, setIsFormDisabledForFieldStaff] = useState(false);
  
  const isApprovingUpdate = !!((user?.role === 'admin' || user?.role === 'scientist' || user?.role === 'engineer') && approveUpdateId);
  const effectiveUserRole = readOnlyParam === 'true' ? 'viewer' : user?.role;
  
  const returnPath = useMemo(() => {
    let base = '/dashboard/file-room'; 
    
    if (approveUpdateId) {
        base = '/dashboard/pending-updates'; 
    } else if (workTypeContext) { // Prioritize workTypeContext
        if (workTypeContext === 'collector') base = '/dashboard/collectors-deposit-works';
        else if (workTypeContext === 'planFund') base = '/dashboard/plan-fund-works';
        else if (workTypeContext === 'private') base = '/dashboard/private-deposit-works';
        else if (workTypeContext === 'public') base = '/dashboard/file-room';
        else if (workTypeContext === 'gwInvestigation') base = '/dashboard/gw-investigation';
        else if (workTypeContext === 'loggingPumpingTest') base = '/dashboard/logging-pumping-test';
    } else if (fileIdToEdit && pageData?.initialData) { // Fallback to inferring from data
        const hasInvestigationPurpose = pageData?.initialData?.siteDetails?.some(site => site.purpose === 'GW Investigation');
        const hasLoggingPumpingPurpose = pageData?.initialData?.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));

        if (hasInvestigationPurpose && !hasLoggingPumpingPurpose) {
            base = '/dashboard/gw-investigation';
        } else if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) {
            base = '/dashboard/logging-pumping-test';
        } else {
             const appType = pageData?.initialData.applicationType;
             if (appType?.includes("Collector")) {
                base = '/dashboard/collectors-deposit-works';
            } else if (appType === "GWBDWS") {
                base = '/dashboard/plan-fund-works';
            } else if (appType?.includes("Private")) {
                base = '/dashboard/private-deposit-works';
            }
        }
    }
    
    const params = new URLSearchParams();
    if (pageToReturnTo) params.set('page', pageToReturnTo);
    if (activeTab) params.set('tab', activeTab);
    if (fileIdToEdit) params.set('lastId', fileIdToEdit);
    
    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
}, [approveUpdateId, pageToReturnTo, activeTab, fileIdToEdit, workTypeContext, pageData]);

  useEffect(() => {
    const loadData = async () => {
        if (!user) {
            if (!authIsLoading) setErrorState("You must be logged in.");
            return;
        }

        setDataLoading(true);
        try {
            if (!fileIdToEdit) {
                let defaultData = getFormDefaults(workTypeContext);
                setPageData({ initialData: defaultData });
                return;
            }

            const originalEntry = allFileEntries.find(entry => entry.id === fileIdToEdit);
            
            if (!originalEntry) {
                 if (allFileEntries.length > 0 && !dataStoreLoading) {
                     setErrorState("Could not find the requested file. It may have been deleted or you may not have permission to view it.");
                 }
                 return;
            }

            let dataForForm = originalEntry;
            const isFieldStaff = user.role === 'supervisor' || user.role === 'investigator';
            
            if (isFieldStaff && user.uid) {
                const updates = await getPendingUpdates(originalEntry.fileNo, user.uid);
                const pendingUpdate = updates.find(u => u.status === 'pending');

                if (pendingUpdate) {
                    setIsFormDisabledForFieldStaff(true);
                    toast({ title: "Edits Locked", description: "You have a submission pending review. Editing is disabled until it is approved or rejected.", duration: 7000 });
                    
                    let mergedData = JSON.parse(JSON.stringify(originalEntry));
                    const updatedSitesMap = new Map((pendingUpdate.updatedSiteDetails || []).map((site: any) => [site.nameOfSite, site]));
                    mergedData.siteDetails = (mergedData.siteDetails || []).map((site: any) => updatedSitesMap.get(site.nameOfSite) || site);
                    
                    if (pendingUpdate.fileLevelUpdates) {
                        mergedData.fileStatus = pendingUpdate.fileLevelUpdates.fileStatus || mergedData.fileStatus;
                        mergedData.remarks = pendingUpdate.fileLevelUpdates.remarks || mergedData.remarks;
                    }
                    dataForForm = mergedData;
                }
            }


            if (isApprovingUpdate && approveUpdateId) {
                const pendingUpdate = await getPendingUpdateById(approveUpdateId);
                if (pendingUpdate) {
                    let mergedData = JSON.parse(JSON.stringify(originalEntry));
                    const updatedSitesMap = new Map((pendingUpdate.updatedSiteDetails || []).map((site: any) => [site.nameOfSite, site]));
                    mergedData.siteDetails = (mergedData.siteDetails || []).map((site: any) => updatedSitesMap.get(site.nameOfSite) || site);
                    
                    if (pendingUpdate.fileLevelUpdates) {
                        mergedData.fileStatus = pendingUpdate.fileLevelUpdates.fileStatus || mergedData.fileStatus;
                        mergedData.remarks = pendingUpdate.fileLevelUpdates.remarks || mergedData.remarks;
                    }

                    dataForForm = mergedData;
                }
            }
            
            const { createdAt, updatedAt, ...restOfData } = dataForForm as any;
            setFileNoForHeader(dataForForm.fileNo);
            setPageData({ initialData: processDataForForm(restOfData) });

        } catch (error) {
            setErrorState("Could not load all required data.");
            console.error(error);
        } finally {
            setDataLoading(false);
        }
    };

    if (!authIsLoading && !dataStoreLoading) {
        loadData();
    }
}, [fileIdToEdit, approveUpdateId, user, authIsLoading, allFileEntries, getPendingUpdates, workTypeContext, toast, isApprovingUpdate, dataStoreLoading, getPendingUpdateById]);

  useEffect(() => {
    let title = "Loading...";
    let description = "";
    if (!dataLoading) {
        if (errorState) { title = "Error"; description = errorState; } 
        else {
            const displayId = fileNoForHeader || 'New';
            if (!fileIdToEdit) {
                if (workTypeContext === 'private') title = "New Private Deposit Work";
                else if (workTypeContext === 'collector') title = "New Collector's Deposit Work";
                else if (workTypeContext === 'planFund') title = "New Plan Fund Work";
                else if (workTypeContext === 'gwInvestigation') title = "New GW Investigation"; 
                else if (workTypeContext === 'loggingPumpingTest') title = "New Logging & Pumping Test";
                else title = "New Deposit Work";
            } else if (approveUpdateId) {
                title = `Approve Update: ${displayId}`;
            } else if (effectiveUserRole === 'viewer' || readOnlyParam === 'true') {
                title = `View File: ${displayId}`;
            } else {
                title = `Edit File: ${displayId}`;
            }
        }
    }
    setHeader(title, description);
  }, [fileIdToEdit, user, approveUpdateId, setHeader, fileNoForHeader, workTypeContext, dataLoading, errorState, readOnlyParam, effectiveUserRole]);

  const supervisorList = useMemo(() => {
    if (!user) return [];
    const sourceUsers = allUsers;
    
    return sourceUsers.filter(u => u.role === 'supervisor' && u.isApproved && u.staffId).map(userProfile => {
        const staffInfo = allStaffMembers.find(s => s.id === userProfile.staffId && s.status === 'Active');
        return staffInfo ? { ...staffInfo, uid: userProfile.uid, name: staffInfo.name } : null;
    }).filter((s): s is (StaffMember & { uid: string; name: string }) => s !== null).sort((a, b) => a.name.localeCompare(b.name));
   }, [allStaffMembers, user, allUsers]);
  
  const hasInvestigationPurpose = useMemo(() => 
    pageData?.initialData?.siteDetails?.some(site => site.purpose === 'GW Investigation'), 
    [pageData]
  );
  
   const hasLoggingPumpingPurpose = useMemo(() => 
    pageData?.initialData?.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any)),
    [pageData]
  );

   const isGwInvestigationType = workTypeContext === 'gwInvestigation' || (!!fileIdToEdit && hasInvestigationPurpose && !hasLoggingPumpingPurpose);
  const isLoggingPumpingTestType = workTypeContext === 'loggingPumpingTest' || (!!fileIdToEdit && hasLoggingPumpingPurpose && !hasInvestigationPurpose);
  
  const formOptions = useMemo(() => {
    if (workTypeContext === 'planFund') return PLAN_FUND_APPLICATION_TYPES;
    if (workTypeContext === 'collector') return COLLECTOR_APPLICATION_TYPES;
    if (workTypeContext === 'private') return PRIVATE_APPLICATION_TYPES;
    if (workTypeContext === 'public') return PUBLIC_DEPOSIT_APPLICATION_TYPES;
    
    return applicationTypeOptions;
  }, [workTypeContext]);

  if (authIsLoading || dataLoading) return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (errorState) return <div className="flex h-screen items-center justify-center text-center p-6"><Card><CardContent className="pt-6"><ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4" /><h1 className="text-xl font-bold">{errorState}</h1><Button className="mt-4" variant="outline" onClick={() => router.back()}>Go Back</Button></CardContent></Card></div>;
  
  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          {pageData && pageData.initialData ? (
             isGwInvestigationType ? (
                <InvestigationDataEntryFormComponent
                    fileNoToEdit={fileNoForHeader ?? undefined}
                    initialData={pageData.initialData}
                    allStaffMembers={allStaffMembers}
                    userRole={effectiveUserRole}
                    workTypeContext={workTypeContext}
                    returnPath={returnPath}
                    pageToReturnTo={pageToReturnTo} 
                    isFormDisabled={isFormDisabledForFieldStaff}
                    allLsgConstituencyMaps={allLsgConstituencyMaps}
                />
             ) : isLoggingPumpingTestType ? (
                <LoggingPumpingTestDataEntryFormComponent
                    fileNoToEdit={fileNoForHeader ?? undefined}
                    initialData={pageData.initialData}
                    allStaffMembers={allStaffMembers}
                    userRole={effectiveUserRole}
                    workTypeContext={workTypeContext}
                    returnPath={returnPath}
                    pageToReturnTo={pageToReturnTo} 
                    isFormDisabled={isFormDisabledForFieldStaff}
                    allLsgConstituencyMaps={allLsgConstituencyMaps}
                />
             ) : (
                <DataEntryFormComponent
                    fileNoToEdit={fileNoForHeader ?? undefined}
                    initialData={pageData.initialData}
                    supervisorList={supervisorList}
                    userRole={effectiveUserRole}
                    workTypeContext={workTypeContext}
                    returnPath={returnPath}
                    pageToReturnTo={pageToReturnTo}
                    isFormDisabled={isFormDisabledForFieldStaff}
                    formOptions={formOptions}
                />
              )
          ) : <div className="flex h-64 items-center justify-center"><p className="text-muted-foreground">Loading entry details...</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
