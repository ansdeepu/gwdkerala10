// src/components/e-tender/pdf/CorrigendumReports.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useTenderData } from '../TenderDataContext';
import download from 'downloadjs';
import { toast } from '@/hooks/use-toast';
import type { Corrigendum } from '@/lib/schemas/eTenderSchema';
import { generateRetenderCorrigendum } from './generators/retenderCorrigendumGenerator';
import { generateDateExtensionCorrigendum } from './generators/dateExtensionCorrigendumGenerator';
import { generateCancelCorrigendum } from './generators/cancelCorrigendumGenerator';
import { formatTenderNoForFilename } from '../utils';
import { useDataStore } from '@/hooks/use-data-store';

interface CorrigendumReportsProps {
  corrigendum: Corrigendum;
  index: number;
}

export default function CorrigendumReports({ corrigendum, index }: CorrigendumReportsProps) {
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
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
      disabled={isLoading || !corrigendum.corrigendumType}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}
