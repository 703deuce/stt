import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Send password reset email to user (admin only)
 */
export async function POST(request: Request, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { email } = body;
    
    if (!userId || !email) {
      return NextResponse.json({
        success: false,
        error: 'User ID and email are required'
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 });
    }
    
    // Send password reset email
    await sendPasswordResetEmail(auth, email, {
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
      handleCodeInApp: false
    });
    
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
      email: email
    });
    
  } catch (error: any) {
    console.error('Failed to send password reset email:', error);
    
    // Handle specific Firebase Auth errors
    let errorMessage = error.message;
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No user found with this email address';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many requests. Please try again later';
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
