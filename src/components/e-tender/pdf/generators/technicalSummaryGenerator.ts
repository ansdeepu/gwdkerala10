// src/components/e-tender/pdf/generators/technicalSummaryGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe, formatTenderNoForFilename } from '../../utils';
import type { StaffMember, OfficeAddress } from '@/lib/schemas';
import { numberToWords } from './utils';

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

export async function generateTechnicalSummary(tender: E_tender, officeAddress: OfficeAddress | null, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Technical-Summary.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    const targetOfficeAddress = officeAddress;
    
    const acceptedBidders = (tender.bidders || []).filter(b => b.status === 'Accepted');
    const l1Bidder = acceptedBidders.length > 0 ? acceptedBidders.filter(b => typeof b.quotedAmount === 'number' && b.quotedAmount > 0).reduce((lowest, current) => (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest) : null;

    let techSummaryText = `     The bids received were scrutinized. Upon verification, ${numberToWords(acceptedBidders.length)} bids were found to be technically qualified and hence accepted.`;
    if (l1Bidder && l1Bidder.quotedPercentage !== undefined && l1Bidder.aboveBelow) {
        techSummaryText += ` The lowest rate, ${l1Bidder.quotedPercentage}% ${l1Bidder.aboveBelow.toLowerCase()} the estimated rate, was quoted by ${l1Bidder.name || 'N/A'}.`;
    }
    techSummaryText += ' All technically qualified bids are recommended for financial evaluation.';
    
    const committeeMemberNames = [tender.technicalCommitteeMember1, tender.technicalCommitteeMember2, tender.technicalCommitteeMember3].filter(Boolean) as string[];
    const committeeMembersText = committeeMemberNames.map((name, index) => {
        const staffInfo = allStaffMembers?.find(s => s.name === name);
        return `${index + 1}. ${name}, ${staffInfo?.designation || 'N/A'}`;
    }).join('\n');

    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'office_location_8'];
    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
    const fileName = `bTechEvaluation${formattedTenderNo}.pdf`;
    
    const fieldMappings: Record<string, any> = {
        'file_no_header': `${targetOfficeAddress?.officeCode || 'GKT'}/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'tech_summary': techSummaryText,
        'committee_members': committeeMembersText,
        'tech_date': formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening),
        'office_location_8': (targetOfficeAddress?.officeLocation || '').toUpperCase(),
        'place_6': capitalize(targetOfficeAddress?.officeLocation),
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
           try {
            const textField = form.getTextField(fieldName);
            const isBold = boldFields.includes(fieldName);
            
            textField.setText(String(fieldMappings[fieldName] || ''));
            
            if (fieldName === 'tech_summary') {
                textField.setAlignment(TextAlignment.Left);
            }
            
            textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
           } catch(e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
           }
        }
    });

    form.flatten();
    
    return await pdfDoc.save();
}
