
// src/hooks/useFileEntries.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import type { DataEntryFormData, SiteWorkStatus, SiteDetailFormData, ApplicationType } from '@/lib/schemas';
import { 
    PRIVATE_APPLICATION_TYPES, 
    COLLECTOR_APPLICATION_TYPES, 
    PLAN_FUND_APPLICATION_TYPES,
    PUBLIC_DEPOSIT_APPLICATION_TYPES,
    LOGGING_PUMPING_TEST_PURPOSE_OPTIONS,
    INVESTIGATION_GOVT_TYPES,
} from '@/lib/schemas';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { usePendingUpdates } from './usePendingUpdates';
import { useDataStore } from './use-data-store'; 
import { v4 as uuidv4 } from 'uuid';

const db = getFirestore(app);
const FILE_ENTRIES_COLLECTION = 'fileEntries';

// Helper function to recursively remove `undefined` values, replacing them with `null`.
const sanitizeDataForFirestore = (data: any): any => {
    if (data === undefined) {
        return null;
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeDataForFirestore(item));
    }
    if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
        const sanitized: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (value === undefined) {
                    sanitized[key] = null;
                } else {
                    sanitized[key] = sanitizeDataForFirestore(value);
                }
            }
        }
        return sanitized;
    }
    return data;
};


export function useFileEntries() {
  const { user } = useAuth();
  const { allFileEntries, isLoading: dataStoreLoading } = useDataStore(); 
  const { toast } = useToast();
  const [fileEntries, setFileEntries] = useState<DataEntryFormData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getPendingUpdates } = usePendingUpdates();
  const [pendingUpdatesMap, setPendingUpdatesMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.uid && (user.role === 'supervisor' || user.role === 'investigator')) {
        getPendingUpdates(null, user.uid).then(updates => {
            const map: Record<string, boolean> = {};
            updates.forEach(u => {
                if(u.fileNo && u.status === 'pending') {
                    map[u.fileNo] = true;
                }
            });
            setPendingUpdatesMap(map);
        });
    }
  }, [user, getPendingUpdates]);

  useEffect(() => {
    const processEntries = async () => {
      if (!user) {
        setFileEntries([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      
      const isFieldStaff = user.role === 'supervisor' || user.role === 'investigator';

      if (isFieldStaff && user.uid) {
        const filteredEntries = (allFileEntries as DataEntryFormData[])
          .map(entry => {
            if (!entry.siteDetails || entry.siteDetails.length === 0) {
              return null;
            }

            const hasPendingUpdateForThisFile = pendingUpdatesMap[entry.fileNo];
            
            const visibleSites = entry.siteDetails.filter(site => {
                const isAssignedSupervisor = user.role === 'supervisor' && (site.supervisorUid === user.uid || (user.name && site.supervisorName?.includes(user.name)));
                const isAssignedHydro = user.role === 'investigator' && site.nameOfInvestigator === user.name;
                const isAssignedGeo = user.role === 'investigator' && site.vesInvestigator === user.name;

                if (!isAssignedSupervisor && !isAssignedHydro && !isAssignedGeo) {
                    return false;
                }

                if (user.role === 'investigator') {
                    if (isAssignedHydro) {
                        const isHydroPartDone = site.vesRequired === 'Yes' || site.workStatus === 'Completed';
                        if (isHydroPartDone && !hasPendingUpdateForThisFile) return false;
                        return true;
                    }
                    if (isAssignedGeo) {
                        if (site.workStatus === 'Completed' && !hasPendingUpdateForThisFile) return false;
                        return true;
                    }
                    return false;
                }
              
                const supervisorOngoingStatuses: string[] = ["Work Order Issued", "Work in Progress", "Awaiting Dept. Rig", "Work Initiated"];
                const isSupervisorOngoing = site.workStatus && (supervisorOngoingStatuses as string[]).includes(site.workStatus);
                return isSupervisorOngoing || hasPendingUpdateForThisFile;
            });
            
            if (visibleSites.length > 0) {
              return { ...entry, siteDetails: visibleSites } as DataEntryFormData;
            }
            
            return null;
          })
          .filter((entry): entry is DataEntryFormData => entry !== null);
          
        setFileEntries(filteredEntries);
      } else {
        setFileEntries(allFileEntries as DataEntryFormData[]);
      }

      setIsLoading(false);
    };

    if (!dataStoreLoading) {
      processEntries();
    }
  }, [user, allFileEntries, dataStoreLoading, pendingUpdatesMap]);

    const addFileEntry = useCallback(async (entryData: DataEntryFormData): Promise<string> => {
        if (!user || !['admin', 'engineer', 'scientist'].includes(user.role)) throw new Error("Permission denied to add file entry.");
        if (!user.officeLocation) throw new Error("User must have an office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/fileEntries`;
        
        const payload = { ...entryData, officeLocation: user.officeLocation };
        if (payload.id) delete payload.id;

        const sanitizedPayload = sanitizeDataForFirestore({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

        const docRef = await addDoc(collection(db, collectionPath), sanitizedPayload);
        return docRef.id;
    }, [user]);

    const updateFileEntry = useCallback(async (fileId: string, entryData: DataEntryFormData, approveUpdateId?: string): Promise<void> => {
        if (!user || !['admin', 'engineer', 'scientist'].includes(user.role)) throw new Error("Permission denied to update file entry.");
        if (!user.officeLocation) throw new Error("User has no office location.");
        
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/fileEntries`;
        const docRef = doc(db, collectionPath, fileId);

        const fileNoTrimmed = entryData.fileNo.trim().toUpperCase();

        const originalDocSnap = await getDoc(docRef);
        if (!originalDocSnap.exists()) {
            throw new Error("The file you are trying to edit does not exist.");
        }
        const originalFileNo = originalDocSnap.data().fileNo?.trim().toUpperCase();

        if (originalFileNo !== fileNoTrimmed) {
            const q = query(collection(db, collectionPath), where("fileNo", "==", fileNoTrimmed));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== fileId)) {
                throw new Error(`A file with the number "${entryData.fileNo}" already exists.`);
            }
        }
        
        const payload = { ...entryData, fileNo: fileNoTrimmed };
        if (payload.id) delete payload.id;

        const finalPayload = { ...payload, updatedAt: serverTimestamp() };
        const sanitizedPayload = sanitizeDataForFirestore(finalPayload);

        if (approveUpdateId && (user.role === 'admin' || user.role === 'scientist' || user.role === 'engineer')) {
            const batch = writeBatch(db);
            batch.update(docRef, sanitizedPayload);
            const updateRef = doc(db, `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`, approveUpdateId);
            batch.update(updateRef, { status: 'approved', reviewedByUid: user.uid, reviewedAt: serverTimestamp() });
            await batch.commit();
        } else {
            await updateDoc(docRef, sanitizedPayload);
        }
        
    }, [user]);


  const deleteFileEntry = useCallback(async (docId: string): Promise<void> => {
    if (user?.role !== 'admin') {
        toast({ title: "Permission Denied", description: "You don't have permission to delete entries.", variant: "destructive" });
        return;
    }
    if (!user?.officeLocation) {
        toast({ title: "Deletion Failed", description: "User has no office location.", variant: "destructive" });
        return;
    }
    if (!docId) {
        toast({ title: "Deletion Failed", description: "Invalid item ID provided.", variant: "destructive" });
        return;
    }
    try {
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/fileEntries`;
        await deleteDoc(doc(db, collectionPath, docId));
        toast({ title: "Entry Deleted", description: "The file entry has been removed." });
    } catch (error: any) {
        console.error(`Error deleting file with ID ${docId}:`, error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const batchDeleteFileEntries = useCallback(async (fileNos: string[]): Promise<{ successCount: number; failureCount: number }> => {
    if (user?.role !== 'admin') {
        toast({ title: "Permission Denied", variant: "destructive" });
        return { successCount: 0, failureCount: fileNos.length };
    }
    const batch = writeBatch(db);
    let successCount = 0;
    
    for (const fileNo of fileNos) {
        const q = query(collection(db, FILE_ENTRIES_COLLECTION), where("fileNo", "==", fileNo));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const docId = querySnapshot.docs[0].id;
            batch.delete(doc(db, FILE_ENTRIES_COLLECTION, docId));
            successCount++;
        }
    }
    
    await batch.commit();
    return { successCount, failureCount: fileNos.length - successCount };
  }, [user, toast]);

  const getFileEntry = useCallback((fileNo: string): DataEntryFormData | undefined => {
    return (allFileEntries as DataEntryFormData[]).find(entry => entry.fileNo === fileNo);
  }, [allFileEntries]);

  const fetchEntryForEditing = useCallback(async (
    docId: string
  ): Promise<DataEntryFormData | null> => {
    if (!user || !user.officeLocation) {
        console.error("fetchEntryForEditing: User or user office not available.");
        return null;
    }
    try {
      const collectionPath = `offices/${user.officeLocation.toLowerCase()}/fileEntries`;
      const docRef = doc(db, collectionPath, docId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn(`[fetchEntryForEditing] No file found with ID: ${docId} in office ${user.officeLocation}`);
        return null;
      }
      
      let entry = { id: docSnap.id, ...(docSnap.data()) } as any;

      // Visibility check for Supervisors and Investigators on direct fetch
      if (user.role === 'supervisor' || user.role === 'investigator') {
          const isAssigned = entry.siteDetails?.some((site: any) => {
              if (user.role === 'supervisor') {
                  const isAssignedByUid = site.supervisorUid === user.uid;
                  const isAssignedByName = user.name && site.supervisorName?.includes(user.name);
                  return isAssignedByUid || isAssignedByName;
              } else { // Investigator
                  return site.nameOfInvestigator === user.name || site.vesInvestigator === user.name;
              }
          });
          
          if (!isAssigned) {
              // Check if they have a pending update for this specific file
              const updates = await getPendingUpdates(entry.fileNo, user.uid);
              const hasUpdate = updates.some(u => u.status === 'pending');
              if (!hasUpdate) {
                  return null;
              }
          }
      }

      return entry as DataEntryFormData;
    } catch (error) {
      console.error(`[fetchEntryForEditing] Error fetching docId ${docId}:`, error);
      return null;
    }
  }, [user, getPendingUpdates]);

  const moveCopyFile = useCallback(async (
    fileId: string, 
    operation: 'move' | 'copy', 
    targetModule: string
  ) => {
    if (!user?.officeLocation) throw new Error("User office location not found.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/fileEntries`;
    
    const docRef = doc(db, collectionPath, fileId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error("Source file not found.");
    
    const data = docSnap.data() as DataEntryFormData;
    let updatedData = { ...data };

    // Update metadata based on target module
    switch (targetModule) {
      case 'deposit':
        updatedData.applicationType = PUBLIC_DEPOSIT_APPLICATION_TYPES[0];
        updatedData.category = null;
        break;
      case 'private':
        updatedData.applicationType = PRIVATE_APPLICATION_TYPES[0];
        updatedData.category = null;
        break;
      case 'collector':
        updatedData.applicationType = COLLECTOR_APPLICATION_TYPES[0];
        updatedData.category = null;
        break;
      case 'planFund':
        updatedData.applicationType = PLAN_FUND_APPLICATION_TYPES[0];
        updatedData.category = null;
        break;
      case 'gwInvestigation':
        updatedData.category = 'Govt';
        updatedData.applicationType = INVESTIGATION_GOVT_TYPES[0];
        updatedData.siteDetails = (updatedData.siteDetails || []).map(s => ({ ...s, purpose: 'GW Investigation' }));
        break;
      case 'loggingPumpingTest':
        updatedData.category = 'Govt';
        updatedData.applicationType = INVESTIGATION_GOVT_TYPES[0];
        updatedData.siteDetails = (updatedData.siteDetails || []).map(s => ({ ...s, purpose: LOGGING_PUMPING_TEST_PURPOSE_OPTIONS[0] }));
        break;
    }

    if (operation === 'copy') {
      updatedData.fileNo = `${updatedData.fileNo}-COPY`;
      const sanitized = sanitizeDataForFirestore({ ...updatedData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await addDoc(collection(db, collectionPath), sanitized);
    } else {
      const sanitized = sanitizeDataForFirestore({ ...updatedData, updatedAt: serverTimestamp() });
      await updateDoc(docRef, sanitized);
    }
  }, [user]);

  const moveCopySite = useCallback(async (
    sourceFileId: string,
    siteIndex: number,
    operation: 'move' | 'copy',
    targetFileNo: string
  ) => {
    if (!user?.officeLocation) throw new Error("User office location not found.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/fileEntries`;

    // 1. Get Source
    const sourceRef = doc(db, collectionPath, sourceFileId);
    const sourceSnap = await getDoc(sourceRef);
    if (!sourceSnap.exists()) throw new Error("Source file not found.");
    const sourceData = sourceSnap.data() as DataEntryFormData;
    const siteToTransfer = sourceData.siteDetails?.[siteIndex];
    if (!siteToTransfer) throw new Error("Site not found at given index.");

    // 2. Get Target
    const q = query(collection(db, collectionPath), where("fileNo", "==", targetFileNo));
    const targetSnap = await getDocs(q);
    if (targetSnap.empty) throw new Error(`Target file ${targetFileNo} not found.`);
    const targetDoc = targetSnap.docs[0];
    const targetData = targetDoc.data() as DataEntryFormData;

    const batch = writeBatch(db);

    // 3. Perform Operation
    const newSiteDetails = [...(targetData.siteDetails || []), { ...siteToTransfer, id: uuidv4() }];
    batch.update(targetDoc.ref, { siteDetails: newSiteDetails, updatedAt: serverTimestamp() });

    if (operation === 'move') {
      const updatedSourceSites = sourceData.siteDetails?.filter((_, i) => i !== siteIndex);
      batch.update(sourceRef, { siteDetails: updatedSourceSites, updatedAt: serverTimestamp() });
    }

    await batch.commit();
  }, [user]);

  return { 
      fileEntries, 
      isLoading, 
      addFileEntry,
      updateFileEntry,
      deleteFileEntry, 
      batchDeleteFileEntries,
      getFileEntry,
      fetchEntryForEditing,
      moveCopyFile,
      moveCopySite
    };
}
