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
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface VoiceCloneRecord {
  id?: string;
  user_id: string;
  name: string;
  description: string;
  original_file_name: string;
  firebase_path: string;
  download_url: string;
  transcription_text?: string;
  uploaded_at: Timestamp;
  file_size: number;
  duration?: number;
  status: 'processing' | 'ready' | 'failed';
  metadata?: {
    sample_rate?: number;
    bit_depth?: number;
    channels?: number;
    processing_time?: number;
    model_version?: string;
  };
}

class VoiceCloningDatabaseService {
  private readonly COLLECTION_NAME = 'voice_clones';

  /**
   * Create a new voice clone record
   */
  async createVoiceCloneRecord(record: Omit<VoiceCloneRecord, 'id' | 'uploaded_at'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...record,
        uploaded_at: Timestamp.now()
      });
      
      console.log('✅ Voice clone record created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating voice clone record:', error);
      throw new Error(`Failed to create voice clone record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all voice clones for a specific user
   */
  async getUserVoiceClones(userId: string, limitCount: number = 100): Promise<VoiceCloneRecord[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('user_id', '==', userId),
        orderBy('uploaded_at', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const records: VoiceCloneRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Use the firebase_path (filename) as the ID, not the Firestore document ID
        const firebasePath = data.firebase_path || '';
        const fileName = firebasePath.split('/').pop() || ''; // Get just the filename
        const voiceId = fileName.replace('.wav', ''); // Remove .wav extension since API adds it
        
        records.push({
          id: voiceId, // Use the filename without .wav extension as ID
          ...data
        } as VoiceCloneRecord);
      });

      console.log(`✅ Retrieved ${records.length} voice clones for user ${userId}`);
      return records;
    } catch (error) {
      console.error('❌ Error fetching user voice clones:', error);
      throw error;
    }
  }

  /**
   * Get a specific voice clone by ID
   */
  async getVoiceCloneById(recordId: string): Promise<VoiceCloneRecord | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, recordId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Use the firebase_path (filename) as the ID, not the Firestore document ID
        const firebasePath = data.firebase_path || '';
        const fileName = firebasePath.split('/').pop() || ''; // Get just the filename
        const voiceId = fileName.replace('.wav', ''); // Remove .wav extension since API adds it
        
        return {
          id: voiceId, // Use the filename without .wav extension as ID
          ...data
        } as VoiceCloneRecord;
      } else {
        console.log('❌ Voice clone record not found:', recordId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching voice clone record:', error);
      throw error;
    }
  }

  /**
   * Update a voice clone record
   */
  async updateVoiceCloneRecord(recordId: string, updates: Partial<VoiceCloneRecord>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, recordId);
      await updateDoc(docRef, updates);
      console.log('✅ Voice clone record updated:', recordId);
    } catch (error) {
      console.error('❌ Error updating voice clone record:', error);
      throw error;
    }
  }

  /**
   * Delete a voice clone record
   */
  async deleteVoiceCloneRecord(recordId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, recordId);
      await deleteDoc(docRef);
      console.log('✅ Voice clone record deleted:', recordId);
    } catch (error) {
      console.error('❌ Error deleting voice clone record:', error);
      throw error;
    }
  }

  /**
   * Search voice clones by name or description
   */
  async searchVoiceClones(userId: string, searchTerm: string): Promise<VoiceCloneRecord[]> {
    try {
      // Get all user's voice clones and filter client-side for now
      // In production, you might want to use Algolia or similar for better search
      const allVoices = await this.getUserVoiceClones(userId, 1000);
      
      const lowercaseSearch = searchTerm.toLowerCase();
      return allVoices.filter(voice => 
        voice.name.toLowerCase().includes(lowercaseSearch) ||
        voice.description.toLowerCase().includes(lowercaseSearch)
      );
    } catch (error) {
      console.error('❌ Error searching voice clones:', error);
      throw error;
    }
  }

  /**
   * Get voice clones by status
   */
  async getVoiceClonesByStatus(userId: string, status: VoiceCloneRecord['status']): Promise<VoiceCloneRecord[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('user_id', '==', userId),
        where('status', '==', status),
        orderBy('uploaded_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const records: VoiceCloneRecord[] = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as VoiceCloneRecord);
      });

      return records;
    } catch (error) {
      console.error('❌ Error fetching voice clones by status:', error);
      throw error;
    }
  }

  /**
   * Get voice clones by date range
   */
  async getVoiceClonesByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<VoiceCloneRecord[]> {
    try {
      const startTimestamp = Timestamp.fromDate(startDate);
      const endTimestamp = Timestamp.fromDate(endDate);
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('user_id', '==', userId),
        where('uploaded_at', '>=', startTimestamp),
        where('uploaded_at', '<=', endTimestamp),
        orderBy('uploaded_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const records: VoiceCloneRecord[] = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as VoiceCloneRecord);
      });

      return records;
    } catch (error) {
      console.error('❌ Error fetching voice clones by date range:', error);
      throw error;
    }
  }

  /**
   * Get user statistics for voice cloning
   */
  async getUserVoiceCloneStats(userId: string): Promise<{
    total_voices: number;
    ready_voices: number;
    processing_voices: number;
    failed_voices: number;
    total_file_size: number;
  }> {
    try {
      const allVoices = await this.getUserVoiceClones(userId, 1000);
      
      const stats = {
        total_voices: allVoices.length,
        ready_voices: allVoices.filter(v => v.status === 'ready').length,
        processing_voices: allVoices.filter(v => v.status === 'processing').length,
        failed_voices: allVoices.filter(v => v.status === 'failed').length,
        total_file_size: allVoices.reduce((sum, v) => sum + (v.file_size || 0), 0)
      };

      console.log(`📊 Voice clone stats for user ${userId}:`, stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching voice clone stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const voiceCloningDatabaseService = new VoiceCloningDatabaseService();
export default voiceCloningDatabaseService;
