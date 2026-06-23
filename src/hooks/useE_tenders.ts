// src/hooks/useE_tenders.ts
"use client";

import { useCallback } from 'react';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, type DocumentData, Timestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useAuth } from './useAuth';
import type { E_tenderFormData } from '@/lib/schemas/eTenderSchema';
import { toast } from './use-toast';
import { useDataStore } from './use-data-store';
import { SUPER_ADMIN_EMAIL } from '@/lib/config';

const db = getFirestore(app);

export type E_tender = E_tenderFormData & {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const processDoc = (docSnap: DocumentData): E_tender => {
    const data = docSnap.data();
    
    // Helper function to recursively process any value
    const processValue = (value: any): any => {
        if (value instanceof Timestamp) {
            return value.toDate();
        }
        if (Array.isArray(value)) {
            return value.map(processValue); // Recurse for items in array
        }
        if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            // It's a plain object (a map in Firestore terms)
            const nestedObject: { [key: string]: any } = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    nestedObject[key] = processValue(value[key]);
                }
            }
            return nestedObject;
        }
        // Return primitives, Dates, or null as is
        return value;
    };

    // Process the document data
    const convertedData = processValue(data);

    // Add the document ID to the final object
    if (docSnap.id) {
        convertedData.id = docSnap.id;
    }
    
    return convertedData as E_tender;
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

export function useE_tenders() {
    const { user } = useAuth();
    const { allE_tenders, isLoading: dataStoreLoading, selectedOffice } = useDataStore();
    
    const addTender = useCallback(async (tenderData: Omit<E_tender, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        if (!user) throw new Error("User must be logged in to add a tender.");
        if (!user.officeLocation) throw new Error("User has no office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
        const payload = { ...tenderData, officeLocation: user.officeLocation, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        if ('id' in payload) {
            delete (payload as any).id;
        }
        const sanitizedPayload = sanitizeDataForFirestore(payload);
        const docRef = await addDoc(collection(db, collectionPath), sanitizedPayload);
        return docRef.id;
    }, [user]);

    const updateTender = useCallback(async (id: string, tenderData: Partial<E_tender>) => {
        if (!user) throw new Error("User must be logged in to update a tender.");
        if (!user.officeLocation) throw new Error("User has no office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
        const docRef = doc(db, collectionPath, id);
        const payload = { ...tenderData, updatedAt: serverTimestamp() };
        if ('id' in payload) delete (payload as any).id;
        const sanitizedPayload = sanitizeDataForFirestore(payload);
        await updateDoc(docRef, sanitizedPayload);
    }, [user]);

    const deleteTender = useCallback(async (id: string) => {
        if (!user || !['admin', 'engineer', 'scientist'].includes(user.role)) {
            toast({ title: "Permission Denied", description: "You don't have permission to delete tenders.", variant: "destructive" });
            return;
        }
        if (!user.officeLocation) throw new Error("User has no office location.");
        const collectionPath = `offices/${user.officeLocation.toLowerCase()}/eTenders`;
        await deleteDoc(doc(db, collectionPath, id));
    }, [user]);
    
    const getTender = useCallback(async (id: string): Promise<E_tender | null> => {
        // First, try to find the tender in the already-loaded list. This is the most reliable.
        const tenderFromList = allE_tenders.find(t => t.id === id);
        if (tenderFromList) {
            return tenderFromList;
        }
    
        // If not in the list (e.g., race condition or direct access), fallback to a direct fetch.
        if (!user) return null;
    
        const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
        const officeToQuery = isSuperAdmin ? selectedOffice : user.officeLocation;
    
        // If there's no specific office to query, we can't fetch a single doc.
        if (!officeToQuery) {
            return null;
        }
    
        try {
            const collectionPath = `offices/${officeToQuery.toLowerCase()}/eTenders`;
            const docRef = doc(db, collectionPath, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return processDoc(docSnap);
            }
            return null;
        } catch (error) {
            console.error("Error fetching tender by ID:", error);
            return null;
        }
    }, [user, selectedOffice, allE_tenders]);

    return { 
        tenders: allE_tenders, 
        isLoading: dataStoreLoading, 
        addTender, 
        updateTender, 
        deleteTender, 
        getTender, 
    };
}
