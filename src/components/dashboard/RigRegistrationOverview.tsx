
// src/components/dashboard/RigRegistrationOverview.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AgencyApplication } from '@/lib/schemas';
import { agencyRigTypeOptions, type AgencyRigType as RigType } from '@/lib/schemas';
import { addYears, isValid, isWithinInterval, startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from "@/lib/utils";

const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const AlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
const Ban = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
);
const FileStack = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 22h2a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m4 18 3-3 3 3"/><path d="m4 22 3-3 3 3"/></svg>
);
const Building = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
);


interface RigRegistrationOverviewProps {
  agencyApplications: AgencyApplication[];
  onOpenDialog: (data: any[], title: string, columns: any[], type?: 'detail') => void;
}

const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'object' && dateValue !== null && typeof (dateValue as any).seconds === 'number') {
    return new Date((dateValue as any).seconds * 1000);
  }
  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
};

const StatusCard = ({
  title,
  icon: Icon,
  totalCount,
  onTotalClick,
  className,
  iconClassName
}: {
  title: string;
  icon: React.ElementType;
  totalCount: number;
  onTotalClick?: () => void;
  className?: string;
  iconClassName?: string;
}) => (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </CardHeader>
      <CardContent>
        <Button
          variant="link"
          className="text-4xl font-bold p-0 h-auto"
          onClick={onTotalClick}
          disabled={!onTotalClick || totalCount === 0}
        >
          {totalCount}
        </Button>
      </CardContent>
    </Card>
);

const rigTypeOptions = agencyRigTypeOptions;

const RigStatusCard = ({
  title,
  icon: Icon,
  totalCount,
  rigData,
  onTotalClick,
  onTypeClick,
  className,
  iconClassName
}: {
  title: string;
  icon: React.ElementType;
  totalCount: number;
  rigData: Record<RigType, { count: number; data: any[] }>;
  onTotalClick: () => void;
  onTypeClick: (type: RigType) => void;
  className?: string;
  iconClassName?: string;
}) => {
  const hasData = rigTypeOptions.some(type => rigData[type]?.count > 0);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
      </CardHeader>
      <CardContent>
        <Button
          variant="link"
          className="text-4xl font-bold p-0 h-auto"
          onClick={onTotalClick}
          disabled={totalCount === 0}
        >
          {totalCount}
        </Button>
        <div className="mt-4 space-y-2">
            {hasData ? rigTypeOptions.map(type => {
                const count = rigData[type]?.count || 0;
                if (count === 0) return null;
                return (
                    <div key={type} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{type}</span>
                        <Button variant="link" className="p-0 h-auto text-xs font-semibold" onClick={() => onTypeClick(type)} disabled={count === 0}>
                            {count}
                        </Button>
                    </div>
                )
            }) : <p className="text-xs text-muted-foreground italic text-center pt-4">No rigs in this category.</p>}
        </div>
      </CardContent>
    </Card>
  );
};


export default function RigRegistrationOverview({ agencyApplications, onOpenDialog }: RigRegistrationOverviewProps) {

  const summaryData = React.useMemo(() => {
    const initialCounts = () => ({
        active: { count: 0, data: [] as any[] },
        expired: { count: 0, data: [] as any[] },
        expiredThisMonth: { count: 0, data: [] as any[] },
        cancelled: { count: 0, data: [] as any[] },
    });
    
    const rigData = rigTypeOptions.reduce((acc, type) => ({ ...acc, [type]: initialCounts() }), {} as Record<RigType, ReturnType<typeof initialCounts>>);

    const completedApps = agencyApplications.filter(app => app.status === 'Active');
    
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);

    completedApps.forEach(app => {
        (app.rigs || []).forEach(rig => {
            const rigWithContext = { ...rig, agencyName: app.agencyName, ownerName: app.owner.name };
            const rigType = rig.typeOfRig as RigType;
            if (!rigType || !rigTypeOptions.includes(rigType)) return;

            if (rig.status === 'Active') {
                const lastEffectiveDate = rig.renewals && rig.renewals.length > 0
                    ? [...rig.renewals].sort((a, b) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate
                    : rig.registrationDate;

                if (lastEffectiveDate) {
                    const validityDate = new Date(addYears(new Date(lastEffectiveDate), 1).getTime() - 24 * 60 * 60 * 1000);
                    if (isValid(validityDate) && today > validityDate) {
                         rigData[rigType].expired.count++;
                         rigData[rigType].expired.data.push(rigWithContext);
                         if (isWithinInterval(validityDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
                            rigData[rigType].expiredThisMonth.count++;
                            rigData[rigType].expiredThisMonth.data.push(rigWithContext);
                         }
                    } else {
                        rigData[rigType].active.count++;
                        rigData[rigType].active.data.push(rigWithContext);
                    }
                } else {
                     rigData[rigType].active.count++;
                     rigData[rigType].active.data.push(rigWithContext);
                }
            } else if (rig.status === 'Cancelled') {
                rigData[rigType].cancelled.count++;
                rigData[rigType].cancelled.data.push(rigWithContext);
            }
        });
    });

    const totals = {
      active: rigTypeOptions.reduce((sum, type) => sum + rigData[type].active.count, 0),
      expired: rigTypeOptions.reduce((sum, type) => sum + rigData[type].expired.count, 0),
      expiredThisMonth: rigTypeOptions.reduce((sum, type) => sum + rigData[type].expiredThisMonth.count, 0),
      cancelled: rigTypeOptions.reduce((sum, type) => sum + rigData[type].cancelled.count, 0),
    };

    const totalData = {
        active: rigTypeOptions.flatMap(type => rigData[type].active.data),
        expired: rigTypeOptions.flatMap(type => rigData[type].expired.data),
        expiredThisMonth: rigTypeOptions.flatMap(type => rigData[type].expiredThisMonth.data),
        cancelled: rigTypeOptions.flatMap(type => rigData[type].cancelled.data),
    };
    
    const byStatus = {
        active: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].active.count, data: rigData[type].active.data}}), {} as Record<RigType, { count: number; data: any[] }>),
        expired: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].expired.count, data: rigData[type].expired.data}}), {} as Record<RigType, { count: number; data: any[] }>),
        expiredThisMonth: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].expiredThisMonth.count, data: rigData[type].expiredThisMonth.data}}), {} as Record<RigType, { count: number; data: any[] }>),
        cancelled: rigTypeOptions.reduce((acc, type) => ({...acc, [type]: {count: rigData[type].cancelled.count, data: rigData[type].cancelled.data}}), {} as Record<RigType, { count: number; data: any[] }>),
    };

    return { totals, totalData, byStatus, totalAgencies: completedApps.length, allAgencies: completedApps };
  }, [agencyApplications]);
  
  const handleCellClick = (data: any[], title: string) => {
    const columns = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'agencyName', label: 'Agency Name' },
        { key: 'ownerName', label: 'Owner' },
        { key: 'regNo', label: 'Rig Reg. No.' },
        { key: 'typeOfRig', label: 'Type of Rig' },
        { key: 'dateOfExpiry', label: 'Date of Expiry' },
    ];
    
    const dialogData = data.map((item, index) => {
        let dateOfExpiry = 'N/A';
        const lastDate = item.renewals?.length > 0 ? [...item.renewals].sort((a: any, b: any) => (safeParseDate(b.renewalDate)?.getTime() ?? 0) - (safeParseDate(a.renewalDate)?.getTime() ?? 0))[0].renewalDate : item.registrationDate;
        
        if (lastDate) {
            const expiryDate = new Date(addYears(new Date(lastDate), 1).getTime() - 24 * 60 * 60 * 1000);
            if (isValid(expiryDate)) {
                dateOfExpiry = format(expiryDate, 'dd/MM/yyyy');
            }
        }
        
        if (item.status === 'Cancelled') {
            dateOfExpiry = `Cancelled on ${formatDateSafe(item.cancellationDate)}`;
        }

        return {
            slNo: index + 1,
            agencyName: item.agencyName,
            ownerName: item.ownerName,
            regNo: item.rigRegistrationNo || 'N/A',
            typeOfRig: item.typeOfRig || 'N/A',
            dateOfExpiry: dateOfExpiry,
        };
    });

    onOpenDialog(dialogData, title, columns, 'detail');
  };
  
    const formatDateSafe = (d: any): string => {
        if (!d) return 'N/A';
        const date = safeParseDate(d);
        return date ? format(date, 'dd/MM/yyyy') : 'N/A';
    }


  const handleAgencyClick = () => {
    const columns = [
        { key: 'slNo', label: 'Sl. No.' },
        { key: 'agencyName', label: 'Agency Name' },
        { key: 'ownerName', label: 'Owner' },
        { key: 'registrationDate', label: 'Date of Registration' },
        { key: 'status', label: 'Status' },
    ];
    const sortedAgencies = [...summaryData.allAgencies].sort((a,b) => {
        const dateA = safeParseDate(a.agencyRegistrationDate);
        const dateB = safeParseDate(b.agencyRegistrationDate);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
    });

    const dialogData = sortedAgencies.map((app, index) => ({
      slNo: index + 1,
      agencyName: app.agencyName,
      ownerName: app.owner.name,
      registrationDate: app.agencyRegistrationDate ? formatDateSafe(app.agencyRegistrationDate) : 'N/A',
      status: app.status,
    }));
    onOpenDialog(dialogData, 'Total Agencies', columns, 'detail');
  };

  return (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileStack className="h-5 w-5 text-primary" />Rig Registration Overview</CardTitle>
            <CardDescription>A summary of all registered rigs by type and current status.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
           <StatusCard
              title="Total Agencies"
              icon={Building}
              totalCount={summaryData.totalAgencies}
              onTotalClick={handleAgencyClick}
              className="border-blue-500/50 bg-blue-500/5"
              iconClassName="text-blue-600"
           />
           <RigStatusCard
                title="Active Rigs"
                icon={CheckCircle}
                totalCount={summaryData.totals.active}
                rigData={summaryData.byStatus.active}
                onTotalClick={() => handleCellClick(summaryData.totalData.active, "All Active Rigs")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.active[type].data, `Active - ${type}`)}
                className="border-green-500/50 bg-green-500/5"
                iconClassName="text-green-600"
            />
            <RigStatusCard
                title="Expired This Month"
                icon={AlertTriangle}
                totalCount={summaryData.totals.expiredThisMonth}
                rigData={summaryData.byStatus.expiredThisMonth}
                onTotalClick={() => handleCellClick(summaryData.totalData.expiredThisMonth, "Rigs Expired This Month")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.expiredThisMonth[type].data, `Expired This Month - ${type}`)}
                className="border-orange-500/50 bg-orange-500/5"
                iconClassName="text-orange-600"
            />
            <RigStatusCard
                title="Expired Rigs (Total)"
                icon={AlertTriangle}
                totalCount={summaryData.totals.expired}
                rigData={summaryData.byStatus.expired}
                onTotalClick={() => handleCellClick(summaryData.totalData.expired, "All Expired Rigs")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.expired[type].data, `Expired - ${type}`)}
                className="border-amber-500/50 bg-amber-500/5"
                iconClassName="text-amber-600"
            />
            <RigStatusCard
                title="Cancelled Rigs"
                icon={Ban}
                totalCount={summaryData.totals.cancelled}
                rigData={summaryData.byStatus.cancelled}
                onTotalClick={() => handleCellClick(summaryData.totalData.cancelled, "All Cancelled Rigs")}
                onTypeClick={(type) => handleCellClick(summaryData.byStatus.cancelled[type].data, `Cancelled - ${type}`)}
                className="border-red-500/50 bg-red-500/5"
                iconClassName="text-red-600"
            />
        </CardContent>
    </Card>
  );
}
