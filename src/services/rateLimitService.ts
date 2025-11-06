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
  // Rate limits per feature type and tier
  private readonly LIMITS = {
    trial: {
      stt: { perHour: 5, concurrent: 2 },
      'ai-summary': { perHour: 10, concurrent: 3 },
      'content-repurpose': { perHour: 5, concurrent: 2 }
    },
    'transcription-only': {
      stt: { perHour: 20, concurrent: 5 },
      'ai-summary': { perHour: 50, concurrent: 10 },
      'content-repurpose': { perHour: 20, concurrent: 5 }
    },
    creator: {
      stt: { perHour: 100, concurrent: 20 },
      'ai-summary': { perHour: 500, concurrent: 50 },
      'content-repurpose': { perHour: 100, concurrent: 20 }
    },
    default: {
      stt: { perHour: 5, concurrent: 2 },
      'ai-summary': { perHour: 10, concurrent: 3 },
      'content-repurpose': { perHour: 5, concurrent: 2 }
    }
  };

  /**
   * Check if user can submit a new job for a specific feature
   * @param userId - User ID to check
   * @param featureType - Type of feature: 'stt', 'ai-summary', or 'content-repurpose'
   * @returns Rate limit result with allowed status and reason
   */
  async canUserSubmitJob(userId?: string, featureType: 'stt' | 'ai-summary' | 'content-repurpose' = 'stt'): Promise<RateLimitResult> {
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

      const tierLimits = this.LIMITS[planKey] || this.LIMITS.default;
      const limits = tierLimits[featureType] || tierLimits.stt; // Fallback to STT limits

      // Determine collection based on feature type
      const collectionName = featureType === 'stt' 
        ? 'stt' 
        : featureType === 'ai-summary' 
          ? 'ai-summary' 
          : 'content-repurpose';
      
      const featureCollection = collection(db, 'users', targetUserId, collectionName);

      // Check hourly limit (jobs created in last hour)
      const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
      
      // Get count of recent jobs (last hour)
      // Use 'created_at' for AI features, 'createdAt' for STT
      const createdAtField = featureType === 'stt' ? 'createdAt' : 'created_at';
      const recentJobsQuery = query(
        featureCollection,
        where(createdAtField, '>=', oneHourAgo)
      );
      
      const recentJobsSnapshot = await getDocs(recentJobsQuery);
      const perHourCount = recentJobsSnapshot.size;

      // Check concurrent limit (active jobs)
      const activeJobsQuery = query(
        featureCollection,
        where('status', 'in', ['queued', 'processing'])
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

