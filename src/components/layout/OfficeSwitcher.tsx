
// src/components/layout/OfficeSwitcher.tsx
"use client";

import React from 'react';
import { useDataStore } from '@/hooks/use-data-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';

const districtsOrder = ["Directorate TVM", "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha", "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod", "Lab TVM", "Lab EKM", "Lab KKD"];

export default function OfficeSwitcher() {
    const { selectedOffice, setSelectedOffice, allUsers } = useDataStore();

    const officeOptions = React.useMemo(() => {
        // Use a Set to ensure unique office locations, derived from users who have one.
        const locations = new Set<string>();
        allUsers.forEach(user => {
            if (user.officeLocation) {
                locations.add(user.officeLocation);
            }
        });
        
        return Array.from(locations)
            .map(location => ({
                value: location, // Use original casing for value
                label: location.charAt(0).toUpperCase() + location.slice(1).toLowerCase(), // Keep display friendly
            }))
            .sort((a, b) => {
                const indexA = districtsOrder.findIndex(d => d.toLowerCase() === a.label.toLowerCase());
                const indexB = districtsOrder.findIndex(d => d.toLowerCase() === b.label.toLowerCase());

                // If one or both are not in the custom order, use localeCompare as a fallback
                if (indexA === -1 || indexB === -1) {
                    return a.label.localeCompare(b.label);
                }

                return indexA - indexB;
            });
            
    }, [allUsers]);

    const handleValueChange = (value: string) => {
        const newSelection = value === 'all' ? null : value;
        setSelectedOffice(newSelection);
    };

    return (
        <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedOffice || 'all'} onValueChange={handleValueChange}>
                <SelectTrigger className="w-[230px] h-9">
                    <SelectValue placeholder="Select Office" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {officeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
