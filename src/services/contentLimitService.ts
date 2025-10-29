import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface WordLimitStatus {
  canGenerate: boolean;
  reason?: string;
  monthlyLimit: number;
  wordsUsed: number;
  wordsRemaining: number;
  boostWords: number;
  totalAvailable: number;
}

export interface DeductWordsResult {
  success: boolean;
  newWordsUsed: number;
  newBoostWords: number;
}

class ContentLimitService {
  /**
   * Check if user can generate content with specified word count
   */
  async checkCanGenerate(estimatedWords: number = 0): Promise<WordLimitStatus> {
    const user = auth.currentUser;
    
    if (!user) {
      return {
        canGenerate: false,
        reason: 'You must be logged in to generate content.',
        monthlyLimit: 0,
        wordsUsed: 0,
        wordsRemaining: 0,
        boostWords: 0,
        totalAvailable: 0,
      };
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        return {
          canGenerate: false,
          reason: 'User account not found.',
          monthlyLimit: 0,
          wordsUsed: 0,
          wordsRemaining: 0,
          boostWords: 0,
          totalAvailable: 0,
        };
      }

      const userData = userDoc.data();

      // Get user's limits
      const monthlyLimit = userData?.monthlyWordLimit || 0;
      const wordsUsed = userData?.wordsUsedThisMonth || 0;
      const boostWords = userData?.boostWords || 0;
      const subscriptionStatus = userData?.subscriptionStatus;
      const subscriptionPlan = userData?.subscriptionPlan;

      // Check if in trial
      const isInTrial = userData?.trial?.isActive === true;
      const trialWords = isInTrial ? (userData?.trial?.contentWords || 2000) : 0;
      const trialWordsUsed = isInTrial ? (userData?.trial?.contentWordsUsed || 0) : 0;
      const trialWordsRemaining = isInTrial ? Math.max(0, trialWords - trialWordsUsed) : 0;

      // Calculate total available words
      const monthlyRemaining = Math.max(0, monthlyLimit - wordsUsed);
      const totalAvailable = monthlyRemaining + boostWords + trialWordsRemaining;
      
      // No subscription and no trial
      if (subscriptionStatus !== 'active' && !isInTrial) {
        return {
          canGenerate: false,
          reason: 'You need an active subscription to generate content. Please upgrade to continue.',
          monthlyLimit: 0,
          wordsUsed: 0,
          wordsRemaining: 0,
          boostWords: 0,
          totalAvailable: 0,
        };
      }

      // Transcription-only plan (no content generation)
      if (subscriptionPlan === 'transcription-only' && boostWords === 0 && !isInTrial) {
        return {
          canGenerate: false,
          reason: 'Your current plan does not include content generation. Upgrade to Creator, Pro, or Studio plan, or purchase a word boost.',
          monthlyLimit: 0,
          wordsUsed: 0,
          wordsRemaining: 0,
          boostWords: 0,
          totalAvailable: 0,
        };
      }

      // Check if user has enough words (if estimate is provided)
      // Note: We allow generation even with fewer words - the system will adjust
      if (estimatedWords > 0 && totalAvailable === 0) {
        return {
          canGenerate: false,
          reason: `You have 0 words remaining. ${boostWords > 0 ? 'Your boost words have been used.' : 'Purchase a word boost or upgrade your plan to continue.'}`,
          monthlyLimit,
          wordsUsed,
          wordsRemaining: monthlyRemaining,
          boostWords,
          totalAvailable,
        };
      }

      return {
        canGenerate: true,
        monthlyLimit,
        wordsUsed,
        wordsRemaining: monthlyRemaining,
        boostWords,
        totalAvailable,
      };

    } catch (error) {
      console.error('❌ Error checking content generation limits:', error);
      return {
        canGenerate: false,
        reason: 'Error checking your limits. Please try again.',
        monthlyLimit: 0,
        wordsUsed: 0,
        wordsRemaining: 0,
        boostWords: 0,
        totalAvailable: 0,
      };
    }
  }

  /**
   * Deduct words from user's limit after content generation
   * Uses this priority: Monthly limit → Boost words → Trial words
   */
  async deductWords(wordsGenerated: number): Promise<DeductWordsResult> {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User must be logged in');
    }

    return this.deductWordsForUser(user.uid, wordsGenerated);
  }

  /**
   * Deduct words from a specific user's limit (server-side version)
   * Uses this priority: Trial words → Monthly limit → Boost words
   */
  async deductWordsForUser(userId: string, wordsGenerated: number): Promise<DeductWordsResult> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User account not found');
      }

      const userData = userDoc.data();
      const monthlyLimit = userData?.monthlyWordLimit || 0;
      const wordsUsed = userData?.wordsUsedThisMonth || 0;
      const boostWords = userData?.boostWords || 0;

      // Check if in trial
      const isInTrial = userData?.trial?.isActive === true;
      const trialWordsUsed = isInTrial ? (userData?.trial?.contentWordsUsed || 0) : 0;

      let remainingToDeduct = wordsGenerated;
      let newWordsUsed = wordsUsed;
      let newBoostWords = boostWords;
      let newTrialWordsUsed = trialWordsUsed;

      // Priority 1: Use trial words if in trial
      if (isInTrial && remainingToDeduct > 0) {
        const trialWords = userData?.trial?.contentWords || 2000;
        const trialAvailable = Math.max(0, trialWords - trialWordsUsed);
        const fromTrial = Math.min(remainingToDeduct, trialAvailable);
        newTrialWordsUsed += fromTrial;
        remainingToDeduct -= fromTrial;
      }

      // Priority 2: Use monthly allocation
      if (remainingToDeduct > 0 && monthlyLimit > 0) {
        const monthlyAvailable = Math.max(0, monthlyLimit - wordsUsed);
        const fromMonthly = Math.min(remainingToDeduct, monthlyAvailable);
        newWordsUsed += fromMonthly;
        remainingToDeduct -= fromMonthly;
      }

      // Priority 3: Use boost words
      if (remainingToDeduct > 0 && boostWords > 0) {
        const fromBoost = Math.min(remainingToDeduct, boostWords);
        newBoostWords -= fromBoost;
        remainingToDeduct -= fromBoost;
      }

      // Update Firestore
      const updateData: any = {
        wordsUsedThisMonth: newWordsUsed,
        boostWords: newBoostWords,
        updatedAt: serverTimestamp(),
      };

      if (isInTrial) {
        updateData['trial.contentWordsUsed'] = newTrialWordsUsed;
      }

      await updateDoc(userRef, updateData);

      console.log(`✅ Deducted ${wordsGenerated} words from user ${userId}. Monthly: ${newWordsUsed}/${monthlyLimit}, Boost: ${newBoostWords}${isInTrial ? `, Trial: ${newTrialWordsUsed}` : ''}`);

      return {
        success: true,
        newWordsUsed,
        newBoostWords,
      };

    } catch (error) {
      console.error('❌ Error deducting words for user:', userId, error);
      throw error;
    }
  }

  /**
   * Get current word limit status for display
   */
  async getWordLimitStatus(): Promise<WordLimitStatus> {
    return this.checkCanGenerate(0);
  }

  /**
   * Reset monthly usage (called by a scheduled function on the 1st of each month)
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        wordsUsedThisMonth: 0,
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Reset monthly word usage for user ${userId}`);
    } catch (error) {
      console.error('❌ Error resetting monthly usage:', error);
      throw error;
    }
  }
}

export const contentLimitService = new ContentLimitService();
export default contentLimitService;

