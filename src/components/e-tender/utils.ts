// src/components/e-tender/utils.ts
import { format, isValid, parseISO, parse } from 'date-fns';
import type { E_tenderStatus } from '@/lib/schemas/eTenderSchema';
import type { RateDescriptionDetail, RateDescriptionId } from '@/hooks/use-data-store';

export const getRateDetailForDate = (
    allRateDescriptionDetails: Record<RateDescriptionId, RateDescriptionDetail>,
    id: RateDescriptionId,
    date: Date | null
): RateDescriptionDetail | null => {
    const detail = allRateDescriptionDetails[id];
    if (!detail) return null;
    if (!date) return detail;
    
    const targetTime = date.getTime();

    // Check history first
    if (detail.history && detail.history.length > 0) {
        // Sort history by effectiveDate descending to check most recent applicable first
        const sortedHistory = [...detail.history].sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime());
        
        for (const item of sortedHistory) {
            const from = item.effectiveDate.getTime();
            const to = item.effectiveTo ? item.effectiveTo.getTime() : Infinity;
            
            if (targetTime >= from && targetTime <= to) {
                return {
                    description: item.description,
                    rate: item.rate,
                    orderNo: item.orderNo,
                    orderDate: item.orderDate,
                    effectiveDate: item.effectiveDate,
                    effectiveTo: item.effectiveTo,
                    structuredData: item.structuredData
                };
            }
        }
    }

    // Check the current entry
    const currentFrom = detail.effectiveDate ? detail.effectiveDate.getTime() : 0;
    const currentTo = detail.effectiveTo ? detail.effectiveTo.getTime() : Infinity;
    if (targetTime >= currentFrom && targetTime <= currentTo) {
        return detail;
    }

    // Fallback to the current entry if no historical match and it seems "latest"
    return detail;
};

export const parseAmountRange = (label: string): { min: number, max: number } => {
    const clean = label.toLowerCase().replace(/,/g, '').replace(/rs\.?/g, '').replace(/₹/g, '').trim();
    
    let min = 0;
    let max = Infinity;

    const lakhMatch = clean.match(/(\d+(?:\.\d+)?)\s*lakh/);
    const croreMatch = clean.match(/(\d+(?:\.\d+)?)\s*crore/);
    
    const convertValue = (val: string, labelText: string) => {
        let n = parseFloat(val);
        if (labelText.includes('crore')) n *= 10000000;
        else if (labelText.includes('lakh')) n *= 100000;
        return n;
    };

    // Extract all numbers with their units
    const parts = clean.split(/[-–]|upto|to|through/);
    
    if (parts.length === 2) {
        // Range format: "Above 50000 - upto 10 Lakh" or "1 Lakh to 10 Lakh"
        const p1 = parts[0].trim();
        const p2 = parts[1].trim();
        
        const n1Match = p1.match(/(\d+(?:\.\d+)?)/);
        if (n1Match) min = convertValue(n1Match[1], p1);
        
        const n2Match = p2.match(/(\d+(?:\.\d+)?)/);
        if (n2Match) max = convertValue(n2Match[1], p2);
    } else {
        // Single bound format: "Above 10 crore" or "Upto 50000"
        const nMatch = clean.match(/(\d+(?:\.\d+)?)/);
        if (nMatch) {
            const val = convertValue(nMatch[1], clean);
            if (clean.includes('above') || clean.includes('over') || clean.includes('more than')) {
                min = val;
            } else if (clean.includes('upto') || clean.includes('up to') || clean.includes('less than') || clean.includes('below')) {
                max = val;
            }
        }
    }

    return { min, max };
};

export const calculateStructuredRate = (
    structuredData: any, 
    tenderType: 'Work' | 'Purchase', 
    amount: number
): number | string => {
    if (!structuredData) return 0;
    const section = tenderType === 'Work' ? structuredData.works : structuredData.purchase;
    if (!section || !Array.isArray(section)) return 0;

    for (const row of section) {
        const { min, max } = parseAmountRange(row.label);
        if (amount > min && amount <= max) {
            // Found the range
            const rateStr = row.rate || "";
            // Try to parse as number
            const numRate = parseFloat(rateStr.replace(/[^0-9.]/g, ''));
            if (rateStr.includes('%')) {
                return (amount * numRate) / 100;
            }
            if (!isNaN(numRate)) return numRate;
            return rateStr; // Return string if it's not just a number (e.g. "No Fee")
        }
    }

    return 0;
};

export const formatDateForInput = (date: any, isDateTime: boolean = false): string => {
    if (!date) return '';
    const d = toDateOrNull(date);
    if (d && isValid(d)) {
        return format(d, isDateTime ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd');
    }
    // Return the string itself if it's already in the correct format but not a Date object
    if (typeof date === 'string' && (date.match(/^\d{4}-\d{2}-\d{2}$/) || date.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/))) {
        return date;
    }
    return '';
};

export const formatTenderNoForFilename = (tenderNo: string | undefined | null): string => {
    if (!tenderNo) return 'Tender';

    const tenderMatch = tenderNo.match(/T-(\d+)/);
    const yearMatch = tenderNo.match(/(\d{4})-(\d{2})/);

    if (tenderMatch && yearMatch) {
        const tenderNumber = `T${tenderMatch[1]}`;
        const yearPart = `${yearMatch[1]}${yearMatch[2]}`;
        return `${yearPart}${tenderNumber}`;
    }
    
    // Fallback for old or different formats
    return tenderNo.replace(/[\/\-]/g, '_');
};


export const toDateOrNull = (value: any): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    try {
      const ms = value.seconds * 1000 + (value.nanoseconds ? Math.round(value.nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) return d;
    } catch { /* fallthrough */ }
  }
  if (typeof value === 'number' && isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Try ISO/yyyy-MM-dd
    let d = parseISO(trimmed);
    if (isValid(d)) return d;
    
    // Try dd/MM/yyyy
    d = parse(trimmed, 'dd/MM/yyyy', new Date());
    if (isValid(d)) return d;

    const iso = Date.parse(trimmed);
    if (!isNaN(iso)) return new Date(iso);
    try {
      const fallback = new Date(trimmed);
      if (!isNaN(fallback.getTime())) return fallback;
    } catch { /* ignore */ }
  }
  return null;
};


export const formatDateSafe = (date: any, includeTime: boolean = false, isReceiptFormat: boolean = false, isOpeningFormat: boolean = false): string => {
    if (date === null || date === undefined || date === '') {
        return 'N/A';
    }
    
    const d = toDateOrNull(date);

    if (!d || !isValid(d)) {
        return String(date); // Fallback to original string if parsing fails
    }
    
    if (isReceiptFormat) {
        return format(d, "dd/MM/yyyy 'up to' hh:mm a");
    }
    
    if (isOpeningFormat) {
        return format(d, "dd/MM/yyyy 'at' hh:mm a");
    }

    return format(d, includeTime ? 'dd/MM/yyyy, hh:mm a' : 'dd/MM/yyyy');
};

export const getStatusBadgeClass = (status?: E_tenderStatus): string => {
    if (!status) return "";
    switch (status) {
        case 'Tender Preparation':
        case 'Tender Process':
            return "border-gray-400 bg-gray-100 text-gray-800";
        case 'Bid Opened':
            return "border-orange-400 bg-orange-100 text-orange-800";
        case 'Retender':
            return "border-yellow-400 bg-yellow-100 text-yellow-800";
        case 'Tender Cancelled':
            return "border-red-400 bg-red-100 text-red-800";
        case 'Selection Notice Issued':
            return "border-blue-400 bg-blue-100 text-blue-800";
        case 'Work Order Issued':
            return "border-green-400 bg-green-100 text-green-800";
        case 'Supply Order Issued':
            return "border-purple-400 bg-purple-100 text-purple-800";
        default:
            return "border-border";
    }
};