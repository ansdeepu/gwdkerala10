// src/app/dashboard/e-tender/[id]/layout.tsx
"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useE_tenders, type E_tender } from "@/hooks/useE_tenders";
import { TenderDataProvider } from "@/components/e-tender/TenderDataContext";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";


export default function TenderLayout({ children }: { children: ReactNode }) {
    const params = useParams();
    const router = useRouter(); // Use router for navigation
    const id = params?.id as string;

    const { getTender, isLoading: isTendersLoading } = useE_tenders();
    const { user, isLoading: isAuthLoading } = useAuth(); // Wait for user data

    const [tender, setTender] = useState<E_tender | null>(null);
    const [error, setError] = useState<string | null>(null);

    const stableToast = useCallback(toast, []);

    useEffect(() => {
        // Don't do anything until both authentication and data store are ready.
        if (isAuthLoading || isTendersLoading) {
            return;
        }

        const loadTender = async () => {
            if (!id || !user) {
                // If there's no ID or user, there's nothing to load.
                setError("Invalid request.");
                return;
            }

            if (id === 'new') {
                const newTenderData: E_tender = {
                    id: 'new',
                    eTenderNo: '', tenderDate: null, fileNo: '', nameOfWork: '', nameOfWorkMalayalam: '', location: '', estimateAmount: undefined,
                    tenderFormFee: undefined, emd: undefined, periodOfCompletion: undefined, lastDateOfReceipt: null, timeOfReceipt: '',
                    dateOfOpeningTender: null, timeOfOpeningTender: '', presentStatus: 'Tender Preparation', bidders: [], corrigendums: [],
                    dateTimeOfReceipt: undefined, dateTimeOfOpening: undefined, noOfBids: undefined, noOfTenderers: undefined,
                    noOfSuccessfulTenderers: undefined, quotedPercentage: undefined, aboveBelow: undefined, dateOfOpeningBid: undefined,
                    dateOfTechnicalAndFinancialBidOpening: undefined, technicalCommitteeMember1: undefined, technicalCommitteeMember2: undefined,
                    technicalCommitteeMember3: undefined, agreementDate: undefined, dateWorkOrder: undefined, nameOfAssistantEngineer: undefined,
                    supervisor1Id: undefined, supervisor1Name: undefined, supervisor1Phone: undefined,
                    supervisor2Id: undefined, supervisor2Name: undefined, supervisor2Phone: undefined,
                    supervisor3Id: undefined, supervisor3Name: undefined, supervisor3Phone: undefined,
                    nameOfSupervisor: undefined, supervisorPhoneNo: undefined, remarks: '',
                };
                setTender(newTenderData);
            } else {
                const fetchedTender = await getTender(id);
                if (fetchedTender) {
                    setTender(fetchedTender);
                } else {
                    // Set an error state instead of a toast that disappears.
                    setError("The requested tender could not be found.");
                    // Redirect back to the main e-tender list after a delay.
                    stableToast({ title: "Tender Not Found", description: "Redirecting back to the tender list.", variant: "destructive" });
                    setTimeout(() => router.replace('/dashboard/e-tender'), 2000);
                }
            }
        };

        loadTender();
    }, [id, getTender, isTendersLoading, isAuthLoading, user, router, stableToast]);

    const isLoading = isAuthLoading || isTendersLoading;

    if (isLoading || (id !== 'new' && !tender && !error)) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading Tender Data...</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex h-full w-full items-center justify-center p-4">
                <div className="text-center p-6 border rounded-lg bg-destructive/10">
                    <h2 className="text-xl font-bold text-destructive">Error</h2>
                    <p className="text-destructive/80 mt-2">{error}</p>
                </div>
            </div>
        )
    }
    
    if (!tender) {
        // This case handles the brief moment before the redirect happens on error or while initializing 'new'
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <TenderDataProvider key={id} initialTender={tender}>
            {children}
        </TenderDataProvider>
    );
}
