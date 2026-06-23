// src/components/e-tender/pdf/generators/workAgreementGenerator.ts
import { PDFDocument, StandardFonts, rgb, PageSizes } from 'pdf-lib';
import type { E_tender } from '@/hooks/useE_tenders';
import { format, isValid } from 'date-fns';
import type { OfficeAddress } from '@/lib/schemas';

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

class PDFPageManager {
    private doc: PDFDocument;
    private font: any;
    private fontBold: any;
    private pages: any[] = [];
    private currentPage: any;
    private currentY: number = 0;
    private width: number;
    private height: number;
    private margin: number = 54; // 0.75 in (~2cm)
    private pageNum: number = 0;
    private officeAddress: OfficeAddress | null;

    constructor(doc: PDFDocument, font: any, fontBold: any, officeAddress: OfficeAddress | null) {
        this.doc = doc;
        this.font = font;
        this.fontBold = fontBold;
        this.officeAddress = officeAddress;
        
        // Setup initial dimensions (A4 size is 595.27 x 841.89)
        this.width = PageSizes.A4[0];
        this.height = PageSizes.A4[1];
        
        this.addNewPage();
    }

    addNewPage() {
        this.currentPage = this.doc.addPage(PageSizes.A4);
        this.pageNum++;
        this.currentY = this.height - this.margin - 10;
        this.pages.push(this.currentPage);
        
        // Draw elegant thin page border
        this.currentPage.drawRectangle({
            x: this.margin - 15,
            y: this.margin - 15,
            width: this.width - 2 * (this.margin - 15),
            height: this.height - 2 * (this.margin - 15),
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.75,
            color: rgb(1, 1, 1),
            opacity: 0,
            borderOpacity: 0.6,
        });
    }

    getCurrentY(): number {
        return this.currentY;
    }

    setCurrentY(y: number) {
        this.currentY = y;
    }

    getCurrentPage() {
        return this.currentPage;
    }

    getWidth() {
        return this.width;
    }

    getHeight() {
        return this.height;
    }

    getMargin() {
        return this.margin;
    }

    getPrintableWidth(): number {
        return this.width - 2 * this.margin;
    }

    drawCenteredText(text: string, font: any, size: number, y: number, color = rgb(0.1, 0.1, 0.1)) {
        const textWidth = font.widthOfTextAtSize(text, size);
        const x = (this.width - textWidth) / 2;
        this.currentPage.drawText(text, { x, y, font, size, color });
    }

    // A helper to draw a paragraph. If it would overflow the page, it adds a new page first!
    drawParagraph(text: string, isBold: boolean = false, fontSize: number = 9.5, lineHeightMultiplier: number = 1.3, indent: string = '') {
        const activeFont = isBold ? this.fontBold : this.font;
        const lineHeight = fontSize * lineHeightMultiplier;
        const words = text.split(' ');
        const maxWidth = this.getPrintableWidth();
        let currentLine = indent;

        // Break text into lines
        const lines: string[] = [];
        for (const word of words) {
            const testLine = currentLine === indent ? `${currentLine}${word}` : `${currentLine} ${word}`;
            const testWidth = activeFont.widthOfTextAtSize(testLine, fontSize);
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        // Write lines, adding pages as needed
        for (const line of lines) {
            // Check overflow
            if (this.currentY - lineHeight < this.margin + 20) {
                this.addNewPage();
            }

            this.currentPage.drawText(line, {
                x: this.margin,
                y: this.currentY,
                font: activeFont,
                size: fontSize,
                color: rgb(0.1, 0.1, 0.1),
            });
            this.currentY -= lineHeight;
        }
    }

    // A helper to add an empty visual space
    addSpacing(amount: number) {
        if (this.currentY - amount < this.margin + 20) {
            this.addNewPage();
        } else {
            this.currentY -= amount;
        }
    }

    // Clean up: draw footers on all pages dynamically with correct total page count!
    finalize() {
        const totalPages = this.pages.length;
        this.pages.forEach((page, index) => {
            const pageNumText = `Page ${index + 1} of ${totalPages}`;
            const pageNumWidth = this.font.widthOfTextAtSize(pageNumText, 8);
            page.drawText(pageNumText, {
                x: this.width - this.margin - pageNumWidth,
                y: this.margin - 10,
                font: this.font,
                size: 8,
                color: rgb(0.5, 0.5, 0.5),
            });

            if (index > 0) {
                // Draw header only on subsequent pages (page 2, 3...)
                const officeLocation = capitalize(this.officeAddress?.officeLocation) || 'District';
                const headerText = `GROUND WATER DEPARTMENT  |  DISTRICT OFFICE, ${officeLocation.toUpperCase()}`;
                page.drawText(headerText, {
                    x: this.margin,
                    y: this.height - this.margin + 12,
                    font: this.fontBold,
                    size: 7,
                    color: rgb(0.5, 0.5, 0.5),
                });

                page.drawLine({
                    start: { x: this.margin, y: this.height - this.margin + 8 },
                    end: { x: this.width - this.margin, y: this.height - this.margin + 8 },
                    thickness: 0.5,
                    color: rgb(0.8, 0.8, 0.8),
                });
            }
        });
    }
}

export async function generateWorkAgreement(tender: E_tender, officeAddress: OfficeAddress | null): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const acceptedBidders = (tender.bidders || []).filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
    const l1Bidder = acceptedBidders.length > 0 
        ? acceptedBidders.reduce((lowest, current) => (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest)
        : ((tender.bidders || []).length > 0 ? (tender.bidders || []).reduce((prev, curr) => (prev.quotedAmount ?? Infinity) < (curr.quotedAmount ?? Infinity) ? prev : curr, {} as any) : null);

    let agreementDateFormatted = '';
    let agreementDateForHeading = '';
    if (tender.agreementDate) {
        try {
            const d = new Date(tender.agreementDate);
            if (!isNaN(d.getTime())) {
                agreementDateFormatted = format(d, 'dd MMMM yyyy');
                agreementDateForHeading = format(d, 'dd/MM/yyyy');
            }
        } catch (e) {
            console.warn("Could not parse agreement date:", tender.agreementDate);
        }
    }

    const fileNo = tender.fileNo || '__________';
    const eTenderNo = tender.eTenderNo || '__________';
    const contractorName = l1Bidder?.name || '____________________';
    const contractorAddress = (l1Bidder?.address || '____________________').replace(/\n/g, ', ');
    const contractorDetails = `Sri/Smt. ${contractorName}, residing at ${contractorAddress}`;
    
    let workName = tender.nameOfWork || '____________________';
    if (workName.endsWith('.')) {
        workName = workName.slice(0, -1);
    }
    
    const completionPeriod = tender.periodOfCompletion || '___';
    const officeLocation = capitalize(officeAddress?.officeLocation) || '____________';
    const officeName = officeAddress?.officeName || 'District Office';

    const estimateAmountFormatted = tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN')}/-` : '____________';
    const acceptedAmountFormatted = tender.agreedAmount ? `Rs. ${tender.agreedAmount.toLocaleString('en-IN')}/-` : (l1Bidder?.quotedAmount ? `Rs. ${l1Bidder.quotedAmount.toLocaleString('en-IN')}/-` : '____________');
    const securityDepositFormatted = '____________________';

    // Initialize the page manager
    const manager = new PDFPageManager(pdfDoc, timesRomanFont, timesRomanBoldFont, officeAddress);
    const firstPage = manager.getCurrentPage();
    const midX = manager.getWidth() / 2;

    // Draw Page 1 (Cover Page)
    let y = manager.getHeight() - manager.getMargin() - 10;
    
    manager.drawCenteredText("GROUND WATER DEPARTMENT", timesRomanBoldFont, 14, y);
    y -= 16;
    manager.drawCenteredText(`DISTRICT OFFICE, ${officeAddress?.officeLocation?.toUpperCase() || ''}`, timesRomanFont, 11, y, rgb(0.3, 0.3, 0.3));
    
    // Add a double divider under head
    y -= 15;
    firstPage.drawLine({
        start: { x: manager.getMargin(), y },
        end: { x: manager.getWidth() - manager.getMargin(), y },
        thickness: 1.5,
        color: rgb(0.2, 0.2, 0.2),
    });
    y -= 3;
    firstPage.drawLine({
        start: { x: manager.getMargin(), y },
        end: { x: manager.getWidth() - manager.getMargin(), y },
        thickness: 0.5,
        color: rgb(0.4, 0.4, 0.4),
    });

    y -= 45;
    manager.drawCenteredText("CONTRACT AGREEMENT DEED", timesRomanBoldFont, 18, y, rgb(0.1, 0.1, 0.1));
    y -= 8;
    // Underline
    const titleWidth = timesRomanBoldFont.widthOfTextAtSize("CONTRACT AGREEMENT DEED", 18);
    firstPage.drawLine({
        start: { x: midX - titleWidth / 2, y },
        end: { x: midX + titleWidth / 2, y },
        thickness: 1.5,
        color: rgb(0.1, 0.1, 0.1),
    });

    y -= 45;
    
    // Draw an elegant box for Details
    const boxX = manager.getMargin();
    const boxWidth = manager.getPrintableWidth();
    const boxHeight = 250;
    const boxY = y - boxHeight;
    
    firstPage.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98),
    });

    // Content inside the box
    let boxTextY = y - 18;
    const paddingX = boxX + 15;
    
    const drawBoxLine = (label: string, value: string) => {
        firstPage.drawText(label, { x: paddingX, y: boxTextY, font: timesRomanBoldFont, size: 9, color: rgb(0.2, 0.2, 0.2) });
        // Handle value wrapping if too long
        const labelWidth = 140;
        const valX = paddingX + labelWidth;
        const valMaxWidth = boxWidth - labelWidth - 30;
        const words = value.split(' ');
        let currentLine = '';
        let localY = boxTextY;
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (timesRomanFont.widthOfTextAtSize(testLine, 9) <= valMaxWidth) {
                currentLine = testLine;
            } else {
                firstPage.drawText(currentLine, { x: valX, y: localY, font: timesRomanFont, size: 9, color: rgb(0.1, 0.1, 0.1) });
                localY -= 12;
                currentLine = word;
            }
        }
        if (currentLine) {
            firstPage.drawText(currentLine, { x: valX, y: localY, font: timesRomanFont, size: 9, color: rgb(0.1, 0.1, 0.1) });
        }
        boxTextY = localY - 15;
    };

    drawBoxLine("AGREEMENT NO:", `${officeAddress?.officeCode || 'GKT'}/${fileNo}/${eTenderNo}`);
    drawBoxLine("AGREEMENT DATE:", agreementDateForHeading);
    drawBoxLine("NAME OF CONTRACTOR:", `${contractorName}`);
    drawBoxLine("ADDRESS OF OBLIGEE:", `${contractorAddress}`);
    drawBoxLine("NAME OF CONTRACT WORK:", `${workName}`);
    drawBoxLine("ESTIMATE PAC AMOUNT:", `${estimateAmountFormatted}`);
    drawBoxLine("ACCEPTED CONTRACT PAC:", `${acceptedAmountFormatted}`);
    drawBoxLine("SECURITY DEPOSIT DETAILS:", `${securityDepositFormatted}`);

    // Bottom description text on first page
    y = boxY - 30;
    const descText = "The detailed terms, conditions, specifications, and regulatory clauses governing the execution of this contract are annexed hereto and form part of this agreement on the following pages 2 to 4.";
    
    const dWords = descText.split(' ');
    let currentDLine = '';
    const dLines = [];
    for (const w of dWords) {
        const test = currentDLine ? `${currentDLine} ${w}` : w;
        if (timesRomanFont.widthOfTextAtSize(test, 9) <= manager.getPrintableWidth() - 20) {
            currentDLine = test;
        } else {
            dLines.push(currentDLine);
            currentDLine = w;
        }
    }
    dLines.push(currentDLine);
    
    for (const line of dLines) {
        manager.drawCenteredText(line, timesRomanFont, 9, y, rgb(0.4, 0.4, 0.4));
        y -= 12;
    }

    // Signatures placeholders at bottom
    const sigY = manager.getMargin() + 30;
    firstPage.drawText("CONTRACTOR", { x: manager.getMargin() + 10, y: sigY, font: timesRomanBoldFont, size: 10, color: rgb(0.2, 0.2, 0.2) });
    const doTextWidth = timesRomanBoldFont.widthOfTextAtSize("DISTRICT OFFICER", 10);
    firstPage.drawText("DISTRICT OFFICER", { x: manager.getWidth() - manager.getMargin() - 10 - doTextWidth, y: sigY, font: timesRomanBoldFont, size: 10, color: rgb(0.2, 0.2, 0.2) });


    // Start Page 2 (Clauses Page)
    manager.addNewPage();
    manager.drawParagraph("AGREEMENT CONDITIONS", true, 12, 1.4);
    manager.addSpacing(10);
    
    const introText = `Agreement executed on this date ${agreementDateFormatted} by and between the District Officer, Ground Water Department, District Office, ${officeLocation} (hereinafter referred to as the "First Party" or "District Officer" which expression shall unless excluded by or repugnant to the context be deemed to include his successors in office and assigns) on the ONE PART, and ${contractorDetails} (hereinafter referred to as the "Second Party" or "Contractor" which expression shall unless excluded by or repugnant to the context be deemed to include his heirs, executors, administrators, and permitted assigns) on the OTHER PART.`;
    manager.drawParagraph(introText, false, 9.5, 1.3, '     ');
    manager.addSpacing(10);
    
    manager.drawParagraph("WHEREAS the First Party is desirous of executing the drilling, renovation, and construction work of Ground Water-Based Drinking Water infrastructures as listed under the e-tender schedule, and the Second Party has offered to perform and complete the said work.", false, 9.5, 1.3, '     ');
    manager.addSpacing(10);
    
    manager.drawParagraph("NOW, THEREFORE, this agreement witnesseth and is hereby mutually agreed by and between the parties hereto as follows:", true, 9.5, 1.3);
    manager.addSpacing(15);

    // List out consolidated clauses from Malayalam 38 clauses
    const clauses = [
        {
            num: "1",
            title: "Project Sanction & Estimate cost",
            desc: `The administrative and technical sanction estimate for the work stands at ${estimateAmountFormatted}, which is formally approved and funded by the Ground Water Department. The Contractor participated in the competitive e-tender process and agrees to execute the said work at the sanctioned/tendered PAC of ${acceptedAmountFormatted}.`
        },
        {
            num: "2",
            title: "Adherence to Plans & Schedule",
            desc: "The contractor is bound to execute the entire work in strict conformity with the approved designs, blueprints, estimates, and schedules of the department. Any alterations, amendments, or deviation must obtain the prior written approval of the District Officer."
        },
        {
            num: "3",
            title: "Performance Security Deposit",
            desc: `As security for the faithful fulfillment of the contract, the Contractor has submitted a total performance guarantee / security deposit of ${securityDepositFormatted}, representing five percent (5%) of the accepted contract PAC, of which at least 50% is pledged in Treasury Fixed Deposits.`
        },
        {
            num: "4",
            title: "Governance of Works Manuals",
            desc: "The execution of all work items, materials supply, quality supervision, and administrative rules shall be governed strictly by the Ground Water Department (GWD) regulations, Kerala Public Works Department (PWD) Manual, and CPWD Standards in force."
        },
        {
            num: "5",
            title: "Exclusion of Arbitration",
            desc: "It is hereby explicitly agreed that this contract is not subject to arbitration. In the event of any technical or administrative disputes, the matter shall be referred to the GWD Technical Committee or the District Officer, whose decision shall be final and binding."
        },
        {
            num: "6",
            title: "Handing Over Site & Commencement",
            desc: "The Contractor shall take possession of the work site immediately, and must commence construction or drilling operations within seven (7) days of receipt of the formal work order and site clearance."
        },
        {
            num: "7",
            title: "Milestones & Penalty for Delay",
            desc: `The Contractor must complete the entire scope of work within the stipulated period of ${completionPeriod} days. Delays attributable to the Contractor will attract liquidated damages of 0.1% of the contract value per week of delay, capped at a maximum of 10% of the PAC.`
        },
        {
            num: "8",
            title: "Statutory Deductions & Bills",
            desc: "Running account invoices shall be submitted monthly or upon achieving major project milestones. A security retention of 2.5% will be deducted from each running bill. Standard statutory deductions including Income Tax, GST, and Labor Welfare Fund will be recovered at source."
        },
        {
            num: "9",
            title: "Termination at Contractor's Risk",
            desc: "In case of persistent default, slow progress, or critical breach by the Contractor, the District Officer reserves the right to cancel the contract after serving a fourteen (14) days' written notice. The remaining works will be completed through another agency at the sole risk and cost of the Contractor."
        },
        {
            num: "10",
            title: "Safe Custody of Site Materials",
            desc: "All construction materials, machinery parts, fittings, and aggregates brought to the site by the Contractor shall be deemed the absolute property of the Ground Water Department and cannot be moved or salvaged without written permission."
        },
        {
            num: "11",
            title: "Responsibility for Departmental Rigs",
            desc: "Where the department provides specialized drilling rigs, machinery, or compressor units, the Contractor assumes absolute care and financial cover for daily operations, safe custody, fuel management, and perfect return."
        },
        {
            num: "12",
            title: "Sundays & Holiday Operations",
            desc: "No work or operations shall be executed at the site of work on Sundays, public holidays, or after sunset hours, except when authorized under exceptional emergency clearance by the Assistant Engineer."
        },
        {
            num: "13",
            title: "Strict Ban on Subletting",
            desc: "The Contractor is strictly prohibited from assigning, transferring, or subletting any part of this contract to third parties. Any unauthorized subdivision of work will lead to immediate rescission and forfeiture of security deposits."
        },
        {
            num: "14",
            title: "Corporate & Copartnership Liability",
            desc: "If the contract is signed by a corporate body, company, or partners, all directors, partners, and shareholders are jointly and severally liable to the department for all financial commitments, deliverables, and legal duties."
        },
        {
            num: "15",
            title: "Limitation for Bill Claims",
            desc: "The final bill invoice must be presented by the Contractor within three (3) months of physical completion. Any claims unclaimed after three years will stand lapsed and revert back to the treasury."
        },
        {
            num: "16",
            title: "Storage & Protection of Assets",
            desc: "The Contractor is fully responsible for arranging storage, watch and ward, and water-tight covers for all casing pipes, cement Bags, and reinforcement steel stored at the site of work."
        },
        {
            num: "17",
            title: "Fair Wages & Labor Welfare",
            desc: "The Contractor shall pay fair wages to all categories of laborers in strict compliance with the Minimum Wages Act and Labor Welfare statutory orders in Kerala. The department is exempt from all labor-related liabilities."
        },
        {
            num: "18",
            title: "Work Site Signboards & Information",
            desc: "The Contractor must set up standard warning and informant signboards at the site showcasing project specifications, funding agencies, expected dates, and contact helplines before commencing heavy excavation."
        },
        {
            num: "19",
            title: "Right to Information Compliance",
            desc: "The Contractor is legally bound to assist the department in complying with any queries raised under the Right to Information Act, and must produce authentic work data, logs, and quality test sheets on demand."
        },
        {
            num: "20",
            title: "Scope of Attached Annexures",
            desc: "All design annexures, tender schedules, itemized rate lists, and corrigendums published during the bidding process are treated as an integrated part of this binding contract document."
        },
        {
            num: "21",
            title: "Approximate Nature of Quantities",
            desc: "The quantities of items described in the schedule are indicative and approximate. The department reserves the right to increase or decrease quantities at the same agreed rates, and no extra compensation will be paid."
        },
        {
            num: "22",
            title: "Execution of Extra Items",
            desc: "The Contractor is bound to carry out any necessary extra items of work required to secure the structurally sound completion of the borewell or drinking water schemes as directed by the site Engineers."
        },
        {
            num: "23",
            title: "Quality Control & Lab Testing",
            desc: "All quality tests, concrete cube tests, compressor yield tests, water chemistry lab analysis, and logging procedures shall be conducted by the Contractor at their own expense as instructed by the Assistant Engineer."
        },
        {
            num: "24",
            title: "Active GST Filing & TDS",
            desc: "The Contractor must maintain active GST identification and file statutory returns. General Goods and Services Tax (GST) TDS will be deducted from running bills as per Government rules."
        },
        {
            num: "25",
            title: "Procurement of Standard Materials",
            desc: "The Contractor shall buy and utilize only certified ISI/ISO marked materials, pipes, aggregates, and pumps, and must show genuine raw-material invoices and test-certificates prior to fitting."
        },
        {
            num: "26",
            title: "Full Comprehension of Clauses",
            desc: "The Contractor declares that they have carefully studied the site, read all clauses, and understood all obligations, rates, and PWD/GWD standards, and signs this agreement with absolute comprehension."
        },
        {
            num: "27",
            title: "Adherence to GWD Standard Form 83",
            desc: "All standard provisions, clauses, and stipulations encoded in GWD Form 83 (drilling and construction rules) shall apply in full force and to their literal extent throughout the duration of the contract."
        },
        {
            num: "28",
            title: "Defect Liability Period (DLP)",
            desc: "The Defect Liability Period for the work is fixed at twelve (12) calendar months (1 Year) from the date of final physical completion. The Contractor shall rectify any structural or aggregate defects at their own financial charge."
        }
    ];

    clauses.forEach((item) => {
        manager.addSpacing(10);
        manager.drawParagraph(`${item.num}. ${item.title.toUpperCase()}`, true, 9.5, 1.25);
        manager.drawParagraph(item.desc, false, 9, 1.25);
    });

    // Wtiness and signatures section to finalize
    manager.addSpacing(25);
    manager.drawParagraph("IN WITNESS WHEREOF the parties hereunto have set their hands and seals on the day and year first above written.", true, 9.5, 1.3);
    manager.addSpacing(25);

    const endY = manager.getCurrentY();
    const curPage = manager.getCurrentPage();
    
    // Check overflow for signatures section
    if (endY - 140 < manager.getMargin() + 20) {
        manager.addNewPage();
    }
    
    const sigFinalY = manager.getCurrentY();
    const activePage = manager.getCurrentPage();

    // Column 1: Contractor
    activePage.drawText("CONTRACTOR:", { x: manager.getMargin() + 10, y: sigFinalY, font: timesRomanBoldFont, size: 9.5 });
    activePage.drawText("Signature: _______________________", { x: manager.getMargin() + 10, y: sigFinalY - 20, font: timesRomanFont, size: 9.5 });
    activePage.drawText(`Name: ${contractorName}`, { x: manager.getMargin() + 10, y: sigFinalY - 40, font: timesRomanFont, size: 9.5 });
    activePage.drawText(`Address: ${contractorAddress}`, { x: manager.getMargin() + 10, y: sigFinalY - 60, font: timesRomanFont, size: 8 });

    // Column 2: District Officer
    const rightColX = manager.getWidth() - manager.getMargin() - 200;
    activePage.drawText("DISTRICT OFFICER:", { x: rightColX, y: sigFinalY, font: timesRomanBoldFont, size: 9.5 });
    activePage.drawText("Signature: _______________________", { x: rightColX, y: sigFinalY - 20, font: timesRomanFont, size: 9.5 });
    activePage.drawText("GROUND WATER DEPARTMENT", { x: rightColX, y: sigFinalY - 40, font: timesRomanFont, size: 9.5 });
    activePage.drawText(`OFFICE: ${officeAddress?.address || 'District Office, Ground Water Department'}`, { x: rightColX, y: sigFinalY - 60, font: timesRomanFont, size: 8 });

    manager.setCurrentY(sigFinalY - 80);
    manager.addSpacing(20);
    
    const witnessesY = manager.getCurrentY();
    if (witnessesY - 85 < manager.getMargin() + 20) {
        manager.addNewPage();
    }
    
    const finalWitnessY = manager.getCurrentY();
    const finalPage = manager.getCurrentPage();
    
    finalPage.drawText("In the presence of Witnesses:", { x: manager.getMargin() + 10, y: finalWitnessY, font: timesRomanBoldFont, size: 9.5 });
    
    finalPage.drawText("1. Name & Address: __________________________________________________________________", { x: manager.getMargin() + 20, y: finalWitnessY - 20, font: timesRomanFont, size: 9 });
    finalPage.drawText("   Signature: ______________________", { x: manager.getMargin() + 20, y: finalWitnessY - 35, font: timesRomanFont, size: 9 });
    
    finalPage.drawText("2. Name & Address: __________________________________________________________________", { x: manager.getMargin() + 20, y: finalWitnessY - 55, font: timesRomanFont, size: 9 });
    finalPage.drawText("   Signature: ______________________", { x: manager.getMargin() + 20, y: finalWitnessY - 70, font: timesRomanFont, size: 9 });

    manager.setCurrentY(finalWitnessY - 85);

    // Finalize pagination, headers, footers
    manager.finalize();

    return await pdfDoc.save();
}
