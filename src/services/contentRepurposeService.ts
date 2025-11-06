import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

export interface ContentRepurposeRecord {
  id?: string;
  user_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  
  // Content
  transcription_id?: string; // Link to STT record if applicable
  original_content: string;
  content_type: 'blog' | 'social_media' | 'video_script' | 'email';
  target_platforms?: string[]; // ['linkedin', 'twitter', 'instagram']
  
  // DeepSeek specific
  deepseek_request_id?: string;
  deepseek_model?: 'deepseek-chat' | 'deepseek-reasoning';
  
  // Results
  repurposed_content?: Record<string, string>; // { 'linkedin': '...', 'twitter': '...' }
  tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  
  // Metadata
  priority: 1 | 2 | 3; // 1 = Transcription with Content, 2 = Only, 3 = Free
  created_at: Timestamp | Date;
  started_at?: Timestamp | Date;
  completed_at?: Timestamp | Date;
  processing_time?: number; // seconds
  
  // Job tracking
  retry_count: number;
  max_retries: number;
  error?: string;
}

/**
 * Service for managing Content Repurpose jobs with same scalable patterns as STT
 * Uses separate Firestore collection: users/{userId}/content-repurpose
 */
class ContentRepurposeService {
  private getCurrentUserId(): string {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return userId;
  }

  /**
   * Create a new content repurpose job
   */
  async createContentRepurposeRecord(data: {
    transcription_id?: string;
    original_content: string;
    content_type: 'blog' | 'social_media' | 'video_script' | 'email';
    target_platforms?: string[];
    deepseek_model?: 'deepseek-chat' | 'deepseek-reasoning';
    priority?: 1 | 2 | 3;
  }): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      const contentRepurposeCollection = collection(db, 'users', userId, 'content-repurpose');
      
      const record: Omit<ContentRepurposeRecord, 'id'> = {
        user_id: userId,
        status: 'processing', // DeepSeek is fast, starts immediately
        transcription_id: data.transcription_id,
        original_content: data.original_content,
        content_type: data.content_type,
        target_platforms: data.target_platforms || [],
        deepseek_model: data.deepseek_model || 'deepseek-chat',
        priority: data.priority ?? 3, // Default to Free tier
        created_at: serverTimestamp() as Timestamp,
        started_at: serverTimestamp() as Timestamp,
        retry_count: 0,
        max_retries: 3
      };

      const docRef = await addDoc(contentRepurposeCollection, record);
      console.log(`✅ Created content repurpose record: ${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating content repurpose record:', error);
      throw error;
    }
  }

  /**
   * Get content repurpose record by ID
   */
  async getContentRepurposeRecordById(recordId: string, userId?: string): Promise<ContentRepurposeRecord | null> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      const docRef = doc(db, 'users', targetUserId, 'content-repurpose', recordId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as ContentRepurposeRecord;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting content repurpose record:', error);
      return null;
    }
  }

  /**
   * Update content repurpose record
   */
  async updateContentRepurposeRecord(
    recordId: string, 
    updates: Partial<ContentRepurposeRecord>,
    userId?: string
  ): Promise<void> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      const docRef = doc(db, 'users', targetUserId, 'content-repurpose', recordId);
      
      // Calculate processing time if both started_at and completed_at exist
      if (updates.status === 'completed' && updates.completed_at) {
        const record = await this.getContentRepurposeRecordById(recordId, targetUserId);
        if (record?.started_at) {
          const startedAt = record.started_at instanceof Date 
            ? record.started_at.getTime() 
            : record.started_at instanceof Timestamp 
              ? record.started_at.toDate().getTime()
              : typeof record.started_at === 'number'
                ? record.started_at
                : Date.now();
          const completedAt = updates.completed_at instanceof Date
            ? updates.completed_at.getTime()
            : updates.completed_at instanceof Timestamp
              ? updates.completed_at.toDate().getTime()
              : typeof updates.completed_at === 'number'
                ? updates.completed_at
                : Date.now();
          updates.processing_time = Math.round((completedAt - startedAt) / 1000);
        }
      }
      
      await updateDoc(docRef, {
        ...updates,
        ...(updates.status === 'completed' && { completed_at: serverTimestamp() })
      });
      
      console.log(`✅ Updated content repurpose record: ${recordId}`);
    } catch (error) {
      console.error('❌ Error updating content repurpose record:', error);
      throw error;
    }
  }

  /**
   * Get user's content repurpose records
   */
  async getContentRepurposeRecords(
    limitCount: number = 50,
    status?: 'queued' | 'processing' | 'completed' | 'failed'
  ): Promise<ContentRepurposeRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const contentRepurposeCollection = collection(db, 'users', userId, 'content-repurpose');
      
      let q;
      if (status) {
        q = query(
          contentRepurposeCollection,
          where('status', '==', status),
          orderBy('created_at', 'desc'),
          firestoreLimit(limitCount)
        );
      } else {
        q = query(
          contentRepurposeCollection,
          orderBy('created_at', 'desc'),
          firestoreLimit(limitCount)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContentRepurposeRecord[];
    } catch (error) {
      console.error('❌ Error getting content repurpose records:', error);
      return [];
    }
  }

  /**
   * Find content repurpose record by DeepSeek request ID (for webhook matching)
   */
  async findContentRepurposeByDeepseekId(deepseekRequestId: string, userId?: string): Promise<ContentRepurposeRecord | null> {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      const contentRepurposeCollection = collection(db, 'users', targetUserId, 'content-repurpose');
      
      const q = query(
        contentRepurposeCollection,
        where('deepseek_request_id', '==', deepseekRequestId),
        firestoreLimit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ContentRepurposeRecord;
    } catch (error) {
      console.error('❌ Error finding content repurpose by DeepSeek ID:', error);
      return null;
    }
  }
}

export const contentRepurposeService = new ContentRepurposeService();

