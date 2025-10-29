import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface TTSRecord {
  id?: string;
  user_id: string;
  name: string;
  input_text: string;
  voice_id: string;
  voice_name: string;
  audio_url: string;
  duration: number;
  format: string;
  content_type: string;
  status: 'completed' | 'processing' | 'failed';
  timestamp: Timestamp;
  metadata?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    chunk_method?: string;
    is_multi_speaker?: boolean;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    cache_status?: {
      cache_exists: boolean;
      models_cached: number;
      total_cache_size_mb: number;
    };
  };
}

class TTSDatabaseService {
  private collectionName = 'tts_records';

  /**
   * Create a new TTS record
   */
  async createTTSRecord(record: Omit<TTSRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      console.log('📝 Creating TTS record:', record);
      
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...record,
        timestamp: Timestamp.now()
      });
      
      console.log('✅ TTS record created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Failed to create TTS record:', error);
      throw new Error(`Failed to create TTS record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get TTS records for a specific user
   */
  async getTTSRecords(userId: string, limitCount: number = 10): Promise<TTSRecord[]> {
    try {
      console.log(`🔍 Fetching TTS records for user: ${userId}, limit: ${limitCount}`);
      
      const q = query(
        collection(db, this.collectionName),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const records: TTSRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as TTSRecord);
      });
      
      console.log(`✅ Found ${records.length} TTS records for user ${userId}`);
      return records;
    } catch (error) {
      console.error('❌ Failed to fetch TTS records:', error);
      throw new Error(`Failed to fetch TTS records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific TTS record by ID
   */
  async getTTSRecordById(recordId: string, userId: string): Promise<TTSRecord | null> {
    try {
      console.log(`🔍 Fetching TTS record: ${recordId} for user: ${userId}`);
      
      const docRef = doc(db, this.collectionName, recordId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as TTSRecord;
        
        // Verify the record belongs to the user
        if (data.user_id === userId) {
          console.log('✅ TTS record found:', data);
          return {
            id: docSnap.id,
            ...data
          } as TTSRecord;
        } else {
          console.warn('⚠️ TTS record does not belong to user');
          return null;
        }
      } else {
        console.log('📝 TTS record not found');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch TTS record:', error);
      throw new Error(`Failed to fetch TTS record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a TTS record
   */
  async updateTTSRecord(recordId: string, updates: Partial<TTSRecord>): Promise<void> {
    try {
      console.log(`📝 Updating TTS record: ${recordId}`, updates);
      
      const docRef = doc(db, this.collectionName, recordId);
      await updateDoc(docRef, updates);
      
      console.log('✅ TTS record updated successfully');
    } catch (error) {
      console.error('❌ Failed to update TTS record:', error);
      throw new Error(`Failed to update TTS record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a TTS record
   */
  async deleteTTSRecord(recordId: string, userId: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting TTS record: ${recordId} for user: ${userId}`);
      
      // Verify ownership before deletion
      const record = await this.getTTSRecordById(recordId, userId);
      if (!record) {
        throw new Error('TTS record not found or access denied');
      }
      
      const docRef = doc(db, this.collectionName, recordId);
      await deleteDoc(docRef);
      
      console.log('✅ TTS record deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete TTS record:', error);
      throw new Error(`Failed to delete TTS record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get TTS records with pagination
   */
  async getTTSRecordsPaginated(
    userId: string, 
    pageSize: number = 20, 
    lastTimestamp?: Timestamp
  ): Promise<{ records: TTSRecord[]; hasMore: boolean }> {
    try {
      console.log(`🔍 Fetching paginated TTS records for user: ${userId}, page size: ${pageSize}`);
      
      let q = query(
        collection(db, this.collectionName),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(pageSize + 1) // Get one extra to check if there are more
      );
      
      if (lastTimestamp) {
        q = query(
          collection(db, this.collectionName),
          where('user_id', '==', userId),
          where('timestamp', '<', lastTimestamp),
          orderBy('timestamp', 'desc'),
          limit(pageSize + 1)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const records: TTSRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as TTSRecord);
      });
      
      const hasMore = records.length > pageSize;
      const finalRecords = hasMore ? records.slice(0, pageSize) : records;
      
      console.log(`✅ Found ${finalRecords.length} TTS records, has more: ${hasMore}`);
      return { records: finalRecords, hasMore };
    } catch (error) {
      console.error('❌ Failed to fetch paginated TTS records:', error);
      throw new Error(`Failed to fetch paginated TTS records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search TTS records by text content
   */
  async searchTTSRecords(userId: string, searchTerm: string): Promise<TTSRecord[]> {
    try {
      console.log(`🔍 Searching TTS records for user: ${userId}, term: "${searchTerm}"`);
      
      // Note: Firestore doesn't support full-text search, so we'll search in the name and input_text
      // For production, consider using Algolia or similar for better search capabilities
      const q = query(
        collection(db, this.collectionName),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const records: TTSRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as TTSRecord;
        const searchableText = `${data.name} ${data.input_text}`.toLowerCase();
        
        if (searchableText.includes(searchTerm.toLowerCase())) {
          records.push({
            id: doc.id,
            ...data
          } as TTSRecord);
        }
      });
      
      console.log(`✅ Found ${records.length} TTS records matching search term`);
      return records;
    } catch (error) {
      console.error('❌ Failed to search TTS records:', error);
      throw new Error(`Failed to search TTS records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const ttsDatabaseService = new TTSDatabaseService();
export default ttsDatabaseService;
