/**
 * Express Request type augmentation for authenticated user data.
 * This file exists as a fallback for IDEs that may not pick up
 * the global declaration in auth.middleware.ts.
 */
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
