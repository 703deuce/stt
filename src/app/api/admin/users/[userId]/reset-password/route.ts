import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Reset user password directly (admin only)
 * Note: This requires the user to be currently signed in or using Firebase Admin SDK
 * For production, consider using Firebase Admin SDK instead
 */
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { newPassword } = body;
    
    if (!userId || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'User ID and new password are required'
      }, { status: 400 });
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 6 characters'
      }, { status: 400 });
    }
    
    // Note: This approach has limitations in a serverless environment
    // For production, you should use Firebase Admin SDK:
    // const admin = require('firebase-admin');
    // await admin.auth().updateUser(userId, { password: newPassword });
    
    // For now, we'll update the user document to track password changes
    // The actual password update would need to be done through Firebase Console
    // or using Firebase Admin SDK in a server environment
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      passwordResetRequired: true,
      passwordResetTimestamp: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Password reset initiated. User will need to reset password on next login.',
      note: 'For immediate password reset, use Firebase Admin SDK or Firebase Console'
    });
    
  } catch (error: any) {
    console.error('Failed to reset password:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
