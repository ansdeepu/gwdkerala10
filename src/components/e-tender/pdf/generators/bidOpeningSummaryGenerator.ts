// src/components/e-tender/pdf/generators/bidOpeningSummaryGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe, formatTenderNoForFilename } from '../../utils';
import { numberToWords } from './utils';
import type { StaffMember, OfficeAddress } from '@/lib/schemas';

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

export async function generateBidOpeningSummary(tender: E_tender, officeAddress: OfficeAddress | null, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Bid-Opening-Summary.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    
    const targetOfficeAddress = officeAddress;

    const allBidders = tender.bidders || [];
    const acceptedBidders = allBidders.filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
    const rejectedBidders = allBidders.filter(b => b.status === 'Rejected');

    const numTotalBidders = allBidders.length;
    const numAccepted = acceptedBidders.length;
    const numRejected = rejectedBidders.length;
    
    const numTotalBiddersInWords = numberToWords(numTotalBidders);
    const numAcceptedInWords = numberToWords(numAccepted);
    const numRejectedInWords = numberToWords(numRejected);
    
    const l1Bidder = acceptedBidders.length > 0 ? acceptedBidders.reduce((lowest, current) => (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest) : null;
    
    const totalBidWord = numTotalBidders === 1 ? 'bid was' : 'bids were';
    const acceptedBidWord = numAccepted === 1 ? 'bid was' : 'bids were';

    let bidOpeningText = `     ${numTotalBiddersInWords} ${totalBidWord} received. Upon opening, ${numAcceptedInWords} ${acceptedBidWord} found to be admissible and accepted for further evaluation.`;
    
    if (rejectedBidders.length > 0) {
        const rejectionDetails = rejectedBidders.map(b => `${b.name || 'A bidder'} (Reason: ${b.remarks || 'Not specified'})`).join('; ');
        const rejectedBidWord = numRejected === 1 ? 'bid was' : 'bids were';
        const rejectedText = `${numRejectedInWords} ${rejectedBidWord} rejected.`;
        bidOpeningText += ` ${rejectedText} The reasons are as follows: ${rejectionDetails}.`;
    }
    
    if (l1Bidder && l1Bidder.quotedPercentage !== undefined && l1Bidder.aboveBelow) {
        bidOpeningText += ` The lowest quoted rate among the accepted bids, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was submitted by ${l1Bidder.name || 'N/A'}.`;
    }
    bidOpeningText += ' The accepted bids are recommended for technical and financial evaluation.';
    
    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'office_location_3'];

    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
    const fileName = `aBidOpening${formattedTenderNo}.pdf`;

    const fieldMappings: Record<string, any> = {
        'file_no_header': `${targetOfficeAddress?.officeCode || 'GKT'}/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'bid_date': formatDateSafe(tender.dateOfOpeningBid),
        'bid_opening': bidOpeningText,
        'office_location_3': (targetOfficeAddress?.officeLocation || '').toUpperCase(),
        'place_1': capitalize(targetOfficeAddress?.officeLocation),
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
            try {
                const textField = form.getTextField(fieldName);
                const isBold = boldFields.includes(fieldName);
                
                textField.setText(String(fieldMappings[fieldName] || ''));

                if (fieldName === 'bid_opening') {
                    textField.setAlignment(TextAlignment.Left);
                }
                
                textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
            } catch (e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
            }
        }
    });

    form.flatten();
    
    return await pdfDoc.save();
}
