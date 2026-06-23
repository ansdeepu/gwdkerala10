// src/firebase/errors.ts

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `
Firestore Permission Denied: The following request was denied by Firestore Security Rules.

Review the details below and your security rules to resolve the issue.

  - Operation: ${context.operation.toUpperCase()}
  - Path: ${context.path}
  - Request Data: ${context.requestResourceData ? JSON.stringify(context.requestResourceData, null, 2) : 'N/A'}
`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is necessary for the stack trace to be correct
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FirestorePermissionError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }
}
