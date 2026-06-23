// src/hooks/useOfficeSelection.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';

interface OfficeSelectionContextType {
  selectedOffice: string | null; // null means 'All Offices'
  setSelectedOffice: (office: string | null) => void;
}

const OfficeSelectionContext = createContext<OfficeSelectionContextType | undefined>(undefined);

export function OfficeSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);

  const value = useMemo(() => ({
    selectedOffice,
    setSelectedOffice,
  }), [selectedOffice]);

  return (
    <OfficeSelectionContext.Provider value={value}>
      {children}
    </OfficeSelectionContext.Provider>
  );
}

export function useOfficeSelection() {
  const context = useContext(OfficeSelectionContext);
  if (context === undefined) {
    throw new Error('useOfficeSelection must be used within an OfficeSelectionProvider');
  }
  return context;
}
