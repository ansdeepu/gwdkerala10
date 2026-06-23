
// src/components/dashboard/DepartmentalRigStatus.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RigCompressor } from '@/lib/schemas';
import { Construction, Truck, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentalRigStatusProps {
  rigCompressors: RigCompressor[];
}

export default function DepartmentalRigStatus({ rigCompressors }: DepartmentalRigStatusProps) {
  const stats = useMemo(() => {
    // Filter for department-owned rigs only (not external)
    const departmentRigs = rigCompressors.filter(r => !r.isExternal);
    const active = departmentRigs.filter(r => r.status === 'Active');
    const garaged = departmentRigs.filter(r => r.status === 'Garaged');

    return {
      total: departmentRigs.length,
      active: active.length,
      garaged: garaged.length,
      list: departmentRigs.sort((a, b) => (a.typeOfRigUnit || '').localeCompare(b.typeOfRigUnit || ''))
    };
  }, [rigCompressors]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Construction className="h-5 w-5" />
          Departmental Rig Availability
        </CardTitle>
        <CardDescription>Real-time status of internal drilling units.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/20 text-center">
             <p className="text-[10px] uppercase font-bold text-green-700 mb-1">Active Fleet</p>
             <p className="text-3xl font-bold text-green-700">{stats.active}</p>
          </div>
          <div className="p-3 rounded-lg border bg-destructive/10 border-destructive/20 text-center">
             <p className="text-[10px] uppercase font-bold text-destructive mb-1">In Workshop</p>
             <p className="text-3xl font-bold text-destructive">{stats.garaged}</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5"/> Full Fleet Status
            </h4>
            <ScrollArea className="h-[250px] border rounded-md">
                <div className="p-2 space-y-2">
                    {stats.list.length > 0 ? stats.list.map((rig) => (
                        <div key={rig.id} className="flex items-center justify-between p-2 rounded border bg-background hover:bg-secondary/30 transition-colors">
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm truncate">{rig.typeOfRigUnit}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">{rig.rigVehicleRegNo || 'No Reg No.'}</span>
                            </div>
                            <Badge variant={rig.status === 'Active' ? 'default' : 'destructive'} className={cn(
                                "text-[10px] h-5",
                                rig.status === 'Active' ? "bg-green-600 hover:bg-green-600" : "bg-destructive hover:bg-destructive"
                            )}>
                                {rig.status === 'Active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                                {rig.status}
                            </Badge>
                        </div>
                    )) : (
                        <div className="py-10 text-center text-muted-foreground italic text-xs">
                            No departmental rigs registered.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
