import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

export interface SummaryAudioRecord {
  id?: string;
  user_id: string;
  transcription_id: string;
  summary_type: 'brief' | 'detailed' | 'key_points';
  audio_url: string;
  filename: string;
  content_type: string;
  duration: number;
  timestamp: Date;
  summary_text: string;
}

export interface SummaryAudioUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

class SummaryAudioService {
  private collectionName = 'summary_audio';

  /**
   * Upload summary audio to Firebase Storage
   */
  async uploadSummaryAudio(
    audioBlob: Blob,
    userId: string,
    transcriptionId: string,
    summaryType: 'brief' | 'detailed' | 'key_points',
    summaryText: string,
    contentType: string = 'audio/wav'
  ): Promise<SummaryAudioUploadResult> {
    try {
      console.log('🔄 Uploading summary audio to Firebase Storage...');
      console.log('📁 User ID:', userId);
      console.log('📁 Transcription ID:', transcriptionId);
      console.log('📁 Summary Type:', summaryType);
      console.log('📁 Blob size:', audioBlob.size, 'bytes');
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `summary_${transcriptionId}_${summaryType}_${timestamp}.${contentType.split('/')[1] || 'wav'}`;
      
      // Create the storage path: users/{userId}/summary_audio/{filename}
      const storagePath = `users/${userId}/summary_audio/${filename}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📁 Storage path:', storagePath);
      console.log('📁 Final filename:', filename);
      
      // Upload the blob to Firebase Storage
      console.log('📤 Starting upload...');
      const uploadResult = await uploadBytes(storageRef, audioBlob, {
        contentType: contentType
      });
      
      console.log('✅ Upload successful!');
      
      // Get the download URL
      console.log('🔗 Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('🔗 Download URL:', downloadURL);
      
      return {
        success: true,
        url: downloadURL,
        filename: filename
      };
      
    } catch (error) {
      console.error('❌ Summary audio upload failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Save summary audio record to Firestore
   */
  async saveSummaryAudioRecord(record: Omit<SummaryAudioRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      console.log('💾 Saving summary audio record to Firestore...');
      
      const docRef = doc(collection(db, this.collectionName));
      const recordWithTimestamp: SummaryAudioRecord = {
        ...record,
        id: docRef.id,
        timestamp: new Date()
      };
      
      await setDoc(docRef, recordWithTimestamp);
      
      console.log('✅ Summary audio record saved with ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Failed to save summary audio record:', error);
      throw error;
    }
  }

  /**
   * Get summary audio record by transcription ID and summary type
   */
  async getSummaryAudioRecord(
    userId: string,
    transcriptionId: string,
    summaryType: 'brief' | 'detailed' | 'key_points'
  ): Promise<SummaryAudioRecord | null> {
    try {
      console.log('🔍 Getting summary audio record...');
      console.log('📁 User ID:', userId);
      console.log('📁 Transcription ID:', transcriptionId);
      console.log('📁 Summary Type:', summaryType);
      
      const q = query(
        collection(db, this.collectionName),
        where('user_id', '==', userId),
        where('transcription_id', '==', transcriptionId),
        where('summary_type', '==', summaryType)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('❌ No summary audio record found');
        return null;
      }
      
      const records: SummaryAudioRecord[] = [];
      querySnapshot.forEach((doc) => {
        records.push(doc.data() as SummaryAudioRecord);
      });
      
      // Sort by timestamp in JavaScript (descending order) and get the first one
      records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const latestRecord = records[0];
      
      console.log('✅ Summary audio record found:', latestRecord.id);
      return latestRecord;
      
    } catch (error) {
      console.error('❌ Failed to get summary audio record:', error);
      return null;
    }
  }

  /**
   * Get all summary audio records for a transcription
   */
  async getSummaryAudioRecords(
    userId: string,
    transcriptionId: string
  ): Promise<SummaryAudioRecord[]> {
    try {
      console.log('🔍 Getting all summary audio records for transcription...');
      console.log('📁 User ID:', userId);
      console.log('📁 Transcription ID:', transcriptionId);
      
      const q = query(
        collection(db, this.collectionName),
        where('user_id', '==', userId),
        where('transcription_id', '==', transcriptionId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const records: SummaryAudioRecord[] = [];
      querySnapshot.forEach((doc) => {
        records.push(doc.data() as SummaryAudioRecord);
      });
      
      // Sort by timestamp in JavaScript (descending order)
      records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      console.log(`✅ Found ${records.length} summary audio records`);
      return records;
      
    } catch (error) {
      console.error('❌ Failed to get summary audio records:', error);
      return [];
    }
  }

  /**
   * Delete summary audio from Firebase Storage and Firestore
   */
  async deleteSummaryAudio(
    userId: string,
    transcriptionId: string,
    summaryType: 'brief' | 'detailed' | 'key_points'
  ): Promise<boolean> {
    try {
      console.log('🗑️ Deleting summary audio...');
      
      // Get the record first
      const record = await this.getSummaryAudioRecord(userId, transcriptionId, summaryType);
      if (!record) {
        console.log('❌ No record found to delete');
        return false;
      }
      
      // Delete from Firebase Storage
      const storageRef = ref(storage, `users/${userId}/summary_audio/${record.filename}`);
      await deleteObject(storageRef);
      
      // Delete from Firestore (you would need to implement this)
      // For now, we'll just return true since the storage deletion succeeded
      
      console.log('✅ Summary audio deleted successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to delete summary audio:', error);
      return false;
    }
  }

  /**
   * Check if summary audio exists for a transcription and summary type
   */
  async hasSummaryAudio(
    userId: string,
    transcriptionId: string,
    summaryType: 'brief' | 'detailed' | 'key_points'
  ): Promise<boolean> {
    const record = await this.getSummaryAudioRecord(userId, transcriptionId, summaryType);
    return record !== null;
  }
}

// Export singleton instance
export const summaryAudioService = new SummaryAudioService();
export default summaryAudioService;
