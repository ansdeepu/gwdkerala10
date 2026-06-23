// src/components/FirebaseErrorListener.tsx
'use client';

import React, { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { toast } from '@/hooks/use-toast';

// This component should be placed high in your component tree,
// ideally within your main Firebase provider.
export default function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: Error) => {
      if (!(error instanceof FirestorePermissionError)) {
        // Safety guard – should never happen, but keeps TS happy
        console.error("Unknown error received:", error);
        return;
      }
    
      console.error(
        "Firestore Permission Error Caught:",
        JSON.stringify(error, null, 2)
      );

      // In a development environment, we want to provide rich, actionable feedback.
      if (process.env.NODE_ENV === 'development') {
        // This will throw an error that Next.js will catch and display in its
        // development overlay, providing a clear and detailed message.
        throw error;
      } else {
        // In production, we fall back to a user-friendly toast notification.
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.',
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return null; // This component does not render anything.
}
