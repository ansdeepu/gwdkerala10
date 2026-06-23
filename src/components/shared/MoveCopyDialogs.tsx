
// src/components/shared/MoveCopyDialogs.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';
import { useDataStore } from '@/hooks/use-data-store';
import { 
    PUBLIC_DEPOSIT_APPLICATION_TYPES, 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS
} from '@/lib/schemas';

interface MoveCopyFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (operation: 'move' | 'copy', targetModule: string) => Promise<void>;
  fileNo: string;
  currentModule?: string;
}

export function MoveCopyFileDialog({ isOpen, onClose, onConfirm, fileNo, currentModule }: MoveCopyFileDialogProps) {
  const [operation, setOperation] = useState<'move' | 'copy'>('move');
  const [targetModule, setTargetModule] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-set target module when copying to own page as priority
  useEffect(() => {
    if (operation === 'copy' && currentModule) {
      setTargetModule(currentModule);
    }
  }, [operation, currentModule]);

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
        setOperation('move');
        setTargetModule('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!targetModule) return;
    setIsSubmitting(true);
    try {
      await onConfirm(operation, targetModule);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-md p-8">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">Move or Copy File</DialogTitle>
          <DialogDescription className="mt-2 text-sm">
            Reassign <strong>{fileNo}</strong> to a different module.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Operation</Label>
            <RadioGroup value={operation} onValueChange={(v: any) => setOperation(v)} className="flex gap-6 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="move" id="op-move" />
                <Label htmlFor="op-move" className="font-medium cursor-pointer">Move</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="copy" id="op-copy" />
                <Label htmlFor="op-copy" className="font-medium cursor-pointer">Copy</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Target Module</Label>
            <div className="mt-1">
                <Select value={targetModule} onValueChange={setTargetModule}>
                <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Target Module" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="deposit">Deposit Works (Public)</SelectItem>
                    <SelectItem value="private">Private Deposit Works</SelectItem>
                    <SelectItem value="collector">Collector&apos;s Deposit Works</SelectItem>
                    <SelectItem value="planFund">Plan Fund Works</SelectItem>
                    <SelectItem value="gwInvestigation">GW Investigation</SelectItem>
                    <SelectItem value="loggingPumpingTest">Logging &amp; Pumping Test</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-0 mt-6 pt-4 border-t">
          <Button variant="outline" size="lg" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button size="lg" onClick={handleConfirm} disabled={!targetModule || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {operation === 'move' ? 'Move File' : 'Copy File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MoveCopySiteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (operation: 'move' | 'copy', targetFileNo: string) => Promise<void>;
  siteName: string;
  currentModule?: string;
  currentFileNo?: string;
}

export function MoveCopySiteDialog({ isOpen, onClose, onConfirm, siteName, currentModule, currentFileNo }: MoveCopySiteDialogProps) {
  const { allFileEntries } = useDataStore();
  const [operation, setOperation] = useState<'move' | 'copy'>('move');
  const [targetModule, setTargetModule] = useState<string>('deposit');
  const [targetFileNo, setTargetFileNo] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-set target module and file when copying
  useEffect(() => {
    if (operation === 'copy') {
      if (currentModule) setTargetModule(currentModule);
      if (currentFileNo) setTargetFileNo(currentFileNo);
    }
  }, [operation, currentModule, currentFileNo]);

  // Categorize file entries based on their current "module"
  const categorizedFiles = useMemo(() => {
    const modules: Record<string, string[]> = {
      deposit: [],
      private: [],
      collector: [],
      planFund: [],
      gwInvestigation: [],
      loggingPumpingTest: []
    };

    allFileEntries.forEach(entry => {
      const appType = entry.applicationType as any;
      const hasInvestigationPurpose = entry.siteDetails?.some(s => s.purpose === 'GW Investigation');
      const hasLoggingPumpingPurpose = entry.siteDetails?.some(s => s.purpose && LOGGING_PUMPING_TEST_PURPOSE_OPTIONS.includes(s.purpose as any));

      let targetModuleKey = 'deposit';
      if (hasInvestigationPurpose && !hasLoggingPumpingPurpose) targetModuleKey = 'gwInvestigation';
      else if (hasLoggingPumpingPurpose && !hasInvestigationPurpose) targetModuleKey = 'loggingPumpingTest';
      else if (PRIVATE_APPLICATION_TYPES.includes(appType)) targetModuleKey = 'private';
      else if (COLLECTOR_APPLICATION_TYPES.includes(appType)) targetModuleKey = 'collector';
      else if (PLAN_FUND_APPLICATION_TYPES.includes(appType)) targetModuleKey = 'planFund';
      else targetModuleKey = 'deposit';

      modules[targetModuleKey].push(entry.fileNo);
    });

    return modules;
  }, [allFileEntries]);

  const fileSuggestions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const moduleFiles = categorizedFiles[targetModule] || [];
    
    if (!term) return moduleFiles.slice(0, 50); // Show first 50 if no search
    
    return moduleFiles
      .filter(no => no.toLowerCase().includes(term))
      .slice(0, 50);
  }, [categorizedFiles, targetModule, searchTerm]);

  const selectedFileApplicantInfo = useMemo(() => {
    if (!targetFileNo) return null;
    const found = allFileEntries.find(e => e.fileNo === targetFileNo);
    return found ? found.applicantName : null;
  }, [allFileEntries, targetFileNo]);

  const handleConfirm = async () => {
    if (!targetFileNo) return;
    setIsSubmitting(true);
    try {
      await onConfirm(operation, targetFileNo);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSelection = (module: string) => {
    setTargetModule(module);
    setTargetFileNo('');
    setSearchTerm('');
  };

  // Reset state when opening/closing
  useEffect(() => {
    if (isOpen) {
        setOperation('move');
        setTargetModule(currentModule || 'deposit');
        setTargetFileNo('');
        setSearchTerm('');
    }
  }, [isOpen, currentModule]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-lg p-8">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">Move or Copy Site</DialogTitle>
          <DialogDescription className="mt-2 text-sm">
            Transfer <strong>{siteName}</strong> to another file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Operation</Label>
            <RadioGroup value={operation} onValueChange={(v: any) => setOperation(v)} className="flex gap-6 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="move" id="site-op-move" />
                <Label htmlFor="site-op-move" className="font-medium cursor-pointer">Move</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="copy" id="site-op-copy" />
                <Label htmlFor="site-op-copy" className="font-medium cursor-pointer">Copy</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Target Module</Label>
            <div className="mt-1">
                <Select value={targetModule} onValueChange={resetSelection}>
                <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="deposit">Deposit Works (Public)</SelectItem>
                    <SelectItem value="private">Private Deposit Works</SelectItem>
                    <SelectItem value="collector">Collector&apos;s Deposit Works</SelectItem>
                    <SelectItem value="planFund">Plan Fund Works</SelectItem>
                    <SelectItem value="gwInvestigation">GW Investigation</SelectItem>
                    <SelectItem value="loggingPumpingTest">Logging &amp; Pumping Test</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Target File Selection</Label>
            <div className="space-y-4 mt-1">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input 
                  placeholder="Search file number..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="h-11 bg-secondary/20 border-secondary flex-1"
                />
                <Select value={targetFileNo} onValueChange={setTargetFileNo}>
                  <SelectTrigger className="h-11 border-primary/20 bg-primary/5 flex-1">
                    <SelectValue placeholder={targetFileNo || "Select Destination File"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {fileSuggestions.map(no => (
                      <SelectItem key={no} value={no}>{no}</SelectItem>
                    ))}
                    {fileSuggestions.length === 0 && (
                      <p className="p-4 text-xs text-muted-foreground text-center italic">No matching files found in this category.</p>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedFileApplicantInfo && (
                <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 animate-in fade-in slide-in-from-top-1">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1 block">Applicant Name & Address</Label>
                  <p className="text-sm font-semibold text-blue-900 leading-tight">
                    {selectedFileApplicantInfo}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3 sm:gap-0 mt-6 pt-4 border-t">
          <Button variant="outline" size="lg" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button size="lg" onClick={handleConfirm} disabled={!targetFileNo || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {operation === 'move' ? 'Move Site' : 'Copy Site'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
