// src/components/e-tender/pdf/PdfReportDialogs.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useTenderData } from '../TenderDataContext';
import download from 'downloadjs';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useDataStore } from '@/hooks/use-data-store';
import type { OfficeAddress } from '@/lib/schemas';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// Import the new generator functions
import { generateNIT } from './generators/nitGenerator';
import { generateTenderForm } from './generators/tenderFormGenerator';
import { generateBidOpeningSummary } from './generators/bidOpeningSummaryGenerator';
import { generateTechnicalSummary } from './generators/technicalSummaryGenerator';
import { generateFinancialSummary } from './generators/financialSummaryGenerator';
import { generateRetenderCorrigendum } from './generators/retenderCorrigendumGenerator';
import { generateDateExtensionCorrigendum } from './generators/dateExtensionCorrigendumGenerator';
import { generateCancelCorrigendum } from './generators/cancelCorrigendumGenerator';
import type { Corrigendum, StaffMember, RetenderDetails } from '@/lib/schemas';
import { formatTenderNoForFilename } from '../utils';
import type { E_tender } from '@/hooks/useE_tenders';


const ReportButton = ({
  label,
  onClick,
  disabled,
  href,
  tooltipContent,
}: {
  label: string;
  onClick?: () => Promise<void> | void; // Allow non-async onClick
  disabled?: boolean;
  href?: string;
  tooltipContent?: React.ReactNode;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onClick) return;
    setIsLoading(true);
    await onClick();
    setIsLoading(false);
  };
  
  const buttonContent = (
      <Button onClick={handleClick} variant="outline" className="justify-start w-full" disabled={disabled || isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {label}
      </Button>
  );

  const renderButton = () => {
    if (href) {
        return <Link href={href} passHref target="_blank" rel="noopener noreferrer" className={disabled ? 'pointer-events-none' : ''}>{buttonContent}</Link>;
    }
    return buttonContent;
  };

  if (disabled && tooltipContent) {
    return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">{renderButton()}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipContent}</p>
          </TooltipContent>
        </Tooltip>
    );
  }

  return renderButton();
};

const CorrigendumReportButton = ({ corrigendum, index }: { corrigendum: Corrigendum, index: number }) => {
    const { tender } = useTenderData();
    const [isLoading, setIsLoading] = useState(false);
    const { officeAddress } = useDataStore();

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            let pdfBytes: Uint8Array;
            let fileNamePrefix: string = '';
            
            switch (corrigendum.corrigendumType) {
                case 'Retender':
                    pdfBytes = await generateRetenderCorrigendum(tender, corrigendum, officeAddress);
                    fileNamePrefix = 'RetenderCorrigendum';
                    break;
                case 'Date Extension':
                    pdfBytes = await generateDateExtensionCorrigendum(tender, corrigendum, officeAddress);
                    fileNamePrefix = 'DateCorrigendum';
                    break;
                case 'Cancel':
                    pdfBytes = await generateCancelCorrigendum(tender, corrigendum, officeAddress);
                    fileNamePrefix = 'CancelCorrigendum';
                    break;
                default:
                    toast({ title: "Generation Not Supported", description: `PDF generation for type '${corrigendum.corrigendumType}' is not implemented.`, variant: 'destructive' });
                    setIsLoading(false);
                    return;
            }

            const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
            const corrigendumIndex = corrigendum.corrigendumType === 'Retender' ? '' : `${index + 1}`;
            const fileName = `${fileNamePrefix}${corrigendumIndex}${formattedTenderNo}.pdf`;

            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: "Corrigendum report has been downloaded." });

        } catch (error: any) {
            console.error("Corrigendum PDF Generation Error:", error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button variant="outline" className="justify-start w-full" onClick={handleGenerate} disabled={isLoading || !corrigendum.corrigendumType}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Corrigendum No. {index + 1} ({corrigendum.corrigendumType})
        </Button>
    );
};


export default function PdfReportDialogs() {
    const { tender } = useTenderData();
    const { allStaffMembers, officeAddress } = useDataStore();

    const handleGeneratePdf = useCallback(async (
        generator: (tender: E_tender, officeAddress: OfficeAddress | null, staff?: StaffMember[]) => Promise<Uint8Array>,
        fileName: string,
        successMessage: string,
        tenderDataOverride?: Partial<E_tender>
    ) => {
        try {
            const finalTenderData = { ...tender, ...tenderDataOverride };
            const pdfBytes = await generator(finalTenderData, officeAddress, allStaffMembers);
            download(pdfBytes, fileName, 'application/pdf');
            toast({ title: "PDF Generated", description: successMessage });
        } catch (error: any) {
            console.error(`${fileName} Generation Error:`, error);
            toast({ title: "PDF Generation Failed", description: error.message, variant: 'destructive', duration: 9000 });
        }
    }, [tender, allStaffMembers, officeAddress]);
    
    const handleDirectDownload = () => {
        if (!tender.detailedEstimateUrl) return;
        window.open(tender.detailedEstimateUrl, '_blank');
    };

    const isTenderSaved = tender.id !== 'new';
    const hasOpeningDetails = !!tender.dateOfOpeningBid;
    const hasBidders = (tender.bidders || []).length > 0;
    const hasSelectionNotice = !!tender.selectionNoticeDate;
    const hasWorkOrder = !!tender.agreementDate;
    const hasDetailedEstimate = !!tender.detailedEstimateUrl;
    const hasRetenders = (tender.retenders || []).length > 0;

    const workOrderButtonLabel = tender.tenderType === 'Work'
        ? 'Work Order'
        : tender.tenderType === 'Purchase'
        ? 'Supply Order'
        : 'Work / Supply Order';
        
    const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);

    return (
        <Card>
            <CardHeader>
                <CardTitle>PDF Reports Generation</CardTitle>
                <CardDescription>Generate and download PDF documents for this tender.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <TooltipProvider>
                    <div className="pt-4 mt-4 border-t">
                        <h4 className="text-sm font-semibold mb-2 text-primary">Tender PDF Reports</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ReportButton 
                                label="Detailed Estimate"
                                onClick={handleDirectDownload}
                                disabled={!isTenderSaved || !hasDetailedEstimate}
                                tooltipContent={!isTenderSaved ? "Save the tender first." : "Add a Detailed Estimate URL in Basic Details."}
                            />
                            <ReportButton 
                                label="Notice Inviting Tender (NIT)"
                                onClick={() => handleGeneratePdf(generateNIT, `aNIT${formattedTenderNo}.pdf`, 'Your Notice Inviting Tender has been downloaded.')}
                                disabled={!isTenderSaved}
                                tooltipContent="Save the Basic Details first to enable."
                            />
                            <ReportButton 
                                label="Tender Form"
                                onClick={() => handleGeneratePdf(generateTenderForm, `bTenderForm${formattedTenderNo}.pdf`, 'Your Tender Form has been downloaded.')}
                                disabled={!isTenderSaved}
                                tooltipContent="Save the Basic Details first to enable."
                            />
                        </div>
                    </div>
                    
                    <div className="pt-4 mt-4 border-t">
                         <h4 className="text-sm font-semibold mb-2 text-primary">Corrigendum PDF Reports</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(tender.corrigendums?.length || 0) > 0 ? (
                                tender.corrigendums?.map((corr, index) => (
                                    <CorrigendumReportButton key={corr.id} corrigendum={corr} index={index} />
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic col-span-full">No corrigendums created for this tender.</p>
                            )}
                         </div>
                    </div>

                    {hasRetenders && (
                        <div className="pt-4 mt-4 border-t space-y-3">
                            <h4 className="text-sm font-semibold mb-2 text-primary">Retender PDF Reports</h4>
                            {(tender.retenders || []).map((retender, index) => (
                                <div key={retender.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2 border rounded-md bg-secondary/30">
                                    <h5 className="text-sm font-semibold shrink-0">Re-Tender No. {index + 1}</h5>
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <ReportButton 
                                            label="Notice Inviting Tender (NIT)"
                                            onClick={() => handleGeneratePdf(generateNIT, `Retender_NIT_${index+1}${formattedTenderNo}.pdf`, 'Retender NIT downloaded.', { tenderDate: retender.retenderDate, dateTimeOfReceipt: retender.lastDateOfReceipt, dateTimeOfOpening: retender.dateOfOpeningTender })}
                                        />
                                        <ReportButton 
                                            label="Tender Form"
                                            onClick={() => handleGeneratePdf(generateTenderForm, `Retender_Form_${index+1}${formattedTenderNo}.pdf`, 'Retender Form downloaded.', { tenderDate: retender.retenderDate, dateTimeOfReceipt: retender.lastDateOfReceipt, dateTimeOfOpening: retender.dateOfOpeningTender })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="pt-4 mt-4 border-t">
                        <h4 className="text-sm font-semibold mb-2 text-primary">Bid Opening PDF Reports</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ReportButton 
                                label="Bid Opening Summary"
                                onClick={() => handleGeneratePdf(generateBidOpeningSummary, `aBidOpening${formattedTenderNo}.pdf`, 'Your Bid Opening Summary has been downloaded.')}
                                disabled={!hasOpeningDetails || !hasBidders}
                                tooltipContent={!hasOpeningDetails ? "Add Tender Opening Details first." : "Add at least one bidder first."}
                            />
                            <ReportButton
                                label="Technical Summary"
                                onClick={() => handleGeneratePdf(generateTechnicalSummary, `bTechEvaluation${formattedTenderNo}.pdf`, 'Your Technical Summary has been downloaded.')}
                                disabled={!hasOpeningDetails || !hasBidders}
                                tooltipContent={!hasOpeningDetails ? "Add Tender Opening Details first." : "Add at least one bidder first."}
                            />
                            <ReportButton
                                label="Financial Summary"
                                onClick={() => handleGeneratePdf(generateFinancialSummary, `cFinEvaluation${formattedTenderNo}.pdf`, 'Your Financial Summary has been downloaded.')}
                                disabled={!hasOpeningDetails || !hasBidders}
                                tooltipContent={!hasOpeningDetails ? "Add Tender Opening Details first." : "Add at least one bidder first."}
                            />
                            <ReportButton 
                                label="Selection Notice"
                                href={tender.id ? `/dashboard/e-tender/${tender.id}/selection-notice` : '#'}
                                disabled={!isTenderSaved || !hasSelectionNotice}
                                tooltipContent={!isTenderSaved ? "Save the tender first." : "Add Selection Notice Details first."}
                            />
                            <ReportButton 
                                label="Work Agreement"
                                href={tender.id ? `/dashboard/e-tender/${tender.id}/work-agreement` : '#'}
                                disabled={!isTenderSaved || !hasSelectionNotice}
                                tooltipContent={!isTenderSaved ? "Save the tender first." : "Add Selection Notice Details first."}
                            />
                            <ReportButton 
                                label={workOrderButtonLabel}
                                href={tender.id && tender.tenderType ? `/dashboard/e-tender/${tender.id}/${tender.tenderType === 'Work' ? 'work-order' : 'supply-order'}` : '#'}
                                disabled={!isTenderSaved || !hasWorkOrder || !tender.tenderType}
                                tooltipContent={!isTenderSaved ? "Save the tender first." : !hasWorkOrder ? "Add Work Order Details first." : "Select a 'Type of Tender' in Basic Details."}
                            />
                        </div>
                    </div>

                </TooltipProvider>
            </CardContent>
        </Card>
    );
}
