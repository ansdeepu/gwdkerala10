// src/app/dashboard/e-tender/[id]/print/page.tsx
"use client";

import React, { useEffect } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, formatTenderNoForFilename } from '@/components/e-tender/utils';
import { useDataStore } from '@/hooks/use-data-store';

export default function TenderPrintPage() {
    const { tender } = useTenderData();
    const { officeAddress } = useDataStore();

    useEffect(() => {
        if (tender) {
            const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
            document.title = `aNIT${formattedTenderNo}`;
        }
    }, [tender]);

    return (
        <div className="bg-white text-black p-8 font-serif">
            <div className="max-w-4xl mx-auto border-2 border-black p-12 space-y-12">
                <h1 className="text-xl font-bold text-center mb-1">GROUND WATER DEPARTMENT</h1>
                <h2 className="text-lg font-bold text-center mb-4 underline">NOTICE INVITING TENDER</h2>
                
                <div className="text-sm flex justify-between">
                    <p>No: {tender.fileNo ? `${officeAddress?.officeCode || 'GKT'}/${tender.fileNo}` : '__________'}</p>
                    <p>Date: {formatDateSafe(tender.tenderDate) || '__________'}</p>
                </div>
                
                <p className="text-sm leading-relaxed mb-4 text-justify">
                    The Executive Engineer, Ground Water Department, {officeAddress?.officeLocation || ''}, for and on behalf of the Governor of Kerala invites online tenders from registered bidders of the Ground Water Department for the work specified below.
                </p>

                <table className="w-full border-collapse border border-black text-sm mb-6">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="w-1/3 p-2 border-r border-black font-semibold align-top">Name of Work</td>
                            <td className="w-2/3 p-2">{tender.nameOfWork || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="p-2 border-r border-black font-semibold align-top">Location of Work</td>
                            <td className="p-2">{tender.location || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="p-2 border-r border-black font-semibold align-top">Tender Amount (P.A.C)</td>
                            <td className="p-2">₹{tender.estimateAmount?.toLocaleString('en-IN') || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="p-2 border-r border-black font-semibold align-top">Earnest Money Deposit (EMD)</td>
                            <td className="p-2">₹{tender.emd?.toLocaleString('en-IN') || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="p-2 border-r border-black font-semibold align-top">Tender Submission Fee</td>
                            <td className="p-2">₹{tender.tenderFormFee?.toLocaleString('en-IN') || 'N/A'} + GST</td>
                        </tr>
                         <tr className="border-b border-black">
                            <td className="p-2 border-r border-black font-semibold align-top">Period of Completion</td>
                            <td className="p-2">{tender.periodOfCompletion || 'N/A'} days</td>
                        </tr>
                         <tr className="border-b border-black">
                            <td className="p-2 border-r border-black font-semibold align-top">Last date and time of receipt of tender</td>
                            <td className="p-2">{formatDateSafe(tender.dateTimeOfReceipt, true) || 'N/A'}</td>
                        </tr>
                        <tr>
                            <td className="p-2 border-r border-black font-semibold align-top">Date and time of opening of tender</td>
                            <td className="p-2">{formatDateSafe(tender.dateTimeOfOpening, true) || 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div className="text-sm space-y-4 leading-relaxed text-justify">
                    <p>
                        Tender documents and any other details can be obtained from the website <a href="http://www.etenders.kerala.gov.in" className="underline text-blue-800">www.etenders.kerala.gov.in</a>.
                        All bid/tender documents are to be submitted online only and in the designated cover(s)/envelope(s) on the website. Tenders/bids shall be accepted only through online mode on the website and no manual submission of the same shall be entertained. Late tenders will not be accepted.
                    </p>
                    <p>
                        The tenderer should have registration with the Ground Water Department, Kerala. Unregistered bidders can also participate in the tender by obtaining a temporary registration from the department. For this, they should submit an application for temporary registration online. The temporary registration will be valid for a specific tender only.
                    </p>
                    <p>
                        Further details, if any, can be had from the Office of the undersigned during office hours. All other existing conditions related to e-tendering of the department will be applicable to this tender also.
                    </p>
                </div>
                
                <div className="mt-20 text-right">
                    <p className="font-semibold">Executive Engineer</p>
                </div>
            </div>
        </div>
    );
}

    