
// src/app/dashboard/file-database/page.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import FileDatabaseTable from "@/components/database/FileDatabaseTable";
import { Card, CardContent } from "@/components/ui/card";
import { useFileEntries } from "@/hooks/useFileEntries";
import { usePageHeader } from "@/hooks/usePageHeader";
import { useSearchParams, useRouter } from "next/navigation";
import PaginationControls from "@/components/shared/PaginationControls";
import { useAuth } from "@/hooks/useAuth";

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 50;

export default function FileDatabasePage() {
  const { setHeader } = usePageHeader();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    setHeader('All File Entries', 'Browse, view, edit, or delete submitted file entries.');
  }, [setHeader]);

  useEffect(() => {
    const page = searchParams?.get('page');
    if (page && !isNaN(parseInt(page))) {
      setCurrentPage(parseInt(page));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  const { fileEntries, isLoading } = useFileEntries();

  const totalPages = Math.ceil(fileEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return fileEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [fileEntries, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams?.toString());
    params.set('page', String(page));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="flex justify-center pb-4">
            {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
          </div>
          <FileDatabaseTable 
            fileEntries={paginatedEntries} 
            isLoading={isLoading} 
            searchActive={false} 
            totalEntries={fileEntries.length}
            currentPage={currentPage}
            userRole={user?.role}
            currentModule="all"
          />
          <div className="flex justify-center pt-4">
            {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
