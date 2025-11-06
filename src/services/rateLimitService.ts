import { db, auth } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  Timestamp,
  count
} from 'firebase/firestore';

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  limits: {
    perHour: number;
    concurrent: number;
  };
  current: {
    perHour: number;
    concurrent: number;
  };
}

/**
 * Service for user-level rate limiting to prevent abuse
 * Prevents single users from overwhelming the system
 */
class RateLimitService {
  private readonly LIMITS = {
    trial: { perHour: 5, concurrent: 2 },
    'transcription-only': { perHour: 10, concurrent: 3 },
    creator: { perHour: 50, concurrent: 10 },
    team: { perHour: 200, concurrent: 50 },
    studio: { perHour: 500, concurrent: 100 },
    default: { perHour: 5, concurrent: 2 }
  };

  /**
   * Check if user can submit a new job
   * @param userId - User ID to check
   * @returns Rate limit result with allowed status and reason
   */
  async canUserSubmitJob(userId?: string): Promise<RateLimitResult> {
    try {
      const targetUserId = userId || auth.currentUser?.uid;
      
      if (!targetUserId) {
        return {
          allowed: false,
          reason: 'User not authenticated',
          limits: this.LIMITS.default,
          current: { perHour: 0, concurrent: 0 }
        };
      }

      // Get user's subscription plan
      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!userDoc.exists()) {
        return {
          allowed: false,
          reason: 'User not found',
          limits: this.LIMITS.default,
          current: { perHour: 0, concurrent: 0 }
        };
      }

      const userData = userDoc.data();
      const subscriptionPlan = userData?.subscriptionPlan || 'trial';
      const subscriptionStatus = userData?.subscriptionStatus || 'trial';

      // Determine plan limits
      let planKey: keyof typeof this.LIMITS = subscriptionPlan;
      if (!this.LIMITS[planKey] || subscriptionStatus !== 'active') {
        planKey = subscriptionStatus === 'active' ? 'default' : 'trial';
      }

      const limits = this.LIMITS[planKey] || this.LIMITS.default;

      // Check hourly limit (jobs created in last hour)
      const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
      const sttCollection = collection(db, 'users', targetUserId, 'stt');
      
      // Get count of recent jobs (last hour)
      const recentJobsQuery = query(
        sttCollection,
        where('createdAt', '>=', oneHourAgo)
      );
      
      const recentJobsSnapshot = await getDocs(recentJobsQuery);
      const perHourCount = recentJobsSnapshot.size;

      // Check concurrent limit (active jobs)
      const activeJobsQuery = query(
        sttCollection,
        where('status', 'in', ['queued', 'submitted', 'processing'])
      );
      
      const activeJobsSnapshot = await getDocs(activeJobsQuery);
      const concurrentCount = activeJobsSnapshot.size;

      // Check limits
      if (perHourCount >= limits.perHour) {
        return {
          allowed: false,
          reason: `Hourly limit exceeded. You can submit ${limits.perHour} jobs per hour.`,
          limits,
          current: { perHour: perHourCount, concurrent: concurrentCount }
        };
      }

      if (concurrentCount >= limits.concurrent) {
        return {
          allowed: false,
          reason: `Too many active jobs. Maximum ${limits.concurrent} concurrent jobs allowed.`,
          limits,
          current: { perHour: perHourCount, concurrent: concurrentCount }
        };
      }

      return {
        allowed: true,
        limits,
        current: { perHour: perHourCount, concurrent: concurrentCount }
      };
    } catch (error) {
      console.error('❌ Error checking rate limits:', error);
      // Fail open - allow job if rate limit check fails
      return {
        allowed: true,
        reason: 'Rate limit check failed, allowing job',
        limits: this.LIMITS.default,
        current: { perHour: 0, concurrent: 0 }
      };
    }
  }
}

export const rateLimitService = new RateLimitService();

