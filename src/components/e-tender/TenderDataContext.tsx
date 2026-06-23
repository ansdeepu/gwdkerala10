// src/components/e-tender/TenderDataContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import type { E_tender } from '@/hooks/useE_tenders';

interface TenderDataContextType {
    tender: E_tender;
    updateTender: (updatedData: Partial<E_tender>) => void;
}

const TenderDataContext = createContext<TenderDataContextType | undefined>(undefined);

export function TenderDataProvider({ initialTender, children }: { initialTender: E_tender, children: ReactNode }) {
    const [tender, setTender] = useState<E_tender>(initialTender);

    useEffect(() => {
        setTender(initialTender);
    }, [initialTender]);

    const updateTender = useCallback((updatedData: Partial<E_tender>) => {
        setTender(prevTender => ({ ...prevTender, ...updatedData }));
    }, []);

    const value = useMemo(() => ({ tender, updateTender }), [tender, updateTender]);

    return (
        <TenderDataContext.Provider value={value}>
            {children}
        </TenderDataContext.Provider>
    );
}

export function useTenderData() {
    const context = useContext(TenderDataContext);
    if (context === undefined) {
        throw new Error('useTenderData must be used within a TenderDataProvider');
    }
    return context;
}
