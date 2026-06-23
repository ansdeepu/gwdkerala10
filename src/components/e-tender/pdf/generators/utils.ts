// src/components/e-tender/pdf/generators/utils.ts

import type { E_tender } from '@/hooks/useE_tenders';

export const numberToWords = (num: number): string => {
    if (num < 0) return 'Negative';
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    const numToWords = (n: number): string => {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ` ${ones[n % 10]}` : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ` and ${numToWords(n % 100)}` : '');
        return '';
    };

    let n = num;
    let word = '';
    let i = 0;

    while (n > 0) {
        if (n % 1000 !== 0) {
            word = numToWords(n % 1000) + ' ' + thousands[i] + ' ' + word;
        }
        n = Math.floor(n / 1000);
        i++;
    }

    return word.trim();
};
