import { db, auth } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Service for determining job priority based on user subscription status
 * Priority levels:
 * - 1: Premium/Team plan (highest priority)
 * - 3: Creator plan (medium-high priority)
 * - 5: Standard/Trial users (default priority)
 */
class JobPriorityService {
  /**
   * Get priority for a user based on their subscription plan
   * @param userId - Optional user ID, defaults to current user
   * @returns Priority number (lower = higher priority)
   */
  async getUserPriority(userId?: string): Promise<number> {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      
      if (!targetUserId) {
        console.warn('⚠️ No user ID provided, using default priority');
        return 5; // Default priority
      }

      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      
      if (!userDoc.exists()) {
        console.warn('⚠️ User document not found, using default priority');
        return 5;
      }

      const userData = userDoc.data();
      const subscriptionPlan = userData?.subscriptionPlan;
      const subscriptionStatus = userData?.subscriptionStatus;

      // Premium/Team plans get highest priority
      if (subscriptionStatus === 'active' && (subscriptionPlan === 'team' || subscriptionPlan === 'studio')) {
        return 1;
      }

      // Creator plan gets medium-high priority
      if (subscriptionStatus === 'active' && subscriptionPlan === 'creator') {
        return 3;
      }

      // Standard/Trial users get default priority
      return 5;
    } catch (error) {
      console.error('❌ Error getting user priority:', error);
      return 5; // Default to lowest priority on error
    }
  }

  /**
   * Get priority synchronously (returns default if user data not available)
   * Use this when you need priority but can't wait for async call
   */
  getUserPrioritySync(): number {
    // For now, return default priority
    // In the future, you could cache user data in localStorage or context
    return 5;
  }
}

export const jobPriorityService = new JobPriorityService();

