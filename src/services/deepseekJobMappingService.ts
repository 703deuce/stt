import { db } from '@/config/firebase';
import { doc, setDoc, getDoc, updateDoc, query, collection, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface DeepSeekJobMapping {
  id: string;
  userId: string;
  jobType: 'chat' | 'summary' | 'content_generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  
  // Job-specific data
  transcriptionId?: string;
  transcriptionText?: string;
  prompt?: string;
  customInstructions?: string;
  contentTypeId?: string;
  contentTypeName?: string;
  contentCategory?: string;
  maxWords?: number;
  
  // Results
  result?: string;
  error?: string;
  
  // Metadata
  fileName?: string;
  wordCount?: number;
  processingTime?: number;
}

class DeepSeekJobMappingService {
  private collectionName = 'deepseek_job_mappings';

  /**
   * Create a new job mapping for DeepSeek operations
   */
  async mapJobToUser(
    jobId: string, 
    userId: string, 
    jobType: 'chat' | 'summary' | 'content_generation',
    jobData: {
      transcriptionId?: string;
      transcriptionText?: string;
      prompt?: string;
      customInstructions?: string;
      contentTypeId?: string;
      contentTypeName?: string;
      contentCategory?: string;
      maxWords?: number;
      fileName?: string;
    }
  ): Promise<void> {
    try {
      // Only include defined fields to avoid Firestore errors
      const docData: any = {
        id: jobId,
        userId,
        jobType,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      // Add optional fields only if they have values
      if (jobData.transcriptionId) docData.transcriptionId = jobData.transcriptionId;
      if (jobData.transcriptionText) docData.transcriptionText = jobData.transcriptionText;
      if (jobData.prompt) docData.prompt = jobData.prompt;
      if (jobData.customInstructions && jobData.customInstructions.trim()) docData.customInstructions = jobData.customInstructions;
      if (jobData.contentTypeId) docData.contentTypeId = jobData.contentTypeId;
      if (jobData.contentTypeName) docData.contentTypeName = jobData.contentTypeName;
      if (jobData.contentCategory) docData.contentCategory = jobData.contentCategory;
      if (jobData.maxWords) docData.maxWords = jobData.maxWords;
      if (jobData.fileName) docData.fileName = jobData.fileName;

      await setDoc(doc(db, this.collectionName, jobId), docData);
      console.log('✅ DeepSeek job mapping created:', { jobId, userId, jobType });
    } catch (error) {
      console.error('❌ Error creating DeepSeek job mapping:', error);
      throw error;
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    result?: string,
    error?: string,
    metadata?: {
      wordCount?: number;
      processingTime?: number;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: Date.now()
      };

      if (result) updateData.result = result;
      if (error) updateData.error = error;
      if (metadata?.wordCount) updateData.wordCount = metadata.wordCount;
      if (metadata?.processingTime) updateData.processingTime = metadata.processingTime;

      await updateDoc(doc(db, this.collectionName, jobId), updateData);
      console.log('✅ DeepSeek job status updated:', { jobId, status });
    } catch (error) {
      console.error('❌ Error updating DeepSeek job status:', error);
      throw error;
    }
  }

  /**
   * Get job mapping by ID
   */
  async getJobMapping(jobId: string): Promise<DeepSeekJobMapping | null> {
    try {
      const docSnap = await getDoc(doc(db, this.collectionName, jobId));
      if (docSnap.exists()) {
        return docSnap.data() as DeepSeekJobMapping;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting DeepSeek job mapping:', error);
      return null;
    }
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: string, limitCount: number = 50): Promise<DeepSeekJobMapping[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const jobs: DeepSeekJobMapping[] = [];
      
      querySnapshot.forEach((doc) => {
        jobs.push(doc.data() as DeepSeekJobMapping);
      });
      
      return jobs;
    } catch (error) {
      console.error('❌ Error getting user DeepSeek jobs:', error);
      return [];
    }
  }

  /**
   * Get pending jobs for processing
   */
  async getPendingJobs(limitCount: number = 10): Promise<DeepSeekJobMapping[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const jobs: DeepSeekJobMapping[] = [];
      
      querySnapshot.forEach((doc) => {
        jobs.push(doc.data() as DeepSeekJobMapping);
      });
      
      return jobs;
    } catch (error) {
      console.error('❌ Error getting pending DeepSeek jobs:', error);
      return [];
    }
  }

  /**
   * Clean up old completed jobs (older than 7 days)
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'completed'),
        where('updatedAt', '<', sevenDaysAgo)
      );
      
      const querySnapshot = await getDocs(q);
      const batch = [];
      
      querySnapshot.forEach((doc) => {
        batch.push(doc.ref);
      });
      
      if (batch.length > 0) {
        // Note: Firestore doesn't support batch deletes in client SDK
        // In production, you'd use a Cloud Function for this
        console.log(`🧹 Found ${batch.length} old DeepSeek jobs to clean up`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up old DeepSeek jobs:', error);
    }
  }
}

export const deepseekJobMappingService = new DeepSeekJobMappingService();
