// src/components/e-tender/utils.ts
import { format, isValid, parseISO, parse } from 'date-fns';
import type { E_tenderStatus } from '@/lib/schemas/eTenderSchema';

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