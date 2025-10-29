import { db } from '@/config/firebase';
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface JobMapping {
  jobId: string;
  userId: string;
  timestamp: number;
  type: 'transcription' | 'content';
  fileName?: string; // Store the filename for transcriptions
  runpodJobId?: string; // Store the RunPod job ID for easy lookup
}

class JobMappingService {
  private collection = 'job_mappings';

  /**
   * Map a job ID to a user ID
   */
  async mapJobToUser(
    jobId: string, 
    userId: string, 
    type: 'transcription' | 'content' = 'transcription',
    fileName?: string,
    runpodJobId?: string
  ): Promise<void> {
    try {
      const mapping: JobMapping = {
        jobId,
        userId,
        timestamp: Date.now(),
        type,
        ...(fileName && { fileName }),
        ...(runpodJobId && { runpodJobId })
      };

      await setDoc(doc(db, this.collection, jobId), mapping);
      console.log(`📝 Mapped job ${jobId} to user ${userId} (${type})`, { fileName, runpodJobId });
    } catch (error) {
      console.error('❌ Error mapping job to user:', error);
      throw error;
    }
  }

  /**
   * Get user ID for a job ID
   */
  async getUserForJob(jobId: string): Promise<string | null> {
    try {
      const docRef = doc(db, this.collection, jobId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as JobMapping;
        return data.userId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting user for job:', error);
      return null;
    }
  }

  /**
   * Update an existing job mapping with RunPod job ID
   */
  async updateJobMappingWithRunpodId(jobId: string, runpodJobId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collection, jobId);
      await updateDoc(docRef, {
        runpodJobId: runpodJobId
      });
      console.log(`📝 Updated job mapping ${jobId} with RunPod job ID: ${runpodJobId}`);
    } catch (error) {
      console.error('❌ Error updating job mapping with RunPod ID:', error);
      throw error;
    }
  }

  /**
   * Get full job mapping by RunPod job ID
   */
  async getJobMappingByRunpodId(runpodJobId: string): Promise<JobMapping | null> {
    try {
      // We need to query by runpodJobId field
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, this.collection), where('runpodJobId', '==', runpodJobId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return doc.data() as JobMapping;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting job mapping by RunPod ID:', error);
      return null;
    }
  }

  /**
   * Clean up old job mappings (older than 24 hours)
   */
  async cleanupOldMappings(): Promise<void> {
    try {
      // This would require a query, but for now we'll implement a simple cleanup
      // In production, you might want to use a scheduled function
      console.log('🧹 Job mapping cleanup would run here');
    } catch (error) {
      console.error('❌ Error cleaning up job mappings:', error);
    }
  }

  /**
   * Remove a job mapping
   */
  async removeJobMapping(jobId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collection, jobId));
      console.log(`🗑️ Removed mapping for job ${jobId}`);
    } catch (error) {
      console.error('❌ Error removing job mapping:', error);
    }
  }
}

export const jobMappingService = new JobMappingService();
export default jobMappingService;
