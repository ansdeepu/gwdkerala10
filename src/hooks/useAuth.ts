
// src/hooks/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, Timestamp, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { type UserRole, type Designation } from '@/lib/schemas';
import { useToast } from "@/hooks/use-toast"; 
import { SUPER_ADMIN_EMAIL } from '@/lib/config';

const auth = getAuth(app);
const db = getFirestore(app);

export interface UserProfile {
  uid: string;
  email: string | null;
  name?: string;
  role: UserRole;
  isApproved: boolean;
  staffId?: string;
  designation?: Designation;
  officeLocation?: string; 
  createdAt?: Date;
  lastActiveAt?: Date;
}

/**
 * Updates the user's last active timestamp in both global and office-scoped collections.
 * Uses setDoc with merge to ensure the record exists (self-healing).
 */
export const updateUserLastActive = async (uid: string, officeLocation?: string): Promise<void> => {
  if (!uid) return;
  
  const batch = writeBatch(db);
  const now = Timestamp.now();
  
  // Update global doc
  batch.set(doc(db, "users", uid), { lastActiveAt: now }, { merge: true });
  
  // Update office-scoped doc if applicable
  if (officeLocation) {
    batch.set(doc(db, `offices/${officeLocation.toLowerCase()}/users`, uid), { 
        lastActiveAt: now,
        officeLocation: officeLocation.toLowerCase() // Ensure the field exists for filtering
    }, { merge: true });
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error("Failed to update user activity:", error);
  }
};

// Helper to convert Firestore Timestamps to JS Dates recursively
const processData = (data: any): any => {
    if (!data) return data;
    if (data instanceof Timestamp) {
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(processData);
    }
    if (typeof data === 'object' && !(data instanceof Date)) {
        const converted: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                converted[key] = processData(data[key]);
            }
        }
        return converted;
    }
    return data;
};


export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isAuthenticating: false,
    user: null,
    firebaseUser: null,
  });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true; 
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setAuthState({ isAuthenticated: false, isLoading: false, isAuthenticating: false, user: null, firebaseUser: null });
        return;
      }

      try {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userProfile: UserProfile | null = null;
        const isAdminByEmail = firebaseUser.email?.toLowerCase() === (SUPER_ADMIN_EMAIL || '').toLowerCase();

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const isApproved = isAdminByEmail || userData.isApproved === true;
            
            const officeLocation = isAdminByEmail ? undefined : userData.officeLocation;

            userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: userData.name ? String(userData.name) : undefined,
                role: isAdminByEmail ? 'superAdmin' : (userData.role || 'viewer'),
                isApproved: isApproved,
                staffId: userData.staffId || undefined,
                officeLocation: officeLocation,
                createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(),
                lastActiveAt: userData.lastActiveAt instanceof Timestamp ? userData.lastActiveAt.toDate() : undefined,
            };
        } else if (isAdminByEmail) {
            userProfile = {
                uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.email?.split('@')[0],
                role: 'superAdmin', isApproved: true,
                createdAt: new Date(),
            };
            await setDoc(doc(db, "users", firebaseUser.uid), {
                email: firebaseUser.email, name: userProfile.name, role: 'superAdmin', isApproved: true, createdAt: Timestamp.now(),
            });
        }
        
        if (!isMounted) return;

        if (userProfile && userProfile.isApproved) {
            updateUserLastActive(userProfile.uid, userProfile.officeLocation);
            setAuthState({ isAuthenticated: true, isLoading: false, isAuthenticating: false, user: userProfile, firebaseUser });
        } else {
             if (auth.currentUser) {
                try { await signOut(auth); } catch (signOutError) {}
            }
            setAuthState({ isAuthenticated: false, isLoading: false, isAuthenticating: false, user: userProfile, firebaseUser: null });
            
            if (userProfile && !userProfile.isApproved) {
                toast({
                    title: "Account Pending Approval",
                    description: "Your account is not yet approved. Contact administrator for activation.",
                    variant: "destructive",
                });
            }
        }
      } catch (error: any) {
        console.error('[Auth] Error:', error);
        if (isMounted) {
            setAuthState({ isAuthenticated: false, isLoading: false, isAuthenticating: false, user: null, firebaseUser: null });
        }
      }
    });

    return () => { isMounted = false; unsubscribe(); };
  }, [toast]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: any }> => {
    setAuthState(prevState => ({ ...prevState, isAuthenticating: true }));
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error: any) {
      setAuthState(prevState => ({ ...prevState, isAuthenticating: false }));
      return { success: false, error: error };
    }
  }, []);

  const createUserByAdmin = useCallback(async (email: string, password: string, name: string, staffId: string, officeLocation: string, role: UserRole = 'viewer'): Promise<{ success: boolean; error?: any }> => {
    if (!authState.user || (authState.user.role !== 'admin' && authState.user.role !== 'superAdmin')) {
      return { success: false, error: { message: "Permission denied." } };
    }
  
    const tempAppName = `temp-app-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);
  
    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newFirebaseUser = userCredential.user;
  
      const globalProfileData = {
        email: newFirebaseUser.email,
        name: name,
        staffId: staffId,
        role: role,
        isApproved: false,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now(),
        officeLocation: (officeLocation || '').toLowerCase(),
      };
      
      const batch = writeBatch(db);
      batch.set(doc(db, "users", newFirebaseUser.uid), globalProfileData);
      batch.set(doc(db, `offices/${(officeLocation || '').toLowerCase()}/users`, newFirebaseUser.uid), globalProfileData);
  
      await batch.commit();
      await signOut(tempAuth);
      await deleteApp(tempApp);
  
      return { success: true };
    } catch (error: any) {
      await deleteApp(tempApp).catch(() => {});
      return { success: false, error };
    }
  }, [authState.user]);
  
  const createOfficeAdmin = useCallback(async (email: string, name: string, officeLocation: string): Promise<{ success: boolean; error?: any }> => {
    if (!authState.user || authState.user.role !== 'superAdmin') {
      return { success: false, error: { message: "Permission denied." } };
    }

    const tempAppName = `temp-office-setup-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);
    const defaultPassword = "123456";

    try {
      const emailPrefix = (email || '').split('@')[0];
      const accounts = [
        { email, name, role: 'admin' as UserRole },
        { email: `${emailPrefix}001@gmail.com`, name: `Scientist - ${officeLocation}`, role: 'scientist' as UserRole },
        { email: `${emailPrefix}002@gmail.com`, name: `Engineer - ${officeLocation}`, role: 'engineer' as UserRole },
      ];

      const batch = writeBatch(db);

      for (const acc of accounts) {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, acc.email, defaultPassword);
        const uid = userCredential.user.uid;
        
        const globalProfile = {
          email: acc.email,
          name: acc.name,
          role: acc.role,
          isApproved: true,
          createdAt: Timestamp.now(),
          lastActiveAt: Timestamp.now(),
          officeLocation: (officeLocation || '').toLowerCase(),
        };

        batch.set(doc(db, "users", uid), globalProfile);
        batch.set(doc(db, `offices/${(officeLocation || '').toLowerCase()}/users`, uid), globalProfile);
      }
      
      await batch.commit();
      await signOut(tempAuth);
      await deleteApp(tempApp);

      return { success: true };
    } catch (error: any) {
      await deleteApp(tempApp).catch(() => {});
      return { success: false, error };
    }
  }, [authState.user]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("[Auth] Logout error:", error);
    }
  }, [router]);

  const fetchAllUsers = useCallback(async (): Promise<UserProfile[]> => {
    if (!authState.user || (authState.user.role !== 'admin' && authState.user.role !== 'superAdmin')) {
      return [];
    }
    
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      return querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const processed = processData(data);
          const id = docSnap.id;
          return {
              ...processed,
              uid: id,
              id: id,
              email: data.email || null,
              role: data.role || 'viewer',
              isApproved: data.isApproved === true,
          } as UserProfile;
      });
    } catch (error: any) {
      throw error;
    }
  }, [authState.user]); 

  const updateUserApproval = useCallback(async (targetUserUid: string, isApproved: boolean, officeLocation?: string): Promise<void> => {
    if (!authState.user || (authState.user.role !== 'admin' && authState.user.role !== 'superAdmin')) {
      throw new Error("Permission denied.");
    }
    if (!targetUserUid) throw new Error("Target user ID is missing.");

    const batch = writeBatch(db);
    batch.update(doc(db, "users", targetUserUid), { isApproved });
    if (officeLocation) {
        batch.update(doc(db, `offices/${(officeLocation || '').toLowerCase()}/users`, targetUserUid), { isApproved });
    }
    await batch.commit();
  }, [authState.user]);

  const handleSupervisorCleanup = useCallback(async (uid: string, officeId: string) => {
    if (!uid || !officeId) return;
    const batch = writeBatch(db);
    const officePath = `offices/${(officeId || '').toLowerCase()}`;
    
    const filesQuery = query(collection(db, `${officePath}/fileEntries`));
    const filesSnap = await getDocs(filesQuery);
    filesSnap.forEach(fDoc => {
        const data = fDoc.data();
        let changed = false;
        const newSites = (data.siteDetails || []).map((s: any) => {
            if (s.supervisorUid === uid && s.workStatus && (["Work Order Issued", "Work in Progress"] || []).includes(s.workStatus)) {
                changed = true;
                return { ...s, supervisorUid: null, supervisorName: null, supervisorDesignation: null };
            }
            return s;
        });
        if (changed) {
            batch.update(fDoc.ref, { siteDetails: newSites });
            const notifRef = doc(collection(db, `${officePath}/pendingUpdates`));
            batch.set(notifRef, {
                fileNo: data.fileNo || 'N/A',
                status: 'supervisor-unassigned',
                notes: 'Work status file has no assigned Supervisor (user account deleted).',
                submittedAt: serverTimestamp(),
                submittedByName: 'System',
                isArsUpdate: false,
                updatedSiteDetails: newSites.filter((s:any) => s.supervisorUid === null)
            });
        }
    });

    const arsQuery = query(collection(db, `${officePath}/arsEntries`), where('supervisorUid', '==', uid));
    const arsSnap = await getDocs(arsQuery);
    arsSnap.forEach(aDoc => {
        const data = aDoc.data();
        if (data.arsStatus && (["Work Order Issued", "Work in Progress"] || []).includes(data.arsStatus)) {
            batch.update(aDoc.ref, { supervisorUid: null, supervisorName: null });
            const notifRef = doc(collection(db, `${officePath}/pendingUpdates`));
            batch.set(notifRef, {
                arsId: aDoc.id,
                fileNo: data.fileNo || 'N/A',
                status: 'supervisor-unassigned',
                notes: 'ARS Work status file has no assigned Supervisor (user account deleted).',
                submittedAt: serverTimestamp(),
                submittedByName: 'System',
                isArsUpdate: true,
                updatedSiteDetails: [{ ...data, supervisorUid: null, supervisorName: null }]
            });
        }
    });

    await batch.commit();
  }, []);

  const updateUserRole = useCallback(async (targetUserUid: string, newRole: UserRole, staffId?: string, officeLocation?: string): Promise<void> => {
    if (!authState.user || (authState.user.role !== 'admin' && authState.user.role !== 'superAdmin')) {
        throw new Error("Permission denied.");
    }
    if (!targetUserUid) throw new Error("Target user ID is missing.");
    
    const userRef = doc(db, "users", targetUserUid);
    const oldSnap = await getDoc(userRef);
    const oldRole = oldSnap.exists() ? oldSnap.data()?.role : null;

    const batch = writeBatch(db);
    const updates: any = { role: newRole };
    if (staffId) {
        updates.staffId = staffId;
    }

    batch.update(userRef, updates);
    if (officeLocation) {
        batch.update(doc(db, `offices/${(officeLocation || '').toLowerCase()}/users`, targetUserUid), updates);
    }
    await batch.commit();

    if ((oldRole === 'supervisor' || oldRole === 'investigator') && newRole !== 'supervisor' && newRole !== 'investigator' && officeLocation) {
        await handleSupervisorCleanup(targetUserUid, officeLocation);
    }
  }, [authState.user, handleSupervisorCleanup]);

  const deleteUserDocument = useCallback(async (targetUserUid: string, officeLocation?: string): Promise<void> => {
    if (!authState.user || (authState.user.role !== 'admin' && authState.user.role !== 'superAdmin')) {
        throw new Error("Permission denied.");
    }
    if (!targetUserUid) throw new Error("Target user ID is missing.");
    if (authState.user.uid === targetUserUid) {
        throw new Error("You cannot delete yourself.");
    }

    const userRef = doc(db, "users", targetUserUid);
    const userSnap = await getDoc(userRef);

    const userToDeleteData = userSnap.exists() ? userSnap.data() : null;
    const effectiveOfficeLocation = officeLocation || userToDeleteData?.officeLocation;
    const userRole = userToDeleteData?.role;

    if (effectiveOfficeLocation && typeof effectiveOfficeLocation === 'string') {
        if (userRole === 'supervisor' || userRole === 'investigator') {
            await handleSupervisorCleanup(targetUserUid, effectiveOfficeLocation);
        }
    }

    const batch = writeBatch(db);
    
    if (userSnap.exists()) {
        batch.delete(userRef);
    }
    
    if (effectiveOfficeLocation && typeof effectiveOfficeLocation === 'string') {
        const officeUserRef = doc(db, `offices/${effectiveOfficeLocation.toLowerCase()}/users`, targetUserUid);
        batch.delete(officeUserRef);
    }

    await batch.commit();

}, [authState.user, handleSupervisorCleanup]);


  const updatePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: any }> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, error: { message: "No user found." } };
    }

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await firebaseUpdatePassword(firebaseUser, newPassword);
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  }, []);
  
  const updateUserProfileByAdmin = useCallback(async (targetUserUid: string, data: { name?: string; officeLocation?: string; role?: UserRole; isApproved?: boolean }): Promise<{ success: boolean; error?: any }> => {
    if (!targetUserUid) return { success: false, error: { message: "User ID is required." } };
    if (authState.user?.role !== 'superAdmin') {
        return { success: false, error: { message: "Permission denied." } };
    }
    try {
        const batch = writeBatch(db);
        const { officeLocation, ...globalData } = data;
        
        if (Object.keys(globalData).length > 0) {
          batch.update(doc(db, "users", targetUserUid), globalData);
        }

        if (officeLocation) {
            const officePayload = { ...data, officeLocation: (officeLocation || '').toLowerCase() };
            batch.update(doc(db, `offices/${(officeLocation || '').toLowerCase()}/users`, targetUserUid), officePayload);
        }
        await batch.commit();
        return { success: true };
    } catch(error: any) {
        return { success: false, error };
    }
  }, [authState.user]);

  const updateSuperAdminProfile = useCallback(async (newName: string): Promise<{ success: boolean; error?: any }> => {
    if (!auth.currentUser || authState.user?.role !== 'superAdmin') {
      return { success: false, error: { message: "Permission denied." } };
    }

    try {
      await firebaseUpdateProfile(auth.currentUser, { displayName: newName });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { name: newName });
      setAuthState(prev => ({ ...prev, user: prev.user ? { ...prev.user, name: newName } : null }));
      return { success: true };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [authState.user]);
  
  const createDirectorateUser = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: any }> => {
    if (authState.user?.role !== 'superAdmin') {
        return { success: false, error: { message: "Permission denied." } };
    }

    const tempAppName = `temp-dir-app-${Date.now()}`;
    const tempApp = initializeApp(app.options, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
        const newFirebaseUser = userCredential.user;

        const userProfileData = {
            email: newFirebaseUser.email,
            name: name,
            officeLocation: null, 
            role: 'viewer' as UserRole,
            isApproved: true, 
            createdAt: Timestamp.now(),
            lastActiveAt: Timestamp.now(),
        };

        await setDoc(doc(db, "users", newFirebaseUser.uid), userProfileData);
        
        await signOut(tempAuth);
        await deleteApp(tempApp);

        return { success: true };
    } catch (error: any) {
        await deleteApp(tempApp).catch(() => {});
        return { success: false, error };
    }
  }, [authState.user]);

  return { ...authState, login, logout, fetchAllUsers, updateUserApproval, updateUserRole, deleteUserDocument, createUserByAdmin, createOfficeAdmin, updatePassword, updateSuperAdminProfile, updateUserProfileByAdmin, createDirectorateUser };
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean;
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
}
