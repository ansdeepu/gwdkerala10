// src/components/reports/pdf/progressReportPdfGenerator.ts
import { PDFDocument, PDFFont, PageSizes, StandardFonts, rgb, cmyk } from 'pdf-lib';
import { format } from 'date-fns';
import type { OfficeAddress } from '@/lib/schemas';
import { 
    REPORTING_PURPOSE_ORDER, 
    type SitePurpose, 
    typeOfWellOptions, 
    applicationTypeOptions, 
    applicationTypeDisplayMap,
    type ApplicationType
} from '@/lib/schemas';

const FONT_SIZE = 7;
const HEADER_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 12;
const MARGIN = 40;
const ROW_HEIGHT = 14;
const HEADER_ROW_HEIGHT = 16;
const SECTION_SPACING = 20;

let font: PDFFont;
let boldFont: PDFFont;
let page: any;
let currentY: number;

async function drawHeader(pdfDoc: PDFDocument, officeAddress: OfficeAddress | null, startDate?: Date, endDate?: Date) {
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        const currentPage = pages[i];
        const { width, height } = currentPage.getSize();
        
        const title = `Monthly Progress Report`;
        currentPage.drawText(title, {
            x: MARGIN,
            y: height - MARGIN + 20,
            font: boldFont,
            size: TITLE_FONT_SIZE,
            color: rgb(0, 0, 0),
        });

        const officeName = `Ground Water Department, ${officeAddress?.officeLocation || 'All Offices'}`;
        const dateRange = (startDate && endDate) ? `for the period ${format(startDate, 'dd/MM/yyyy')} to ${format(endDate, 'dd/MM/yyyy')}` : '';
        const subtitle = `${officeName} ${dateRange}`;
        currentPage.drawText(subtitle, {
            x: MARGIN,
            y: height - MARGIN + 5,
            font: font,
            size: HEADER_FONT_SIZE,
            color: rgb(0.3, 0.3, 0.3),
        });

        const pageNumberText = `Page ${i + 1} of ${pages.length}`;
        const pageNumberWidth = font.widthOfTextAtSize(pageNumberText, FONT_SIZE);
        currentPage.drawText(pageNumberText, {
            x: width - MARGIN - pageNumberWidth,
            y: height - MARGIN + 5,
            font: font,
            size: FONT_SIZE,
            color: rgb(0.5, 0.5, 0.5),
        });

        currentPage.drawLine({
            start: { x: MARGIN, y: height - MARGIN },
            end: { x: width - MARGIN, y: height - MARGIN },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });
    }
}

async function checkNewPage(pdfDoc: PDFDocument, neededHeight: number) {
    if (currentY < MARGIN + neededHeight) {
        page = pdfDoc.addPage(PageSizes.A4);
        currentY = page.getHeight() - MARGIN - 40;
    }
}

async function drawTable(pdfDoc: PDFDocument, headers: string[], data: (string|number)[][], title: string) {
    const tableHeight = HEADER_ROW_HEIGHT + data.length * ROW_HEIGHT + SECTION_SPACING;
    await checkNewPage(pdfDoc, tableHeight);

    currentY -= SECTION_SPACING;
    page.drawText(title, {
        x: MARGIN,
        y: currentY,
        font: boldFont,
        size: HEADER_FONT_SIZE + 1,
        color: rgb(0, 0, 0.4)
    });
    currentY -= HEADER_ROW_HEIGHT + 5;

    const availableWidth = page.getWidth() - 2 * MARGIN;
    const firstColWidth = 120;
    const otherColWidth = (availableWidth - firstColWidth) / (headers.length - 1);
    const columnWidths = [firstColWidth, ...Array(headers.length - 1).fill(otherColWidth)];
    
    let x = MARGIN;

    headers.forEach((header, i) => {
        page.drawRectangle({
            x,
            y: currentY,
            width: columnWidths[i],
            height: HEADER_ROW_HEIGHT,
            color: rgb(0.92, 0.94, 0.96),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });
        page.drawText(header, {
            x: x + 5,
            y: currentY + 5,
            font: boldFont,
            size: FONT_SIZE,
        });
        x += columnWidths[i];
    });
    currentY -= ROW_HEIGHT;

    data.forEach((row, rowIndex) => {
        x = MARGIN;
        row.forEach((cell, i) => {
            const isTotalRow = rowIndex === data.length - 1;
             page.drawRectangle({
                x,
                y: currentY,
                width: columnWidths[i],
                height: ROW_HEIGHT,
                borderColor: rgb(0.8, 0.8, 0.8),
                borderWidth: 0.5,
                color: isTotalRow ? rgb(0.92, 0.94, 0.96) : rgb(1, 1, 1),
            });
            page.drawText(String(cell), {
                x: x + (i > 0 ? columnWidths[i] / 2 - font.widthOfTextAtSize(String(cell), FONT_SIZE) / 2 : 5),
                y: currentY + 4,
                font: isTotalRow ? boldFont : font,
                size: FONT_SIZE,
            });
            x += columnWidths[i];
        });
        currentY -= ROW_HEIGHT;
    });
}

type CategoryTotals = {
    previousBalance: number;
    currentApplications: number;
    toBeRefunded: number;
    totalApplications: number;
    completed: number;
    balance: number;
};

// Helper to generate a category table
async function drawCategoryTable(
    pdfDoc: PDFDocument,
    title: string,
    reportSectionData: any,
    categoryKeys: readonly string[],
    categoryLabels: Record<string, string>,
    diameter?: string
) {
    const metrics: Array<{ key: keyof CategoryTotals; label: string }> = [
        { key: 'previousBalance', label: 'Prev Balance' },
        { key: 'currentApplications', label: 'Current App' },
        { key: 'toBeRefunded', label: 'Refunded' },
        { key: 'totalApplications', label: 'Total App' },
        { key: 'completed', label: 'Completed' },
        { key: 'balance', label: 'Balance' },
    ];
    const headers = ['Category', ...metrics.map(m => m.label)];

    const tableData: (string | number)[][] = [];
    const categoryTotals: CategoryTotals = { previousBalance: 0, currentApplications: 0, toBeRefunded: 0, totalApplications: 0, completed: 0, balance: 0 };
    let hasData = false;

    categoryKeys.forEach(catKey => {
        const stats = diameter ? reportSectionData[catKey]?.[diameter] : reportSectionData[catKey];
        if (stats && Object.values(stats).some(val => typeof val === 'number' && val > 0)) {
            hasData = true;
            const rowData: (string | number)[] = [categoryLabels[catKey] || catKey];
            metrics.forEach(metric => {
                const count = (stats[metric.key] as number) || 0;
                rowData.push(count);
                categoryTotals[metric.key] += count;
            });
            tableData.push(rowData);
        }
    });

    if (hasData) {
        const totalRow: (string | number)[] = ['Total', ...metrics.map(metric => categoryTotals[metric.key])];
        tableData.push(totalRow);
        await drawTable(pdfDoc, headers, tableData, title);
    }
}


export async function generateProgressReportPdf(
    reportData: any,
    officeAddress: OfficeAddress | null,
    startDate?: Date,
    endDate?: Date
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page = pdfDoc.addPage(PageSizes.A4);
    currentY = page.getHeight() - MARGIN - 40;
    
    const uniqueApplicationTypes = [...new Set(applicationTypeOptions.filter(type => !['GW_Investigation', 'Logging_Pumping_Test'].some(prefix => type.startsWith(prefix))))];


    // --- Main Progress Summary Table ---
    const summaryHeaders = ['Service Type', 'Prev Balance', 'Current App', 'To be Refunded', 'Total App', 'Completed', 'Balance'];
    const summaryTableData = REPORTING_PURPOSE_ORDER.map(purpose => {
        const stats = reportData.progressSummaryData[purpose as SitePurpose];
        if (!stats || (stats.totalApplications === 0 && stats.previousBalance === 0)) return null;
        return [
            purpose,
            stats.previousBalance,
            stats.currentApplications,
            stats.toBeRefunded,
            stats.totalApplications,
            stats.completed,
            stats.balance,
        ];
    }).filter((row): row is (string|number)[] => row !== null);

    await drawTable(pdfDoc, summaryHeaders, summaryTableData, 'Progress Summary (Aggregate)');

    // --- Detailed Tables ---
    await drawCategoryTable(pdfDoc, "GW Investigation", reportData.gwInvestigationData, typeOfWellOptions, Object.fromEntries(typeOfWellOptions.map(o => [o,o])));
    await drawCategoryTable(pdfDoc, "VES", reportData.vesData, typeOfWellOptions, Object.fromEntries(typeOfWellOptions.map(o => [o,o])));
    await drawCategoryTable(pdfDoc, "Pumping Test", reportData.pumpingTestData, uniqueApplicationTypes, applicationTypeDisplayMap);
    await drawCategoryTable(pdfDoc, "Geological Logging", reportData.geologicalLoggingData, uniqueApplicationTypes, applicationTypeDisplayMap);
    await drawCategoryTable(pdfDoc, "Geophysical Logging", reportData.geophysicalLoggingData, uniqueApplicationTypes, applicationTypeDisplayMap);

    await drawCategoryTable(pdfDoc, "BWC - 110 mm (4.5”)", reportData.bwcData, uniqueApplicationTypes, applicationTypeDisplayMap, "110 mm (4.5”)");
    await drawCategoryTable(pdfDoc, "BWC - 150 mm (6”)", reportData.bwcData, uniqueApplicationTypes, applicationTypeDisplayMap, "150 mm (6”)");
    await drawCategoryTable(pdfDoc, "TWC - 150 mm (6”)", reportData.twcData, uniqueApplicationTypes, applicationTypeDisplayMap, "150 mm (6”)");
    await drawCategoryTable(pdfDoc, "TWC - 200 mm (8”)", reportData.twcData, uniqueApplicationTypes, applicationTypeDisplayMap, "200 mm (8”)");
    
    // Finalize: Draw headers on all pages
    await drawHeader(pdfDoc, officeAddress, startDate, endDate);

    return await pdfDoc.save();
}
