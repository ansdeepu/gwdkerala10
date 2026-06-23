// src/app/dashboard/e-tender/[id]/selection-notice/page.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useTenderData } from '@/components/e-tender/TenderDataContext';
import { formatDateSafe, formatTenderNoForFilename, toDateOrNull } from '@/components/e-tender/utils';
import { useDataStore, defaultRateDescriptions } from '@/hooks/use-data-store';
import { Button } from '@/components/ui/button';
import { usePageHeader } from '@/hooks/usePageHeader';
import { isValid } from 'date-fns';

const parseStampPaperLogic = (description: string) => {
    const rateBasisMatch = description.match(/([\d,]+)\s*(?:for every|per)\s*[₹Rs\.]?\s*([\d,]+)/i);
    const minMatch = description.match(/(?:minimum|min)(?:\s*of)?\s*[₹Rs\.]?\s*([\d,]+)/i);
    const maxMatch = description.match(/(?:maximum|max)(?:\s*of)?\s*[₹Rs\.]?\s*([\d,]+)/i);
    
    const parseNumber = (str: string | undefined) => str ? parseInt(str.replace(/,/g, ''), 10) : undefined;

    const result = {
        rate: rateBasisMatch ? parseNumber(rateBasisMatch[1]) : 100,
        basis: rateBasisMatch ? parseNumber(rateBasisMatch[2]) : 100000,
        min: minMatch ? parseNumber(minMatch[1]) : 200,
        max: maxMatch ? parseNumber(maxMatch[1]) : 100000,
    };

    if (result.rate === 1 && result.basis === 100000) {
        result.rate = 100;
    }

    return result;
};

const parseAdditionalPerformanceGuaranteeLogic = (description: string) => {
    const moreThanMatch = description.match(/more than ([\d.]+)%/);
    const apgRequiredThresholdMatch = description.match(/between\s+([\d.]+)%\s+and\s*([\d.]+)%/);
    const noApgThresholdMatch = description.match(/up to ([\d.]+)%/);

    if (moreThanMatch) return { threshold: parseFloat(moreThanMatch[1]) / 100 };
    if (apgRequiredThresholdMatch) return { threshold: parseFloat(apgRequiredThresholdMatch[1]) / 100 };
    if (noApgThresholdMatch) return { threshold: parseFloat(noApgThresholdMatch[1]) / 100 };
    
    return { threshold: 0.15 }; 
};

export default function SelectionNoticePrintPage() {
    const { tender } = useTenderData();
    const { officeAddress, allRateDescriptions } = useDataStore();
    const { setHeader } = usePageHeader();

    useEffect(() => {
        if (tender) {
            const formattedTenderNo = formatTenderNoForFilename(tender.eTenderNo);
            document.title = `dSelectionNotice${formattedTenderNo}`;
            setHeader("Selection Notice", `Print preview for Tender No: ${tender.eTenderNo}`);
        }
    }, [tender, setHeader]);
    
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

    // --- Dynamic Calculation Logic ---
    
    const stampPaperDescription = useMemo(() => {
        return tender?.stampPaperDescription || allRateDescriptions.stampPaper || defaultRateDescriptions.stampPaper;
    }, [tender?.stampPaperDescription, allRateDescriptions.stampPaper]);

    const performanceGuaranteeDescription = useMemo(() => {
        return tender?.performanceGuaranteeDescription || allRateDescriptions.performanceGuarantee || defaultRateDescriptions.performanceGuarantee;
    }, [tender?.performanceGuaranteeDescription, allRateDescriptions.performanceGuarantee]);

    const additionalPerformanceGuaranteeDescription = useMemo(() => {
        return tender?.additionalPerformanceGuaranteeDescription || allRateDescriptions.additionalPerformanceGuarantee || defaultRateDescriptions.additionalPerformanceGuarantee;
    }, [tender?.additionalPerformanceGuaranteeDescription, allRateDescriptions.additionalPerformanceGuarantee]);

    const calculatedStampPaperValue = useMemo(() => {
        const logic = parseStampPaperLogic(stampPaperDescription);
        const { rate, basis, min, max } = logic;
        if (!contractAmount || contractAmount <= 0) return min ?? 0;
        
        const duty = Math.ceil(contractAmount / (basis || 100000)) * (rate || 100); 
        const roundedDuty = Math.ceil(duty / 100) * 100;
        return Math.max(min ?? 0, Math.min(roundedDuty, max ?? Infinity));
    }, [stampPaperDescription, contractAmount]);

    const apgThreshold = useMemo(() => {
        const logic = parseAdditionalPerformanceGuaranteeLogic(additionalPerformanceGuaranteeDescription);
        return logic.threshold;
    }, [additionalPerformanceGuaranteeDescription]);
    
    const isApgRequired = useMemo(() => {
        if (!tender.estimateAmount || !contractAmount) return false;
        if (contractAmount >= tender.estimateAmount) return false;
        const percentageDifference = (tender.estimateAmount - contractAmount) / tender.estimateAmount;
        return percentageDifference > apgThreshold;
    }, [tender.estimateAmount, contractAmount, apgThreshold]);

    const performanceGuarantee = useMemo(() => {
        if (!contractAmount) return tender.performanceGuaranteeAmount ?? 0;
        return Math.ceil((contractAmount * 0.05) / 100) * 100;
    }, [contractAmount, tender.performanceGuaranteeAmount]);

    const additionalPerformanceGuarantee = useMemo(() => {
        if (!isApgRequired || !tender.estimateAmount || !contractAmount) return tender.additionalPerformanceGuaranteeAmount ?? 0;
        const excessPercentage = ((tender.estimateAmount - contractAmount) / tender.estimateAmount) - apgThreshold;
        const apg = excessPercentage * tender.estimateAmount;
        return Math.ceil(apg / 100) * 100;
    }, [isApgRequired, tender.estimateAmount, contractAmount, apgThreshold, tender.additionalPerformanceGuaranteeAmount]);

    const stampPaperValue = useMemo(() => {
        // Prefer calculated value to ensure correctness even if stale in DB
        return calculatedStampPaperValue;
    }, [calculatedStampPaperValue]);
    
    const excessPercentageText = useMemo(() => {
        if (!isApgRequired || !tender.estimateAmount || !contractAmount) return '0';
        const percentageDifference = (tender.estimateAmount - contractAmount) / tender.estimateAmount;
        const excessPercentage = (percentageDifference - apgThreshold) * 100;
        return excessPercentage.toFixed(2);
    }, [isApgRequired, tender.estimateAmount, contractAmount, apgThreshold]);


    const MainContent = () => {
        const workName = tender.nameOfWorkMalayalam || tender.nameOfWork;
        
        if (!l1Bidder && !tender.agreedAmount) {
            return <p className="leading-relaxed text-justify indent-8">ടെണ്ടർ അംഗീകരിച്ചു. ദയവായി മറ്റ് വിവരങ്ങൾ ചേർക്കുക.</p>
        }

        const quotedAmountStr = (contractAmount ?? 0).toLocaleString('en-IN');
        const performanceGuaranteeStr = performanceGuarantee.toLocaleString('en-IN');
        const stampPaperValueStr = stampPaperValue.toLocaleString('en-IN');

        if (isApgRequired) {
            const additionalPerformanceGuaranteeStr = additionalPerformanceGuarantee.toLocaleString('en-IN');

            return (
                 <p className="leading-relaxed text-justify indent-8">
                    മേൽ സൂചന പ്രകാരം {workName} നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന് മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെർഫോമൻസ് ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന <span className="font-semibold">{quotedAmountStr}/-</span> രൂപയുടെ <span className="font-semibold">5%</span> തുകയായ <span className="font-semibold">{performanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായും, അഡിഷണൽ പെർഫോമൻസ് ഗ്യാരന്റിയായി എസ്റ്റിമേറ്റ് തുകയുടെ <span className="font-semibold">{excessPercentageText}%</span> തുകയായ <span className="font-semibold">{additionalPerformanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായും ഈ ഓഫീസിൽ കെട്ടിവയ്ക്കുന്നതിനും <span className="font-semibold">{stampPaperValueStr}/-</span> രൂപയുടെ മുദ്രപത്രത്തിൽ ഇതോടൊപ്പം ഉള്ളടക്കം ചെയ്തിട്ടുള്ള ഫോർമാറ്റിൽ വർക്ക് എഗ്രിമെന്റ് വയ്ക്കുന്നതിനും നിർദ്ദേശിക്കുന്നു.
                </p>
            );
        }

        return (
            <p className="leading-relaxed text-justify indent-8">
                മേൽ സൂചന പ്രകാരം {workName} നടപ്പിലാക്കുന്നതിന് വേണ്ടി താങ്കൾ സമർപ്പിച്ചിട്ടുള്ള ടെണ്ടർ അംഗീകരിച്ചു. ടെണ്ടർ പ്രകാരമുള്ള പ്രവൃത്തികൾ ഏറ്റെടുക്കുന്നതിന് മുന്നോടിയായി ഈ നോട്ടീസ് തീയതി മുതൽ പതിന്നാല് ദിവസത്തിനകം പെർഫോമൻസ് ഗ്യാരന്റിയായി ടെണ്ടറിൽ ക്വോട്ട് ചെയ്തിരിക്കുന്ന <span className="font-semibold">{quotedAmountStr}/-</span> രൂപയുടെ <span className="font-semibold">5%</span> തുകയായ <span className="font-semibold">{performanceGuaranteeStr}/-</span> രൂപയിൽ കുറയാത്ത തുക ട്രഷറി ഫിക്സഡ് ഡെപ്പോസിറ്റായി ഈ ഓഫീസിൽ കെട്ടിവയ്ക്കുന്നതിനും <span className="font-semibold">{stampPaperValueStr}/-</span> രൂപയുടെ മുദ്രപത്രത്തിൽ ഇതോടൊപ്പം ഉള്ളടക്കം ചെയ്തിട്ടുള്ള ഫോർമാറ്റിൽ വർക്ക് എഗ്രിമെൻ്റ് വയ്ക്കുന്നതിനും നിർദ്ദേശിക്കുന്നു.
            </p>
        );
    };

    return (
        <div className="-m-6 bg-white min-h-screen">
          <div className="max-w-4xl mx-auto p-12 space-y-4 font-serif text-base">
              <div className="text-center">
                  <h1 className="font-bold underline">{`"ഭരണഭാഷ-മാതൃഭാഷ"`}</h1>
              </div>
              
              <div className="flex justify-between pt-2">
                  <div>
                      <p>നമ്പർ: {officeAddress?.officeCode || 'GKT'} / {tender.fileNo || '__________'}</p>
                      <p>ടെണ്ടർ നമ്പർ : {tender.eTenderNo || '__________'}</p>
                  </div>
                  <div className="text-right">
                      <p className="whitespace-pre-wrap">{(officeAddress?.officeNameMalayalam || '').replace('ഭൂജലവകുപ്പ്', '').replace(',', '').trim()}</p>
                      <p className="whitespace-pre-wrap">{officeAddress?.addressMalayalam || ''}</p>
                      <p>ഫോൺനമ്പർ: {officeAddress?.phoneNo || ''}</p>
                      <p>ഇമെയിൽ: {officeAddress?.email || ''}</p>
                      <p>തീയതി: {formatDateSafe(tender.selectionNoticeDate) || '__________'}</p>
                  </div>
              </div>

              <div className="pt-6">
                  <p>പ്രേഷകൻ</p>
                  <p className="ml-8">ജില്ലാ ആഫീസർ</p>
              </div>

              <div className="pt-2">
                  <p>സ്വീകർത്താവ്</p>
                  <div className="ml-8 whitespace-pre-wrap min-h-[6rem]">
                      <p className="text-lg font-semibold">{l1Bidder?.name || '____________________'}</p>
                      <p className="text-lg">{l1Bidder?.address || '____________________'}</p>
                  </div>
              </div>
              
              <div className="pt-2">
                  <p>സർ,</p>
              </div>

              <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-[auto,1fr] gap-x-2">
                      <span>വിഷയം:</span>
                      <span className="text-justify">{tender.nameOfWorkMalayalam || tender.nameOfWork} - ടെണ്ടർ അംഗീകരിച്ച് സെലക്ഷൻ നോട്ടീസ് നൽകുന്നത് - സംബന്ധിച്ച്.</span>
                  </div>
                  <div className="grid grid-cols-[auto,1fr] gap-x-2">
                      <span>സൂചന:</span>
                      <span>ഈ ഓഫീസിലെ {formatDateSafe(tender.dateOfTechnicalAndFinancialBidOpening) || '__________'} തീയതിയിലെ ടെണ്ടർ നമ്പർ {tender.eTenderNo || '__________'}</span>
                  </div>
              </div>
              
              <div className="pt-2">
                  <MainContent />
              </div>
              
              <div className="pt-10 text-right">
                  <p>വിശ്വസ്തതയോടെ</p>
                  <div className="h-16" />
                  <p className="font-semibold">ജില്ലാ ഓഫീസർ</p>
              </div>
          </div>
            <div className="fixed bottom-4 right-4 no-print">
                <Button onClick={() => window.print()}>Print</Button>
            </div>
        </div>
    );
}
