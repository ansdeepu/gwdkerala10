// src/hooks/usePageHeader.tsx
"use client";

import { createContext, useState, useContext, ReactNode, useCallback } from "react";

type PageHeaderContextType = {
  title: string;
  description: string;
  setHeader: (title: string, description: string) => void;
};

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("Dashboard");
  const [description, setDescription] = useState("");

  const setHeader = useCallback((newTitle: string, newDescription: string) => {
    setTitle(newTitle);
    setDescription(newDescription);
  }, []);

  return (
    <PageHeaderContext.Provider value={{ title, description, setHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error("usePageHeader must be used within a PageHeaderProvider");
  }
  return context;
}
