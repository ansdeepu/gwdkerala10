// src/app/dashboard/e-tender/[id]/page.tsx
"use client";

import { useEffect } from "react";
import { useTenderData } from "@/components/e-tender/TenderDataContext";
import { usePageHeader } from "@/hooks/usePageHeader";
import TenderDetails from "@/components/e-tender/TenderDetails";
import { useParams } from "next/navigation";
import { useDataStore } from "@/hooks/use-data-store";

export default function TenderPage() {
    const { tender } = useTenderData(); // Consumes data from layout's provider
    const { setHeader } = usePageHeader();
    const { officeAddress } = useDataStore();

    useEffect(() => {
        if (!tender) return;

        if (tender.id === 'new') {
            setHeader("Create New e-Tender", "Fill in the details for the new tender.");
        } else {
            const refNo = `${officeAddress?.officeCode || 'GKT'}/${tender.fileNo}/${tender.eTenderNo}`;
            setHeader(`Edit e-Tender: ${refNo}`, `Editing details for tender: ${refNo}`);
        }
    }, [tender, setHeader, officeAddress]);

    // The loader is handled by the layout.
    // The TenderDataProvider is also in the layout.
    // This page component just needs to render the details component.
    return (
        <div className="space-y-6">
            <TenderDetails />
        </div>
    );
}

    