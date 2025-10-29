import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Content record interface
export interface ContentRecord {
  id?: string;
  user_id: string;
  transcription_id: string;
  transcription_name: string;
  content_type_id: string;
  content_type_name: string;
  content_category: string;
  title: string;
  content: string; // Markdown content
  status: 'generating' | 'completed' | 'failed';
  timestamp: Timestamp | Date;
  word_count?: number;
  character_count?: number;
  error_message?: string;
}

class ContentService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }
    return user.uid;
  }

  /**
   * Create a new content record
   */
  async createContentRecord(data: Omit<ContentRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      
      const contentData = {
        ...data,
        user_id: userId,
        timestamp: serverTimestamp(),
        word_count: data.content.split(/\s+/).filter(Boolean).length,
        character_count: data.content.length
      };
      
      const docRef = await addDoc(
        collection(db, 'users', userId, 'generated_content'),
        contentData
      );
      
      console.log('✅ Content record created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating content record:', error);
      throw error;
    }
  }

  /**
   * Get all content records for current user
   */
  async getContentRecords(limitCount: number = 100): Promise<ContentRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, 'users', userId, 'generated_content'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const records: ContentRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as ContentRecord);
      });
      
      console.log(`📋 Loaded ${records.length} content records`);
      return records;
    } catch (error) {
      console.error('❌ Error getting content records:', error);
      throw error;
    }
  }

  /**
   * Get a single content record by ID
   */
  async getContentRecordById(contentId: string): Promise<ContentRecord | null> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'generated_content', contentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as ContentRecord;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting content record:', error);
      throw error;
    }
  }

  /**
   * Update a content record
   */
  async updateContentRecord(contentId: string, updates: Partial<ContentRecord>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'generated_content', contentId);
      
      // Calculate word/character count if content is being updated
      if (updates.content) {
        updates.word_count = updates.content.split(/\s+/).filter(Boolean).length;
        updates.character_count = updates.content.length;
      }
      
      await updateDoc(docRef, updates);
      console.log('✅ Content record updated:', contentId);
    } catch (error) {
      console.error('❌ Error updating content record:', error);
      throw error;
    }
  }

  /**
   * Delete a content record
   */
  async deleteContentRecord(contentId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'generated_content', contentId);
      await deleteDoc(docRef);
      console.log('✅ Content record deleted:', contentId);
    } catch (error) {
      console.error('❌ Error deleting content record:', error);
      throw error;
    }
  }

  /**
   * Get content records by transcription ID
   */
  async getContentByTranscription(transcriptionId: string): Promise<ContentRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, 'users', userId, 'generated_content'),
        where('transcription_id', '==', transcriptionId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const records: ContentRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as ContentRecord);
      });
      
      return records;
    } catch (error) {
      console.error('❌ Error getting content by transcription:', error);
      throw error;
    }
  }

  /**
   * Get content records by category
   */
  async getContentByCategory(category: string): Promise<ContentRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, 'users', userId, 'generated_content'),
        where('content_category', '==', category),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const records: ContentRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as ContentRecord);
      });
      
      return records;
    } catch (error) {
      console.error('❌ Error getting content by category:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const contentService = new ContentService();
export default contentService;

