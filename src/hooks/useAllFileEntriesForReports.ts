// src/hooks/useAllFileEntriesForReports.ts
"use client";

import { useDataStore } from './use-data-store';

export function useAllFileEntriesForReports() {
  const { allFileEntries, isLoading: isReportLoading } = useDataStore();

  return { reportEntries: allFileEntries, isReportLoading };
}
