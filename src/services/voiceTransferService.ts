import axios from 'axios';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { storage, db } from '../config/firebase';
import { auth } from '../config/firebase';

// Voice Transfer API Configuration
const RUNPOD_VOICE_TRANSFER_ENDPOINT_ID = process.env.RUNPOD_VOICE_TRANSFER_ENDPOINT;
const RUNPOD_BASE_URL = process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';
const VOICE_TRANSFER_ENDPOINT = RUNPOD_VOICE_TRANSFER_ENDPOINT_ID ? `${RUNPOD_BASE_URL}/${RUNPOD_VOICE_TRANSFER_ENDPOINT_ID}/run` : undefined;
const API_KEY = process.env.RUNPOD_API_KEY;

if (!API_KEY) throw new Error('RUNPOD_API_KEY is required');
if (!VOICE_TRANSFER_ENDPOINT) throw new Error('RUNPOD_VOICE_TRANSFER_ENDPOINT is required');

export interface VoiceTransferRequest {
  input_audio: string; // Base64 encoded input audio
  target_audio: string; // Base64 encoded target audio
  no_watermark?: boolean;
}

// New Firebase Storage request interface
export interface VoiceTransferFirebaseRequest {
  input_storage_path: string; // Firebase Storage path for input audio
  target_storage_path: string; // Firebase Storage path for target audio
  output_storage_path: string; // Firebase Storage path for output audio
  return_download_url?: boolean; // Return download URL instead of base64
  no_watermark?: boolean;
}

export interface VoiceTransferJob {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface VoiceTransferResult {
  audio: string; // Base64 encoded transferred audio
  sample_rate: number;
  duration: number;
  format: string;
  model: string;
  operation: string;
  transfer_info: {
    transfer_mode: string;
    target_source: string;
    target_duration: number;
  };
  input_duration: number;
  processing_time: string;
}

// New Firebase Storage result interface
export interface VoiceTransferFirebaseResult {
  download_url?: string; // Firebase download URL for output audio
  audio?: string; // Base64 encoded audio (fallback)
  sample_rate: number;
  duration: number;
  format: string;
  model: string;
  operation: string;
  transfer_info: {
    transfer_mode: string;
    target_source: string;
    target_duration: number;
  };
  input_duration: number;
  processing_time: string;
}

export interface VoiceTransferJobResult {
  id: string;
  status: string;
  output?: VoiceTransferResult | VoiceTransferFirebaseResult;
  error?: string;
}

export interface VoiceTransferRecord {
  id?: string;
  user_id: string;
  name: string;
  input_audio_url: string;
  target_audio_url: string;
  output_audio_url: string;
  input_filename: string;
  target_filename: string;
  output_filename: string;
  content_type: string;
  duration: number;
  timestamp: Date;
  status: 'completed' | 'processing' | 'failed';
  error?: string;
}

export interface VoiceTransferUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

export interface VoiceTransferFirebaseUploadResult {
  success: boolean;
  storage_path?: string;
  download_url?: string;
  error?: string;
  filename?: string;
}

class VoiceTransferService {
  private headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  };

  /**
   * Upload file to Firebase Storage and return storage path
   */
  async uploadFileToFirebase(
    file: File,
    userId: string,
    folder: string = 'voice_transfers'
  ): Promise<VoiceTransferFirebaseUploadResult> {
    try {
      console.log('🔄 Uploading file to Firebase Storage...');
      console.log('📁 User ID:', userId);
      console.log('📁 Original filename:', file.name);
      console.log('📁 File size:', file.size, 'bytes');
      
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'wav';
      const filename = `${folder}_${timestamp}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
      
      // Create the storage path: users/{userId}/voice_transfers/{filename}
      const storagePath = `users/${userId}/${folder}/${filename}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📁 Storage path:', storagePath);
      console.log('📁 Final filename:', filename);
      
      // Upload the file to Firebase Storage
      console.log('📤 Starting upload...');
      const uploadResult = await uploadBytes(storageRef, file, {
        contentType: file.type || 'audio/wav'
      });
      
      console.log('✅ Upload successful!');
      
      // Get the download URL
      console.log('🔗 Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('🔗 Download URL:', downloadURL);
      
      return {
        success: true,
        storage_path: storagePath,
        download_url: downloadURL,
        filename: filename
      };
      
    } catch (error) {
      console.error('❌ File upload failed:', error);
      
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
   * Submit a voice transfer job using Firebase Storage paths
   */
  async submitVoiceTransferJobWithFirebase(request: VoiceTransferFirebaseRequest): Promise<VoiceTransferJob> {
    try {
      console.log('🚀 Submitting voice transfer job with Firebase Storage...');
      console.log('🔗 Endpoint:', VOICE_TRANSFER_ENDPOINT);
      console.log('📁 Input storage path:', request.input_storage_path);
      console.log('📁 Target storage path:', request.target_storage_path);
      console.log('📁 Output storage path:', request.output_storage_path);
      
      // Use the Firebase Storage payload structure with proper URL encoding
      const bucketName = 'aitts-d4c6d.firebasestorage.app';
      
      // Create properly encoded Firebase Storage URLs
      const inputUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(request.input_storage_path)}?alt=media`;
      const targetUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(request.target_storage_path)}?alt=media`;
      const outputUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(request.output_storage_path)}?alt=media`;
      
      const payload = {
        input: {
          operation: "voice_transfer",
          transfer_mode: "audio",
          input_audio: inputUrl,  // Use the full URL instead of storage path
          input_is_url: true,     // Tell API this is a URL
          target_audio: targetUrl, // Use the full URL instead of storage path
          target_is_url: true,    // Tell API this is a URL
          output_storage_path: request.output_storage_path, // Keep storage path for output
          return_download_url: request.return_download_url || true,
          no_watermark: request.no_watermark || false
        }
      };

      console.log('📤 Firebase payload prepared:', {
        operation: payload.input.operation,
        transfer_mode: payload.input.transfer_mode,
        input_audio: payload.input.input_audio,
        input_is_url: payload.input.input_is_url,
        target_audio: payload.input.target_audio,
        target_is_url: payload.input.target_is_url,
        output_storage_path: payload.input.output_storage_path,
        return_download_url: payload.input.return_download_url,
        no_watermark: payload.input.no_watermark
      });

      const response = await axios.post(VOICE_TRANSFER_ENDPOINT, payload, {
        headers: this.headers
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const jobData = response.data;
      console.log('✅ Voice transfer job submitted with Firebase Storage:', jobData.id);

      return {
        id: jobData.id,
        status: jobData.status || 'IN_QUEUE'
      };
    } catch (error: any) {
      console.error('❌ Error submitting voice transfer job with Firebase:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response headers:', error.response.headers);
      }
      
      if (error.request) {
        console.error('❌ Request made but no response received:', error.request);
      }
      
      throw new Error(`Failed to submit voice transfer job with Firebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit a voice transfer job (legacy base64 method)
   */
  async submitVoiceTransferJob(request: VoiceTransferRequest): Promise<VoiceTransferJob> {
    try {
      console.log('🚀 Submitting voice transfer job...');
      console.log('🔗 Endpoint:', VOICE_TRANSFER_ENDPOINT);
      
      // Use the correct payload structure from the API documentation
      const payload = {
        input: {
          operation: "voice_transfer",
          transfer_mode: "audio",
          input_audio: request.input_audio,
          target_audio: request.target_audio,
          no_watermark: request.no_watermark || false
        }
      };

      console.log('📤 Payload prepared:', {
        operation: payload.input.operation,
        transfer_mode: payload.input.transfer_mode,
        input_audio_length: request.input_audio.length,
        target_audio_length: request.target_audio.length,
        no_watermark: payload.input.no_watermark
      });

      console.log('📤 Full payload structure:', JSON.stringify(payload, null, 2));

      const response = await axios.post(VOICE_TRANSFER_ENDPOINT, payload, {
        headers: this.headers
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const jobData = response.data;
      console.log('✅ Voice transfer job submitted:', jobData.id);

      return {
        id: jobData.id,
        status: jobData.status || 'IN_QUEUE'
      };
    } catch (error: any) {
      console.error('❌ Error submitting voice transfer job:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('❌ Response status:', error.response.status);
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response headers:', error.response.headers);
      }
      
      if (error.request) {
        console.error('❌ Request made but no response received:', error.request);
      }
      
      throw new Error(`Failed to submit voice transfer job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check the status of a voice transfer job
   */
  async checkJobStatus(jobId: string): Promise<VoiceTransferJobResult> {
    try {
      // Use the correct status URL format for RunPod
      if (!RUNPOD_VOICE_TRANSFER_ENDPOINT_ID) throw new Error('RUNPOD_VOICE_TRANSFER_ENDPOINT is required');
      const statusUrl = `${RUNPOD_BASE_URL}/${RUNPOD_VOICE_TRANSFER_ENDPOINT_ID}/status/${jobId}`;
      
      console.log('🔍 Checking job status at:', statusUrl);
      
      const response = await axios.get(statusUrl, {
        headers: this.headers
      });

      if (response.status !== 200) {
        throw new Error(`Status check failed with status ${response.status}`);
      }

      console.log('✅ Status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error checking voice transfer job status:', error);
      throw new Error(`Failed to check job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for job completion with timeout
   */
  async pollForCompletion(
    jobId: string,
    maxWaitTime: number = 300000, // 5 minutes
    checkInterval: number = 3000, // 3 seconds
    onStatusUpdate?: (status: string) => void
  ): Promise<VoiceTransferResult | VoiceTransferFirebaseResult> {
    const maxAttempts = Math.floor(maxWaitTime / checkInterval);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`⏳ Checking voice transfer status (attempt ${attempt + 1}/${maxAttempts})...`);
        
        const jobResult = await this.checkJobStatus(jobId);
        const status = jobResult.status;

        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status === 'COMPLETED') {
          console.log('✅ Voice transfer job completed!');
          if (!jobResult.output) {
            throw new Error('Job completed but no output received');
          }
          return jobResult.output as VoiceTransferResult | VoiceTransferFirebaseResult;
        } else if (status === 'FAILED') {
          console.log('❌ Voice transfer job failed:', jobResult.error);
          throw new Error(`Voice transfer failed: ${jobResult.error || 'Unknown error'}`);
        } else if (status === 'CANCELLED') {
          throw new Error('Voice transfer job was cancelled');
        } else {
          console.log(`🔄 Voice Transfer Status: ${status}`);
        }

        // Wait before next check (except on last attempt)
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('cancelled'))) {
          throw error; // Re-throw terminal errors
        }
        console.warn(`⚠️ Voice transfer status check attempt ${attempt + 1} failed:`, error);
        
        // If this was the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        // Otherwise, wait and try again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error(`Timeout waiting for voice transfer to complete after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Complete voice transfer workflow using Firebase Storage
   */
  async transferVoiceWithFirebase(
    inputFile: File,
    targetFile: File,
    originalName: string,
    onStatusUpdate?: (status: string, jobId?: string) => void
  ): Promise<VoiceTransferFirebaseResult> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      onStatusUpdate?.('UPLOADING_FILES');
      
      // Upload both files to Firebase Storage
      console.log('📤 Uploading input and target files to Firebase Storage...');
      
      const [inputUpload, targetUpload] = await Promise.all([
        this.uploadFileToFirebase(inputFile, userId, 'voice_transfers'),
        this.uploadFileToFirebase(targetFile, userId, 'voice_transfers')
      ]);

      if (!inputUpload.success || !targetUpload.success) {
        throw new Error(`Firebase upload failed: ${inputUpload.error || targetUpload.error}`);
      }

      console.log('✅ Both files uploaded to Firebase Storage');
      console.log('📁 Input storage path:', inputUpload.storage_path);
      console.log('📁 Target storage path:', targetUpload.storage_path);

      // Generate output storage path
      const timestamp = Date.now();
      const outputFilename = `output_${timestamp}_${Math.random().toString(36).substring(2, 8)}.wav`;
      const outputStoragePath = `users/${userId}/voice_transfers/${outputFilename}`;

      onStatusUpdate?.('SUBMITTING_JOB');
      
      // Submit job with Firebase Storage paths
      const job = await this.submitVoiceTransferJobWithFirebase({
        input_storage_path: inputUpload.storage_path!,
        target_storage_path: targetUpload.storage_path!,
        output_storage_path: outputStoragePath,
        return_download_url: true,
        no_watermark: true
      });
      
      onStatusUpdate?.('IN_QUEUE', job.id);
      
      // Poll for completion
      const result = await this.pollForCompletion(
        job.id,
        300000, // 5 minutes
        3000,   // 3 seconds
        (status) => onStatusUpdate?.(status, job.id)
      );

      // Save the voice transfer to database
      try {
        await this.saveVoiceTransferWithFirebase(
          originalName, 
          inputUpload, 
          targetUpload, 
          outputStoragePath,
          result
        );
      } catch (saveError) {
        console.error('❌ Failed to save voice transfer:', saveError);
        // Don't fail the transfer if saving fails
      }

      return result as VoiceTransferFirebaseResult;
    } catch (error) {
      console.error('❌ Voice transfer workflow with Firebase failed:', error);
      throw error;
    }
  }

  /**
   * Complete voice transfer workflow: submit + poll + save to database (legacy base64 method)
   */
  async transferVoice(
    inputAudioBase64: string,
    targetAudioBase64: string,
    originalName: string,
    onStatusUpdate?: (status: string, jobId?: string) => void
  ): Promise<VoiceTransferResult | VoiceTransferFirebaseResult> {
    try {
      // Submit job
      onStatusUpdate?.('SUBMITTING');
      const job = await this.submitVoiceTransferJob({
        input_audio: inputAudioBase64,
        target_audio: targetAudioBase64,
        no_watermark: true
      });
      
      onStatusUpdate?.('IN_QUEUE', job.id);
      
      // Poll for completion
      const result = await this.pollForCompletion(
        job.id,
        300000, // 5 minutes
        3000,   // 3 seconds
        (status) => onStatusUpdate?.(status, job.id)
      );

      // Save the voice transfer to database and Firebase Storage
      try {
        if ('audio' in result && result.audio) {
          await this.saveVoiceTransfer(originalName, inputAudioBase64, targetAudioBase64, result as VoiceTransferResult);
        }
      } catch (saveError) {
        console.error('❌ Failed to save voice transfer:', saveError);
        // Don't fail the transfer if saving fails
      }

      return result;
    } catch (error) {
      console.error('❌ Voice transfer workflow failed:', error);
      throw error;
    }
  }

  /**
   * Upload audio to Firebase Storage (legacy base64 method)
   */
  async uploadAudioToFirebase(
    audioBase64: string,
    userId: string,
    filename: string,
    contentType: string = 'audio/wav'
  ): Promise<VoiceTransferUploadResult> {
    try {
      console.log('🔄 Uploading audio to Firebase Storage...');
      console.log('📁 User ID:', userId);
      console.log('📁 Filename:', filename);
      
      // Convert base64 to blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: contentType });
      
      // Create the storage path: users/{userId}/voice_transfers/{filename}
      const storagePath = `users/${userId}/voice_transfers/${filename}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📁 Storage path:', storagePath);
      
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
      console.error('❌ Audio upload failed:', error);
      
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
   * Save voice transfer to database and Firebase Storage (legacy base64 method)
   */
  private async saveVoiceTransfer(
    originalName: string,
    inputAudioBase64: string,
    targetAudioBase64: string,
    result: VoiceTransferResult
  ): Promise<void> {
    try {
      console.log('💾 Saving voice transfer to database and storage...');
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 8);
      
      // Generate filenames
      const inputFilename = `input_${timestamp}_${randomId}.wav`;
      const targetFilename = `target_${timestamp}_${randomId}.wav`;
      const outputFilename = `output_${timestamp}_${randomId}.wav`;
      
      console.log('📁 Generated filenames:', { inputFilename, targetFilename, outputFilename });

      // Upload all audio files to Firebase Storage
      console.log('📤 Uploading audio files to Firebase Storage...');
      
      const [inputUpload, targetUpload, outputUpload] = await Promise.all([
        this.uploadAudioToFirebase(inputAudioBase64, userId, inputFilename),
        this.uploadAudioToFirebase(targetAudioBase64, userId, targetFilename),
        this.uploadAudioToFirebase(result.audio, userId, outputFilename)
      ]);

      if (!inputUpload.success || !targetUpload.success || !outputUpload.success) {
        throw new Error(`Firebase upload failed: ${inputUpload.error || targetUpload.error || outputUpload.error}`);
      }

      console.log('✅ All audio files uploaded to Firebase Storage');

      // Create voice transfer record in database
      console.log('📝 Creating voice transfer record in database...');
      const voiceTransferRecord: Omit<VoiceTransferRecord, 'id' | 'timestamp'> = {
        user_id: userId,
        name: originalName,
        input_audio_url: inputUpload.url!,
        target_audio_url: targetUpload.url!,
        output_audio_url: outputUpload.url!,
        input_filename: inputFilename,
        target_filename: targetFilename,
        output_filename: outputFilename,
        content_type: 'audio/wav',
        duration: result.duration,
        status: 'completed'
      };

      const recordId = await this.saveVoiceTransferRecord(voiceTransferRecord);
      console.log('✅ Voice transfer record created in database with ID:', recordId);

    } catch (error) {
      console.error('❌ Failed to save voice transfer:', error);
      throw error;
    }
  }

  /**
   * Save voice transfer to database using Firebase Storage URLs
   */
  private async saveVoiceTransferWithFirebase(
    originalName: string,
    inputUpload: VoiceTransferFirebaseUploadResult,
    targetUpload: VoiceTransferFirebaseUploadResult,
    outputStoragePath: string,
    result: VoiceTransferFirebaseResult
  ): Promise<void> {
    try {
      console.log('💾 Saving voice transfer to database with Firebase URLs...');
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get output download URL from result or construct it
      let outputDownloadURL = result.download_url;
      if (!outputDownloadURL) {
        // Construct the download URL from the storage path
        const storageRef = ref(storage, outputStoragePath);
        outputDownloadURL = await getDownloadURL(storageRef);
      }

      // Create voice transfer record in database
      console.log('📝 Creating voice transfer record in database...');
      const voiceTransferRecord: Omit<VoiceTransferRecord, 'id' | 'timestamp'> = {
        user_id: userId,
        name: originalName,
        input_audio_url: inputUpload.download_url!,
        target_audio_url: targetUpload.download_url!,
        output_audio_url: outputDownloadURL,
        input_filename: inputUpload.filename!,
        target_filename: targetUpload.filename!,
        output_filename: outputStoragePath.split('/').pop()!,
        content_type: 'audio/wav',
        duration: result.duration,
        status: 'completed'
      };

      const recordId = await this.saveVoiceTransferRecord(voiceTransferRecord);
      console.log('✅ Voice transfer record created in database with ID:', recordId);

    } catch (error) {
      console.error('❌ Failed to save voice transfer with Firebase:', error);
      throw error;
    }
  }

  /**
   * Save voice transfer record to Firestore
   */
  private async saveVoiceTransferRecord(record: Omit<VoiceTransferRecord, 'id' | 'timestamp'>): Promise<string> {
    try {
      console.log('💾 Saving voice transfer record to Firestore...');
      
      const docRef = doc(collection(db, 'voice_transfers'));
      const recordWithTimestamp: VoiceTransferRecord = {
        ...record,
        id: docRef.id,
        timestamp: new Date()
      };
      
      await setDoc(docRef, recordWithTimestamp);
      
      console.log('✅ Voice transfer record saved with ID:', docRef.id);
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Failed to save voice transfer record:', error);
      throw error;
    }
  }

  /**
   * Get voice transfer records for a user
   */
  async getVoiceTransferRecords(userId: string, limit: number = 10): Promise<VoiceTransferRecord[]> {
    try {
      console.log('🔍 Getting voice transfer records...');
      console.log('📁 User ID:', userId);
      
      const q = query(
        collection(db, 'voice_transfers'),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      
      const records: VoiceTransferRecord[] = [];
      querySnapshot.forEach((doc) => {
        records.push(doc.data() as VoiceTransferRecord);
      });
      
      console.log(`✅ Found ${records.length} voice transfer records`);
      return records;
      
    } catch (error) {
      console.error('❌ Failed to get voice transfer records:', error);
      return [];
    }
  }

  /**
   * Convert base64 audio to blob for playback
   */
  base64ToBlob(base64Data: string, contentType: string = 'audio/wav'): Blob {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Create audio URL from base64 data
   */
  createAudioURL(base64Data: string, contentType: string = 'audio/wav'): string {
    const blob = this.base64ToBlob(base64Data, contentType);
    return URL.createObjectURL(blob);
  }

  /**
   * Download audio file from base64 data
   */
  downloadAudio(base64Data: string, filename: string = 'transferred_audio.wav', contentType: string = 'audio/wav'): void {
    const blob = this.base64ToBlob(base64Data, contentType);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Validate audio input
   */
  validateAudioInput(inputAudioBase64: string, targetAudioBase64: string): { valid: boolean; error?: string } {
    try {
      if (!inputAudioBase64 || !targetAudioBase64) {
        return { valid: false, error: 'Both input and target audio are required' };
      }

      // Check if base64 is valid
      try {
        atob(inputAudioBase64);
        atob(targetAudioBase64);
      } catch {
        return { valid: false, error: 'Invalid base64 audio data' };
      }

      // Check file size (rough estimate)
      const inputSize = Math.ceil((inputAudioBase64.length * 3) / 4);
      const targetSize = Math.ceil((targetAudioBase64.length * 3) / 4);
      
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (inputSize > maxSize || targetSize > maxSize) {
        return { valid: false, error: 'Audio files are too large (max 50MB each)' };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Validate file input for Firebase upload
   */
  validateFileInput(inputFile: File, targetFile: File): { valid: boolean; error?: string } {
    try {
      if (!inputFile || !targetFile) {
        return { valid: false, error: 'Both input and target audio files are required' };
      }

      // Check file types
      if (!inputFile.type.startsWith('audio/') || !targetFile.type.startsWith('audio/')) {
        return { valid: false, error: 'Please select valid audio files' };
      }

      // Check file sizes
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (inputFile.size > maxSize || targetFile.size > maxSize) {
        return { valid: false, error: 'Audio files are too large (max 50MB each)' };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Download audio from Firebase Storage URL
   */
  downloadAudioFromURL(downloadURL: string, filename: string = 'transferred_audio.wav'): void {
    const a = document.createElement('a');
    a.href = downloadURL;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Create audio URL from Firebase download URL
   */
  createAudioURLFromFirebase(downloadURL: string): string {
    // Fix malformed Firebase Storage URLs automatically
    return this.fixFirebaseStorageURL(downloadURL);
  }

  /**
   * Fix malformed Firebase Storage URLs by properly encoding the path
   */
  fixFirebaseStorageURL(malformedURL: string): string {
    try {
      console.log('🔧 Fixing malformed Firebase Storage URL...');
      console.log('❌ Malformed URL:', malformedURL);
      
      // Check if this is a Firebase Storage URL that needs fixing
      if (!malformedURL.includes('firebasestorage.googleapis.com')) {
        console.log('✅ Not a Firebase Storage URL, returning as-is');
        return malformedURL;
      }
      
      // Extract the bucket and path from the malformed URL
      const urlParts = malformedURL.split('/o/');
      if (urlParts.length !== 2) {
        console.log('⚠️ Cannot parse Firebase Storage URL structure');
        return malformedURL;
      }
      
      const baseUrl = urlParts[0] + '/o/';
      const storagePath = urlParts[1].split('?')[0]; // Remove query parameters
      
      // URL encode the storage path
      const encodedPath = encodeURIComponent(storagePath);
      
      // Reconstruct the URL with proper encoding
      const fixedURL = baseUrl + encodedPath + '?alt=media';
      
      console.log('✅ Fixed URL:', fixedURL);
      return fixedURL;
      
    } catch (error) {
      console.error('❌ Error fixing Firebase Storage URL:', error);
      return malformedURL; // Return original if fixing fails
    }
  }
}

// Export singleton instance
export const voiceTransferService = new VoiceTransferService();
export default voiceTransferService;
