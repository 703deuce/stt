import { db, auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Service for determining job priority based on user subscription status
 * Priority levels (lower = higher priority):
 * - 1: Transcription with Content plan (highest priority)
 * - 2: Transcription Only plan (medium priority)
 * - 3: Free/Trial users (lowest priority)
 */
class JobPriorityService {
  /**
   * Get priority for a user based on their subscription plan
   * @param userId - Optional user ID, defaults to current user
   * @returns Priority number (lower = higher priority: 1, 2, or 3)
   */
  async getUserPriority(userId?: string): Promise<number> {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      
      if (!targetUserId) {
        console.warn('⚠️ No user ID provided, using default priority');
        return 3; // Default priority (lowest)
      }

      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      
      if (!userDoc.exists()) {
        console.warn('⚠️ User document not found, using default priority');
        return 3; // Default priority (lowest)
      }

      const userData = userDoc.data();
      const subscriptionPlan = userData?.subscriptionPlan;
      const subscriptionStatus = userData?.subscriptionStatus;

      // Transcription with Content plan gets highest priority (Priority 1)
      if (subscriptionStatus === 'active' && subscriptionPlan === 'creator') {
        return 1;
      }

      // Transcription Only plan gets medium priority (Priority 2)
      if (subscriptionStatus === 'active' && subscriptionPlan === 'transcription-only') {
        return 2;
      }

      // Free/Trial users get lowest priority (Priority 3)
      return 3;
    } catch (error) {
      console.error('❌ Error getting user priority:', error);
      return 3; // Default to lowest priority on error
    }
  }

  /**
   * Get priority synchronously (returns default if user data not available)
   * Use this when you need priority but can't wait for async call
   */
  getUserPrioritySync(): number {
    // For now, return default priority (lowest)
    // In the future, you could cache user data in localStorage or context
    return 3;
  }
}

export const jobPriorityService = new JobPriorityService();

