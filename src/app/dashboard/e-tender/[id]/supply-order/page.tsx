
// src/app/dashboard/e-tender/[id]/supply-order/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, formatTenderNoForFilename } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';
import type { StaffMember } from '@/lib/schemas';
import { numberToWords } from '@/components/e-tender/pdf/generators/utils';
import { Button } from '@/components/ui/button';

export default function SupplyOrderPrintPage() {
    const { tender } = useTenderData();
    const { officeAddress, allStaffMembers } = useDataStore();

    useEffect(() => {
        if (tender) {
            const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
            document.title = `eSupplyOrder${formattedTenderNo}`;
        }
    }, [tender]);

    const l1Bidder = useMemo(() => {
        if (!tender.bidders || tender.bidders.length === 0) return null;
        const validBidders = tender.bidders.filter(b => b.status === 'Accepted' && typeof b.quotedAmount === 'number' && b.quotedAmount > 0);
        if (validBidders.length === 0) return null;
        return validBidders.reduce((lowest, current) =>
            (current.quotedAmount! < lowest.quotedAmount!) ? current : lowest
        );
    }, [tender.bidders]);

    const hasRejectedBids = useMemo(() => tender.bidders?.some(b => b.status === 'Rejected'), [tender.bidders]);
    const contractAmount = (hasRejectedBids && tender.agreedAmount) ? tender.agreedAmount : l1Bidder?.quotedAmount;
    
    const measurer = allStaffMembers.find(s => s.name === tender.nameOfAssistantEngineer);
    const supervisor1 = allStaffMembers.find(s => s.id === tender.supervisor1Id);
    const supervisor2 = allStaffMembers.find(s => s.id === tender.supervisor2Id);
    const supervisor3 = allStaffMembers.find(s => s.id === tender.supervisor3Id);

    const quotedAmountInWords = contractAmount ? numberToWords(Math.floor(contractAmount)) : '';
    const supplySupervisors = [
        measurer?.name,
        supervisor1?.name,
        supervisor2?.name,
        supervisor3?.name,
    ].filter(Boolean).join(', ');
    const supplySupervisorPhone = measurer?.phoneNo || supervisor1?.phoneNo || supervisor2?.phoneNo || supervisor3?.phoneNo;
    const supervisorDetailsText = `${supplySupervisors}${supplySupervisorPhone ? ` (Phone: ${supplySupervisorPhone})` : ''}`;


    return (
        <div className="-m-6 bg-white min-h-screen">
          <div className="max-w-5xl mx-auto p-12 text-black font-mono text-base">
            {/* Page 1 */}
            <div className="space-y-6">
                <div className="flex justify-between">
                    <div>
                        <p>File No. {officeAddress?.officeCode || 'GKT'}/{tender.fileNo || '__________'}</p>
                        <p>Tender No. {tender.eTenderNo || '__________'}</p>
                    </div>
                    <div className="text-right">
                        <p>Office of the District Officer</p>
                        <p>Ground Water Department</p>
                        <p>{officeAddress?.address || ''}</p>
                        <p>Phone: {officeAddress?.phoneNo || ''}</p>
                        <p>Email: {officeAddress?.email || ''}</p>
                        <p>Date: {formatDateSafe(tender.dateWorkOrder) || '__________'}</p>
                    </div>
                </div>
                
                 <div className="pt-2">
                    <p>From</p>
                    <p className="ml-8">District Officer</p>
                </div>
                 <div className="pt-2">
                    <p>To</p>
                    <div className="ml-8">
                        <p>{l1Bidder?.name || '____________________'}</p>
                        <p className="whitespace-pre-wrap">{l1Bidder?.address || '____________________'}</p>
                    </div>
                </div>
                <p>Sir,</p>
                <div className="flex space-x-4">
                    <span>Sub:</span>
                    <p className="text-justify leading-relaxed">GWD, {officeAddress?.officeLocation || ''} - {tender.nameOfWork} - Supply Order issued – reg.</p>
                </div>
                <div className="flex space-x-4">
                    <span>Ref:</span>
                    <div className="flex-1">
                        <p>1. 	e-Tender Notice of this office, {tender.eTenderNo || '__________'}, dated {formatDateSafe(tender.tenderDate) || '__________'}.</p>
                        <p>2.	Supply Agreement No. {tender.eTenderNo || '__________'}, dated {formatDateSafe(tender.agreementDate) || '__________'}.</p>
                    </div>
                </div>
                <p className="text-justify leading-relaxed indent-8">As per the 1st reference cited above, e-tender was invited for the purchase of {tender.nameOfWork}.</p>
                <p className="text-justify leading-relaxed indent-8">Vide the 2nd reference cited, {l1Bidder?.name || 'N/A'}, {l1Bidder?.address || 'N/A'}, submitted the lowest bid of Rs. {contractAmount?.toLocaleString('en-IN') || '0.00'}/- (Rupees {quotedAmountInWords} only) for the aforesaid purchase. Your bid was accepted accordingly.</p>
                <p className="text-justify leading-relaxed indent-8">You are therefore directed to supply the items as per the schedule and specifications mentioned in the e-tender, and complete the supply within the stipulated period of {tender.periodOfCompletion || '___'} days under the supervision of {supervisorDetailsText}. Thereafter, you shall submit the bill in triplicate to this office for processing of payment.</p>
                
                 <div className="pt-2 text-right">
                  <div className="h-12" />
                  <p className="font-semibold">District Officer</p>
                </div>
                
                <div className="pt-2 text-base">
                  <p>Copy to:</p>
                  <p>1.	File</p>
                  <p>2.	OC</p>
                </div>
            </div>

            {/* Page 2 */}
            <div className="space-y-6 print:break-before-page pt-12">
                <div className="text-center">
                    <h2 className="font-bold underline">Special Conditions</h2>
                    <ol className="list-decimal list-inside text-left mt-2 space-y-1">
                        <li>The entire supply shall be completed within 15 days from the date of receipt of this order.</li>
                        <li>No advance payment will be made for the entire supply of items.</li>
                    </ol>
                </div>
                 <div className="text-center">
                    <h2 className="font-bold underline">Notes</h2>
                    <ol className="list-decimal list-inside text-left mt-2 space-y-2 text-justify">
                        <li>INVOICES IN TRIPLICATE SHOULD BE DRAWN ON AND FORWARDED FOR PAYMENT TO The District Officer, District Office, Groundwater Department, {officeAddress?.address || ''}.</li>
                        <li>Acknowledgment and all other communications regarding this purchase may be sent to the District Officer.</li>
                        <li>In all future correspondence and bills relating to this order the number and date at the top should INVARIABLY be quoted.</li>
                        <li>The payment will be paid for only after getting the satisfactory report from supervisory staff of this office.</li>
                    </ol>
                </div>
                <div className="text-center pt-4">
                    <h2 className="font-bold underline">List of items to be supplied</h2>
                     <table className="w-full mt-2 border-collapse border border-black">
                        <thead>
                            <tr className="border border-black">
                                <th className="border border-black p-1">Item No</th>
                                <th className="border border-black p-1">Description of item</th>
                                <th className="border border-black p-1">Quantity</th>
                                <th className="border border-black p-1">Unit</th>
                                <th colSpan={2} className="border border-black p-1">Rates</th>
                                <th colSpan={2} className="border border-black p-1">Total</th>
                            </tr>
                            <tr className="border border-black">
                              <th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th><th className="border border-black p-1"></th>
                              <th className="border border-black p-1">Rs.</th><th className="border border-black p-1">Ps.</th>
                              <th className="border border-black p-1">Rs.</th><th className="border border-black p-1">Ps.</th>
                            </tr>
                             <tr className="border border-black text-center"><th className="border border-black p-1">1</th><th className="border border-black p-1">2</th><th className="border border-black p-1">3</th><th className="border border-black p-1">4</th><th colSpan={2} className="border border-black p-1">5</th><th colSpan={2} className="border border-black p-1"></th></tr>
                        </thead>
                        <tbody>
                            <tr className="border border-black">
                                <td className="border border-black p-1 text-center">1</td>
                                <td className="border border-black p-1 text-left">{tender.nameOfWork}</td>
                                <td className="border border-black p-1 text-center"></td>
                                <td className="border border-black p-1 text-center"></td>
                                <td colSpan={2} className="border border-black p-1 text-center">-</td>
                                <td colSpan={2} className="border border-black p-1 text-center">Rs. {contractAmount?.toLocaleString('en-IN') || ''}/-</td>
                            </tr>
                            <tr className="border-t border-black">
                                <td colSpan={6} className="text-right p-1 font-bold">Total (Rounded to)</td>
                                <td colSpan={2} className="p-1 text-center font-bold">Rs. {contractAmount?.toLocaleString('en-IN') || ''}/-</td>
                            </tr>
                            <tr>
                                <td colSpan={8} className="p-2 text-center font-bold">(Rupees {quotedAmountInWords} only)</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-sm text-left mt-2">N.B: The specifications, quantities, price, etc., are subject to correction. Errors or omissions, if any, will be intimated to or by the contractor within ten days from this date.</p>
                </div>
                <div className="pt-24 text-right">
                    <span>District officer</span>
                </div>
            </div>
          </div>
            <div className="fixed bottom-4 right-4 no-print">
                <Button onClick={() => window.print()}>Print</Button>
            </div>
        </div>
    );
}
