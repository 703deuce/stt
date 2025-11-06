import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../config/firebase';

// Types for our database records
export interface STTRecord {
  id?: string;
  user_id: string;
  audio_id: string;
  name: string; // User-friendly name for the transcription
  audio_file_url: string; // URL to the original audio file
  transcription_data_url?: string; // URL to the full transcription data file in Storage
  transcript: string; // Shortened transcript for preview (first 500 chars)
  timestamp: Timestamp | Date;
  createdAt?: Timestamp | Date; // Explicit creation timestamp for timeout queries
  duration: number;
  confidence?: number;
  language: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  type: 'stt';
  tags?: string[];
  archived?: boolean; // Whether the transcription is archived
  favorited?: boolean; // Whether the transcription is favorited
  isPublic?: boolean; // Whether the transcription can be viewed by anyone with the link
  // Job tracking fields
  priority?: number; // Lower number = higher priority (1 = Transcription with Content, 2 = Transcription Only, 3 = Free)
  retryCount?: number; // Number of retry attempts
  maxRetries?: number; // Maximum retry attempts (default: 3)
  queuedAt?: Timestamp | Date; // When job was queued
  startedAt?: Timestamp | Date; // When processing actually started (RunPod begins)
  completedAt?: Timestamp | Date; // When processing completed
  processingTime?: number; // Processing time in seconds (completedAt - startedAt)
  error?: string; // Error message if failed
  // Transcription data fields
  diarized_transcript?: Array<{
    speaker: string;
    start_time: number;
    end_time: number;
    text: string;
    words?: Array<{
      start: number;
      end: number;
      text: string;
      speaker?: string;
    }>;
  }>;
  timestamps?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  metadata?: {
    word_count?: number;
    speaker_count?: number;
    processing_method?: string;
    chunks_processed?: number;
    runpod_job_id?: string; // RunPod job ID for webhook matching
    execution_time?: number;
    workflow?: string;
    model_used?: string;
    // Only store summary metadata, not the full data
  };
  // Speaker mappings specific to this transcription
  speaker_mappings?: {
    [speakerId: string]: string; // e.g., "Speaker_00" -> "Speaker 1"
  };
}

export interface TTSRecord {
  id?: string;
  user_id: string;
  tts_id: string;
  name: string; // User-friendly name for the TTS generation
  input_text: string;
  audio_url: string;
  timestamp: Timestamp | Date;
  voice: string;
  language: string;
  status: 'processing' | 'completed' | 'failed';
  type: 'tts';
  duration?: number;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  email: string;
  display_name?: string;
  created_at: Timestamp | Date;
  last_login: Timestamp | Date;
  preferences?: Record<string, any>;
  usage_stats?: {
    total_transcriptions: number;
    total_tts_generations: number;
    total_audio_duration: number;
  };
}

class DatabaseService {
  private getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to access database');
    }
    return user.uid;
  }

  // Save full transcription data to Firebase Storage
  async saveTranscriptionDataToStorage(transcriptionData: any, userId: string, audioId: string): Promise<string> {
    try {
      console.log('💾 Saving full transcription data to Firebase Storage...');
      
      // Create a JSON file with the full transcription data
      const jsonData = JSON.stringify(transcriptionData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // Create a reference to the file in Storage
      const fileName = `transcription_data_${audioId}.json`;
      const storageRef = ref(storage, `transcription_data/${userId}/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, blob);
      console.log('✅ Transcription data uploaded to Storage:', snapshot.ref.fullPath);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 Transcription data URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Error saving transcription data to Storage:', error);
      throw error;
    }
  }

  // STT (Speech-to-Text) Operations
  async createSTTRecord(data: Omit<STTRecord, 'id' | 'timestamp' | 'type'>, fullTranscriptionData?: any, userId?: string): Promise<string> {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      
      // If we have full transcription data, save it to Storage first
      let transcriptionDataUrl: string | undefined;
      if (fullTranscriptionData) {
        transcriptionDataUrl = await this.saveTranscriptionDataToStorage(fullTranscriptionData, currentUserId, data.audio_id);
      }
      
      // Create a shortened transcript for preview (first 500 characters)
      const shortTranscript = data.transcript.length > 500 
        ? data.transcript.substring(0, 500) + '...' 
        : data.transcript;
      
      // Helper function to remove undefined values from objects (Firestore doesn't allow undefined)
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
          return obj.map(removeUndefined);
        }
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              cleaned[key] = removeUndefined(value);
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Clean metadata to remove undefined values
      const cleanedMetadata = data.metadata ? removeUndefined(data.metadata) : undefined;
      
      // CRITICAL: Log metadata before and after cleaning to debug jobId issues
      if (data.metadata?.runpod_job_id) {
        console.log('🔍 [databaseService] Metadata before cleaning:', JSON.stringify(data.metadata));
        console.log('🔍 [databaseService] Metadata after cleaning:', JSON.stringify(cleanedMetadata));
        console.log('🔍 [databaseService] runpod_job_id preserved:', !!cleanedMetadata?.runpod_job_id);
      }

      // Set createdAt explicitly if not provided (for timeout queries)
      const createdAt = data.createdAt || serverTimestamp();
      
      const sttData: Omit<STTRecord, 'id'> = {
        ...data,
        transcript: shortTranscript, // Store shortened version
        user_id: currentUserId,
        timestamp: serverTimestamp() as Timestamp,
        createdAt: createdAt as Timestamp, // Explicit creation timestamp
        type: 'stt',
        // Set defaults for job tracking fields
        priority: data.priority ?? 3, // Default priority 3 (Free tier - lowest priority)
        retryCount: data.retryCount ?? 0,
        maxRetries: data.maxRetries ?? 3,
        queuedAt: data.queuedAt || (data.status === 'queued' ? serverTimestamp() : undefined) as Timestamp | undefined,
        startedAt: data.startedAt, // Set when RunPod actually starts processing
        completedAt: data.completedAt, // Set when job completes
        processingTime: data.processingTime, // Calculated: completedAt - startedAt
        // Only include transcription_data_url if it has a value
        ...(transcriptionDataUrl && { transcription_data_url: transcriptionDataUrl }),
        // Only include metadata if it exists and has values
        ...(cleanedMetadata && Object.keys(cleanedMetadata).length > 0 && { metadata: cleanedMetadata })
      };

      // Clean the entire sttData object to remove any remaining undefined values
      const cleanedSttData = removeUndefined(sttData);

      console.log('💾 Creating STT record in Firestore (metadata only)...');
      console.log('📊 Data size check:', {
        transcriptLength: cleanedSttData.transcript.length,
        hasTranscriptionDataUrl: !!cleanedSttData.transcription_data_url,
        metadataSize: JSON.stringify(cleanedSttData.metadata || {}).length
      });

      const docRef = await addDoc(collection(db, 'users', currentUserId, 'stt'), cleanedSttData);
      console.log('✅ STT record created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating STT record:', error);
      
      // Check if it's a network/connectivity issue
      if (error instanceof Error) {
        if (error.message.includes('Could not reach Cloud Firestore backend') || 
            error.message.includes('Backend didn\'t respond') ||
            error.message.includes('network') ||
            error.message.includes('timeout')) {
          throw new Error('Network connectivity issue. Please check your internet connection and try again.');
        }
      }
      
      throw error;
    }
  }

  async getSTTRecords(limitCount: number = 50, status?: 'queued' | 'processing' | 'completed' | 'failed'): Promise<STTRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const sttCollection = collection(db, 'users', userId, 'stt');
      
      let q;
      if (status) {
        // Query by status
        q = query(
          sttCollection,
          where('status', '==', status),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      } else {
        // Query all records
        q = query(
          sttCollection,
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      console.log('🔍 Fetching STT records for user:', userId);
      console.log('📊 Query limit:', limitCount);
      if (status) {
        console.log('📊 Filtering by status:', status);
      }
      
      const querySnapshot = await getDocs(q);
      const records: STTRecord[] = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as STTRecord);
      });

      console.log('✅ Retrieved STT records:', records.length);
      return records;
    } catch (error) {
      console.error('❌ Error fetching STT records:', error);
      
      // Check if it's a network/connectivity issue
      if (error instanceof Error) {
        if (error.message.includes('Could not reach Cloud Firestore backend') || 
            error.message.includes('Backend didn\'t respond') ||
            error.message.includes('network') ||
            error.message.includes('timeout')) {
          throw new Error('Network connectivity issue. Please check your internet connection and try again.');
        }
      }
      
      throw error;
    }
  }

  async getSTTRecordById(recordId: string, userId?: string): Promise<STTRecord | null> {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      const docRef = doc(db, 'users', currentUserId, 'stt', recordId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as STTRecord;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching STT record:', error);
      throw error;
    }
  }

  // Get full transcription data from Storage via API route (avoids CORS issues)
  async getFullTranscriptionData(transcriptionDataUrl: string): Promise<any> {
    try {
      console.log('📥 Fetching full transcription data via API route...');
      console.log('🔗 URL:', transcriptionDataUrl);
      
      // Validate URL format
      if (!transcriptionDataUrl || typeof transcriptionDataUrl !== 'string') {
        throw new Error(`Invalid transcription data URL: ${transcriptionDataUrl}`);
      }
      
      if (!transcriptionDataUrl.startsWith('http')) {
        throw new Error(`Invalid URL format - must start with http/https: ${transcriptionDataUrl}`);
      }
      
      // Use API route to avoid CORS issues
      const response = await fetch('/api/get-transcription-data', {
        method: 'POST',
          headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcriptionDataUrl })
        });
        
        if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        const fullData = await response.json();
      console.log('✅ Full transcription data retrieved via API:', {
          hasTranscript: !!fullData.transcript,
          hasDiarizedTranscript: !!fullData.diarized_transcript,
          hasTimestamps: !!fullData.timestamps,
          transcriptLength: fullData.transcript?.length || 0,
          diarizedSegments: fullData.diarized_transcript?.length || 0,
          wordTimestamps: fullData.timestamps?.length || 0
        });
        
        return fullData;
      
    } catch (error) {
      console.error('❌ Error fetching full transcription data:', error);
      console.error('❌ URL that failed:', transcriptionDataUrl);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('NetworkError')) {
          console.error('💡 This appears to be a network connectivity issue. Possible causes:');
          console.error('   - Check internet connection');
          console.error('   - Firebase Storage may be temporarily unavailable');
          console.error('   - CORS policy may be blocking the request');
          console.error('   - URL may be invalid or expired');
        }
      }
      
      throw error;
    }
  }

  async findSTTRecordByRunpodJobId(runpodJobId: string, userId?: string): Promise<STTRecord | null> {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      const sttCollection = collection(db, 'users', currentUserId, 'stt');
      
      // Query for records with matching runpod_job_id in metadata
      const q = query(
        sttCollection,
        where('metadata.runpod_job_id', '==', runpodJobId),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as STTRecord;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error finding STT record by RunPod job ID:', error);
      return null;
    }
  }

  async updateSTTRecord(recordId: string, updates: Partial<STTRecord>, userId?: string): Promise<void> {
    try {
      const currentUserId = userId || this.getCurrentUserId();
      const docRef = doc(db, 'users', currentUserId, 'stt', recordId);
      
      // Filter out undefined values to avoid Firestore errors
      const cleanUpdates = removeUndefined(updates);
      
      await updateDoc(docRef, cleanUpdates);
      console.log('✅ STT record updated:', recordId);
    } catch (error) {
      console.error('❌ Error updating STT record:', error);
      throw error;
    }
  }

  async deleteSTTRecord(recordId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'stt', recordId);
      await deleteDoc(docRef);
      console.log('✅ STT record deleted:', recordId);
    } catch (error) {
      console.error('❌ Error deleting STT record:', error);
      throw error;
    }
  }

  // Archive/Unarchive STT record
  async toggleArchiveSTTRecord(recordId: string, archived: boolean): Promise<void> {
    try {
      await this.updateSTTRecord(recordId, { archived });
      console.log(`✅ STT record ${archived ? 'archived' : 'unarchived'}:`, recordId);
    } catch (error) {
      console.error('❌ Error toggling archive status:', error);
      throw error;
    }
  }

  // Favorite/Unfavorite STT record
  async toggleFavoriteSTTRecord(recordId: string, favorited: boolean): Promise<void> {
    try {
      await this.updateSTTRecord(recordId, { favorited });
      console.log(`✅ STT record ${favorited ? 'favorited' : 'unfavorited'}:`, recordId);
    } catch (error) {
      console.error('❌ Error toggling favorite status:', error);
      throw error;
    }
  }

  // Toggle Public/Private STT record
  async togglePublicSTTRecord(recordId: string, isPublic: boolean): Promise<void> {
    try {
      await this.updateSTTRecord(recordId, { isPublic });
      console.log(`✅ STT record is now ${isPublic ? 'public' : 'private'}:`, recordId);
    } catch (error) {
      console.error('❌ Error toggling public status:', error);
      throw error;
    }
  }

  // Get public STT record (no auth required, checks isPublic flag)
  async getPublicSTTRecord(recordId: string): Promise<STTRecord | null> {
    try {
      // Query all users' STT records to find the one with this ID
      // This is a workaround since we don't know the user_id
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const sttRef = doc(db, 'users', userDoc.id, 'stt', recordId);
        const sttDoc = await getDoc(sttRef);
        
        if (sttDoc.exists()) {
          const data = sttDoc.data();
          
          // Check if the record is public
          if (!data.isPublic) {
            console.log('❌ STT record is not public:', recordId);
            return null;
          }
          
          console.log('✅ Public STT record retrieved:', recordId);
          return { id: sttDoc.id, ...data } as STTRecord;
        }
      }
      
      console.log('❌ Public STT record not found:', recordId);
      return null;
    } catch (error) {
      console.error('❌ Error getting public STT record:', error);
      throw error;
    }
  }

  // TTS (Text-to-Speech) Operations
  async createTTSRecord(data: Omit<TTSRecord, 'id' | 'timestamp' | 'type'>): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      const ttsData: Omit<TTSRecord, 'id'> = {
        ...data,
        user_id: userId,
        timestamp: serverTimestamp() as Timestamp,
        type: 'tts'
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'tts'), ttsData);
      console.log('✅ TTS record created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating TTS record:', error);
      throw error;
    }
  }

  async getTTSRecords(limitCount: number = 50): Promise<TTSRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, 'users', userId, 'tts'),
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

      return records;
    } catch (error) {
      console.error('❌ Error fetching TTS records:', error);
      throw error;
    }
  }

  async getTTSRecordById(recordId: string): Promise<TTSRecord | null> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'tts', recordId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as TTSRecord;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching TTS record:', error);
      throw error;
    }
  }

  async updateTTSRecord(recordId: string, updates: Partial<TTSRecord>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'tts', recordId);
      await updateDoc(docRef, updates);
      console.log('✅ TTS record updated:', recordId);
    } catch (error) {
      console.error('❌ Error updating TTS record:', error);
      throw error;
    }
  }

  async deleteTTSRecord(recordId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'tts', recordId);
      await deleteDoc(docRef);
      console.log('✅ TTS record deleted:', recordId);
    } catch (error) {
      console.error('❌ Error deleting TTS record:', error);
      throw error;
    }
  }

  // User Profile Operations
  async createUserProfile(userData: Omit<UserProfile, 'id' | 'created_at' | 'last_login'>): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      const profileData: Omit<UserProfile, 'id'> = {
        ...userData,
        user_id: userId,
        created_at: serverTimestamp() as Timestamp,
        last_login: serverTimestamp() as Timestamp
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'profile'), profileData);
      console.log('✅ User profile created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, 'users', userId, 'profile'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const profile = await this.getUserProfile();
      
      if (profile?.id) {
        const docRef = doc(db, 'users', userId, 'profile', profile.id);
        await updateDoc(docRef, updates);
        console.log('✅ User profile updated');
      } else {
        // Create profile if it doesn't exist
        await this.createUserProfile({
          user_id: userId,
          email: auth.currentUser?.email || '',
          display_name: auth.currentUser?.displayName || '',
          preferences: {},
          usage_stats: {
            total_transcriptions: 0,
            total_tts_generations: 0,
            total_audio_duration: 0
          }
        });
      }
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  // Search and Filter Operations
  async searchSTTRecords(searchTerm: string, limitCount: number = 20): Promise<STTRecord[]> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, 'users', userId, 'stt'),
        where('status', '==', 'completed'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const records: STTRecord[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as STTRecord;
        // Client-side search for transcript content
        if (data.transcript.toLowerCase().includes(searchTerm.toLowerCase())) {
          records.push({
            id: doc.id,
            ...data
          });
        }
      });

      return records;
    } catch (error) {
      console.error('❌ Error searching STT records:', error);
      throw error;
    }
  }

  async getRecordsByDateRange(
    startDate: Date, 
    endDate: Date, 
    type: 'stt' | 'tts' = 'stt'
  ): Promise<(STTRecord | TTSRecord)[]> {
    try {
      const userId = this.getCurrentUserId();
      const collectionName = type === 'stt' ? 'stt' : 'tts';
      
      const q = query(
        collection(db, 'users', userId, collectionName),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const records: (STTRecord | TTSRecord)[] = [];

      querySnapshot.forEach((doc) => {
        records.push({
          id: doc.id,
          ...doc.data()
        } as STTRecord | TTSRecord);
      });

      return records;
    } catch (error) {
      console.error('❌ Error fetching records by date range:', error);
      throw error;
    }
  }

  // Analytics and Statistics
  async getUserStats(): Promise<{
    total_transcriptions: number;
    total_tts_generations: number;
    total_audio_duration: number;
    recent_activity: (STTRecord | TTSRecord)[];
  }> {
    try {
      const [sttRecords, ttsRecords] = await Promise.all([
        this.getSTTRecords(1000),
        this.getTTSRecords(1000)
      ]);

      const totalTranscriptions = sttRecords.filter(r => r.status === 'completed').length;
      const totalTTSGenerations = ttsRecords.filter(r => r.status === 'completed').length;
      const totalAudioDuration = sttRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

      // Get recent activity (last 10 records from both types)
      const allRecords = [...sttRecords, ...ttsRecords]
        .sort((a, b) => {
          // Handle different timestamp formats
          let aTime: number;
          if (a.timestamp instanceof Date) {
            aTime = a.timestamp.getTime();
          } else if (a.timestamp instanceof Timestamp) {
            aTime = a.timestamp.toDate().getTime();
          } else if (typeof a.timestamp === 'string') {
            aTime = new Date(a.timestamp).getTime();
          } else if (typeof a.timestamp === 'number') {
            aTime = a.timestamp;
          } else {
            aTime = 0; // Fallback to epoch
          }
          
          let bTime: number;
          if (b.timestamp instanceof Date) {
            bTime = b.timestamp.getTime();
          } else if (b.timestamp instanceof Timestamp) {
            bTime = b.timestamp.toDate().getTime();
          } else if (typeof b.timestamp === 'string') {
            bTime = new Date(b.timestamp).getTime();
          } else if (typeof b.timestamp === 'number') {
            bTime = b.timestamp;
          } else {
            bTime = 0; // Fallback to epoch
          }
          
          return bTime - aTime;
        })
        .slice(0, 10);

      return {
        total_transcriptions: totalTranscriptions,
        total_tts_generations: totalTTSGenerations,
        total_audio_duration: totalAudioDuration,
        recent_activity: allRecords
      };
    } catch (error) {
      console.error('❌ Error fetching user stats:', error);
      throw error;
    }
  }

  // Generic document operations for AI data
  async setDocument(collectionName: string, docId: string, data: any): Promise<void> {
    try {
      console.log(`💾 Setting document in ${collectionName}:`, docId, data);
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, data);
      console.log(`✅ Document successfully saved to ${collectionName}:`, docId);
    } catch (error) {
      console.error(`❌ Error setting document in ${collectionName}:`, error);
      throw error;
    }
  }

  async getDocument(collectionName: string, docId: string): Promise<any> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting document from ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      console.log(`✅ Document deleted from ${collectionName}:`, docId);
    } catch (error) {
      console.error(`❌ Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  async queryDocuments(collectionName: string, queries: Array<{field: string, operator: any, value: any}>): Promise<any[]> {
    try {
      const collectionRef = collection(db, collectionName);
      let q = query(collectionRef);
      
      // Apply queries
      queries.forEach(queryItem => {
        q = query(q, where(queryItem.field, queryItem.operator, queryItem.value));
      });
      
      const querySnapshot = await getDocs(q);
      const documents: any[] = [];
      
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return documents;
    } catch (error) {
      console.error(`❌ Error querying documents from ${collectionName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;
