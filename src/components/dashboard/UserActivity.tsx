
// src/components/dashboard/UserActivity.tsx
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, subMinutes, isAfter, subDays, isValid } from 'date-fns';
import type { UserProfile } from '@/hooks/useAuth';
import type { StaffMember } from '@/lib/schemas';
import { Users, Clock, History } from 'lucide-react';
import { useDataStore } from '@/hooks/use-data-store';
import { Timestamp } from 'firebase/firestore';

const hashCode = (str: string): number => { let hash = 0; for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = (hash << 5) - hash + char; hash |= 0; } return hash; };
const getColorClass = (nameOrEmail: string): string => {
    const colors = [
        "bg-red-200 text-red-800", "bg-orange-200 text-orange-800", "bg-amber-200 text-amber-800",
        "bg-yellow-200 text-yellow-800", "bg-lime-200 text-lime-800", "bg-green-200 text-green-800",
        "bg-emerald-200 text-emerald-800", "bg-teal-200 text-teal-800", "bg-cyan-200 text-cyan-800",
        "bg-sky-200 text-sky-800", "bg-blue-200 text-blue-800", "bg-indigo-200 text-indigo-800",
        "bg-violet-200 text-violet-800", "bg-purple-200 text-purple-800", "bg-fuchsia-200 text-fuchsia-800",
        "bg-pink-200 text-pink-800", "bg-rose-200 text-rose-800"
    ];
    const hash = hashCode(nameOrEmail || 'user');
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};
const getInitials = (name?: string) => { if (!name || name.trim() === '') return 'U'; return name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase(); };

const toDateSafe = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
        const d = new Date(val);
        return isValid(d) ? d : null;
    }
    return null;
};

interface UserActivityProps {
  allUsers: UserProfile[];
  staffMembers: StaffMember[];
  currentUser?: UserProfile | null;
}

export default function UserActivity({ allUsers, staffMembers, currentUser }: UserActivityProps) {
  const { selectedOffice } = useDataStore();
  
  const activeUsers = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const myUid = currentUser?.uid;
    
    // Determine the office context to filter by
    const contextOffice = (selectedOffice || currentUser?.officeLocation)?.toLowerCase();

    return [...allUsers]
      .filter(usr => {
        // 1. Exclude the current logged-in user (self-display not allowed)
        if (myUid && usr.uid === myUid) {
            return false;
        }

        // 2. Filter by office location context
        // If contextOffice is set (which it is on sub-office dash), we use the implicit scoping
        // from the sub-collection query provided by use-data-store.
        // We use 'officeLocationFromPath' as the most reliable indicator.
        const userOffice = (usr.officeLocation || (usr as any).officeLocationFromPath)?.toLowerCase();
        if (contextOffice && userOffice && userOffice !== contextOffice) {
            return false;
        }

        // 3. Filter by activity within the last 30 days
        const lastActiveDate = toDateSafe(usr.lastActiveAt);
        const createdAtDate = toDateSafe(usr.createdAt);
        const activityDate = lastActiveDate || createdAtDate;
        
        if (!activityDate) return false;
        return isAfter(activityDate, thirtyDaysAgo);
      })
      .sort((a, b) => {
        const dateA = toDateSafe(a.lastActiveAt) || toDateSafe(a.createdAt) || new Date(0);
        const dateB = toDateSafe(b.lastActiveAt) || toDateSafe(b.createdAt) || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);
  }, [allUsers, currentUser, selectedOffice]);

  const tenMinutesAgo = subMinutes(new Date(), 10);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          Recent User Activity
        </CardTitle>
        <CardDescription>Personnel active within the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeUsers.length > 0 ? (
          <div className="space-y-3">
            {activeUsers.map((usr) => {
              const staffInfo = staffMembers.find(s => s.id === usr.staffId);
              const photoUrl = staffInfo?.photoUrl;
              const avatarColorClass = getColorClass(usr.name || usr.email || 'user');
              
              const lastActiveDate = toDateSafe(usr.lastActiveAt);
              const isCurrentlyActive = lastActiveDate && isAfter(lastActiveDate, tenMinutesAgo);

              return (
                <div key={usr.uid} className="flex items-center gap-4 p-3 rounded-lg border bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarImage src={photoUrl || undefined} alt={usr.name || 'user'} />
                      <AvatarFallback className={cn("font-bold text-xs", avatarColorClass)}>{getInitials(usr.name)}</AvatarFallback>
                    </Avatar>
                    {isCurrentlyActive && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-sm text-foreground truncate">{usr.name || usr.email?.split('@')[0]}</p>
                      <Badge variant={isCurrentlyActive ? "default" : "outline"} className={cn("text-[10px] h-4 px-1.5", isCurrentlyActive && "bg-green-600 hover:bg-green-600")}>
                        {isCurrentlyActive ? "Active Now" : (usr.role ? (usr.role.charAt(0).toUpperCase() + usr.role.slice(1)) : 'User')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                       {lastActiveDate ? (
                         <span className="flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           {formatDistanceToNow(lastActiveDate, { addSuffix: true })}
                         </span>
                       ) : (
                         <span className="flex items-center gap-1 italic text-[10px]">
                           <History className="h-3 w-3" />
                           Registered {usr.createdAt ? format(new Date(usr.createdAt), 'dd MMM') : 'Recently'}
                         </span>
                       )}
                       {usr.officeLocation && !selectedOffice && (
                           <span className="capitalize opacity-60">· {usr.officeLocation}</span>
                       )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground italic border-2 border-dashed rounded-lg">
             <p className="text-sm">No recent activity from other users.</p>
             <p className="text-[10px] mt-1">Activity from the last 30 days is shown here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
