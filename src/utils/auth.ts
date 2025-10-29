/**
 * Authentication Utilities
 * 
 * Helper functions for verifying user authentication and admin status
 */

import { NextRequest } from 'next/server';
import { auth } from '@/config/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// Admin emails from environment
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [
  '703deuce@gmail.com'
];

/**
 * Get user email from request headers
 * This is set by the client in authenticated requests
 */
export function getUserEmailFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-email');
}

/**
 * Check if an email is an admin email
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Verify admin access from API request
 * 
 * This function checks for admin access via the request headers.
 * For API routes, the client should include 'x-user-email' header.
 * 
 * For more secure authentication, use Firebase Admin SDK on the server.
 */
export async function verifyAdmin(request: NextRequest): Promise<{ email: string } | null> {
  try {
    const email = getUserEmailFromRequest(request);
    
    if (!email) {
      return null;
    }

    if (isAdminEmail(email)) {
      return { email };
    }

    return null;
  } catch (error) {
    console.error('Error verifying admin:', error);
    return null;
  }
}

/**
 * Require authentication for API routes
 * Returns user email or null
 */
export async function requireAuth(request: NextRequest): Promise<string | null> {
  const email = getUserEmailFromRequest(request);
  
  if (!email) {
    return null;
  }

  return email;
}

/**
 * Get current Firebase Auth user (client-side)
 */
export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

