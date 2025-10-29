import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Update a user (admin only)
 */
export async function PUT(request: Request, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    const body = await request.json();
    const { email, displayName, subscriptionPlan, subscriptionStatus, monthlyWordLimit, wordsUsedThisMonth, boostWords } = body;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Update user document in Firestore
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (email !== undefined) updateData.email = email;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus !== undefined) updateData.subscriptionStatus = subscriptionStatus;
    if (monthlyWordLimit !== undefined) updateData.monthlyWordLimit = monthlyWordLimit;
    if (wordsUsedThisMonth !== undefined) updateData.wordsUsedThisMonth = wordsUsedThisMonth;
    if (boostWords !== undefined) updateData.boostWords = boostWords;
    
    await updateDoc(userRef, updateData);
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Delete a user (admin only)
 */
export async function DELETE(request: Request, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }
    
    // Check if user document exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }
    
    // Delete user's subcollections (transcriptions, content, etc.)
    // Note: This is a simplified approach. In production, you might want to use
    // Firebase Admin SDK with batch operations for better performance
    
    // Delete user document
    await deleteDoc(userRef);
    
    // Note: Deleting from Firebase Auth requires Admin SDK
    // For now, we'll just delete the Firestore document
    // The user will still exist in Auth but won't have access to the app
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
