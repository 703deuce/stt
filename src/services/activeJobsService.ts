import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { STTRecord } from './databaseService';

/**
 * Service for managing activeJobs collection
 * This dramatically reduces Firestore read costs by only tracking active jobs
 * Supports multiple feature types: stt, ai-summary, content-repurpose
 */
class ActiveJobsService {
  /**
   * Add a job to activeJobs collection when it starts processing
   * @param userId - User ID
   * @param jobId - Job record ID
   * @param jobData - Job data to store
   * @param featureType - Type of feature: 'stt', 'ai-summary', or 'content-repurpose'
   */
  async addActiveJob(
    userId: string, 
    jobId: string, 
    jobData: Partial<STTRecord> | any, 
    featureType: 'stt' | 'ai-summary' | 'content-repurpose' = 'stt'
  ): Promise<void> {
    try {
      const activeJobRef = doc(db, 'users', userId, 'activeJobs', `${featureType}-${jobId}`);
      
      await setDoc(activeJobRef, {
        ...jobData,
        jobId: jobId,
        userId: userId,
        featureType: featureType,
        status: jobData.status || 'processing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log(`✅ Added ${featureType} job to activeJobs: ${userId}/${jobId}`);
    } catch (error) {
      console.error(`❌ Error adding job to activeJobs:`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Remove a job from activeJobs collection when it completes or fails
   * @param userId - User ID
   * @param jobId - Job record ID
   * @param featureType - Type of feature: 'stt', 'ai-summary', or 'content-repurpose'
   */
  async removeActiveJob(
    userId: string, 
    jobId: string, 
    featureType: 'stt' | 'ai-summary' | 'content-repurpose' = 'stt'
  ): Promise<void> {
    try {
      const activeJobRef = doc(db, 'users', userId, 'activeJobs', `${featureType}-${jobId}`);
      await deleteDoc(activeJobRef);
      console.log(`✅ Removed ${featureType} job from activeJobs: ${userId}/${jobId}`);
    } catch (error) {
      console.error(`❌ Error removing job from activeJobs:`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Check if job exists in activeJobs
   * @param userId - User ID
   * @param jobId - Job record ID
   * @param featureType - Type of feature: 'stt', 'ai-summary', or 'content-repurpose'
   */
  async isJobActive(
    userId: string, 
    jobId: string, 
    featureType: 'stt' | 'ai-summary' | 'content-repurpose' = 'stt'
  ): Promise<boolean> {
    try {
      const activeJobRef = doc(db, 'users', userId, 'activeJobs', `${featureType}-${jobId}`);
      const activeJobDoc = await getDoc(activeJobRef);
      return activeJobDoc.exists();
    } catch (error) {
      console.error(`❌ Error checking active job:`, error);
      return false;
    }
  }
}

export const activeJobsService = new ActiveJobsService();

