
// src/app/dashboard/reports/page.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import ReportTable from "@/components/reports/ReportTable";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useSearchParams, useRouter } from "next/navigation";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";
import type { SiteWorkStatus, DataEntryFormData, ApplicationType, SitePurpose } from '@/lib/schemas';
import { 
  applicationTypeDisplayMap,
  fileStatusOptions, 
  siteWorkStatusOptions, 
  sitePurposeOptions, 
  applicationTypeOptions, 
  constituencyOptions,
  LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
  typeOfWellOptions,
} from '@/lib/schemas';
import { format, parseISO, startOfDay, endOfDay, isValid, parse } from "date-fns";
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ExcelJS from 'exceljs';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataStore } from '@/hooks/use-data-store';
import { RotateCcw, Loader2, FileDown, Eye, Search, Layers, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES,
    PUBLIC_DEPOSIT_APPLICATION_TYPES 
} from '@/lib/schemas';

export interface FlattenedReportRow {
  fileNo: string; 
  applicantName: string; 
  fileFirstRemittanceDate: string;
  applicationType: string;
  sitePurpose: string;
  fileStatus: string; 
  siteName: string; 
  siteWorkStatus: string; 
  siteTotalExpenditure: string; 
  totalRemittance: string;
  balance: string;
  id?: string;
  // All other potential fields for export
  [key: string]: any;
}

const ITEMS_PER_PAGE = 50;

type DataSource = 'all' | 'gwInvestigation' | 'loggingPumpingTest' | 'depositWorks' | 'collector' | 'private' | 'planFund' | 'ars';

const dataSourceOptions: { value: DataSource; label: string }[] = [
    { value: 'all', label: 'All Data Sources' },
    { value: 'gwInvestigation', label: 'GW Investigation' },
    { value: 'loggingPumpingTest', label: 'Logging & Pumping Test' },
    { value: 'depositWorks', label: 'Deposit Works (Public)' },
    { value: 'collector', label: "Collector's Deposit Works" },
    { value: 'private', label: 'Private Deposit Works' },
    { value: 'planFund', label: 'Plan Fund Works' },
    { value: 'ars', label: 'ARS' },
];

const reportFieldDefinitions = [
    // Base Identity Fields
    { id: 'fileNo', label: 'File No.', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'applicantName', label: 'Applicant Name', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'fileFirstRemittanceDate', label: 'Date of Remittance/Sanction', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'applicationType', label: 'Application Type', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'fileStatus', label: 'File Status', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'siteName', label: 'Site Name', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'sitePurpose', label: 'Service/Purpose', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'siteWorkStatus', label: 'Work Status', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    
    // Core Financials
    { id: 'totalRemittance', label: 'Total Remittance (₹)', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'siteTotalExpenditure', label: 'Site Total Expenditure (₹)', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'balance', label: 'Balance (₹)', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    
    // Geographical & Responsibility
    { id: 'lsg', label: 'Local Self Govt.', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'constituency', label: 'Constituency', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'supervisor', label: 'Supervisor', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'latitude', label: 'Latitude', sources: ['depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },
    { id: 'longitude', label: 'Longitude', sources: ['depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },

    // Technical Details (Drilling)
    { id: 'diameter', label: 'Diameter (mm)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'totalDepth', label: 'Total Depth (m)', sources: ['depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'yield', label: 'Yield/Discharge (LPH)', sources: ['depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'waterLevel', label: 'Static Water Level (m)', sources: ['depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    { id: 'casingPipeUsed', label: 'Casing Pipe (m)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'outerCasingPipe', label: 'Outer Casing (m)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'innerCasingPipe', label: 'Inner Casing (m)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'surveyRecommendedPlainPipe', label: 'Plain Pipe (m)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'surveyRecommendedSlottedPipe', label: 'Slotted Pipe (m)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'surveyRecommendedMsCasingPipe', label: 'MS Casing Pipe (m)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'zoneDetails', label: 'Zone Details', sources: ['depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest'] },
    
    // Investigation Specific
    { id: 'typeOfWell', label: 'Type of Well', sources: ['gwInvestigation', 'loggingPumpingTest'] },
    { id: 'nameOfInvestigator', label: 'Investigator', sources: ['gwInvestigation', 'loggingPumpingTest'] },
    { id: 'dateOfInvestigation', label: 'Investigation Date', sources: ['gwInvestigation', 'loggingPumpingTest'] },
    { id: 'feasibility', label: 'Feasibility (Yes/No)', sources: ['gwInvestigation'] },
    { id: 'vesRequired', label: 'VES Required', sources: ['gwInvestigation'] },
    { id: 'vesInvestigator', label: 'VES Investigator', sources: ['gwInvestigation'] },
    { id: 'vesDate', label: 'VES Date', sources: ['gwInvestigation'] },
    { id: 'descriptionOfWork', label: 'Description of Work', sources: ['loggingPumpingTest'] },
    { id: 'hydrogeologicalRemarks', label: 'Hydrogeological Remarks', sources: ['gwInvestigation'] },
    { id: 'geophysicalRemarks', label: 'Geophysical Remarks', sources: ['gwInvestigation'] },
    
    // Implementation & Scheme
    { id: 'typeOfRig', label: 'Type of Rig Unit', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'contractorName', label: 'Contractor', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'pumpDetails', label: 'Pump Details', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'noOfTapConnections', label: 'Tap Connections', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'waterTankCapacity', label: 'Tank Capacity (L)', sources: ['depositWorks', 'private', 'collector', 'planFund'] },
    { id: 'noOfBeneficiary', label: 'No. of Beneficiaries', sources: ['depositWorks', 'private', 'collector', 'planFund', 'ars'] },
    { id: 'remarks', label: 'Remarks/Notes', sources: ['all', 'depositWorks', 'private', 'collector', 'planFund', 'gwInvestigation', 'loggingPumpingTest', 'ars'] },

    // ARS Specific
    { id: 'arsBlock', label: 'ARS Block', sources: ['ars'] },
    { id: 'arsTypeOfScheme', label: 'ARS Scheme Type', sources: ['ars'] },
    { id: 'arsNumberOfStructures', label: 'ARS No. of Structures', sources: ['ars'] },
    { id: 'arsStorageCapacity', label: 'ARS Storage Capacity (m³)', sources: ['ars'] },
    { id: 'arsNumberOfFillings', label: 'ARS No. of Fillings', sources: ['ars'] },
    { id: 'arsAsTsDetails', label: 'ARS AS/TS Details', sources: ['ars'] },
    { id: 'tsAmount', label: 'ARS TS Amount (₹)', sources: ['ars'] },
    { id: 'arsTenderNo', label: 'ARS Tender No', sources: ['ars'] },
    { id: 'arsAwardedAmount', label: 'ARS Awarded Amount (₹)', sources: ['ars'] },
];

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }
  if (typeof dateValue === 'string') {
    let parsed = parseISO(dateValue);
    if (isValid(parsed)) return parsed;
    parsed = parse(dateValue, 'yyyy-MM-dd', new Date());
    if (isValid(parsed)) return parsed;
  }
  if (typeof dateValue === 'object' && (dateValue as any).toDate) {
    const parsed = (dateValue as any).toDate();
    if (isValid(parsed)) return parsed;
  }
  return null;
};

export default function ReportsPage() {
  const { setHeader } = usePageHeader();
  const { allRigCompressors, officeAddress, allFileEntries, allArsEntries } = useDataStore();
  
  useEffect(() => {
    setHeader('Reports', 'Generate custom reports by applying a combination of filters.');
  }, [setHeader]);

  const router = useRouter(); 
  const { fileEntries, isLoading: entriesLoading, getFileEntry } = useFileEntries();
  const { user, isLoading: authIsLoading } = useAuth();
  const [filteredReportRows, setFilteredReportRows] = useState<FlattenedReportRow[]>([]);
  const { toast } = useToast();

  const [dataSourceFilter, setDataSourceFilter] = useState<DataSource>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); 
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all"); 
  const [workCategoryFilter, setWorkCategoryFilter] = useState("all");
  const [dateFilterType, setDateFilterType] = useState<"remittance" | "completion" | "payment" | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  
  const [applicationTypeFilter, setApplicationTypeFilter] = useState("all");
  const [typeOfRigFilter, setTypeOfRigFilter] = useState("all");
  const [constituencyFilter, setConstituencyFilter] = useState("all");
  const [applicantNameFilter, setApplicantNameFilter] = useState("all");

  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null);

  const [viewItem, setViewItem] = useState<DataEntryFormData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(['fileNo', 'applicantName', 'siteName', 'siteWorkStatus', 'totalRemittance', 'balance']);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(format(now, 'dd/MM/yyyy'));
    setCurrentTime(format(now, 'hh:mm:ss a'));
  }, []);

  const uniqueApplicationTypeOptions = useMemo(() => [...new Set(applicationTypeOptions)], []);

  const matchesDataSource = useCallback((entry: DataEntryFormData, source: DataSource): boolean => {
    if (source === 'all') return true;
    
    const hasInvestigationPurpose = !!entry.siteDetails?.some(site => site.purpose === 'GW Investigation');
    const hasLoggingPumpingPurpose = !!entry.siteDetails?.some(site => site.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(site.purpose as any));
    const appType = entry.applicationType as any;

    if (source === 'gwInvestigation') return hasInvestigationPurpose && !hasLoggingPumpingPurpose;
    if (source === 'loggingPumpingTest') return hasLoggingPumpingPurpose && !hasInvestigationPurpose;
    if (source === 'depositWorks') return (PUBLIC_DEPOSIT_APPLICATION_TYPES as any).includes(appType) || (!appType && !hasInvestigationPurpose && !hasLoggingPumpingPurpose);
    if (source === 'collector') return (COLLECTOR_APPLICATION_TYPES as any).includes(appType);
    if (source === 'private') return (PRIVATE_APPLICATION_TYPES as any).includes(appType);
    if (source === 'planFund') return (PLAN_FUND_APPLICATION_TYPES as any).includes(appType);
    if (source === 'ars') return false; // ARS is handled separately in filtering logic
    
    return false;
  }, []);

  const applicantOptions = useMemo(() => {
      let pool: (DataEntryFormData | any)[] = [];
      
      if (dataSourceFilter === 'ars') {
          pool = allArsEntries.map(e => ({ applicantName: 'ARS Scheme' }));
      } else {
          pool = fileEntries.filter(e => matchesDataSource(e, dataSourceFilter));
      }

      const names = pool.map(e => e.applicantName).filter(Boolean);
      return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [fileEntries, allArsEntries, dataSourceFilter, matchesDataSource]);

  const rigOptions = useMemo(() => {
    const allUnits = (allRigCompressors || []);
    const activeInternal = allUnits.filter(r => !r.isExternal && r.status !== 'Garaged').map(r => r.typeOfRigUnit || '').filter(Boolean);
    const activeExternal = allUnits.filter(r => r.isExternal && r.status !== 'Garaged').map(r => `${r.typeOfRigUnit} - ${r.externalOffice || 'Unknown'}`).filter(val => val && !val.startsWith('undefined'));
    const privateOptions = ["Private Rig - DTH", "Private Rig - Rotary", "Private Rig - Calyx"];
    const garaged = allUnits.filter(r => r.status === 'Garaged').map(r => {
        const base = r.isExternal ? `${r.typeOfRigUnit} - ${r.externalOffice || 'Unknown'}` : (r.typeOfRigUnit || '');
        return `${base} (Garaged)`;
    }).filter(val => val && !val.startsWith('undefined') && val !== ' (Garaged)');

    return [...Array.from(new Set(activeInternal)).sort(), ...Array.from(new Set(activeExternal)).sort(), ...privateOptions, ...Array.from(new Set(garaged)).sort()];
  }, [allRigCompressors]);

  const availableServiceOptions = useMemo(() => {
    const DEPOSIT_PURPOSES = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev", "MWSS", "MWSS Ext", "Pumping Scheme", "MWSS Pump Reno", "HPS", "HPR"];
    const PRIVATE_PURPOSES = ["BWC", "TWC", "FPW", "BW Dev", "TW Dev", "FPW Dev"];
    const INVESTIGATION_PURPOSES = ["GW Investigation", "VES"];
    const LOGGING_PUMPING_PURPOSES = ["Geological logging", "Geophysical Logging", "Industry Pumping test", "MWSS Pumping test", "Pumping Test Others"];
    const ARS_PURPOSES = ["Dugwell Recharge", "Borewell Recharge", "Recharge Pit", "Check Dam", "Sub-Surface Dyke", "Pond Renovation", "Percolation Ponds"];

    let options: string[] = [];
    switch (dataSourceFilter) {
      case 'gwInvestigation': options = [...INVESTIGATION_PURPOSES]; break;
      case 'loggingPumpingTest': options = [...LOGGING_PUMPING_PURPOSES]; break;
      case 'depositWorks':
      case 'collector':
      case 'planFund': options = [...DEPOSIT_PURPOSES]; break;
      case 'private': options = [...PRIVATE_PURPOSES]; break;
      case 'ars': options = [...ARS_PURPOSES]; break;
      default:
        options = Array.from(new Set([
          ...DEPOSIT_PURPOSES,
          ...INVESTIGATION_PURPOSES,
          ...LOGGING_PUMPING_PURPOSES,
          ...ARS_PURPOSES
        ]));
    }
    return options.sort();
  }, [dataSourceFilter]);

  useEffect(() => {
    setServiceTypeFilter("all");
    setApplicantNameFilter('all');
    setApplicationTypeFilter("all");
    setWorkCategoryFilter("all");
    setTypeOfRigFilter("all");
    setSelectedExportFields(['fileNo', 'applicantName', 'siteName', 'siteWorkStatus', 'totalRemittance', 'balance']);
  }, [dataSourceFilter]);


  const applyFilters = useCallback(() => {
    let currentFileEntries = fileEntries.filter(e => matchesDataSource(e, dataSourceFilter));
    let currentArsEntries: any[] = [];
    
    if (dataSourceFilter === 'all' || dataSourceFilter === 'ars') {
        currentArsEntries = allArsEntries;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    const filterByDate = (entries: any[], isArsPool: boolean) => {
        if ((!startDate && !endDate) || dateFilterType === 'all') return entries;
        const from = startDate ? startOfDay(parse(startDate, "yyyy-MM-dd", new Date())) : null;
        const to = endDate ? endOfDay(parse(endDate, "yyyy-MM-dd", new Date())) : null;

        return entries.filter(entry => {
            const checkDate = (targetValue: any): boolean => {
                if (!targetValue) return false;
                const d = safeParseDate(targetValue);
                if (!d || !isValid(d)) return false;
                if (from && d < from) return false;
                if (to && d > to) return false;
                return true;
            };

            if (isArsPool) {
                if (dateFilterType === 'remittance') return checkDate(entry.arsSanctionedDate);
                if (dateFilterType === 'completion') return checkDate(entry.dateOfCompletion);
                return true;
            }

            if (dateFilterType === "remittance") return entry.remittanceDetails?.some((rd: any) => checkDate(rd.dateOfRemittance)) ?? false;
            if (dateFilterType === "completion") return entry.siteDetails?.some((sd: any) => checkDate(sd.dateOfCompletion)) ?? false;
            if (dateFilterType === "payment") return entry.paymentDetails?.some((pd: any) => checkDate(pd.dateOfPayment)) ?? false;
            return true;
        });
    };

    currentFileEntries = filterByDate(currentFileEntries, false);
    currentArsEntries = filterByDate(currentArsEntries, true);

    const applyCommonFilters = (entries: any[], isArsPool: boolean) => {
        return entries.filter(entry => {
            if (statusFilter !== "all" && !isArsPool && entry.fileStatus !== statusFilter) return false;
            if (applicantNameFilter !== "all") {
                const name = isArsPool ? 'ARS Scheme' : entry.applicantName;
                if (name !== applicantNameFilter) return false;
            }
            if (applicationTypeFilter !== "all") {
                if (isArsPool && applicationTypeFilter !== 'ARS') return false;
                if (!isArsPool && entry.applicationType !== applicationTypeFilter) return false;
            }
            if (constituencyFilter !== "all") {
                const match = isArsPool 
                    ? entry.constituency === constituencyFilter 
                    : (entry.constituency === constituencyFilter || entry.siteDetails?.some((sd: any) => sd.constituency === constituencyFilter));
                if (!match) return false;
            }
            if (workCategoryFilter !== "all") {
                const match = isArsPool ? entry.arsStatus === workCategoryFilter : entry.siteDetails?.some((sd: any) => sd.workStatus === workCategoryFilter);
                if (!match) return false;
            }
            if (serviceTypeFilter !== "all") {
                const match = isArsPool ? entry.arsTypeOfScheme === serviceTypeFilter : entry.siteDetails?.some((sd: any) => sd.purpose === serviceTypeFilter);
                if (!match) return false;
            }
            if (typeOfRigFilter !== "all") {
                if (isArsPool) return false;
                if (!entry.siteDetails?.some((site: any) => site.typeOfRig === typeOfRigFilter)) return false;
            }
            
            if (lowerSearchTerm) {
                const searchableString = JSON.stringify(entry).toLowerCase();
                if (!searchableString.includes(lowerSearchTerm)) return false;
            }

            return true;
        });
    };

    currentFileEntries = applyCommonFilters(currentFileEntries, false);
    currentArsEntries = applyCommonFilters(currentArsEntries, true);

    const flattenedRows: FlattenedReportRow[] = [];

    currentFileEntries.forEach(entry => {
        const remittanceDate = entry.remittanceDetails?.[0]?.dateOfRemittance;
        const fileFirstRemittanceDate = remittanceDate ? format(new Date(remittanceDate), "dd/MM/yyyy") : "-";
        const totalRemittance = (Number(entry.totalRemittance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const balance = (Number(entry.overallBalance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

        if (entry.siteDetails && entry.siteDetails.length > 0) {
            entry.siteDetails.forEach(site => {
                flattenedRows.push({
                    fileNo: entry.fileNo || "-", 
                    applicantName: entry.applicantName || "-", 
                    fileFirstRemittanceDate, 
                    applicationType: entry.applicationType ? applicationTypeDisplayMap[entry.applicationType as ApplicationType] || entry.applicationType : "N/A",
                    fileStatus: entry.fileStatus || "-",
                    siteName: site.nameOfSite || "-", 
                    sitePurpose: site.purpose || "-", 
                    siteWorkStatus: site.workStatus || "-", 
                    siteTotalExpenditure: (Number(site.totalExpenditure) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                    totalRemittance, 
                    balance,
                    lsg: site.localSelfGovt || 'N/A',
                    constituency: site.constituency || 'N/A',
                    supervisor: site.supervisorName || 'N/A',
                    latitude: site.latitude || 'N/A',
                    longitude: site.longitude || 'N/A',
                    diameter: site.diameter || 'N/A',
                    totalDepth: site.totalDepth || 'N/A',
                    yield: site.yieldDischarge || 'N/A',
                    waterLevel: site.waterLevel || 'N/A',
                    casingPipeUsed: site.casingPipeUsed || 'N/A',
                    outerCasingPipe: site.outerCasingPipe || 'N/A',
                    innerCasingPipe: site.innerCasingPipe || 'N/A',
                    surveyRecommendedPlainPipe: site.surveyRecommendedPlainPipe || 'N/A',
                    surveyRecommendedSlottedPipe: site.surveyRecommendedSlottedPipe || 'N/A',
                    surveyRecommendedMsCasingPipe: site.surveyRecommendedMsCasingPipe || 'N/A',
                    zoneDetails: site.zoneDetails || 'N/A',
                    typeOfWell: site.typeOfWell || 'N/A',
                    nameOfInvestigator: site.nameOfInvestigator || 'N/A',
                    dateOfInvestigation: site.dateOfInvestigation ? format(new Date(site.dateOfInvestigation), "dd/MM/yyyy") : 'N/A',
                    feasibility: site.feasibility || 'N/A',
                    vesRequired: site.vesRequired || 'N/A',
                    vesInvestigator: site.vesInvestigator || 'N/A',
                    vesDate: site.vesDate ? format(new Date(site.vesDate), "dd/MM/yyyy") : 'N/A',
                    descriptionOfWork: site.descriptionOfWork || 'N/A',
                    hydrogeologicalRemarks: site.hydrogeologicalRemarks || 'N/A',
                    geophysicalRemarks: site.geophysicalRemarks || 'N/A',
                    typeOfRig: site.typeOfRig || 'N/A',
                    contractorName: site.contractorName || 'N/A',
                    pumpDetails: site.pumpDetails || 'N/A',
                    noOfTapConnections: site.noOfTapConnections || 'N/A',
                    waterTankCapacity: site.waterTankCapacity || 'N/A',
                    noOfBeneficiary: site.noOfBeneficiary || 'N/A',
                    remarks: site.workRemarks || entry.remarks || 'N/A'
                });
            });
        } else {
            flattenedRows.push({
                fileNo: entry.fileNo || "-", applicantName: entry.applicantName || "-", fileFirstRemittanceDate, applicationType: entry.applicationType || "-", fileStatus: entry.fileStatus || "-", siteName: "-", sitePurpose: "-", siteWorkStatus: "-", siteTotalExpenditure: "0.00", totalRemittance, balance, remarks: entry.remarks || 'N/A'
            });
        }
    });

    currentArsEntries.forEach(entry => {
        const dateStr = entry.arsSanctionedDate;
        const fileFirstRemittanceDate = dateStr ? format(new Date(dateStr), "dd/MM/yyyy") : "-";
        const totalExpenditure = (Number(entry.totalExpenditure) || 0);

        flattenedRows.push({
            fileNo: entry.fileNo || "-", 
            applicantName: "ARS Scheme", 
            fileFirstRemittanceDate, 
            applicationType: "ARS",
            fileStatus: entry.arsStatus || "-",
            siteName: entry.nameOfSite || "-", 
            sitePurpose: entry.arsTypeOfScheme || "ARS", 
            siteWorkStatus: entry.arsStatus || "-",
            siteTotalExpenditure: totalExpenditure.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            totalRemittance: (Number(entry.estimateAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            balance: ((Number(entry.estimateAmount) || 0) - totalExpenditure).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            id: entry.id,
            lsg: entry.localSelfGovt || 'N/A',
            constituency: entry.constituency || 'N/A',
            supervisor: entry.supervisorName || 'N/A',
            latitude: entry.latitude || 'N/A',
            longitude: entry.longitude || 'N/A',
            noOfBeneficiary: entry.noOfBeneficiary || 'N/A',
            arsBlock: entry.arsBlock || 'N/A',
            arsTypeOfScheme: entry.arsTypeOfScheme || 'N/A',
            arsNumberOfStructures: entry.arsNumberOfStructures || 'N/A',
            arsStorageCapacity: entry.arsStorageCapacity || 'N/A',
            arsNumberOfFillings: entry.arsNumberOfFillings || 'N/A',
            arsAsTsDetails: entry.arsAsTsDetails || 'N/A',
            tsAmount: entry.tsAmount || 'N/A',
            arsTenderNo: entry.arsTenderNo || 'N/A',
            arsAwardedAmount: entry.arsAwardedAmount || 'N/A',
            arsContractorName: entry.arsContractorName || 'N/A',
            arsStatus: entry.arsStatus || 'N/A',
            remarks: entry.workRemarks || 'N/A'
        });
    });
    
    setFilteredReportRows(flattenedRows);
  }, [fileEntries, allArsEntries, matchesDataSource, dataSourceFilter, searchTerm, statusFilter, serviceTypeFilter, workCategoryFilter, startDate, endDate, dateFilterType, applicationTypeFilter, typeOfRigFilter, constituencyFilter, applicantNameFilter]);

  useEffect(() => {
    if (!entriesLoading && !authIsLoading) {
      applyFilters();
    }
  }, [entriesLoading, authIsLoading, applyFilters]);

  const handleResetFilters = () => {
    setDataSourceFilter("all"); setStartDate(""); setEndDate(""); setSearchTerm(""); setStatusFilter("all"); setServiceTypeFilter("all"); setWorkCategoryFilter("all"); setDateFilterType("all"); setApplicationTypeFilter("all"); setTypeOfRigFilter("all"); setConstituencyFilter("all"); setApplicantNameFilter("all");
    router.replace(`/dashboard/reports`, { scroll: false });
  };

  const activeFieldsForExport = useMemo(() => {
      const currentSource = dataSourceFilter;
      return reportFieldDefinitions.filter(f => f.sources.includes(currentSource));
  }, [dataSourceFilter]);

  const handleExportExcel = async () => {
    if (filteredReportRows.length === 0) return;
    if (selectedExportFields.length === 0) {
        toast({ title: "No Fields Selected", description: "Please select at least one field to export.", variant: "destructive" });
        return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");
    
    worksheet.addRow([`Ground Water Department, ${officeAddress?.officeLocation || 'Kollam'}`]).font = { bold: true, size: 14 };
    worksheet.addRow(["Custom Report Generated on: " + format(new Date(), 'dd/MM/yyyy HH:mm')]);
    worksheet.addRow([]);
    
    const activeFields = reportFieldDefinitions.filter(f => selectedExportFields.includes(f.id));
    const header = ["Sl. No.", ...activeFields.map(f => f.label)];
    const headerRow = worksheet.addRow(header);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F0F0' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    filteredReportRows.forEach((row, index) => {
      const values = [index + 1];
      activeFields.forEach(field => {
        values.push(row[field.id] ?? 'N/A');
      });
      const newRow = worksheet.addRow(values);
      newRow.eachCell(cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    worksheet.columns.forEach(column => column.width = 20);
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GWD_Custom_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
    setIsExportDialogOpen(false);
  };

  const handleOpenViewDialog = (fileNo: string) => {
    const entryToView = getFileEntry(fileNo);
    if (entryToView) { setViewItem(entryToView); setIsViewDialogOpen(true); } 
    else { toast({ title: "Error", description: "File details not found in current cache.", variant: "destructive" }); }
  };

  if (entriesLoading || authIsLoading) {
    return <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const paginatedReportRows = filteredReportRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredReportRows.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg no-print">
        <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5"><Layers className="h-3 w-3" />Data Source</Label>
                    <Select value={dataSourceFilter} onValueChange={(v) => setDataSourceFilter(v as DataSource)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Data Source" /></SelectTrigger>
                        <SelectContent>{dataSourceOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Filter by Name of Applicant</Label>
                    <Select value={applicantNameFilter} onValueChange={setApplicantNameFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Applicant" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All Applicants</SelectItem>
                            {applicantOptions.map((name) => (<SelectItem key={name} value={name}>{name}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date Type for Range</Label>
                    <Select value={dateFilterType} onValueChange={(v: any) => setDateFilterType(v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Date Type" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">-- Clear Date Type --</SelectItem>
                            <SelectItem value="remittance">Date of Remittance / Sanction</SelectItem>
                            <SelectItem value="completion">Date of Completion</SelectItem>
                            <SelectItem value="payment">Date of Payment</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9"/>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">To Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9"/>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Service/Purpose</Label>
                    <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Filter by Service" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All Services</SelectItem>
                            {availableServiceOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Application Type</Label>
                    <Select value={applicationTypeFilter} onValueChange={setApplicationTypeFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All Application Types" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All Application Types</SelectItem>
                            {uniqueApplicationTypeOptions.map(o => <SelectItem key={o} value={o}>{applicationTypeDisplayMap[o as ApplicationType] || o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Type of Rig (Site)</Label>
                    <Select value={typeOfRigFilter} onValueChange={setTypeOfRigFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="All Rig Types" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All Rig Types</SelectItem>
                            {rigOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">File Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Filter Status" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All File Statuses</SelectItem>
                            {fileStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Category (Site Status)</Label>
                    <Select value={workCategoryFilter} onValueChange={setWorkCategoryFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Filter Category" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All Categories</SelectItem>
                            {siteWorkStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Constituency (LAC)</Label>
                    <Select value={constituencyFilter} onValueChange={setConstituencyFilter}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Filter Constituency" /></SelectTrigger>
                        <SelectContent className="max-h-80">
                            <SelectItem value="all">All Constituencies</SelectItem>
                            {[...constituencyOptions].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5 lg:col-span-2">
                    <Label className="text-xs font-semibold">Global Search</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Global search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-9" />
                    </div>
                </div>

                <div className="lg:col-span-2 flex items-center gap-2">
                    <Button variant="secondary" onClick={handleResetFilters} size="sm" className="flex-1"><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
                    <Button onClick={() => setIsExportDialogOpen(true)} size="sm" className="flex-1"><FileDown className="mr-2 h-4 w-4" />Export Excel</Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="print-only-block my-4 text-center">
        <p className="font-semibold text-sm text-foreground mb-1">GWD {officeAddress?.officeLocation || 'Kollam'} - Report</p>
        {(currentDate && currentTime) && (<p className="text-xs text-muted-foreground">Report generated on: {currentDate} at {currentTime}</p>)}
      </div>
      
      <Card className="card-for-print shadow-lg">
         <div className="relative max-h-[70vh] overflow-auto">
            <ReportTable data={paginatedReportRows} onViewDetailsClick={handleOpenViewDialog} currentPage={currentPage} itemsPerPage={ITEMS_PER_PAGE} />
          </div>
          <CardFooter className="p-4 border-t flex items-center justify-center">
              {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
          </CardFooter>
      </Card>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-4xl p-0 flex flex-col h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>File Details: {viewItem?.fileNo}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0"><ScrollArea className="h-full px-6 py-4"><p className="text-sm italic text-muted-foreground">Use the Data Entry module for full interactive editing. Summary here is read-only.</p></ScrollArea></div>
          <DialogFooter className="p-6 pt-4 border-t"><DialogClose asChild><Button variant="secondary">Close</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-2xl flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Customize Report Export</DialogTitle>
            <DialogDescription>
                Available fields for <strong>{dataSourceOptions.find(o => o.value === dataSourceFilter)?.label}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[50vh]">
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeFieldsForExport.map((field) => (
                  <div key={field.id} className="flex items-center space-x-3 p-3 rounded-md border bg-secondary/10 hover:bg-secondary/20 transition-colors">
                    <Checkbox 
                      id={`export-field-${field.id}`}
                      checked={selectedExportFields.includes(field.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExportFields(prev => [...prev, field.id]);
                        } else {
                          setSelectedExportFields(prev => prev.filter(id => id !== field.id));
                        }
                      }}
                    />
                    <Label htmlFor={`export-field-${field.id}`} className="flex-1 cursor-pointer font-medium text-sm">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="p-6 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedExportFields(activeFieldsForExport.map(f => f.id))}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedExportFields([])}>Deselect All</Button>
            </div>
            <div className="flex items-center gap-2">
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleExportExcel}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Export Excel
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return null;
  }
  let displayValue = String(value);
  const isDate = label.toLowerCase().includes('date') || label.toLowerCase().includes('validity');
  if (isDate) {
      const date = safeParseDate(value);
      displayValue = date ? format(date, 'dd/MM/yyyy') : 'N/A';
  } else if (typeof value === 'number') {
      displayValue = value.toLocaleString('en-IN');
  }
  return (
      <div className="flex flex-col">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="text-sm font-semibold">{displayValue}</dd>
      </div>
  );
};
