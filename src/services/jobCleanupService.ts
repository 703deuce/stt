import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Service for cleaning up stalled/failed transcription jobs
 * Handles timeout detection and retry logic for 10K+ user scale
 */
class JobCleanupService {
  private readonly TIMEOUT_MINUTES = 30; // Jobs exceeding 30 minutes are considered stalled
  private readonly MAX_RETRIES = 3; // Maximum retry attempts

  /**
   * Clean up stalled processing jobs (jobs that exceeded timeout)
   * Should be called by a cron job every 5-10 minutes
   */
  async cleanupStalledJobs(): Promise<{
    cleaned: number;
    failed: number;
    retried: number;
    errors: string[];
  }> {
    console.log('🧹 Starting cleanup of stalled jobs...');
    
    const results = {
      cleaned: 0,
      failed: 0,
      retried: 0,
      errors: [] as string[]
    };

    try {
      // Calculate timeout threshold (30 minutes ago)
      const timeoutThreshold = new Date();
      timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - this.TIMEOUT_MINUTES);
      const timeoutTimestamp = Timestamp.fromDate(timeoutThreshold);

      // Query all users (we'll need to iterate through them)
      // Note: For 10K+ users, consider using Firestore collection groups or batch processing
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);

      console.log(`📊 Found ${usersSnapshot.size} users to check for stalled jobs`);

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const sttCollection = collection(db, 'users', userId, 'stt');

        try {
          // Find stalled processing jobs
          const stalledQuery = query(
            sttCollection,
            where('status', '==', 'processing'),
            where('createdAt', '<', timeoutTimestamp)
          );

          const stalledSnapshot = await getDocs(stalledQuery);

          for (const jobDoc of stalledSnapshot.docs) {
            const jobData = jobDoc.data();
            const retryCount = jobData.retryCount || 0;
            const maxRetries = jobData.maxRetries || this.MAX_RETRIES;

            try {
              if (retryCount < maxRetries) {
                // Retry the job
                console.log(`🔄 Retrying stalled job: ${jobDoc.id} (attempt ${retryCount + 1}/${maxRetries})`);
                
                await updateDoc(doc(db, 'users', userId, 'stt', jobDoc.id), {
                  status: 'queued', // Move back to queue for retry
                  retryCount: retryCount + 1,
                  error: `Job timeout - retrying (attempt ${retryCount + 1}/${maxRetries})`,
                  queuedAt: serverTimestamp()
                });

                results.retried++;
              } else {
                // Max retries exceeded - mark as failed
                console.log(`❌ Marking stalled job as failed (max retries exceeded): ${jobDoc.id}`);
                
                await updateDoc(doc(db, 'users', userId, 'stt', jobDoc.id), {
                  status: 'failed',
                  error: `Job timeout - exceeded ${this.TIMEOUT_MINUTES} minutes and max retries (${maxRetries})`,
                  retryCount: retryCount
                });

                results.failed++;
              }
              
              results.cleaned++;
            } catch (updateError) {
              const errorMsg = `Error updating job ${jobDoc.id}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`;
              console.error(`❌ ${errorMsg}`);
              results.errors.push(errorMsg);
            }
          }
        } catch (userError) {
          const errorMsg = `Error processing user ${userId}: ${userError instanceof Error ? userError.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      console.log(`✅ Cleanup complete: ${results.cleaned} jobs processed (${results.retried} retried, ${results.failed} failed)`);
      
      return results;
    } catch (error) {
      const errorMsg = `Fatal error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Clean up stalled jobs for a specific user (for testing or manual cleanup)
   */
  async cleanupStalledJobsForUser(userId: string): Promise<{
    cleaned: number;
    failed: number;
    retried: number;
  }> {
    console.log(`🧹 Cleaning up stalled jobs for user: ${userId}`);
    
    const results = {
      cleaned: 0,
      failed: 0,
      retried: 0
    };

    try {
      const timeoutThreshold = new Date();
      timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - this.TIMEOUT_MINUTES);
      const timeoutTimestamp = Timestamp.fromDate(timeoutThreshold);

      const sttCollection = collection(db, 'users', userId, 'stt');
      const stalledQuery = query(
        sttCollection,
        where('status', '==', 'processing'),
        where('createdAt', '<', timeoutTimestamp)
      );

      const stalledSnapshot = await getDocs(stalledQuery);

      for (const jobDoc of stalledSnapshot.docs) {
        const jobData = jobDoc.data();
        const retryCount = jobData.retryCount || 0;
        const maxRetries = jobData.maxRetries || this.MAX_RETRIES;

        if (retryCount < maxRetries) {
          await updateDoc(doc(db, 'users', userId, 'stt', jobDoc.id), {
            status: 'queued',
            retryCount: retryCount + 1,
            error: `Job timeout - retrying (attempt ${retryCount + 1}/${maxRetries})`,
            queuedAt: serverTimestamp()
          });
          results.retried++;
        } else {
          await updateDoc(doc(db, 'users', userId, 'stt', jobDoc.id), {
            status: 'failed',
            error: `Job timeout - exceeded ${this.TIMEOUT_MINUTES} minutes and max retries (${maxRetries})`,
            retryCount: retryCount
          });
          results.failed++;
        }
        
        results.cleaned++;
      }

      console.log(`✅ Cleanup complete for user ${userId}: ${results.cleaned} jobs processed`);
      return results;
    } catch (error) {
      console.error(`❌ Error cleaning up jobs for user ${userId}:`, error);
      throw error;
    }
  }
}

export const jobCleanupService = new JobCleanupService();

