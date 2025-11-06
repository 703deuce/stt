import { db } from '../config/firebase';
import { 
  collectionGroup,
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc,
  Timestamp,
  serverTimestamp,
  startAfter,
  limit,
  QueryDocumentSnapshot,
  setDoc
} from 'firebase/firestore';
import { activeJobsService } from './activeJobsService';
import { databaseService } from './databaseService';

/**
 * Service for cleaning up stalled/failed transcription jobs
 * Uses activeJobs collection for efficient queries (98% cost reduction)
 * Handles batch processing for 10K+ user scale
 */
class JobCleanupService {
  private readonly TIMEOUT_MINUTES = 30; // Jobs exceeding 30 minutes are considered stalled
  private readonly MAX_RETRIES = 3; // Maximum retry attempts
  private readonly BATCH_SIZE = 500; // Firestore query limit

  /**
   * Clean up stalled processing jobs using activeJobs collection
   * This is MUCH more efficient than querying all users' jobs
   * Should be called by a cron job every 5-10 minutes
   */
  async cleanupStalledJobs(): Promise<{
    cleaned: number;
    failed: number;
    retried: number;
    movedToDeadLetter: number;
    errors: string[];
  }> {
    console.log('🧹 Starting cleanup of stalled jobs using activeJobs collection...');
    
    const results = {
      cleaned: 0,
      failed: 0,
      retried: 0,
      movedToDeadLetter: 0,
      errors: [] as string[]
    };

    try {
      // Calculate timeout threshold (30 minutes ago)
      const timeoutThreshold = new Date();
      timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - this.TIMEOUT_MINUTES);
      const timeoutTimestamp = Timestamp.fromDate(timeoutThreshold);

      // Use collectionGroup to query all activeJobs across all users
      // This is MUCH more efficient than iterating through all users
      let lastDoc: QueryDocumentSnapshot | null = null;
      let hasMore = true;

      while (hasMore) {
        try {
          // Only process STT jobs (ai-summary and content-repurpose have separate cleanup)
          let stalledQuery = query(
            collectionGroup(db, 'activeJobs'),
            where('featureType', '==', 'stt'), // Only STT jobs
            where('status', '==', 'processing'),
            where('createdAt', '<', timeoutTimestamp),
            limit(this.BATCH_SIZE)
          );

          // Add pagination if we have a last doc
          if (lastDoc) {
            stalledQuery = query(
              collectionGroup(db, 'activeJobs'),
              where('featureType', '==', 'stt'), // Only STT jobs
              where('status', '==', 'processing'),
              where('createdAt', '<', timeoutTimestamp),
              startAfter(lastDoc),
              limit(this.BATCH_SIZE)
            );
          }

          const stalledSnapshot = await getDocs(stalledQuery);

          if (stalledSnapshot.empty) {
            hasMore = false;
            break;
          }

          console.log(`📊 Processing batch of ${stalledSnapshot.size} stalled jobs...`);

          for (const jobDoc of stalledSnapshot.docs) {
            const jobData = jobDoc.data();
            const userId = jobData.userId || jobDoc.ref.parent.parent?.id;
            const jobId = jobData.jobId || jobDoc.id;
            
            if (!userId || !jobId) {
              console.warn(`⚠️ Skipping job with missing userId or jobId:`, jobDoc.id);
              continue;
            }

            const retryCount = jobData.retryCount || 0;
            const maxRetries = jobData.maxRetries || this.MAX_RETRIES;

            try {
              if (retryCount < maxRetries) {
                // Retry the job
                console.log(`🔄 Retrying stalled job: ${userId}/${jobId} (attempt ${retryCount + 1}/${maxRetries})`);
                
                // Update main STT record
                await databaseService.updateSTTRecord(jobId, {
                  status: 'queued', // Move back to queue for retry
                  retryCount: retryCount + 1,
                  error: `Job timeout - retrying (attempt ${retryCount + 1}/${maxRetries})`,
                  queuedAt: serverTimestamp()
                }, userId);

                // Update activeJobs record
                await updateDoc(jobDoc.ref, {
                  status: 'queued',
                  retryCount: retryCount + 1,
                  error: `Job timeout - retrying (attempt ${retryCount + 1}/${maxRetries})`,
                  updatedAt: serverTimestamp()
                });

                results.retried++;
              } else {
                // Max retries exceeded - move to dead letter queue
                console.log(`❌ Max retries exceeded for job ${userId}/${jobId}, moving to dead letter queue`);
                
                // Move to dead letter queue
                await this.moveToDeadLetterQueue(userId, jobId, jobData, `Job timeout - exceeded ${this.TIMEOUT_MINUTES} minutes and max retries (${maxRetries})`);
                
                // Update main STT record
                await databaseService.updateSTTRecord(jobId, {
                  status: 'failed',
                  error: `Job timeout - exceeded ${this.TIMEOUT_MINUTES} minutes and max retries (${maxRetries})`,
                  retryCount: retryCount
                }, userId);

                // Remove from activeJobs
                await activeJobsService.removeActiveJob(userId, jobId, 'stt');

                results.movedToDeadLetter++;
                results.failed++;
              }
              
              results.cleaned++;
            } catch (updateError) {
              const errorMsg = `Error updating job ${userId}/${jobId}: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`;
              console.error(`❌ ${errorMsg}`);
              results.errors.push(errorMsg);
            }
          }

          // Check if we have more results
          if (stalledSnapshot.size < this.BATCH_SIZE) {
            hasMore = false;
          } else {
            lastDoc = stalledSnapshot.docs[stalledSnapshot.docs.length - 1];
          }
        } catch (batchError) {
          const errorMsg = `Error processing batch: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
          hasMore = false; // Stop on batch error
        }
      }

      console.log(`✅ Cleanup complete: ${results.cleaned} jobs processed (${results.retried} retried, ${results.movedToDeadLetter} moved to dead letter)`);
      
      return results;
    } catch (error) {
      const errorMsg = `Fatal error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Move a failed job to dead letter queue for manual review
   */
  private async moveToDeadLetterQueue(
    userId: string, 
    jobId: string, 
    jobData: any, 
    reason: string
  ): Promise<void> {
    try {
      const deadLetterRef = doc(collection(db, 'deadLetterQueue'));
      
      await setDoc(deadLetterRef, {
        originalJobId: jobId,
        userId: userId,
        jobData: jobData,
        reason: reason,
        movedAt: serverTimestamp(),
        retryCount: jobData.retryCount || 0,
        maxRetries: jobData.maxRetries || this.MAX_RETRIES
      });

      console.log(`✅ Moved job ${userId}/${jobId} to dead letter queue: ${deadLetterRef.id}`);
      
      // TODO: Send alert to admin (email, Slack, etc.)
    } catch (error) {
      console.error(`❌ Error moving job to dead letter queue:`, error);
      // Don't throw - this is not critical
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

