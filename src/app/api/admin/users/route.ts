import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Create a new user (admin only)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, displayName, subscriptionPlan, subscriptionStatus, monthlyWordLimit, boostWords } = body;
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name if provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Create user document in Firestore
    const userDoc = {
      email,
      displayName: displayName || '',
      subscriptionPlan: subscriptionPlan || 'trial',
      subscriptionStatus: subscriptionStatus || 'trial',
      monthlyWordLimit: monthlyWordLimit || 0,
      wordsUsedThisMonth: 0,
      boostWords: boostWords || 0,
      trial: {
        minutes: 30,
        used: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    return NextResponse.json({
      success: true,
      userId: user.uid,
      message: 'User created successfully'
    });
    
  } catch (error: any) {
    console.error('Failed to create user:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
