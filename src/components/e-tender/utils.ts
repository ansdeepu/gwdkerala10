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

    const convertValue = (val: string, labelText: string) => {
        let n = parseFloat(val);
        if (labelText.includes('crore') || labelText.includes('cr')) n *= 10000000;
        else if (labelText.includes('lakh') || labelText.includes('lac') || labelText.includes(' l')) n *= 100000;
        return n;
    };

    // Extract all numbers with their units
    const parts = clean.split(/[-–]|upto|up to|to|through/);
    
    if (parts.length >= 2) {
        // Range format: "Above 50000 - upto 10 Lakh" or "1 Lakh to 10 Lakh"
        const p1 = parts[0].trim();
        const p2 = parts[parts.length - 1].trim(); // Use last part for max
        
        const n1Match = p1.match(/(\d+(?:\.\d+)?)/);
        if (n1Match) min = convertValue(n1Match[1], p1);
        
        const n2Match = p2.match(/(\d+(?:\.\d+)?)/);
        if (n2Match) max = convertValue(n2Match[1], p2);
    } else {
        // Single bound format: "Above 10 crore" or "Upto 50000"
        const nMatch = clean.match(/(\d+(?:\.\d+)?)/);
        if (nMatch) {
            const val = convertValue(nMatch[1], clean);
            if (clean.includes('above') || clean.includes('over') || clean.includes('more than') || clean.includes('greater than')) {
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
    if (!structuredData || amount === 0) return 0;
    
    // Support both lowercase and uppercase keys for resilience
    const section = tenderType === 'Work' 
        ? (structuredData.works || structuredData.Works || structuredData.WORKS) 
        : (structuredData.purchase || structuredData.Purchase || structuredData.PURCHASE);
        
    if (!section || !Array.isArray(section)) return 0;

    for (const row of section) {
        const { min, max } = parseAmountRange(row.label);
        // Use inclusive logic for boundaries to avoid gaps
        if (amount >= min && amount <= max) {
            const rateStr = String(row.rate || "").trim();
            const cleanRate = rateStr.toLowerCase();
            if (cleanRate === "no fee" || cleanRate === "nil" || cleanRate === "0") return 0;
            
            // Handle percentage with min/max constraints
            // Examples: 
            // "0.2% of cost of work (subject to a minimum of Rs.500 and maximum of Rs.2000)"
            // "1% (Min. Rs. 1000)"
            const pctMatch = rateStr.match(/([\d,]+(?:\.\d+)?)\s*%/);
            if (pctMatch) {
                const pct = parseFloat(pctMatch[1].replace(/,/g, ''));
                let fee = (amount * pct) / 100;
                
                // Extract minimum if exists
                // Patterns: "min 500", "minimum of 500", "min: 500", "min. 500"
                const minMatch = cleanRate.match(/min(?:imum)?[:.]?\s*(?:of)?\s*(?:rs\.?)?\s*([\d,]+(?:\.\d+)?)/);
                if (minMatch) {
                    let minVal = parseFloat(minMatch[1].replace(/,/g, ''));
                    // Check for Lakh/Crore in minimum value
                    const minIndex = cleanRate.indexOf(minMatch[0]);
                    const minPart = cleanRate.substring(minIndex);
                    if (minPart.includes('lakh') || minPart.includes('lac')) minVal *= 100000;
                    else if (minPart.includes('crore') || minPart.includes('cr')) minVal *= 10000000;
                    
                    if (fee < minVal) fee = minVal;
                }
                
                // Extract maximum if exists
                const maxMatch = cleanRate.match(/max(?:imum)?[:.]?\s*(?:of)?\s*(?:rs\.?)?\s*([\d,]+(?:\.\d+)?)/);
                if (maxMatch) {
                    let maxVal = parseFloat(maxMatch[1].replace(/,/g, ''));
                    const maxIndex = cleanRate.indexOf(maxMatch[0]);
                    const maxPart = cleanRate.substring(maxIndex);
                    if (maxPart.includes('lakh') || maxPart.includes('lac')) maxVal *= 100000;
                    else if (maxPart.includes('crore') || maxPart.includes('cr')) maxVal *= 10000000;
                    
                    if (fee > maxVal) fee = maxVal;
                }
                
                return fee;
            }

            // Simple number parsing (fallback)
            // Only use this if it doesn't look like it has complex constraints we might misparse
            if (!rateStr.includes('min') && !rateStr.includes('max')) {
                const numRate = parseFloat(rateStr.replace(/[^0-9.]/g, ''));
                if (!isNaN(numRate)) return numRate;
            }

            return rateStr; // Return string if it's complex or has no percentage
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