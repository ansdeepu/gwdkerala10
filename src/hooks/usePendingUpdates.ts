// src/hooks/usePendingUpdates.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  Timestamp,
  serverTimestamp,
  addDoc,
  getDoc,
  type DocumentData,
  deleteDoc,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth, type UserProfile } from './useAuth';
import type { PendingUpdate, DataEntryFormData, SiteDetailFormData, ArsEntryFormData } from '@/lib/schemas';

const db = getFirestore(app);
const PENDING_UPDATES_COLLECTION = 'pendingUpdates';

const convertTimestampToDate = (data: DocumentData): PendingUpdate => {
  return {
    ...data,
    id: data.id,
    submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date(),
    reviewedAt: data.reviewedAt instanceof Timestamp ? data.reviewedAt.toDate() : undefined,
  } as PendingUpdate;
};

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
                sanitized[key] = sanitizeDataForFirestore(value);
            }
        }
        return sanitized;
    }
    return data;
};

interface PendingUpdatesState {
  createPendingUpdate: (fileNo: string, siteDetails: SiteDetailFormData[], currentUser: UserProfile, fileLevelUpdates: Partial<Pick<DataEntryFormData, 'fileStatus' | 'remarks'>>) => Promise<void>;
  createArsPendingUpdate: (arsId: string, updatedArsEntry: ArsEntryFormData, currentUser: UserProfile) => Promise<void>;
  rejectUpdate: (updateId: string, reason?: string) => Promise<void>;
  deleteUpdate: (updateId: string) => Promise<void>;
  getPendingUpdateById: (updateId: string) => Promise<PendingUpdate | null>;
  hasPendingUpdateForFile: (fileNo: string, submittedByUid: string) => Promise<boolean>;
  getPendingUpdates: (fileNo: string | null, submittedByUid?: string) => Promise<PendingUpdate[]>;
  subscribeToPendingUpdates: (
    callback: (updates: PendingUpdate[]) => void
  ) => () => void;
}

export function usePendingUpdates(): PendingUpdatesState {
  const { user } = useAuth();
  
  const getPendingUpdates = useCallback(async (fileNo: string | null, submittedByUid?: string): Promise<PendingUpdate[]> => {
    if (!user || !user.officeLocation) {
        return [];
    }
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`;

    let conditions = [];
    if (fileNo) conditions.push(where('fileNo', '==', fileNo));
    if (submittedByUid) conditions.push(where('submittedByUid', '==', submittedByUid));
    
    const q = query(collection(db, collectionPath), ...conditions);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => convertTimestampToDate({ id: doc.id, ...doc.data() }));
  }, [user]);
  
  const hasPendingUpdateForFile = useCallback(async (fileNo: string, submittedByUid: string): Promise<boolean> => {
    if (!user || !user.officeLocation) {
        return false;
    }
    try {
      const collectionPath = `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`;
      const q = query(
        collection(db, collectionPath),
        where('fileNo', '==', fileNo),
        where('status', '==', 'pending'),
        where('submittedByUid', '==', submittedByUid)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking for pending file updates:", error);
      return false; 
    }
  }, [user]);
  
  const subscribeToPendingUpdates = useCallback((
    callback: (updates: PendingUpdate[]) => void
  ) => {
    if (!user || !user.officeLocation) {
      callback([]);
      return () => {};
    }

    const statusesToQuery = user.role === 'admin' || user.role === 'scientist' || user.role === 'engineer'
      ? ['pending', 'supervisor-unassigned'] 
      : ['pending', 'rejected'];
      
    let conditions = [where('status', 'in', statusesToQuery)];
    if (user.role === 'supervisor' || user.role === 'investigator') {
        conditions.push(where('submittedByUid', '==', user.uid));
    }
    
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`;
    const q = query(collection(db, collectionPath), ...conditions);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const updates = snapshot.docs.map(doc => convertTimestampToDate({ id: doc.id, ...doc.data() }));
        updates.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
        callback(updates);
    }, (error) => {
        console.error("Error subscribing to pending updates:", error);
        callback([]);
    });

    return unsubscribe;
  }, [user]);
  

  const createPendingUpdate = useCallback(async (
    fileNo: string,
    siteDetails: SiteDetailFormData[],
    currentUser: UserProfile,
    fileLevelUpdates: Partial<Pick<DataEntryFormData, 'fileStatus' | 'remarks'>>
  ) => {
    if (!currentUser.uid || !currentUser.name || !currentUser.officeLocation) {
      throw new Error("Invalid user profile for submitting an update.");
    }
    
    const collectionPath = `offices/${currentUser.officeLocation.toLowerCase()}/pendingUpdates`;
    const batch = writeBatch(db);

    const existingUpdatesQuery = query(
      collection(db, collectionPath),
      where('fileNo', '==', fileNo),
      where('status', '==', 'pending'),
      where('submittedByUid', '==', currentUser.uid)
    );
    const existingUpdatesSnapshot = await getDocs(existingUpdatesQuery);
    existingUpdatesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    const newUpdateRef = doc(collection(db, collectionPath));
    const newUpdateData = {
      fileNo,
      updatedSiteDetails: siteDetails,
      fileLevelUpdates: fileLevelUpdates,
      submittedByUid: currentUser.uid,
      submittedByName: currentUser.name,
      status: 'pending',
      isArsUpdate: false,
      submittedAt: serverTimestamp(),
    };
    
    const sanitizedPayload = sanitizeDataForFirestore(newUpdateData);
    batch.set(newUpdateRef, sanitizedPayload);

    await batch.commit();

  }, []);

  const createArsPendingUpdate = useCallback(async (
    arsId: string,
    updatedArsEntry: ArsEntryFormData,
    currentUser: UserProfile
  ) => {
    if (!currentUser.uid || !currentUser.name || !currentUser.officeLocation) {
      throw new Error("Invalid user profile for submitting an update.");
    }
    const collectionPath = `offices/${currentUser.officeLocation.toLowerCase()}/pendingUpdates`;

    const newUpdate = {
      arsId: arsId,
      fileNo: updatedArsEntry.fileNo, // For display purposes
      updatedSiteDetails: [updatedArsEntry], // Store the ARS data in the same structure
      submittedByUid: currentUser.uid,
      submittedByName: currentUser.name,
      status: 'pending',
      isArsUpdate: true, // Flag to identify this as an ARS update
      submittedAt: serverTimestamp(),
    };

    const sanitizedPayload = sanitizeDataForFirestore(newUpdate);
    await addDoc(collection(db, collectionPath), sanitizedPayload);
  }, []);
  
  const getPendingUpdateById = useCallback(async (updateId: string): Promise<PendingUpdate | null> => {
    if (!user || !user.officeLocation) return null;
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`;
    const docRef = doc(db, collectionPath, updateId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestampToDate({ id: docSnap.id, ...docSnap.data() });
    }
    return null;
  }, [user]);

  const rejectUpdate = useCallback(async (updateId: string, reason?: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'scientist' && user.role !== 'engineer')) {
      throw new Error("You do not have permission to reject updates.");
    }
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`;
    const updateDocRef = doc(db, collectionPath, updateId);
    await updateDoc(updateDocRef, {
      status: 'rejected',
      reviewedByUid: user.uid,
      reviewedAt: serverTimestamp(),
      notes: reason || "Rejected by administrator without a specific reason.",
    });
  }, [user]);

  const deleteUpdate = useCallback(async (updateId: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'scientist' && user.role !== 'engineer')) {
        throw new Error("You do not have permission to delete updates.");
    }
    if (!user.officeLocation) throw new Error("User has no office location.");
    const collectionPath = `offices/${user.officeLocation.toLowerCase()}/pendingUpdates`;
    const updateDocRef = doc(db, collectionPath, updateId);
    await deleteDoc(updateDocRef);
  }, [user]);

  return {
    createPendingUpdate,
    createArsPendingUpdate,
    rejectUpdate,
    deleteUpdate,
    getPendingUpdateById,
    hasPendingUpdateForFile,
    getPendingUpdates,
    subscribeToPendingUpdates,
  };
}
