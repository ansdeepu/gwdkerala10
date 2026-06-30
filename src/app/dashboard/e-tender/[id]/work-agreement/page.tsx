// src/app/dashboard/e-tender/[id]/work-agreement/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, formatTenderNoForFilename } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

const capitalize = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

export default function WorkAgreementPrintPage() {
    const { tender } = useTenderData();
    const { officeAddress } = useDataStore();
    const [lang, setLang] = useState<'en' | 'ml'>('ml');
    const [useStampMargin, setUseStampMargin] = useState<boolean>(true);
    const [stampMargin, setStampMargin] = useState<number>(14);
    const [page1Border, setPage1Border] = useState<boolean>(false);

    // Style for printing to hide headers/footers
    const printStyles = `
        @page {
            margin: 0 !important;
            size: auto;
        }
        @media print {
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                height: 100%;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            header, footer, .no-print, #header, #footer {
                display: none !important;
            }
            .print-container {
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
            }
        }
    `;

    useEffect(() => {
        if (tender) {
            const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
            const prefix = lang === 'en' ? 'WorkAgreement' : 'കരാർ_ഉടമ്പടി';
            document.title = `${prefix}_${formattedTenderNo}`;
        }
    }, [tender, lang]);

    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        const acceptedBidders = (tender.bidders || []).filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
        if (acceptedBidders.length > 0) {
            return acceptedBidders.reduce((lowest, current) => 
                (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
            );
        }
        return (tender.bidders || []).reduce((prev, curr) => (prev.quotedAmount ?? Infinity) < (curr.quotedAmount ?? Infinity) ? prev : curr, tender.bidders[0] || ({} as any));
    }, [tender.bidders]);

    const agreementDateFormatted = useMemo(() => {
        if (!tender.agreementDate) return '';
        return formatDateSafe(tender.agreementDate) || '';
    }, [tender.agreementDate]);

    const completionDateFormatted = useMemo(() => {
        if (!tender.agreementDate) return '__________';
        try {
            const d = new Date(tender.agreementDate);
            if (isNaN(d.getTime())) return '__________';
            const numDays = typeof tender.periodOfCompletion === 'number' 
                ? tender.periodOfCompletion 
                : parseInt(tender.periodOfCompletion || '0', 10);
            if (isNaN(numDays) || numDays <= 0) return formatDateSafe(tender.agreementDate);
            const compDate = new Date(d);
            compDate.setDate(compDate.getDate() + numDays);
            return formatDateSafe(compDate);
        } catch (_) {
            return '__________';
        }
    }, [tender.agreementDate, tender.periodOfCompletion]);

    const fileNo = tender.fileNo || '__________';
    const eTenderNo = tender.eTenderNo || '__________';
    const contractorName = l1Bidder?.name || '____________________';
    const contractorAddress = (l1Bidder?.address || '____________________').replace(/\n/g, ', ');
    const contractorDetails = lang === 'en'
        ? `Sri/Smt. ${contractorName}, residing at ${contractorAddress}`
        : `ശ്രീ/ശ്രീമതി. ${contractorName}, മേൽവിലാസം: ${contractorAddress}`;
    
    let workName = lang === 'ml' ? (tender.nameOfWorkMalayalam || tender.nameOfWork) : tender.nameOfWork;
    if (!workName) workName = '____________________';
    
    if (workName.endsWith('.')) {
        workName = workName.slice(0, -1);
    }
    
    const completionPeriod = tender.periodOfCompletion || '___';
    const officeLocation = capitalize(officeAddress?.officeLocation) || '____________';
    const officeLocationMl = officeAddress?.officeLocation 
        ? (officeAddress.officeLocation.toLowerCase() === 'kottayam' ? 'കോട്ടയം' : (officeAddress.officeLocation.toLowerCase() === 'kollam' ? 'കൊല്ലം' : officeAddress.officeLocation))
        : '____________';
    const officeName = officeAddress?.officeName || 'District Office';
    const officeNameMl = officeAddress?.officeName 
        ? (officeAddress.officeName.includes('Kottayam') ? 'ഭൂജല വകുപ്പ് ജില്ലാ ഓഫീസ്, കോട്ടയം' : (officeAddress.officeName.includes('Kollam') ? 'ഭൂജല വകുപ്പ് ജില്ലാ ഓഫീസ്, കൊല്ലം' : officeAddress.officeName))
        : 'ഭൂജല വകുപ്പ് ജില്ലാ ഓഫീസ്';

    const estimateAmountFormatted = tender.estimateAmount ? `Rs. ${tender.estimateAmount.toLocaleString('en-IN')}/-` : '____________';
    const acceptedAmountFormatted = tender.agreedAmount ? `Rs. ${tender.agreedAmount.toLocaleString('en-IN')}/-` : (l1Bidder?.quotedAmount ? `Rs. ${l1Bidder.quotedAmount.toLocaleString('en-IN')}/-` : '____________');
    const securityDepositFormatted = '____________________';

    const clausesEn = [
        {
            num: "1",
            title: "Project Sanction & Estimate Cost",
            desc: `The administrative and technical sanction estimate for the work stands at ${estimateAmountFormatted}, which is formally approved and funded by the Ground Water Department. The Contractor participated in the competitive e-tender process and agrees to execute the said work at the sanctioned/tendered PAC of ${acceptedAmountFormatted}.`
        },
        {
            num: "2",
            title: "Adherence to Plans & Schedule",
            desc: `The contractor is bound to execute the entire work in strict conformity with the approved designs, blueprints, estimates, and schedules of the department, and must complete the entire scope of work within the stipulated period of ${completionPeriod} days.`
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
            desc: "The Contractor must complete work on schedule. Delays will attract liquidated damages of 0.1% of the PAC per week of delay, capped at 10% maximum. Time extensions may be granted optionally up to 25% or 6 months, not exceeding 50% under any circumstance. All works must be billed at contract rates. The Completion Certificate issued by the site Assistant Engineer marks the formal handover, commencing the Defect Liability Period under which the Contractor must resolve all defects in full at their own cost."
        },
        {
            num: "8",
            title: "Refunding Security Deposit",
            desc: "The security deposit / performance guarantee will be refunded to the contractor upon producing the official inspect certificate after the expiration of the liability evaluation period, subject to deduction of any dues."
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
            title: "Statutory Deductions & Bills",
            desc: "Running account invoices shall be submitted monthly or upon achieving major project milestones. A security retention of 2.5% will be deducted from each running bill. Standard statutory deductions including Income Tax, GST, and Labor Welfare Fund will be recovered at source."
        },
        {
            num: "13",
            title: "Limitation for Bill Claims",
            desc: "The physical inspection of works and preparation of bill entries will be done within 2 weeks of completion, and payment processed within a week. Payments are made based on GWD rates and shapes. The department has the right to make fair reductions if quality is not fully met."
        },
        {
            num: "14",
            title: "Rectification of Non-Conforming Works",
            desc: "Any structurally unapproved or non-conforming items of work or materials must be dismantled and rebuilt by the Contractor as directed by GWD at their own expense. Failure to do so gives GWD the authority to impose fines and execute rebuilding at Contractor's risk/cost."
        },
        {
            num: "15",
            title: "Supervisor and Instruction Logbook",
            desc: "All supervisors, monitoring committees, and technical experts have full right of entry and inspection. The Contractor must maintain an active site instruction logbook and implement all directed corrective items immediately."
        },
        {
            num: "16",
            title: "Pre-measurement of Covered Works",
            desc: "For all items which cannot be measured after coverage (e.g., deep foundation, borehole casings), the Contractor must notify GWD site engineer in writing in advance to record measurements in the Measurement Book."
        },
        {
            num: "17",
            title: "Fair Wages & Labor Welfare",
            desc: "The Contractor shall supply all tools, hire skilled labor, and pay fair wages under the Minimum Wages Act. The contractor is fully responsible for safety and is solely liable for any accidents or liabilities to site personnel or the general public."
        },
        {
            num: "18",
            title: "Sundays & Holiday Operations",
            desc: "No work or operations shall be executed at the site of work on Sundays or public holidays, except when authorized under exceptional emergency clearance by the Assistant Engineer."
        },
        {
            num: "19",
            title: "Strict Ban on Subletting",
            desc: "The Contractor is strictly prohibited from assigning, transferring, or subletting any part of this contract to third parties. Any unauthorized subdivision of work will lead to immediate rescission and forfeiture of security deposits."
        },
        {
            num: "20",
            title: "Corporate & Copartnership Liability",
            desc: "If the contract is signed by a corporate body, company, or partners, all directors, partners, and shareholders are jointly and severally liable to the department for all financial commitments, deliverables, and legal duties."
        },
        {
            num: "21",
            title: "Storage & Protection of Assets",
            desc: "The Contractor must receive all passed bill payments within 3 months, after which they will be stored in public deposit for up to 3 years. Unclaimed dues after 3 years will stand forfeited and revert back to treasury."
        },
        {
            num: "22",
            title: "Preservation of Site Materials",
            desc: "All measured and paid-for casing pipes, aggregates, and steel rods stored at the site of work must be safely guarded and fully utilized for the designated work by the Contractor."
        },
        {
            num: "23",
            title: "Impossibility of Performance Clauses",
            desc: "Contract clauses cannot be modified. If land or site clearance becomes impossible, causing work abandonment, GWD will pay for executed items at agreed schedule rates and dismantle the remaining agreement without any extra compensation."
        },
        {
            num: "24",
            title: "Labor Disputes & Strikes Resolution",
            desc: "The Contractor must pay standard government-approved wages and handle all labor strikes/unrests independently. Any project delay or financial damage arising from labor issues will be the sole responsibility of the Contractor."
        },
        {
            num: "25",
            title: "Work Site Signboards & Information",
            desc: "The Contractor must set up standard warning and informant signboards at the site showcasing project specifications, funding agencies, expected dates, and contact helplines before commencing heavy excavation."
        },
        {
            num: "26",
            title: "Right to Information Compliance",
            desc: "The Contractor is legally bound to assist GWD in complying with any queries raised under the Right to Information Act, and must produce authentic work data, logs, and quality test sheets on demand."
        },
        {
            num: "27",
            title: "Integration of Auxiliary Plans & Designs",
            desc: "All design blueprints, itemized rate lists, schedules, and corrigendums published during the bidding process are treated as an integrated part of this binding contract document."
        },
        {
            num: "28",
            title: "Approximate Nature of Quantities",
            desc: "The quantities of items described in the schedule are indicative and approximate. The department reserves the right to increase or decrease quantities at the same agreed rates, and no extra compensation will be paid."
        },
        {
            num: "29",
            title: "Execution of Extra Items",
            desc: "The Contractor is bound to carry out any necessary extra items of work required to secure the structurally sound completion of the borewell or drinking water schemes as directed by the site Engineers."
        },
        {
            num: "30",
            title: "Pricing of Extra Items",
            desc: "Extra items of work will be priced as per Central Public Works Department (CPWD) rates. If CPWD rates are unavailable, GWD standard rates or market rates will be used, scaled by the agreed tender discount/premium, requiring an additional agreement."
        },
        {
            num: "31",
            title: "Extra Item Rate Cap for Percentage Tenders",
            desc: "For percentage rate contracts, any extra items of work will be capped at the same percentage discount as quoted by the Contractor against the original contract PAC."
        },
        {
            num: "32",
            title: "Bitumen Voucher Submission",
            desc: "For road/protective works involving bitumen, the Contractor must submit original purchase invoices. Payments will be made based on agreed tender rates regardless of actual market fluctuations."
        },
        {
            num: "33",
            title: "Quality Control & Lab Testing",
            desc: "All quality tests, concrete cube tests, compressor yield tests, water chemistry lab analysis, and logging procedures shall be conducted by the Contractor at their own expense as instructed by the Assistant Engineer."
        },
        {
            num: "34",
            title: "Active GST Filing & TDS",
            desc: "The Contractor must maintain active GST identification and file statutory returns. General Goods and Services Tax (GST) TDS will be deducted from running bills as per Government rules."
        },
        {
            num: "35",
            title: "Procurement of Standard Materials",
            desc: "The Contractor shall buy and utilize only certified ISI/ISO marked materials, pipes, aggregates, and pumps, and must show genuine raw-material invoices and test-certificates prior to fitting."
        },
        {
            num: "36",
            title: "Full Comprehension of Clauses",
            desc: "The Contractor declares that they have carefully studied the site, read all clauses, and understood all obligations, rates, and PWD/GWD standards, and signs this agreement with absolute comprehension."
        },
        {
            num: "37",
            title: "Adherence to GWD Standard Form 83",
            desc: "All standard provisions, clauses, and stipulations encoded in GWD Form 83 (drilling and construction rules) shall apply in full force and to their literal extent throughout the duration of the contract."
        },
        {
            num: "38",
            title: "Defect Liability Period (DLP)",
            desc: "The Defect Liability Period for the work is fixed at twelve (12) calendar months (1 Year) from the date of final physical completion. The Contractor shall rectify any structural or aggregate defects at their own financial charge."
        }
    ];

    const clausesMl = [
        {
            num: "1",
            title: "പദ്ധതിയുടെ ഭരണാനുമതിയും അടങ്കൽ തുകയും",
            desc: `${workName} എന്ന പ്രവർത്തിക്ക് വേണ്ടി ${estimateAmountFormatted} രൂപയുടെ മതിപ്പു ചെലവ് അംഗീകരിക്കുകയും ആവശ്യമായ തുക പദ്ധതിയിൽ വകയിരുത്തുകയും ചെയ്തിട്ടുണ്ട്. പ്രസ്തുത പ്രവർത്തിക്കുള്ള ടെണ്ടറിൽ കരാറുകാരൻ പങ്കെടുക്കുകയും ${acceptedAmountFormatted} രൂപക്ക് പ്രവൃത്തി ചെയ്യാമെന്ന് അംഗീകരിക്കുകയും ചെയ്തിട്ടുണ്ട്.`
        },
        {
            num: "2",
            title: "പ്ലാനുകളും ഷെഡ്യൂളും പാലിക്കൽ",
            desc: `പ്രസ്തുത പ്രവൃത്തി അംഗീകരിക്കപ്പെട്ടിട്ടുള്ള പ്ലാൻ, എസ്റ്റിമേറ്റ്, ഡിസൈൻ, പ്രവൃത്തി വിവരപ്പട്ടിക, പ്രവർത്തന കലണ്ടർ എന്നിവ പ്രകാരവും കരാർ നിരക്കനുസരിച്ചും എഞ്ചിനീയറുടെ നിർദ്ദേശപ്രകാരവും ${completionDateFormatted !== "__________" ? `${completionDateFormatted} തീയതിയ്ക്കകം` : `${completionPeriod} ദിവസങ്ങൾക്കുള്ളിൽ`} കരാറുകാരൻ പൂർത്തിയാക്കേണ്ടതാണ്.`
        },
        {
            num: "3",
            title: "പെർഫോമൻസ് സെക്യൂരിറ്റി ഡിപ്പോസിറ്റ്",
            desc: "പ്രസ്തുത കരാറുടമ്പടിയുടെ ഭാഗമായി പെർഫോമൻസ് ഗ്യാരണ്ടിയായി............................ രൂപയും അഡിഷണൽ പെർഫോമൻസ് ഗ്യാരണ്ടിയായി .................................... രൂപയും (കുറഞ്ഞത് 50 ശതമാനമെങ്കിലും ട്രഷറി സ്ഥിര നിക്ഷേപം) കരാറുകാരൻ വകുപ്പിൽ അടവാക്കിയിരിക്കുന്നു."
        },
        {
            num: "4",
            title: "ഗവേണിംഗ് വർക്ക്സ് മാനുവലുകൾ",
            desc: "ഈ പ്രവൃത്തി സംബന്ധമായി ജി.ഡബ്ല്യു.ഡി./ സി.പി.ഡബ്ല്യു.ഡി സ്പെസിഫിക്കേഷൻ, പി.ഡബ്ല്യു.ഡി മാനുവൽ, ഇ-ടെണ്ടർ നിബന്ധനകൾ എന്നിവയിലെ പ്രസക്തമായ എല്ലാ വ്യവസ്ഥകളും കരാറുകാരൻ വായിച്ചു മനസ്സിലാക്കിയിരിക്കുന്നു. പ്രവൃത്തിയാവശ്യമായ സാധനങ്ങളുടെ ഗുണനിലവാരം, പ്രവൃത്തിയുടെ ഗുണനിലവാരം, പ്രവൃത്തിയുടെ അളവുകൾ, കരാറുടമ്പടിയുടെ ബാധകമായി വരുന്ന നിബന്ധനകൾ എല്ലാം മേൽപ്പറഞ്ഞ ഡീറ്റെയിൽഡ് സ്പെസിഫിക്കേഷൻ അനുസരിച്ചുമായിരിക്കും."
        },
        {
            num: "5",
            title: "ആർബിട്രേഷൻ ഒഴിവാക്കൽ",
            desc: "പ്രവൃത്തി സംബന്ധമായി വല്ല തർക്കങ്ങളും ഉണ്ടായാൽ ആയത് ഒരു ആർബിട്രേഷനും വിധേയമാകുന്നതല്ല. തർക്കങ്ങളിൽ അന്തിമതീരുമാനം ബന്ധപ്പെട്ട ടെക്നിക്കൽ കമ്മിറ്റിയുടേതായിരിക്കുന്നതാണ്."
        },
        {
            num: "6",
            title: "സ്ഥലം കൈമാറ്റവും ആരംഭവും",
            desc: "ഈ കരാർ ഉടമ്പടി വെച്ച് 7 (ഏഴ്) ദിവസത്തിനുള്ളിൽ പ്രവൃത്തി നടത്തുന്നതിനായി സ്ഥലം ഏറ്റുവാങ്ങി ഏഴ് ദിവസത്തിനുള്ളിൽ പ്രവൃത്തി ആരംഭിക്കുന്നതിനും ഈ കരാർ ഉടമ്പടിയുടെ ഭാഗമായി വെച്ചിട്ടുള്ള പ്രവർത്തന കലണ്ടർ പ്രകാരം നിശ്ചിത സമയത്തിനുള്ളിൽ പ്രവൃത്തി പൂർത്തിയാക്കുന്നതിനും കരാറുകാരൻ ബാധ്യസ്ഥനായിരിക്കുന്നതാണ്."
        },
        {
            num: "7",
            title: "മൈൽസ്റ്റോണുകളും പ്രവൃത്തി വൈകുന്നതിനുള്ള പിഴയും",
            desc: "കരാർ ഉടമ്പടി പ്രകാരമുള്ള നിശ്ചിത തീയതിയ്ക്കകം തന്നെ പ്രവൃത്തി പൂർത്തിയാക്കിയിരിക്കേണ്ടതാണ്. മുൻകൂട്ടി കാണാൻ കഴിയാത്ത കാരണങ്ങളാൽ നിശ്ചിത സമയത്തിനുള്ളിൽ പ്രവൃത്തി പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ലെന്ന് ബോധ്യപ്പെടുന്ന പക്ഷം പൂർത്തീകരണ കാലാവധിക്കുള്ളിൽ തന്നെ തീയതി ദീർഘിപ്പിച്ച് ലഭിക്കുന്നതിന് കരാറുകാരൻ നിശ്ചിത ഫോറത്തിൽ അപേക്ഷ സമർപ്പിക്കേണ്ടതാണ്. ഒരു തവണ നിലവിലുള്ള പൂർത്തീകരണ കാലാവധിയുടെ 25 ശതമാനം അല്ലെങ്കിൽ ആറ് മാസം ഇവയിൽ ഏതാണോ കുറവ് ആ കാലാവധി അനുവദിച്ചു നൽകുന്നതാണ്. കരാർ അതോറിറ്റിക്ക് ഒരു ജോലിക്ക് പിഴയില്ലാതെ അനുവദിക്കാവുന്ന പരമാവധി സമയം യഥാർത്ഥ പൂർത്തീകരണ സമയത്തിന്റെ പകുതിയായി (50 ശതമാനം) പരിമിതപ്പെടുത്തിയിരിക്കുന്നു. കരാറുകാരൻറെ ഭാഗത്ത് ഉണ്ടാകുന്ന കാരണങ്ങളാൽ പ്രവൃത്തിയിൽ കാലതാമസം നേരിടുന്ന പക്ഷം കരാറുകാരൻ സമ്മതിച്ച അടങ്കൽ തുകയുടെ (PAC) പരമാവധി 10% ന് വിധേയമായി, ഷെഡ്യൂൾ ചെയ്ത പൂർത്തീകരണ തീയതിക്ക് ശേഷമുള്ള ഓരോ ആഴ്ചയും കാലതാമസത്തിന്, കരാറുകാരൻ സമ്മതിച്ച അടങ്കൽ തുകയുടെ (PAC) 0.1 % പിഴയായി/ലിക്വിഡേറ്റഡ് നാശനഷ്ടങ്ങളായി ചുമത്തും. നിലവിലുള്ള പൂർത്തീകരണ കാലാവധിയുടെ 50 ശതമാനത്തിലധികം സമയം ഒരു കാരണവശാലും ദീർഘിപ്പിച്ചു നൽകുന്നതല്ല. പ്രവൃത്തി ഒഴികെ ഈ കരാർ ഉടമ്പടി പ്രകാരം നടത്തേണ്ട എല്ലാ പ്രവൃത്തികളും കരാർ ഉടമ്പടിയിൽ കാണിച്ചിട്ടുള്ള നിരക്കിൽ പൂർത്തിയാക്കേണ്ടതാണ്. യാതൊരു കാരണവശാലും നിരക്കിൽ വർദ്ധനവോ, വ്യതിയാനമോ അനുവദിക്കുന്നതല്ല. പ്രസ്തുത പ്രവൃത്തി പൂർത്തിയാക്കി അസിസ്റ്റന്റ് എഞ്ചിനീയർ അവസാനത്തെ അളവുകളെടുത്ത് രേഖപ്പെടുത്തുന്ന ദിവസമാണ് പ്രവൃത്തി പൂർത്തിയാക്കിയ ദിവസമായി കണക്കാക്കുക. പ്രസ്തുത തീയതി മുതൽ സർക്കാർ ഉത്തരവ് പ്രകാരം വിവിധ പ്രവൃത്തികൾക്കായി നിഷ്കർഷിച്ചിട്ടുള്ള കാലാവധി ഗ്യാരണ്ടി പിരിയഡ് ആയി കണക്കാക്കുന്നതാണ്. പ്രസ്തുത ഗ്യാരണ്ടി പീരിയഡിനുള്ളിൽ സംഭവിക്കുകയോ കാണുകയോ ചെയ്യുന്ന എല്ലാ തകരാറുകളും സ്വന്തം ചിലവിൽ പരിഹരിക്കുന്നതിന് കരാറുകാരന് പൂർണ്ണ ഉത്തരവാദിത്തം ഉണ്ടായിരിക്കും. ഈ കാര്യത്തിൽ കരാറുകാരൻ വീഴ്ച വരുത്തുകയാണെങ്കിൽ പ്രവൃത്തിയുടെ തകരാറുകൾ മറ്റൊരു ഏജൻസിയെ കൊണ്ട് പരിഹരിക്കുന്നതും അതിനുവേണ്ടി വരുന്ന ചിലവ് കരാറുകാരൻറെ ജാമ്യ നിക്ഷേപത്തിൽ നിന്ന് ഈടാക്കുന്നതുമാണ്."
        },
        {
            num: "8",
            title: "ജാമ്യ നിക്ഷേപം തിരികെ നൽകൽ",
            desc: "കരാറുടമ്പടി വെക്കുമ്പോൾ നൽകിയിട്ടുള്ള ജാമ്യനിക്ഷേപം പരിശോധനാ പിരിയഡിന് ശേഷം ഏജൻസിയുടെ പരിശോധനാ സർട്ടിഫിക്കറ്റ് ഹാജരാക്കിയാലുടനെ തന്നെ തിരിച്ചു നൽകുന്നതാണ്. പ്രസ്തുത പ്രവൃത്തി സംബന്ധമായി കരാറുകാരൻ വകുപ്പിലേക്ക് എന്തെങ്കിലും തുക അടയ്ക്കാനുണ്ടെങ്കിൽ പ്രസ്തുത തുക ജാമ്യ നിക്ഷേപത്തിൽ നിന്ന് ഈടാക്കുന്നതാണ്."
        },
        {
            num: "9",
            title: "കരാറുകാരന്റെ ഉത്തരവാദിത്തത്തിലുള്ള റദ്ദാക്കൽ",
            desc: "കരാറുടമ്പടി പ്രകാരം പ്രവൃത്തി പൂർത്തിയാക്കുന്നതിൽ കരാറുകാരൻ വീഴ്ച വരുത്തുകയാണെങ്കിൽ നിയമാനുസൃതം നോട്ടീസ് അയച്ച് പതിനാലു ദിവസങ്ങൾക്ക് ശേഷം കരാർ റദ്ദാക്കുന്നതും പ്രവൃത്തി മറ്റൊരു ഏജൻസി വഴി പൂർത്തിയാക്കുന്നതുമാണ്. അങ്ങനെ മറ്റൊരു ഏജൻസിയെ കൊണ്ട് പ്രവൃത്തി പൂർത്തിയാക്കുന്നത് മൂലം ഉണ്ടാകുന്ന അധിക ചിലവ് മുഴുവൻ കരാറുകാരൻറെ ബിൽ തുകയിൽ നിന്നും, ജാമ്യനിക്ഷേപത്തിൽ നിന്നും, സ്ഥാവരജംഗമ സ്വത്തുക്കളിൽ നിന്നും ഈടാക്കുന്നതിന് അധികാരമുണ്ടായിരിക്കുന്നതാണ്."
        },
        {
            num: "10",
            title: "സാമഗ്രികൾ സ്ഥലത്തുനിന്ന് മാറ്റാൻ പാടില്ലാത്ത വ്യവസ്ഥ",
            desc: "കരാർ ദുർബ്ബലപ്പെടുത്തുമ്പോൾ പ്രവൃത്തി നടത്തുന്ന സ്ഥലത്ത് സംഭരിച്ചുവെച്ചിട്ടുള്ള എല്ലാ നിർമ്മാണ സാധനങ്ങളും യന്ത്രോപകരണങ്ങളും പ്രവൃത്തി നടത്തുന്ന സ്ഥലത്തുനിന്ന് കരാറുകാരൻ മാറ്റാൻ പാടുള്ളതല്ല. പ്രസ്തുത സാധനങ്ങളെല്ലാം അളവെടുത്ത ശേഷം പ്രവൃത്തിക്കുവേണ്ടി ഉപയോഗിക്കാനോ, ലേലം ചെയ്ത് വിറ്റ് ഈ വകയിൽ ലഭിക്കുന്ന തുക നഷ്ടപരിഹാരത്തുകയിൽ വകയിരുത്തുന്നതിനോ വകുപ്പിന് പരിപൂർണ്ണമായ അധികാരമുണ്ടായിരിക്കുന്നതാണ്."
        },
        {
            num: "11",
            title: "വകുപ്പ് നൽകുന്ന സാമഗ്രികളുടെ സംരക്ഷണം",
            desc: "പ്രവൃത്തിക്കുവേണ്ടി എന്തെങ്കിലും സാധനങ്ങളോ യന്ത്രോപകരണങ്ങളോ വകുപ്പ് നൽകിയിട്ടുണ്ടെങ്കിൽ അവ പ്രവൃത്തിക്കുവേണ്ടി ഉപയോഗിച്ചിട്ടില്ലെങ്കിൽ കേടുപാടുകൂടാതെ തിരിച്ചു നൽകേണ്ട ഉത്തരവാദിത്തം കരാറുകാരന് ഉണ്ടായിരിക്കും. അങ്ങനെ തിരിച്ചു നൽകാത്ത സാധനങ്ങളുടെ മാർക്കറ്റ് വിലയും പലിശയും അടയ്ക്കാൻ കരാറുകാരൻ ബാധ്യസ്ഥനാണ്."
        },
        {
            num: "12",
            title: "പാർട്ട് ബില്ലുകളും നികുതി കിഴിവുകളും",
            desc: "സാധാരണ നിലയിൽ മാസത്തിൽ ഒരിക്കലോ അല്ലെങ്കിൽ ഗണ്യമായ തുകയ്ക്ക് പ്രവൃത്തി പൂർത്തിയാക്കിയാലോ പാർട്ട് ബിൽ നൽകുന്നതാണ്. കരാറുകാരൻറെ പാർട്ട് ബില്ലിൽ നിന്ന് 2.50 % വരുന്ന തുക ജാമ്യ നിക്ഷേപത്തിനുവേണ്ടി പിടിച്ചുവെക്കുന്നതാണ്. നിയമാനുസൃതമുള്ള നികുതികൾ (ആദായ നികുതി, ചരക്ക് സേവന നികുതി, കെട്ടിട നിർമ്മാണ തൊഴിലാളി ക്ഷേമനിധി വിഹിതം, തുടങ്ങിയവ) പിടിക്കുന്നതാണ്."
        },
        {
            num: "13",
            title: "ബില്ലെഴുത്തും പണം നൽകലും",
            desc: "പ്രവൃത്തി പൂർത്തിയാക്കി രണ്ടാഴ്ചയ്ക്കുള്ളിൽ അളവെടുത്ത് ബില്ലെഴുതുകയും, ബിൽ ലഭിച്ച് ഒരാഴ്ചയ്ക്കുള്ളിൽ പണം നൽകുന്നതുമാണ്. എല്ലാ ഇനം പ്രവൃത്തിയും വിവരപ്പട്ടികയിൽ പരാമർശിച്ചിട്ടുള്ള രൂപത്തിലും ഗുണനിലവാരത്തിലും ചെയ്തിട്ടുണ്ടെങ്കിൽ മാത്രമേ കരാറുടമ്പടിയിൽ കാണിച്ചിട്ടുള്ള നിരക്കിൽ പണം നൽകുകയുള്ളൂ. ഏതെങ്കിലും ഇനം പ്രവൃത്തിയോ ഏതെങ്കിലും ഭാഗം പ്രവൃത്തിയോ തൃപ്തികരമല്ലെന്ന് കാണുകയാണെങ്കിൽ നിരക്കിൽ യുക്തമായ കുറവുവരുത്തുന്നതിന് വകുപ്പിന് അധികാരമുണ്ടായിരിക്കുന്നതാണ്."
        },
        {
            num: "14",
            title: "തൃപ്തികരമല്ലാത്ത പ്രവൃത്തികൾ പുനർനിർമ്മിക്കൽ",
            desc: "തൃപ്തികരമല്ലെന്ന് കാണുന്ന പ്രവൃത്തിയോ അല്ലെങ്കിൽ ഗുണനിലവാരമില്ലാത്ത സാധനങ്ങൾ ഉപയോഗിച്ചുകൊണ്ടുള്ള പ്രവൃത്തിയോ വകുപ്പ് നിർദ്ദേശിക്കുന്ന രീതിയിൽ പൊളിച്ചുമാറ്റി, ഗുണനിലവാരമുള്ള സാധനങ്ങൾ ഉപയോഗിച്ചുകൊണ്ട് കരാറുടമ്പടിയിൽ നിഷ്കർഷിക്കുന്ന രൂപത്തിലും ഘടനത്തിലും പുനർനിർമ്മിക്കുന്നതിന് കരാറുകാരൻ ബാധ്യസ്ഥനായിരിക്കും. അല്ലാത്തപക്ഷം വകുപ്പിന്റെ ഇഷ്ടംപോലെ പിഴ ചുമത്തുന്നതിനും, കരാറുകാരന്റെ നഷ്ടോത്തരവാദിത്തത്തിൽ മറ്റൊരു ഏജൻസിയെക്കൊണ്ട് തൃപ്തികരമല്ലാത്ത പ്രവൃത്തികൾ പൊളിച്ചുമാറ്റി പുനർനിർമ്മിക്കുന്നതിന് അധികാരമുണ്ടായിരിക്കുന്നതാണ്."
        },
        {
            num: "15",
            title: "ഉത്തരവ് പുസ്തകം സൂക്ഷിക്കലും നിർദ്ദേശങ്ങൾ പാലിക്കലും",
            desc: "പ്രവൃത്തി നടന്നുകൊണ്ടിരിക്കുമ്പോഴും പൂർത്തിയായശേഷവും വകുപ്പ് ചുമതലപ്പെടുത്തിയ എഞ്ചിനീയർമാർ, മോണിറ്ററിംഗ് കമ്മിറ്റി അംഗങ്ങൾ, വിദഗ്ദ്ധസമിതി അംഗങ്ങൾ എന്നിവർ പരിശോധിക്കുന്നതും അവരുടെ പരിശോധനാക്കുറിപ്പുകൾ പ്രവൃത്തി സ്ഥലത്ത് കരാറുകാരനോ, കരാറുകാരന്റെ ഏജന്റോ, പ്രവൃത്തിയുടെ മേൽനോട്ടം വഹിക്കുന്ന ഓവർസിയറോ സൂക്ഷിക്കുന്ന പ്രവൃത്തിയുടെ ഉത്തരവ് പുസ്തകത്തിൽ രേഖപ്പെടുത്തുന്നതുമാണ്. പ്രവൃത്തി നടത്തുന്ന സ്ഥലത്ത് കരാറുകാരനോ, കരാറുകാരൻറെ ഏജന്റോ ഉണ്ടായിരിക്കണം. മേൽപ്പറഞ്ഞ എഞ്ചിനീയറോ, മോണിറ്ററിംഗ് കമ്മിറ്റി അംഗങ്ങളോ, വിദഗ്ദ്ധ സമിതി അംഗങ്ങളോ ചൂണ്ടിക്കാണിക്കുന്ന കുറവുകൾ പരിഹരിക്കുന്നതിനും അവരുടെ നിർദ്ദേശങ്ങൾ അനുസരിച്ച് പ്രവൃത്തി നടത്തുന്നതിനും കരാറുകാരൻ ബാധ്യസ്ഥനായിരിക്കുന്നതാണ്."
        },
        {
            num: "16",
            title: "അളവുകൾ മുൻകൂട്ടി എടുക്കൽ",
            desc: "പൂർത്തിയാക്കിയശേഷം അളക്കാൻ പറ്റാത്ത ഇനം പ്രവൃത്തികളുടെ അളവുകൾ മുൻകൂട്ടി എടുക്കുന്നതിനും മെഷർമെന്റ് ബുക്കിൽ രേഖപ്പെടുത്തുന്നതിനും കരാറുകാരൻ രേഖാമൂലം എഞ്ചിനീയറെ അറിയിക്കേണ്ടതും അതിന് ആവശ്യമായ സൗകര്യങ്ങൾ ഏർപ്പാട് ചെയ്യേണ്ടതുമാണ്."
        },
        {
            num: "17",
            title: "പണിയായുധങ്ങളും സുരക്ഷാ മുൻകരുതലുകളും",
            desc: "പ്രവൃത്തി നിർവ്വഹണത്തിനാവശ്യമായ എല്ലാ പണിയായുധങ്ങളും ഉപകരണങ്ങളും കരാറുകാരന്റെ സ്വന്തം ചെലവിലും ഉത്തരവാദിത്തത്തിലും കൊണ്ടുവരേണ്ടതാണ്. ഓരോ ഇനം പ്രവൃത്തിക്കും ആവശ്യമായ വൈദഗ്ദ്ധ്യം ലഭിച്ച തൊഴിലാളികളെയും വിദഗ്ദ്ധരെയും നിയമിക്കേണ്ടതാണ്. പ്രവൃത്തിക്കുവേണ്ടി ഉപയോഗിക്കുന്ന സാധനങ്ങളുടെ അളവുകളെടുക്കുന്നതിനാവശ്യമായ ഉപകരണങ്ങൾ കരാറുകാരൻ കൊണ്ടുവരേണ്ടതാണ്. പ്രവൃത്തിക്കു വേണ്ടി നിയമിക്കുന്ന തൊഴിലാളികൾക്കും പ്രവൃത്തി നടക്കുന്ന സ്ഥലത്തുകൂടെ കടന്നുപോകുന്ന പൊതുജനങ്ങൾക്കും അപകടം വരാതിരിക്കാനുള്ള എല്ലാ മുൻകരുതലുകളും എടുക്കുന്നതിനും വേലികളും മുന്നറിയിപ്പ് ബോർഡുകളും മുന്നറിയിപ്പ് വിളക്കുകളും സ്ഥാപിക്കുന്നതിനും കരാറുകാരന് ഉത്തരവാദിത്തമുണ്ടായിരിക്കും. തൊഴിലാളികൾക്കോ പൊതുജനങ്ങൾക്കോ പ്രവൃത്തി സ്ഥലത്ത് വച്ച് അപകടവും സംഭവിച്ചാൽ ആയതിന് നിയമപ്രകാരമുള്ള എല്ലാ നഷ്ടപരിഹാരവും നൽകുന്നതിന് കരാറുകാരൻ ബാധ്യസ്ഥനായിരിക്കുന്നതാണ്."
        },
        {
            num: "18",
            title: "ഞായറാഴ്ചകളിലെ പ്രവൃത്തികൾ",
            desc: "സാധാരണ നിലയിൽ ഞായറാഴ്ച ദിവസങ്ങളിൽ ബന്ധപ്പെട്ട എഞ്ചിനീയറുടെ അനുമതിയില്ലാതെ പ്രവൃത്തി നടത്താൻ പാടുള്ളതല്ല."
        },
        {
            num: "19",
            title: "ഉപകരാർ നൽകുന്നതിനായുള്ള നിരോധനം",
            desc: "ഏറ്റെടുക്കുന്ന പ്രവൃത്തി മുഴുവനായോ, ഭാഗികമായോ മറ്റൊരു കരാറുകാരനെയോ, ഏജൻസിനെയോ കരാറുകാരൻ ഏൽപ്പിക്കാൻ പാടുള്ളതല്ല. അങ്ങനെ ചെയ്യുകയാണെങ്കിൽ ഈ കരാറുടമ്പടി ദുർബ്ബലപ്പെടുകയും, ജാമ്യനിക്ഷേപവും കരാറുകാരന് കൊടുക്കാനുള്ള ബിൽ തുകയും പ്രവൃത്തി സ്ഥലത്ത് സംഭരിച്ചിട്ടുള്ള സാധനങ്ങളുടെ വിലയും സർക്കാർ റവന്യൂ ഫണ്ടിലേക്ക് കണ്ടുകെട്ടുന്നതാണ്."
        },
        {
            num: "20",
            title: "കൂട്ടാൺമ വ്യക്തിഗത ബാധ്യതകൾ",
            desc: "കമ്പനിക്കുവേണ്ടിയാണ് കരാറുടമ്പടി ഒപ്പ് വയ്ക്കുന്നതെങ്കിൽ പ്രവൃത്തി സംബന്ധമായ എല്ലാ ബാധ്യതകൾക്കും കമ്പനിയുടെ എല്ലാ ഓഹരിഉടമകൾക്കും പരിപൂർണ്ണമായ ഉത്തരവാദിത്തം ഉണ്ടായിരിക്കുന്നതിനോടൊപ്പം തന്നെ പ്രസ്തുത കമ്പനിക്കുവേണ്ടി കരാറുടമ്പടിയിൽ ഒപ്പുവയ്ക്കുന്ന വ്യക്തി സ്വന്തം നിലയിലും എല്ലാ ബാധ്യതകൾക്കും പരിപൂർണ്ണമായ ഉത്തരവാദിത്തം ഉണ്ടായിരിക്കുന്നതാണ്."
        },
        {
            num: "21",
            title: "ബിൽ തുക സ്വീകരിക്കാനുള്ള കാലാവധി",
            desc: "ഈ പ്രവൃത്തി സംബന്ധമായി കരാറുകാരന് ലഭിക്കേണ്ടതായിട്ടുള്ള എല്ലാ ബിൽ തുകളും അവ പാസ്സായി 3 മാസത്തിനുള്ളിൽ സ്വീകരിക്കേണ്ടതാണ്. 3 മാസത്തിനുള്ളിൽ സ്വീകരിക്കാത്ത ബിൽ തുകകൾ പാസ്സായി 3 വർഷം വരെ ഡിപ്പോസിറ്റിൽ സൂക്ഷിക്കുന്നതാണ്. പ്രസ്തുത 3 വർഷത്തിനുള്ളിൽ പണം സ്വീകരിക്കുന്നതിന് കരാറുകാരൻ വന്നിട്ടില്ലെങ്കിൽ പ്രസ്തുത തുക സർക്കാർ ഫണ്ടിലേക്ക് കണ്ടുകെട്ടുന്നതായിരിക്കും."
        },
        {
            num: "22",
            title: "സംഭരിച്ച സാധനങ്ങളുടെ സംരക്ഷണം",
            desc: "പ്രവൃത്തി സ്ഥലത്ത് സംഭരിച്ചിട്ടുള്ള എന്തെങ്കിലും സാധനങ്ങളുടെ അളവെടുക്കുകയും പണം നൽകുകയും ചെയ്തിട്ടുണ്ടെങ്കിൽ പ്രസ്തുത സാധനങ്ങൾ കേടുപാടുകൂടാതെ ഭദ്രമായി സൂക്ഷിക്കേണ്ടതും അവ പൂർണ്ണമായി പ്രവൃത്തിക്കുവേണ്ടി ഉപയോഗപ്പെടുത്തേണ്ടതും കരാറുകാരൻറെ ഉത്തരവാദിത്തമായിരിക്കും."
        },
        {
            num: "23",
            title: "വ്യവസ്ഥകൾ മാറ്റാൻ പാടില്ലാത്ത നിബന്ധന",
            desc: "ഈ കരാറുടമ്പടിയിലെ വ്യവസ്ഥകൾ മാറ്റാനോ ഒഴിവാക്കാനോ ചെയ്യാൻ പാടുള്ളതല്ല. പ്രവൃത്തി നടത്താൻ ആവശ്യമായ സ്ഥലം ലഭിക്കാത്ത സാഹചര്യത്തിൽ പ്രവൃത്തി ആരംഭിക്കാൻ കഴിയാതെ വരികയോ, പൂർത്തിയാക്കാൻ സാധിക്കാതെ വരികയോ ചെയ്താൽ പ്രവൃത്തിസ്ഥലത്ത് കരാറുകാരൻ സംഭരിച്ചിട്ടുള്ള സാധനങ്ങളുടെ അംഗീകൃത നിരക്ക് പ്രകാരമുള്ള വിലയും ചെയ്തിട്ടുള്ള പ്രവൃത്തിയുടെ ബിൽ തുകയും നൽകിയശേഷം ഈ കരാറുടമ്പടി ദുർബ്ബലപ്പെടുത്തുന്നതാണ്. ഈ കാരണത്താൽ യാതൊരു നഷ്ടപരിഹാരവും നൽകുന്നതിന് വകുപ്പിന് ബാധ്യതയുണ്ടായിരിക്കുന്നതല്ല."
        },
        {
            num: "24",
            title: "തൊഴിലാളി കൂലിയും നിയമവ്യവസ്ഥകളും",
            desc: "പ്രവൃത്തിക്കുവേണ്ടി കരാറുകാരൻ നിയോഗിക്കുന്ന എല്ലാ തൊഴിലാളികൾക്കും സർക്കാർ അംഗീകരിച്ച നിരക്കിൽ വേതനം നൽകേണ്ടതാണ്. എന്തെങ്കിലും കാരണത്താൽ ഉണ്ടാകുന്ന തൊഴിൽ സമരത്തിന് കരാറുകാരൻ തന്നെ പരിഹാരം കാണേണ്ടതാണ്. തൊഴിൽ സമരങ്ങൾ കാരണം പ്രവൃത്തി നിർവ്വഹണം തടസ്സപ്പെടുത്താതിരിക്കാൻ കരാറുകാരൻ ശ്രദ്ധിക്കേണ്ടതാണ്. തൊഴിൽ സമരങ്ങൾ കാരണം വരുന്ന കാലതാമസം നേരിടുന്ന നഷ്ടങ്ങൾക്കും കരാറുകാരൻ മാത്രം ബാധ്യസ്ഥനായിരിക്കും."
        },
        {
            num: "25",
            title: "നോട്ടീസ് ബോർഡുകൾ സ്ഥാപിക്കൽ",
            desc: "വകുപ്പ് നിശ്ചയിക്കുന്ന മാതൃകയിലുള്ള നോട്ടീസ് ബോർഡുകൾ പ്രവൃത്തി സ്ഥലത്ത് സ്ഥാപിക്കേണ്ടതും പ്രസ്തുത നോട്ടീസ് ബോർഡിൽ പ്രവൃത്തിയെ സംബന്ധിക്കുന്ന എല്ലാ പ്രധാനപ്പെട്ട സാങ്കേതിക കാര്യങ്ങളും പ്രവൃത്തി ആരംഭിക്കുന്ന തീയതി മുതൽ പ്രവൃത്തി പൂർത്തിയാക്കിയ ശേഷവും സ്ഥിരമായി നിലനിൽക്കുന്ന രീതിയിൽ പ്രദർശിപ്പിക്കുന്നതിന് കരാറുകാരന് ബാധ്യത ഉണ്ടായിരിക്കും. അങ്ങനെയുള്ള നോട്ടീസ് ബോർഡ് സ്ഥാപിച്ചിട്ടുണ്ടെന്ന് ഉറപ്പ് വരുത്തിയതിനുശേഷമേ ആദ്യത്തെ പാർട്ട് ബിൽ നൽകുകയുള്ളൂ."
        },
        {
            num: "26",
            title: "RTI വിവരങ്ങൾ നൽകാൻ സഹായിക്കൽ",
            desc: "പ്രവൃത്തി നിർവ്വഹണഘട്ടത്തിൽ പ്രവൃത്തിയെ സംബന്ധിച്ച് വിശദവിവരങ്ങൾ അന്വേഷിക്കുന്ന ഏതൊരു പൗരനും, പ്രസ്തുത വിവരങ്ങൾ സത്യസന്ധമായി പറഞ്ഞുകൊടുക്കുന്നതിന് കരാറുകാരനും, കരാറുകാരന്റെ ഏജന്റിനും ഉത്തരവാദിത്തമുണ്ടായിരിക്കുന്നതാണ്."
        },
        {
            num: "27",
            title: "രൂപരേഖകളും എസ്റ്റിമേറ്റുകളും ഉൾപ്പെടുത്തൽ",
            desc: "ഈ കരാറുടമ്പടിയുടെ അനുബന്ധമായി വെച്ചിട്ടുള്ള പ്രവൃത്തി വിവരപ്പട്ടികയും, പ്ലാനുകളും ഡിസൈനുകളും ഈ കരാറുടമ്പടിയുടെ ഭാഗമായി കണക്കാക്കുന്നതാണ്."
        },
        {
            num: "28",
            title: "പ്രവൃത്തി അളവുകളുടെ സ്വഭാവം",
            desc: "പ്രവൃത്തി വിവരപ്പട്ടികയിൽ കാണിച്ചിട്ടുള്ള ഓരോ ഇനം പ്രവൃത്തിയുടേയും അളവുകൾ ഏകദേശ കണക്കുകളാണ്. അവ മാറ്റുന്നതിനും, ഒഴിവാക്കലിനും, കൂട്ടിച്ചേർക്കലിനും വിധേയമാണ്. ഈ വ്യവസ്ഥ പരിപൂർണ്ണമായി അംഗീകരിച്ച് പ്രവൃത്തി പൂർത്തിയാക്കുന്നതിനുള്ള നിരക്കുകളാണ് പ്രവൃത്തി വിവരപ്പട്ടികയിൽ കാണിച്ചിട്ടുള്ളത്. അളവുകളിൽ വ്യത്യാസം വരുമ്പോൾ നിരക്കിൽ വർദ്ധനവ് അനുവദിക്കുന്നതല്ല."
        },
        {
            num: "29",
            title: "പുതിയയിനം പ്രവൃത്തികൾ ചെയ്യൽ",
            desc: "പ്രവൃത്തിയുട തൃപ്തികരമായ പൂർത്തീകരണത്തിന് ആവശ്യമായി വരുന്ന പുതിയയിനം പ്രവൃത്തികൾ കരാറുകാരൻ ചെയ്യേണ്ടതാണ്."
        },
        {
            num: "30",
            title: "പുതിയയിനം പ്രവൃത്തികളുടെ നിരക്കുകൾ",
            desc: "പുതിയയിനം പ്രവൃത്തികളുടെ നിരക്കുകൾ ഈ കരാറുടമ്പടിയിൽ ഉൾക്കൊള്ളിച്ചിട്ടുള്ള പ്രവൃത്തികളുടെ നിരക്കുകൾ തിട്ടപ്പെടുത്തുന്നതിന് അവലംബിച്ചിട്ടുള്ള കേന്ദ്ര പൊതുമരാമത്ത് നിരക്കുകളനുസരിച്ചായിരിക്കും നിശ്ചയിക്കുക. കേന്ദ്ര പൊതുമരാമത്ത് നിരക്കുകൾ ലഭ്യമല്ലാത്ത ഇനങ്ങൾക്ക് ഭൂജല വകുപ്പ് അംഗീകരിച്ചിട്ടുള്ള നിരക്ക്/മാർക്കറ്റ് നിരക്ക് അവലംബിക്കുന്നതാണ്. അംഗീകരിച്ചിട്ടുള്ള ടെണ്ടർ നിരക്ക് പുതിയ ഇനം പ്രവൃത്തികൾക്കും ബാധകമായിരിക്കുന്നതാണ്. പുതിയ ഇനം പ്രവൃത്തികൾക്ക് പ്രത്യേകം കരാറുടമ്പടി വെക്കേണ്ടതാണ്."
        },
        {
            num: "31",
            title: "ഏറ്റം റേറ്റ് പ്രകാരമുള്ള അധിക വ്യവസ്ഥ",
            desc: "ഏറ്റം റേറ്റ് പ്രകാരമുള്ള പ്രവൃത്തികളുടെ സംഗതിയിൽ ഏതെങ്കിലും ഇനം പ്രവൃത്തി അധികമായി ചെയ്യേണ്ടി വരികയാണെങ്കിൽ കരാറുകാരൻ കോട്ട് ചെയ്ത നിരക്കുകൾ പ്രകാരമുള്ള ആകെ തുക പി.എ.സി പ്രകാരമുള്ള തുകയുടെ എത്ര ശതമാനം കുറവാണെന്ന് കണക്കാക്കി അത്രയും ശതമാനം മാത്രമേ എക്സ്ട്രാ ഐറ്റത്തിന്റെ നിരക്കിലും അനുവദിക്കുകയുള്ളൂ."
        },
        {
            num: "32",
            title: "ബിറ്റുമെൻ ഒറിജിനൽ ബില്ലുകൾ",
            desc: "ബിറ്റുമെൻ ഉപയോഗിച്ചുള്ള പ്രവൃത്തികൾക്ക് ബിറ്റുമെൻ വാങ്ങിയതിന്റെ ഒറിജിനൽ ബിൽ കരാറുകാരൻ ലഭ്യമാക്കേണ്ടതാണ്. എന്നാൽ ബില്ലിലെ തുക കരാറുകാരൻ കോട്ട് ചെയ്ത് അംഗീകരിച്ച നിരക്കിനേക്കാൾ കൂടുതലായാലും കുറവായാലും അംഗീകരിക്കപ്പെട്ട നിരക്ക് മാത്രമേ നൽകുകയുള്ളൂ."
        },
        {
            num: "33",
            title: "ഗുണനിലവാര ലാബ് പരിശോധനാ ചെലവുകൾ",
            desc: "പ്രവൃത്തിയുടെ ഗുണനിലവാരം ഉറപ്പാക്കുന്നതിനാവശ്യമായ ലാബ് ടെസ്റ്റുകൾ, മറ്റു പരിശോധനകൾ എന്നിവയ്ക്കാവശ്യമായ ചെലവുകൾ കരാറുകാരൻ തന്നെ വഹിക്കേണ്ടതാണ്."
        },
        {
            num: "34",
            title: "ജി.എസ്.ടി ഫയലിംഗും കമ്പൻസേഷനും",
            desc: "കരാറുകാരന് ജി.എസ്.ടി രജിസ്ട്രേഷൻ ഉണ്ടായിരിക്കേണ്ടതും ബില്ലിനോടൊപ്പം ജി.എസ്.ടി കോമ്പൻസേഷൻ നൽകുന്ന പക്ഷം നിശ്ചിത ഹെഡിൽ ഒടുക്കി വരുത്തി രേഖാമൂലം അറിയിക്കേണ്ടതുമാണ്."
        },
        {
            num: "35",
            title: "സാമഗ്രികളുടെ സംഭരണം",
            desc: "പ്രവൃത്തിക്ക് വേണ്ടി ആവശ്യമായ മുഴുവൻ മെറ്റീരിയൽസും കരാറുകാരൻ തന്നെ സംഭരിക്കേണ്ടതും ആയത് നിശ്ചിത ഗുണനിലവാരം ഉള്ളതാണെന്ന് ബന്ധപ്പെട്ട സൈറ്റ് എഞ്ചിനീയറെ ബോധ്യപ്പെടുത്തേണ്ടതുമാണ്. സർക്കാരിൽ നിന്നും പ്രത്യേക നിർദ്ദേശം ഇല്ലാതെ യാതൊരു സാധനങ്ങളും വകുപ്പ് വാങ്ങി നൽകുന്നതല്ല."
        },
        {
            num: "36",
            title: "വ്യവസ്ഥകൾ വായിച്ചു ബോധ്യപ്പെടൽ",
            desc: "ഈ ഉടമ്പടിയിലെയും പ്രവൃത്തി വിവരപ്പട്ടികയിലെയും എല്ലാ വ്യവസ്ഥകളും അളവുകളും നിരക്കുകളും വായിച്ച് മനസ്സിലാക്കുകയും പരിപൂർണ്ണമായി അംഗീകരിക്കുകയും ചെയ്തിരിക്കുന്നു. അവയ്ക്കനുസരിച്ച് പ്രവൃത്തി പൂർത്തിയാക്കുന്നതാണ്."
        },
        {
            num: "37",
            title: "ഫോം 83 ന്റെ ബാധകത",
            desc: "ഭൂജല വകുപ്പ് ടെണ്ടർ മുഖേന നടപ്പിലാക്കുന്ന കുഴൽ കിണർ നിർമ്മാണ പ്രവൃത്തികളുടെ കാര്യത്തിൽ പ്രസ്തുത ടെണ്ടർ ഡോക്യുമെന്റ് (ഫോം 83) ൽ നിഷ്കർഷിച്ചിട്ടുള്ള കുഴൽ കിണർ നിർമ്മാണവുമായി ബന്ധപ്പെട്ട എല്ലാ നിബന്ധനകളും വായിച്ചു മനസ്സിലാക്കുകയും ആയത് പരിപൂർണ്ണമായി അംഗീകരിക്കുകയും ചെയ്തിരിക്കുന്നു. പ്രസ്തുത നിബന്ധനകൾക്ക് വിധേയമായി പ്രവൃത്തികൾ പൂർത്തീകരിക്കുന്നതാണ്."
        },
        {
            num: "38",
            title: "സെക്യൂരിറ്റി കാലയളവ് / ബാധ്യത കാലയളവ്",
            desc: "ഭൂജല വകുപ്പ് ടെണ്ടർ മുഖേന നടപ്പിലാക്കുന്ന ഈ പ്രവൃത്തിയുടെ സെക്യൂരിറ്റി കാലയളവ്/കരാർ ബാധ്യത കാലയളവ് (Defect Liability Period) പ്രവൃത്തി പൂർത്തിയായ തീയതി മുതൽ ഒരു വർഷം (1 Year) ആണ്. പ്രസ്തുത സെക്യൂരിറ്റി കാലയളവ്/കരാർ ബാധ്യത കാലയളവ് (Defect Liability Period)-ൽ ഈ പ്രവൃത്തിയുമായി ബന്ധപ്പെട്ട് ഉണ്ടാകുന്ന തകരാറുകൾ കരാറുകാരൻ പരിഹരിക്കേണ്ടതും ആയതിന് ആവശ്യമായ ചെലവുകൾ കരാറുകാരൻ വഹിക്കേണ്ടതുമാണ്."
        }
    ];

    const clauses = lang === 'en' ? clausesEn : clausesMl;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div id="work-agreement-container" className="bg-[#f0f0f0] min-h-screen py-8 px-4 no-scrollbar print:p-0 print:bg-white animate-fade-in">
            <style jsx global>{`
                #print-sheet, #print-sheet *:not(.no-print):not(.no-print *) {
                    color: #000000 !important;
                }
                @media print {
                    #work-agreement-container {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    #print-sheet {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        page-break-inside: auto !important;
                    }
                    @page {
                        size: A4;
                        margin: 15mm 15mm 15mm 15mm;
                    }
                    body {
                        background-color: white;
                        color: black;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .page-break {
                        page-break-after: always;
                    }
                    .print-break-before {
                        page-break-before: always !important;
                        break-before: page !important;
                    }
                    p, h2, h3, tr, .space-y-1, .grid {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    #agreement-page-1 {
                        margin: 0 !important;
                        margin-top: ${useStampMargin ? `${stampMargin}cm` : '0'} !important;
                        margin-bottom: 5cm !important;
                        border: ${page1Border ? '2px double rgb(156 163 175)' : 'none'} !important;
                        min-height: auto !important;
                        height: auto !important;
                        max-height: ${useStampMargin ? `calc(297mm - ${stampMargin}cm - 5cm)` : '24.7cm'} !important;
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                        gap: 0.15rem !important;
                        box-sizing: border-box !important;
                        font-size: 11px !important;
                        line-height: 1.1 !important;
                        overflow: hidden !important;
                    }
                    #agreement-page-1 .space-y-6 > * + * {
                        margin-top: 0.2rem !important;
                    }
                    #agreement-page-1 .py-6 {
                        padding-top: 0.2rem !important;
                        padding-bottom: 0.2rem !important;
                    }
                    #agreement-page-1 .p-6 {
                        padding: 0.35rem !important;
                        background-color: transparent !important;
                        border-color: rgb(156 163 175) !important;
                    }
                    #agreement-page-1 .grid {
                        font-size: 9px !important;
                        line-height: 1.2 !important;
                        gap: 0.15rem !important;
                    }
                    #agreement-page-1 .col-span-4, #agreement-page-1 .col-span-8 {
                        font-size: 9px !important;
                    }
                    #agreement-page-1 h1 {
                        font-size: 11px !important;
                    }
                    #agreement-page-1 h2 {
                        font-size: 12px !important;
                    }
                    #agreement-page-1 p {
                        font-size: 9px !important;
                    }
                    #agreement-page-1 .mt-12 {
                        margin-top: 0.25rem !important;
                    }
                    #agreement-page-1 .pt-8 {
                        padding-top: 0.15rem !important;
                    }
                }
            `}</style>
            
            {/* Top Navigation / Actions Bar */}
            <div className="max-w-4xl mx-auto mb-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col gap-4 no-print">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800">
                            Work Agreement - Print Preview
                        </h2>
                        <p className="text-sm text-gray-500 font-mono">
                            Agreement No: {officeAddress?.officeCode || 'GKT'}/{fileNo}/{eTenderNo}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Language Selector */}
                        <div className="flex items-center border rounded-md overflow-hidden bg-gray-50">
                            <Button 
                                variant={lang === 'en' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setLang('en')} 
                                className="rounded-none font-medium text-xs px-3 py-1 h-8"
                            >
                                English
                            </Button>
                            <Button 
                                variant={lang === 'ml' ? 'default' : 'ghost'} 
                                size="sm" 
                                onClick={() => setLang('ml')} 
                                className="rounded-none font-medium text-xs px-3 py-1 h-8 !font-sans"
                            >
                                മലയാളം
                            </Button>
                        </div>

                        <Button onClick={handlePrint} className="flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Print Agreement
                        </Button>
                        <Button variant="outline" onClick={() => window.close()} className="flex items-center gap-2">
                            <X className="h-4 w-4" />
                            Close
                        </Button>
                    </div>
                </div>

                {/* Print Settings Section */}
                <div className="border-t pt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-gray-600 bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                        <span>Print Settings:</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={useStampMargin} 
                            onChange={(e) => setUseStampMargin(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Stamp Paper Spacing ({stampMargin}cm)</span>
                    </label>

                    {useStampMargin && (
                        <div className="flex items-center gap-2">
                            <span>Top Margin (cm):</span>
                            <select 
                                value={stampMargin} 
                                onChange={(e) => setStampMargin(Number(e.target.value))}
                                className="border rounded bg-white px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                {[10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18].map((val) => (
                                    <option key={val} value={val}>{val} cm</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={page1Border} 
                            onChange={(e) => setPage1Border(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                        />
                        <span>Show Outer Border on Page 1</span>
                    </label>
                </div>
            </div>

            {/* Document page body */}
            <div id="print-sheet" className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-md p-12 pr-12 min-h-[297mm] font-serif text-gray-900 leading-relaxed space-y-8 select-none print:shadow-none print:border-none print:p-0 print:space-y-0 relative">
                
                {/* PAGE 1: COVER PAGE */}
                <div 
                    id="agreement-page-1"
                    className={`flex flex-col justify-between p-8 print:p-4 transition-all duration-300 ${
                        page1Border ? 'border-2 border-double border-gray-400' : 'border-0 border-transparent'
                    }`}
                    style={{
                        minHeight: '260mm',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* On-screen Stamp Paper Space Helper */}
                    {useStampMargin && (
                        <div 
                            className="no-print mb-6 border border-dashed border-amber-300 bg-amber-50/50 rounded flex flex-col items-center justify-center text-amber-800 text-xs font-sans md:p-6 p-4 select-none animate-pulse"
                            style={{ height: `${stampMargin}cm` }}
                        >
                            <div className="flex flex-col items-center gap-1 text-center">
                                <span className="font-bold tracking-wider uppercase flex items-center gap-1.5 text-amber-900">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    Stamp Paper Reservation Space ({stampMargin} cm)
                                </span>
                                <span className="text-amber-700 font-medium">This zone will be completely blank on the first printed page to avoid printing over the stamp.</span>
                                <span className="text-[10px] text-amber-500 mt-1">Adjust margin height or toggle via &quot;Print Settings&quot; in the toolbar above.</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="text-center space-y-0">
                            <h1 className="text-lg font-bold tracking-wide">
                                {lang === 'en' ? 'GROUND WATER DEPARTMENT' : 'കേരള സർക്കാർ - ഭൂജല വകുപ്പ്'}
                            </h1>
                            <p className="text-xs tracking-wider text-gray-600 uppercase font-bold">
                                {lang === 'en' ? `DISTRICT OFFICE, ${officeLocation}` : `ജില്ലാ ഓഫീസ്, ${officeLocationMl}`}
                            </p>
                        </div>
                        
                        <div className="border-t-4 border-b border-black py-1">
                            <div className="border-t border-black my-[2px]" />
                        </div>

                        <div className="text-center py-1 space-y-0.5">
                            <h2 className="text-lg font-extrabold tracking-wide uppercase">
                                {lang === 'en' ? 'CONTRACT AGREEMENT DEED' : 'കരാർ ഉടമ്പടി പത്രം'}
                            </h2>
                            <div className="w-1/3 mx-auto h-[1px] bg-black" />
                        </div>

                        {/* Details Box */}
                        <div className="border border-gray-500 bg-[#fbfbfb] px-4 py-0.5 rounded-md space-y-0 shadow-sm">
                            <div className="grid grid-cols-12 gap-y-0 pb-0 text-[18px] leading-tight">
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Agreement No:' : 'ഉടമ്പടി നമ്പർ:'}
                                </div>
                                <div className="col-span-8 font-semibold">
                                    {officeAddress?.officeCode || 'GKT'}/{fileNo}/{eTenderNo}
                                </div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Agreement Date:' : 'ഉടമ്പടി തീയതി:'}
                                </div>
                                <div className="col-span-8 border-b border-gray-400 h-4 font-semibold flex items-end">
                                    {agreementDateFormatted}
                                </div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Contractor Name:' : 'കരാറുകാരന്റെ പേര്:'}
                                </div>
                                <div className="col-span-8 font-semibold">{contractorName}</div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Obligee Address:' : 'മേൽവിലാസം:'}
                                </div>
                                <div className="col-span-8">{contractorAddress}</div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Name of work:' : 'പ്രവൃത്തിയുടെ പേര്:'}
                                </div>
                                <div className="col-span-8 font-bold italic text-[18px] leading-tight">{workName}</div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Estimate PAC:' : 'അടങ്കൽ തുക (Estimate PAC):'}
                                </div>
                                <div className="col-span-8 font-semibold">{estimateAmountFormatted}</div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700">
                                    {lang === 'en' ? 'Accepted Contract PAC:' : 'അംഗീകരിച്ച കരാർ തുക:'}
                                </div>
                                <div className="col-span-8 font-semibold text-green-700">{acceptedAmountFormatted}</div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700 leading-tight">
                                    {lang === 'en' ? 'Performance Guarantee:' : 'പെർഫോമൻസ് ഗ്യാരണ്ടി:'}
                                </div>
                                <div className="col-span-8 border-b border-gray-300 h-6 mt-1"></div>
                                
                                <div className="col-span-4 font-bold uppercase text-gray-700 leading-tight mt-2">
                                    {lang === 'en' ? 'Additional Performance Guarantee:' : 'അഡിഷണൽ പെർഫോമൻസ് ഗ്യാരണ്ടി:'}
                                </div>
                                <div className="col-span-8 border-b border-gray-300 h-6 mt-3"></div>
                            </div>
                        </div>

                        <div id="agreement-signatures" className="w-full flex justify-between items-center px-4 pt-16 pb-1 font-bold text-[14px] bg-white relative z-10 border-t border-gray-400 mt-0.5">
                            <div className="flex flex-col items-start leading-tight">
                                <p className="text-gray-800">
                                    {lang === 'en' ? 'CONTRACTOR:' : 'കരാറുകാരൻ:'} _______________________
                                </p>
                            </div>
                            <div className="flex flex-col items-end leading-tight">
                                <p className="text-gray-800">
                                    {lang === 'en' ? 'DISTRICT OFFICER:' : 'ജില്ലാഓഫീസർ:'} _______________________
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="page-break no-print" />

                {/* MIDDLE PAGES: CLAUSES SECTION */}
                <div id="clauses-section" className="w-full font-serif text-gray-900 leading-relaxed max-w-4xl mx-auto py-1 animate-fade-in relative">
                    <table className="w-full border-collapse border-none">
                        <tfoot className="hidden print:table-footer-group">
                            <tr className="border-none">
                                <td className="p-0 border-none">
                                    {/* Middle Clause Pages Footer */}
                                    <div className="w-full mt-10 pt-4 border-t border-gray-300 flex justify-between items-end font-sans text-[10px] font-bold uppercase">
                                        <div>
                                            {lang === 'en' ? 'CONTRACTOR: _______________________' : 'കരാറുകാരൻ: _______________________'}
                                        </div>
                                        <div>
                                            {lang === 'en' ? 'DISTRICT OFFICER: _______________________' : 'ജില്ലാഓഫീസർ: _______________________'}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                        <tbody className="table-row-group">
                            <tr className="border-none">
                                <td className="p-0 border-none">
                                    <div className="pb-4 border-b border-gray-300 mb-6 flex justify-between items-center text-[10px] font-sans text-gray-500 uppercase tracking-wider">
                                        <span>
                                            {lang === 'en' 
                                                ? `GROUND WATER DEPARTMENT | DISTRICT OFFICE, ${officeLocation.toUpperCase()}`
                                                : `ഭൂജല വകുപ്പ് | ജില്ലാ ഓഫീസ്, ${officeLocationMl.toUpperCase()}`
                                            }
                                        </span>
                                        <span>
                                            {lang === 'en' ? 'Terms & Conditions' : 'കരാർ വ്യവസ്ഥകൾ'}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-center underline text-base uppercase pb-6 tracking-wide text-gray-900 font-serif">
                                        {lang === 'en' 
                                            ? 'TERMS AND CONDITIONS OF CONTRACT' 
                                            : 'കരാറുടമ്പടി വ്യവസ്ഥകൾ'
                                        }
                                    </h3>
                                </td>
                            </tr>

                            {clauses.flatMap((item, idx) => {
                                if (item.num === '7' && lang === 'ml') {
                                    return [
                                        {
                                            num: "7",
                                            desc: "കരാർ ഉടമ്പടി പ്രകാരമുള്ള നിശ്ചിത തീയതിയ്ക്കകം തന്നെ പ്രവൃത്തി പൂർത്തിയാക്കിയിരിക്കേണ്ടതാണ്. മുൻകൂട്ടി കാണാൻ കഴിയാത്ത കാരണങ്ങളാൽ നിശ്ചിത സമയത്തിനുള്ളിൽ പ്രവൃത്തി പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ലെന്ന് ബോധ്യപ്പെടുന്ന പക്ഷം പൂർത്തീകരണ കാലാവധിക്കുള്ളിൽ തന്നെ തീയതി ദീർഘിപ്പിച്ച് ലഭിക്കുന്നതിന് കരാറുകാരൻ നിശ്ചിത ഫോറത്തിൽ അപേക്ഷ സമർപ്പിക്കേണ്ടതാണ്. ഒരു തവണ നിലവിലുള്ള പൂർത്തീകരണ കാലാവധിയുടെ 25 ശതമാനം അല്ലെങ്കിൽ ആറ് മാസം ഇവയിൽ ഏതാണോ കുറവ് ആ കാലാവധി അനുവദിച്ചു നൽകുന്നതാണ്. കരാർ അതോറിറ്റിക്ക് ഒരു ജോലിക്ക് പിഴയില്ലാതെ അനുവദിക്കാവുന്ന പരമാവധി സമയം യഥാർത്ഥ പൂർത്തീകരണ സമയത്തിന്റെ പകുതിയായി (50 ശതമാനം) പരിമിതപ്പെടുത്തിയിരിക്കുന്നു. കരാറുകാരൻറെ ഭാഗത്ത് ഉണ്ടാകുന്ന കാരണങ്ങളാൽ പ്രവൃത്തിയിൽ കാലതാമസം നേരിടുന്ന പക്ഷം കരാറുകാരൻ സമ്മതിച്ച അടങ്കൽ തുകയുടെ (PAC) പരമാവധി 10% ന് വിധേയമായി, ഷെഡ്യൂൾ ചെയ്ത പൂർത്തീകരണ തീയതിക്ക് ശേഷമുള്ള ഓരോ ആഴ്ചയും കാലതാമസത്തിന്, കരാറുകാരൻ സമ്മതിച്ച അടങ്കൽ തുകയുടെ (PAC) 0.1 % പിഴയായി/ലിക്വിഡേറ്റഡ് നാശനഷ്ടങ്ങളായി ചുമത്തും.",
                                            uniqueKey: "7-part-1"
                                        },
                                        {
                                            num: "",
                                            desc: "നിലവിലുള്ള പൂർത്തീകരണ കാലാവധിയുടെ 50 ശതമാനത്തിലധികം സമയം ഒരു കാരണവശാലും ദീർഘിപ്പിച്ചു നൽകുന്നതല്ല. പ്രവൃത്തി ഒഴികെ ഈ കരാർ ഉടമ്പടി പ്രകാരം നടത്തേണ്ട എല്ലാ പ്രവൃത്തികളും കരാർ ഉടമ്പടിയിൽ കാണിച്ചിട്ടുള്ള നിരക്കിൽ പൂർത്തിയാക്കേണ്ടതാണ്. യാതൊരു കാരണവശാലും നിരക്കിൽ വർദ്ധനവോ, വ്യതിയാനമോ അനുവദിക്കുന്നതല്ല. പ്രസ്തുത പ്രവൃത്തി പൂർത്തിയാക്കി അസിസ്റ്റന്റ് എഞ്ചിനീയർ അവസാനത്തെ അളവുകളെടുത്ത് രേഖപ്പെടുത്തുന്ന ദിവസമാണ് പ്രവൃത്തി പൂർത്തിയാക്കിയ ദിവസമായി കണക്കാക്കുക. പ്രസ്തുത തീയതി മുതൽ സർക്കാർ ഉത്തരവ് പ്രകാരം വിവിധ പ്രവൃത്തികൾക്കായി നിഷ്കർഷിച്ചിട്ടുള്ള കാലാവധി ഗ്യാരണ്ടി പിരിയഡ് ആയി കണക്കാക്കുന്നതാണ്. പ്രസ്തുത ഗ്യാരണ്ടി പീരിയഡിനുള്ളിൽ സംഭവിക്കുകയോ കാണുകയോ ചെയ്യുന്ന എല്ലാ തകരാറുകളും സ്വന്തം ചിലവിൽ പരിഹരിക്കുന്നതിന്  കരാറുകാരന് പൂർണ്ണ ഉത്തരവാദിത്തം ഉണ്ടായിരിക്കും. ഈ കാര്യത്തിൽ കരാറുകാരൻ വീഴ്ച വരുത്തുകയാണെങ്കിൽ പ്രവൃത്തിയുടെ തകരാറുകൾ മറ്റൊരു ഏജൻസിയെ കൊണ്ട് പരിഹരിക്കുന്നതും അതിനുവേണ്ടി വരുന്ന ചിലവ് കരാറുകാരൻറെ ജാമ്യ നിക്ഷേപത്തിൽ നിന്ന് ഈടാക്കുന്നതുമാണ്.",
                                            uniqueKey: "7-part-2"
                                        }
                                    ];
                                }
                                return [{ ...item, uniqueKey: item.num }];
                            }).map((item) => (
                                <tr key={item.uniqueKey} className={`border-none ${item.num === '7' ? '' : 'break-inside-avoid'}`}>
                                    <td className="p-0 pb-3 border-none">
                                        <div className="flex items-start gap-2 text-[12px] leading-relaxed text-justify text-gray-800">
                                            <span className="font-bold min-w-[22px] text-right">{item.num ? `${item.num}.` : ''}</span>
                                            <div className="flex-1 pl-1">
                                                <p>{item.desc}</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Print Mask to Cover Table Footer on the Last Page of Clauses (Page 7) */}
                    <div className="print:block hidden bg-white relative z-20 -mt-24 h-24 w-full" />

                    {/* SIGNATURES & WITNESSES BLOCK DIRECTLY UNDER SL. NO. 38 */}
                    <div className="w-full font-serif text-gray-900 leading-loose max-w-4xl mx-auto space-y-6 pt-6 bg-white relative z-10 print:pt-6">
                        <div className="pt-4 text-sm font-bold text-justify">
                            <p>
                                {lang === 'en'
                                    ? 'IN WITNESS WHEREOF the parties hereunto have set their hands and seals on the day and year first above written.'
                                    : 'മേൽപ്പറഞ്ഞ വ്യവസ്ഥകളെല്ലാം ബോധ്യപ്പെട്ടതിന്റെ അടിസ്ഥാനത്തിൽ ഇരു കക്ഷികളും യഥാസമയം ബന്ധപ്പെട്ട സാക്ഷികളുടെ മുൻപാകെ ഈ കരാർ ഉടമ്പടിയിൽ ഒപ്പുവെക്കുന്നു.'
                                }
                            </p>
                        </div>

                        {/* Final Signatures */}
                        <div className="grid grid-cols-2 gap-8 pt-8 border-t">
                            <div className="space-y-4 text-sm">
                                <h4 className="font-bold uppercase">
                                    {lang === 'en' ? 'CONTRACTOR:' : 'കരാറുകാരൻ:'}
                                </h4>
                                <p>{lang === 'en' ? 'Signature:' : 'ഒപ്പ്:'} _______________________</p>
                                <p>{lang === 'en' ? 'Name:' : 'പേര്:'} <span className="font-semibold">{contractorName}</span></p>
                                <p className="leading-relaxed text-gray-800">
                                    {lang === 'en' ? 'Address:' : 'മേൽവിലാസം:'} <span className="font-semibold">{contractorAddress}</span>
                                </p>
                            </div>
                            <div className="space-y-4 text-sm">
                                <h4 className="font-bold uppercase">
                                    {lang === 'en' ? 'DISTRICT OFFICER:' : 'ജില്ലാ ഓഫീസർ:'}
                                </h4>
                                <p>{lang === 'en' ? 'Signature:' : 'ഒപ്പ്:'} _______________________</p>
                                <p>{lang === 'en' ? 'GROUND WATER DEPARTMENT' : 'ഭൂജല വകുപ്പ്'}</p>
                                <div className="space-y-1">
                                    <p className="font-semibold">{lang === 'en' ? 'Office Address:' : 'ആഫീസ് വിലാസം:'}</p>
                                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                                        {lang === 'en' 
                                            ? (officeAddress?.address || 'District Office, Ground Water Department') 
                                            : (officeAddress?.addressMalayalam || (officeAddress?.officeLocation?.toLowerCase() === 'kottayam' ? 'ഭൂജല വകുപ്പ് ജില്ലാ ഓഫീസ്, കോട്ടയം' : 'ഭൂജല വകുപ്പ് ജില്ലാ ഓഫീസ്, കൊല്ലം'))
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Witness Details */}
                        <div className="pt-8 space-y-4 text-sm border-t break-inside-avoid">
                            <h4 className="font-bold uppercase">
                                {lang === 'en' ? 'In the presence of Witnesses:' : 'സാക്ഷികളുടെ സാന്നിധ്യത്തിൽ:'}
                            </h4>
                            <div className="space-y-6 pl-2 text-[13px]">
                                <div className="space-y-2">
                                    <div className="flex items-end gap-2">
                                        <span className="font-semibold whitespace-nowrap">1. {lang === 'en' ? 'Name & Address:' : 'പേരും വിലാസവും:'}</span>
                                        <span className="flex-1 border-b border-gray-400 mb-1 min-h-[20px]" />
                                    </div>
                                    <div className="flex items-end gap-2 pl-4">
                                        <span className="text-gray-500 whitespace-nowrap">{lang === 'en' ? 'Signature:' : 'ഒപ്പ്:'}</span>
                                        <span className="w-56 border-b border-gray-400 mb-1 min-h-[20px]" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-end gap-2">
                                        <span className="font-semibold whitespace-nowrap">2. {lang === 'en' ? 'Name & Address:' : 'പേരും വിലാസവും:'}</span>
                                        <span className="flex-1 border-b border-gray-400 mb-1 min-h-[20px]" />
                                    </div>
                                    <div className="flex items-end gap-2 pl-4">
                                        <span className="text-gray-500 whitespace-nowrap">{lang === 'en' ? 'Signature:' : 'ഒപ്പ്:'}</span>
                                        <span className="w-56 border-b border-gray-400 mb-1 min-h-[20px]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
