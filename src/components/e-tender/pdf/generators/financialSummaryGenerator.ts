// src/components/e-tender/pdf/generators/financialSummaryGenerator.ts
import { PDFDocument, PDFTextField, StandardFonts, rgb } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { formatDateSafe, formatTenderNoForFilename } from '../../utils';
import type { StaffMember, OfficeAddress } from '@/lib/schemas';
import { numberToWords } from './utils';

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

export async function generateFinancialSummary(tender: E_tender, officeAddress: OfficeAddress | null, allStaffMembers?: StaffMember[]): Promise<Uint8Array> {
    const templatePath = '/Financial-Summary.pdf';
    const existingPdfBytes = await fetch(templatePath).then(res => {
        if (!res.ok) throw new Error(`Template file not found: ${templatePath.split('/').pop()}`);
        return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const form = pdfDoc.getForm();
    const targetOfficeAddress = officeAddress;

    const acceptedBidders = [...(tender.bidders || [])]
        .filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0)
        .sort((a, b) => a.quotedAmount! - b.quotedAmount!);
    
    const l1Bidder = acceptedBidders[0];
    const ranks = acceptedBidders.map((_, i) => `L${i + 1}`).join(' and ');
    const INDENT = "     ";

    let finSummaryText = `${INDENT}The technically qualified bids were scrutinized, and all participating contractors remitted the required tender fee and EMD. All bids were found to be financially qualified. The bids were evaluated, and the lowest quoted bid was accepted and ranked accordingly as ${ranks}.`;
    
    const header = "Sl. No.    Name of Bidder                                Quoted Amount (Rs.)     Rank";
    const bidderRows = acceptedBidders.map((bidder, index) => {
        const sl = `${index + 1}.`.padEnd(10);
        const name = (bidder.name || 'N/A').padEnd(45);
        const amount = (bidder.quotedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(25);
        const rank = `L${index + 1}`.padEnd(5);
        return `${sl}${name}${amount}     ${rank}`;
    }).join('\n');
    const finTableText = `${header}\n${"-".repeat(header.length + 10)}\n${bidderRows}`;
    
    let finResultText = `${INDENT}No valid bids to recommend.`;
    if (l1Bidder) {
        const bidderName = l1Bidder.name || 'N/A';
        finResultText = `${INDENT}${bidderName}, who quoted the lowest rate, may be accepted and recommended for issuance of the selection notice.`;
    }
    
    const committeeMemberNames = [tender.technicalCommitteeMember1, tender.technicalCommitteeMember2, tender.technicalCommitteeMember3].filter(Boolean) as string[];
    const committeeMembersText = committeeMemberNames.map((name, index) => {
        const staffInfo = allStaffMembers?.find(s => s.name === name);
        return `${index + 1}. ${name}, ${staffInfo?.designation || 'N/A'}`;
    }).join('\n');

    const boldFields = ['file_no_header', 'e_tender_no_header', 'tender_date_header', 'office_location_7'];
    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
    const fileName = `cFinEvaluation${formattedTenderNo}.pdf`;
    
    const fieldMappings: Record<string, any> = {
        'file_no_header': `${targetOfficeAddress?.officeCode || 'GKT'}/${tender.fileNo || ''}`,
        'e_tender_no_header': tender.eTenderNo,
        'tender_date_header': formatDateSafe(tender.tenderDate),
        'name_of_work': tender.nameOfWork,
        'fin_summary': finSummaryText,
        'fin_table': finTableText,
        'fin_result': finResultText,
        'fin_committee': committeeMembersText,
        'fin_date': formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening),
        'office_location_7': (targetOfficeAddress?.officeLocation || '').toUpperCase(),
        'place_5': capitalize(targetOfficeAddress?.officeLocation),
    };

    const allFields = form.getFields();
    allFields.forEach(field => {
        const fieldName = field.getName();
        if (fieldName in fieldMappings) {
           try {
            const textField = form.getTextField(fieldName);
            const isBold = boldFields.includes(fieldName);
            textField.setText(String(fieldMappings[fieldName] || ''));
            textField.updateAppearances(isBold ? timesRomanBoldFont : timesRomanFont);
           } catch(e) {
                console.warn(`Could not fill field ${fieldName}:`, e);
           }
        }
    });

    form.flatten();
    
    return await pdfDoc.save();
}
