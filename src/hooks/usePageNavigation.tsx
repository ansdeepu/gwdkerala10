
"use client";
import { createContext, useState, useContext, ReactNode } from "react";

type PageNavigationContextType = {
  isNavigating: boolean;
  setIsNavigating: (value: boolean) => void;
};

const PageNavigationContext = createContext<PageNavigationContextType | undefined>(undefined);

export function PageNavigationProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);

  return (
    <PageNavigationContext.Provider value={{ isNavigating, setIsNavigating }}>
      {children}
    </PageNavigationContext.Provider>
  );
}

export function usePageNavigation() {
  const context = useContext(PageNavigationContext);
  if (context === undefined) {
    throw new Error("usePageNavigation must be used within a PageNavigationProvider");
  }
  return context;
}
