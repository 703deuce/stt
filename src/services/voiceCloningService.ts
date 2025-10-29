import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from '@/config/firebase';
import { transcriptionService } from './transcriptionService';
import { voiceCloningDatabaseService, VoiceCloneRecord } from './voiceCloningDatabaseService';
import { auth } from '@/config/firebase';

export interface ClonedVoice {
  id: string;
  name: string;
  description: string;
  originalFileName: string;
  firebasePath: string;
  downloadURL: string;
  uploadedAt: Date;
  fileSize: number;
  duration?: number;
  status: 'processing' | 'ready' | 'failed';
  userId?: string;
}

export interface VoiceUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

class VoiceCloningService {
  private readonly VOICE_FOLDER = 'user_voices';

  /**
   * Upload a voice file to Firebase Storage
   */
  async uploadVoice(
    file: File, 
    voiceName: string, 
    description: string,
    onProgress?: (progress: VoiceUploadProgress) => void
  ): Promise<ClonedVoice> {
    try {
      // Get current authenticated user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to upload voice files');
      }

      const userId = currentUser.uid;
      console.log('🎤 Voice Cloning: User authenticated:', userId);

      // Validate file
      if (!this.validateVoiceFile(file)) {
        throw new Error('Invalid voice file. Please upload a WAV file under 50MB.');
      }

      // Generate unique ID and file path
      const voiceId = this.generateVoiceId();
      const fileName = `${voiceId}_${voiceName.replace(/\s+/g, '_')}.wav`;
      const filePath = `${this.VOICE_FOLDER}/${userId}/${fileName}`;
      
      console.log('📁 Voice Cloning: File path:', filePath);
      
      // Create storage reference
      const storageRef = ref(storage, filePath);
      
      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL from Firebase
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Automatically transcribe the audio file using your working RunPod API
      let transcriptionText = '';
      try {
        // Use your existing transcription service that already works
        const transcription = await transcriptionService.transcribeAudio({
          audio_url: downloadURL,
          audio_format: 'wav',
          include_timestamps: false,
          use_diarization: false,
          num_speakers: null
        });
        
        transcriptionText = transcription.text || transcription.merged_text || '';
        
        // Save transcription as .txt file in the same folder
        const transcriptionFileName = fileName.replace('.wav', '.txt');
        const transcriptionPath = filePath.replace('.wav', '.txt');
        const transcriptionRef = ref(storage, transcriptionPath);
        
        // Create text blob and upload
        const textBlob = new Blob([transcriptionText], { type: 'text/plain' });
        await uploadBytes(transcriptionRef, textBlob);
        
        console.log('Transcription saved to Firebase:', transcriptionPath);
      } catch (transcriptionError) {
        console.warn('Transcription failed, but voice upload succeeded:', transcriptionError);
        // Continue with voice upload even if transcription fails
      }
      
      // Create cloned voice object
      const clonedVoice: ClonedVoice = {
        id: fileName.replace('.wav', ''), // Use full filename without extension as ID
        name: voiceName,
        description: description,
        originalFileName: file.name,
        firebasePath: filePath,
        downloadURL: downloadURL,
        uploadedAt: new Date(),
        fileSize: file.size,
        status: 'ready',
        userId: userId
      };

      // Store voice metadata in Firestore database
      try {
        const recordId = await voiceCloningDatabaseService.createVoiceCloneRecord({
          user_id: userId,
          name: voiceName,
          description: description,
          original_file_name: file.name,
          firebase_path: filePath,
          download_url: downloadURL,
          transcription_text: transcriptionText,
          file_size: file.size,
          status: 'ready'
        });
        
        console.log('✅ Voice clone record saved to database with ID:', recordId);
        
        // Update the cloned voice with the database record ID
        clonedVoice.id = recordId;
      } catch (dbError) {
        console.error('❌ Failed to save voice clone to database:', dbError);
        // Continue with voice upload even if database save fails
      }

      // Store voice metadata locally as backup
      this.saveVoiceMetadata(clonedVoice);
      
      return clonedVoice;
    } catch (error) {
      console.error('Voice upload failed:', error);
      throw new Error(`Voice upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all cloned voices for a user
   */
  async getUserVoices(): Promise<ClonedVoice[]> {
    try {
      // Get current authenticated user
      const currentUser = auth.currentUser;
      console.log('🔍 Voice Cloning Service - Auth State:', {
        currentUser: currentUser ? 'Authenticated' : 'Not authenticated',
        uid: currentUser?.uid,
        email: currentUser?.email
      });
      
      if (!currentUser) {
        console.log('❌ No authenticated user found');
        return [];
      }

      const userId = currentUser.uid;
      console.log('🎤 Voice Cloning: Fetching voices for user:', userId);

      // First try to get voices from the database (more reliable)
      try {
        console.log('🔍 Voice Cloning Service: Attempting to fetch from database...');
        const dbVoices = await voiceCloningDatabaseService.getUserVoiceClones(userId);
        console.log('🔍 Voice Cloning Service: Database response:', dbVoices);
        
        if (dbVoices.length > 0) {
          console.log(`✅ Found ${dbVoices.length} voices in database for user ${userId}`);
          
          // Convert database records to ClonedVoice format
          const voices: ClonedVoice[] = dbVoices.map(dbVoice => ({
            id: dbVoice.id || '',
            name: dbVoice.name,
            description: dbVoice.description,
            originalFileName: dbVoice.original_file_name,
            firebasePath: dbVoice.firebase_path,
            downloadURL: dbVoice.download_url,
            uploadedAt: dbVoice.uploaded_at.toDate(),
            fileSize: dbVoice.file_size,
            status: dbVoice.status,
            userId: dbVoice.user_id
          }));
          
          return voices;
        }
      } catch (dbError) {
        console.warn('⚠️ Failed to fetch voices from database, falling back to Firebase Storage:', dbError);
      }

      // Fallback to Firebase Storage if database fails
      console.log('🔄 Falling back to Firebase Storage for voice metadata...');
      const userFolder = `${this.VOICE_FOLDER}/${userId}`;
      const folderRef = ref(storage, userFolder);
      
      const result = await listAll(folderRef);
      console.log(`📁 Firebase Storage: Found ${result.items.length} files`);
      
      // Filter for WAV files and build voice metadata
      const wavFiles = result.items.filter(item => item.name.endsWith('.wav'));
      console.log(`🎵 Found ${wavFiles.length} WAV files`);
      
      const voices: ClonedVoice[] = [];
      
      for (const wavFile of wavFiles) {
        try {
          const fileName = wavFile.name;
          const voiceId = fileName.replace('.wav', '');
          const downloadURL = await getDownloadURL(wavFile);
          
          // Extract name from filename (remove the cloned_ timestamp_random part)
          const nameMatch = fileName.match(/^cloned_\d+_[a-z0-9]+_(.+?)\.wav$/);
          const voiceName = nameMatch ? nameMatch[1].replace(/_/g, ' ') : 'Custom Voice';
          
          const clonedVoice: ClonedVoice = {
            id: voiceId,
            name: voiceName,
            description: 'Custom cloned voice',
            originalFileName: fileName,
            firebasePath: wavFile.fullPath,
            downloadURL: downloadURL,
            uploadedAt: new Date(), // We'll need to store this in Firestore later
            fileSize: 0, // We'll need to store this in Firestore later
            status: 'ready',
            userId: userId
          };
          
          voices.push(clonedVoice);
          console.log(`✅ Built voice metadata for: ${voiceName}`);
        } catch (fileError) {
          console.warn(`⚠️ Failed to build metadata for ${wavFile.name}:`, fileError);
        }
      }
      
      console.log(`🎤 Successfully loaded ${voices.length} voices from Firebase Storage fallback`);
      return voices;
    } catch (error) {
      console.error('Failed to fetch user voices:', error);
      return [];
    }
  }

  /**
   * Ensure voices are loaded and available
   * This method should be called when pages mount to ensure voices are loaded
   */
  async ensureVoicesLoaded(): Promise<ClonedVoice[]> {
    try {
      // Always fetch from Firebase Storage for SaaS consistency
      console.log('🔄 Fetching voices from Firebase Storage...');
      const voices = await this.getUserVoices();
      console.log(`✅ Successfully loaded ${voices.length} voices from Firebase`);
      return voices;
    } catch (error) {
      console.warn('Failed to ensure voices are loaded:', error);
      return [];
    }
  }

  /**
   * Delete a cloned voice from Firebase Storage
   */
  async deleteVoice(voice: ClonedVoice): Promise<void> {
    try {
      // Delete the WAV file from Firebase Storage
      const storageRef = ref(storage, voice.firebasePath);
      await deleteObject(storageRef);
      console.log('Voice deleted from Firebase Storage:', voice.firebasePath);
      
      // Also delete the corresponding transcription TXT file
      try {
        const transcriptionPath = voice.firebasePath.replace('.wav', '.txt');
        const transcriptionRef = ref(storage, transcriptionPath);
        await deleteObject(transcriptionRef);
        console.log('Transcription deleted from Firebase Storage:', transcriptionPath);
      } catch (transcriptionDeleteError) {
        console.warn('Failed to delete transcription file (may not exist):', transcriptionDeleteError);
        // Continue with voice deletion even if transcription deletion fails
      }
      
      // Delete from database if we have a record ID
      if (voice.id && voice.id.length > 20) { // Database IDs are longer than Firebase Storage IDs
        try {
          await voiceCloningDatabaseService.deleteVoiceCloneRecord(voice.id);
          console.log('Voice clone record deleted from database:', voice.id);
        } catch (dbDeleteError) {
          console.warn('Failed to delete voice clone record from database:', dbDeleteError);
          // Continue with deletion even if database deletion fails
        }
      }
      
      // Remove metadata
      this.removeVoiceMetadata(voice.id);
    } catch (error) {
      console.error('Failed to delete voice from Firebase:', error);
      // Still remove from localStorage even if Firebase deletion fails
      this.removeVoiceMetadata(voice.id);
      throw new Error(`Failed to delete voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get download URL for a voice from Firebase Storage
   */
  async getVoiceDownloadURL(firebasePath: string): Promise<string> {
    try {
      const storageRef = ref(storage, firebasePath);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Failed to get download URL from Firebase:', error);
      throw new Error(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transcription text for a voice from Firebase Storage
   */
  async getVoiceTranscription(firebasePath: string): Promise<string | null> {
    try {
      const transcriptionPath = firebasePath.replace('.wav', '.txt');
      const transcriptionRef = ref(storage, transcriptionPath);
      const transcriptionURL = await getDownloadURL(transcriptionRef);
      
      // Fetch the transcription text
      const response = await fetch(transcriptionURL);
      if (!response.ok) {
        return null;
      }
      
      const transcriptionText = await response.text();
      return transcriptionText.trim();
    } catch (error) {
      console.log('No transcription found for voice:', firebasePath);
      return null;
    }
  }

  /**
   * Validate voice file
   */
  private validateVoiceFile(file: File): boolean {
    // Check file type
    if (!file.type.includes('wav') && !file.name.toLowerCase().endsWith('.wav')) {
      return false;
    }
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return false;
    }
    
    return true;
  }

  /**
   * Generate unique voice ID
   */
  private generateVoiceId(): string {
    return `cloned_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save voice metadata to localStorage (temporary until Firestore is implemented)
   */
  private saveVoiceMetadata(voice: ClonedVoice): void {
    try {
      const existingVoices = this.getLocalVoices();
      // Check if voice already exists and update it, otherwise add new
      const existingIndex = existingVoices.findIndex(v => v.id === voice.id);
      if (existingIndex >= 0) {
        existingVoices[existingIndex] = voice; // Update existing
      } else {
        existingVoices.push(voice); // Add new
      }
      localStorage.setItem('clonedVoices', JSON.stringify(existingVoices));
      console.log('Voice metadata saved to localStorage:', voice);
      
      // TODO: In production, save to Firestore for persistence across devices
      // Example: await addDoc(collection(db, 'clonedVoices'), voice);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  /**
   * Remove voice metadata from localStorage
   */
  private removeVoiceMetadata(voiceId: string): void {
    try {
      const existingVoices = this.getLocalVoices();
      const filteredVoices = existingVoices.filter(v => v.id !== voiceId);
      localStorage.setItem('clonedVoices', JSON.stringify(filteredVoices));
      console.log('Voice metadata removed from localStorage:', voiceId);
      
      // TODO: In production, remove from Firestore
      // Example: await deleteDoc(doc(db, 'clonedVoices', voiceId));
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  /**
   * Get voices from localStorage
   */
  private getLocalVoices(): ClonedVoice[] {
    try {
      const stored = localStorage.getItem('clonedVoices');
      if (!stored) return [];
      
      const voices = JSON.parse(stored);
      // Convert date strings back to Date objects
      return voices.map((voice: ClonedVoice) => ({
        ...voice,
        uploadedAt: new Date(voice.uploadedAt)
      }));
    } catch (error) {
      console.warn('Failed to parse localStorage voices:', error);
      return [];
    }
  }

  /**
   * Get all voices from localStorage
   */
  getLocalClonedVoices(): ClonedVoice[] {
    const voices = this.getLocalVoices();
    console.log(`📱 getLocalClonedVoices: Found ${voices.length} voices in localStorage`);
    return voices;
  }

  /**
   * Check if Firebase is available
   */
  isFirebaseAvailable(): boolean {
    return true; // Now Firebase is installed
  }

  /**
   * Get Firebase status message
   */
  getFirebaseStatus(): string {
    return 'Firebase SDK is now installed! Voice files are uploaded to Firebase Storage for secure cloud storage.';
  }

  /**
   * Get Firebase Storage bucket info
   */
  getStorageInfo(): string {
    return 'aitts-d4c6d.firebasestorage.app';
  }

  /**
   * Refresh the voice list by re-fetching from Firebase Storage
   */
  async refreshVoiceList(): Promise<void> {
    try {
      console.log('🔄 Refreshing voice list from Firebase Storage...');
      
      // Simply call getUserVoices to refresh the list
      const voices = await this.getUserVoices();
      console.log(`✅ Voice list refresh completed: ${voices.length} voices found`);
    } catch (error) {
      console.warn('Failed to refresh voice list:', error);
    }
  }
}

export const voiceCloningService = new VoiceCloningService();
export default voiceCloningService;
