import axios from 'axios';
import { firebaseService } from './firebaseService';
import { databaseService } from './databaseService';
import { auth } from '../config/firebase';
import { jobMappingService } from './jobMappingService';
import { runpodFallbackService } from './runpodFallbackService';

// API Configuration
// DEBUG: Log available env vars during build to diagnose Vercel issues
if (typeof window === 'undefined') {
  console.log('🔍 [BUILD DEBUG] Environment variables check:');
  console.log('RUNPOD_API_KEY:', process.env.RUNPOD_API_KEY ? `${process.env.RUNPOD_API_KEY.substring(0, 10)}...` : 'MISSING');
  console.log('HUGGINGFACE_TOKEN:', process.env.HUGGINGFACE_TOKEN ? `${process.env.HUGGINGFACE_TOKEN.substring(0, 10)}...` : 'MISSING');
  console.log('RUNPOD_ENDPOINT_WITH_STORAGE:', process.env.RUNPOD_ENDPOINT_WITH_STORAGE || 'MISSING');
  console.log('RUNPOD_ENDPOINT_NO_STORAGE:', process.env.RUNPOD_ENDPOINT_NO_STORAGE || 'MISSING');
  console.log('RUNPOD_BASE_URL:', process.env.RUNPOD_BASE_URL || 'MISSING');
  console.log('All env keys (RUNPOD_*):', Object.keys(process.env).filter(k => k.startsWith('RUNPOD_')));
  console.log('All env keys (DEEPSEEK_*):', Object.keys(process.env).filter(k => k.startsWith('DEEPSEEK_')));
  console.log('Total env vars:', Object.keys(process.env).length);
}

const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_WITH_STORAGE;
const RUNPOD_BASE_URL = process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';
const RUNPOD_ENDPOINT = RUNPOD_ENDPOINT_ID ? `${RUNPOD_BASE_URL}/${RUNPOD_ENDPOINT_ID}/run` : undefined;
const API_KEY = typeof window === 'undefined' ? process.env.RUNPOD_API_KEY : null;
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;

if (!API_KEY) {
  console.error('❌ [BUILD ERROR] RUNPOD_API_KEY is missing!');
  console.error('Available env vars:', Object.keys(process.env).sort().join(', '));
  throw new Error('RUNPOD_API_KEY is required');
}
if (!HF_TOKEN) {
  console.error('❌ [BUILD ERROR] HUGGINGFACE_TOKEN is missing!');
  throw new Error('HUGGINGFACE_TOKEN is required');
}
if (!RUNPOD_ENDPOINT) {
  console.error('❌ [BUILD ERROR] RUNPOD_ENDPOINT_WITH_STORAGE is missing!');
  throw new Error('RUNPOD_ENDPOINT_WITH_STORAGE is required');
}

// Validate API configuration
console.log('🔧 ===== TRANSCRIPTION SERVICE CONFIGURATION =====');
console.log('🔗 RunPod Endpoint:', RUNPOD_ENDPOINT);
console.log('🔑 API Key (first 10 chars):', API_KEY.substring(0, 10) + '...');
console.log('🔑 API Key length:', API_KEY.length);
console.log('🔑 HF Token (first 10 chars):', HF_TOKEN.substring(0, 10) + '...');
console.log('🔧 Configuration loaded successfully');

export interface TranscriptionRequest {
  audio_url?: string;
  audio_data?: string;
  audio_format?: string;
  include_timestamps?: boolean;
  use_diarization?: boolean;
  num_speakers?: number | null;
}

export interface TranscriptionJob {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface DiarizedSegment {
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
}

export interface TranscriptionResult {
  merged_text?: string;
  text?: string;
  diarized_transcript?: DiarizedSegment[];
  timestamps?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  speaker_count?: number;
  duration?: number;
  processing_time?: number;
  workflow_type?: string;
  model_used?: string; // Add missing property
  metadata?: {
    total_characters: number;
    speaker_segments?: number;
    whole_file_processed: boolean;
    no_chunking_used: boolean;
  };
  audio_duration_seconds?: number; // Added for duration calculation
}

export interface TranscriptionJobResult {
  id: string;
  status: string;
  output?: TranscriptionResult;
  error?: string;
}

class TranscriptionService {
  private headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  };

  /**
   * Test API connection using fallback service
   */
  async testAPIConnection(): Promise<boolean> {
    try {
      console.log('🧪 ===== TESTING API CONNECTION WITH FALLBACK =====');
      
      // Use fallback service to test both endpoints
      const testResult = await runpodFallbackService.testConnections();
      
      console.log('📊 Connection test results:', testResult);
      
      if (testResult.primary || testResult.backup) {
        console.log('✅ At least one endpoint is reachable');
        return true;
      } else {
        console.log('❌ Both endpoints are unreachable');
        return false;
      }
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return false;
    }
  }

  /**
   * Submit a transcription job using Firebase URL with intelligent fallback
   */
  async submitTranscriptionJob(request: TranscriptionRequest): Promise<TranscriptionJob> {
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!webhookUrl) throw new Error('NEXT_PUBLIC_APP_URL is required');
      
      console.log('🚀 ===== SUBMITTING TRANSCRIPTION JOB WITH FALLBACK =====');
      console.log('📤 Request:', JSON.stringify(request, null, 2));
      console.log('🔗 Webhook URL:', webhookUrl);

      // Prepare request for fallback service
      const fallbackRequest = {
        audio_url: request.audio_url!,
        audio_format: request.audio_format || 'mp3',
        include_timestamps: request.include_timestamps || true,
        use_diarization: request.use_diarization || false,
        num_speakers: request.num_speakers,
        hf_token: request.use_diarization ? HF_TOKEN : undefined
      };

      // Use fallback service for intelligent endpoint selection
      const result = await runpodFallbackService.transcribeWithFallback(
        fallbackRequest,
        `${webhookUrl}/api/webhooks/runpod`
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit transcription job');
      }

      console.log('✅ Job submitted successfully via fallback service');
      console.log('🆔 Job ID:', result.jobId);
      console.log('📍 Endpoint used:', result.endpoint);

      // Create job mapping for webhook handling
      const userId = auth.currentUser?.uid;
      if (userId && result.jobId) {
        try {
          await jobMappingService.mapJobToUser(result.jobId, userId, 'transcription');
          console.log('📝 Job mapping created for webhook handling');
        } catch (mappingError) {
          console.error('❌ Failed to create job mapping:', mappingError);
          // Don't fail the job submission if mapping fails
        }
      } else {
        console.warn('⚠️ No user ID or job ID available for job mapping');
      }

      return {
        id: result.jobId!,
        status: 'IN_QUEUE'
      };
    } catch (error) {
      console.error('❌ ===== ERROR SUBMITTING JOB WITH FALLBACK =====');
      console.error('❌ Error details:', error);
      
      throw new Error(`Failed to submit transcription job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check the status of a transcription job
   */
  async checkJobStatus(jobId: string): Promise<TranscriptionJobResult> {
    try {
      // Try both endpoints for status checks
      const endpointWithStorage = process.env.RUNPOD_ENDPOINT_WITH_STORAGE;
      const endpointNoStorage = process.env.RUNPOD_ENDPOINT_NO_STORAGE;
      const baseUrl = process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';
      
      if (!endpointWithStorage || !endpointNoStorage) {
        throw new Error('RUNPOD_ENDPOINT_WITH_STORAGE and RUNPOD_ENDPOINT_NO_STORAGE are required');
      }
      
      const primaryStatusUrl = `${baseUrl}/${endpointWithStorage}/status/${jobId}`;
      const backupStatusUrl = `${baseUrl}/${endpointNoStorage}/status/${jobId}`;
      
      console.log(`🔍 Checking job status for ID: ${jobId}`);
      console.log(`🔗 Primary Status URL: ${primaryStatusUrl}`);
      console.log(`🔗 Backup Status URL: ${backupStatusUrl}`);
      
      let response;
      try {
        // Try primary endpoint first
        response = await axios.get(primaryStatusUrl, {
          headers: this.headers
        });
        console.log(`✅ Status check successful on primary endpoint`);
      } catch (error) {
        // If primary fails, try backup endpoint
        console.log(`🔄 Primary status check failed, trying backup endpoint...`);
        response = await axios.get(backupStatusUrl, {
          headers: this.headers
        });
        console.log(`✅ Status check successful on backup endpoint`);
      }

      if (response.status !== 200) {
        throw new Error(`Status check failed with status ${response.status}`);
      }

      const result = response.data;
      console.log(`📊 Job ${jobId} status:`, result.status);
      
      if (result.output) {
        console.log('✅ Job completed with output');
      } else if (result.error) {
        console.log('❌ Job failed with error:', result.error);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error checking job status for ${jobId}:`, error);
      if (axios.isAxiosError(error)) {
        console.error('📡 HTTP Status:', error.response?.status);
        console.error('📄 Response Data:', error.response?.data);
      }
      throw new Error(`Failed to check job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for job completion with timeout
   */
  async pollForCompletion(
    jobId: string, 
    maxWaitTime: number = 600000, // 10 minutes
    checkInterval: number = 30000, // 30 seconds
    onStatusUpdate?: (status: string) => void
  ): Promise<TranscriptionResult> {
    const maxAttempts = Math.floor(maxWaitTime / checkInterval);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`⏳ Checking status (attempt ${attempt + 1}/${maxAttempts})...`);
        
        const jobResult = await this.checkJobStatus(jobId);
        const status = jobResult.status;

        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status === 'COMPLETED') {
          console.log('✅ Job completed!');
          if (!jobResult.output) {
            throw new Error('Job completed but no output received');
          }
          return jobResult.output;
        } else if (status === 'FAILED') {
          console.log('❌ Job failed:', jobResult.error);
          throw new Error(`Transcription failed: ${jobResult.error || 'Unknown error'}`);
        } else if (status === 'CANCELLED') {
          throw new Error('Job was cancelled');
        } else {
          console.log(`🔄 Status: ${status}`);
        }

        // Wait before next check (except on last attempt)
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('cancelled'))) {
          throw error; // Re-throw terminal errors
        }
        console.warn(`⚠️ Status check attempt ${attempt + 1} failed:`, error);
        
        // If this was the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        // Otherwise, wait and try again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error(`Timeout waiting for transcription to complete after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Complete transcription workflow: submit + poll + database update
   */
  async transcribeAudio(
    request: TranscriptionRequest,
    filename?: string, // Add filename parameter
    recordId?: string, // This will be empty now, we'll create the record after transcription
    onStatusUpdate?: (status: string, jobId?: string) => void
  ): Promise<TranscriptionResult> {
    try {
      console.log('🎯 ===== STARTING TRANSCRIPTION WORKFLOW =====');
      console.log('📝 Request:', JSON.stringify(request, null, 2));
      console.log('🆔 Record ID:', recordId);
      console.log('📞 Status callback provided:', !!onStatusUpdate);
      
      // Validate request
      if (!request.audio_url && !request.audio_data) {
        console.error('❌ Validation failed: No audio URL or data provided');
        throw new Error('Either audio_url or audio_data must be provided');
      }
      
      console.log('✅ Request validation passed');
      
      // Submit job
      console.log('📤 About to submit transcription job...');
      onStatusUpdate?.('SUBMITTING');
      
      console.log('📤 Calling submitTranscriptionJob...');
      const job = await this.submitTranscriptionJob(request);
      
      console.log('⏳ Job submitted successfully, starting status polling...');
      onStatusUpdate?.('IN_QUEUE', job.id);
      
      // Poll for completion
      console.log('🔄 Starting to poll for completion...');
      const result = await this.pollForCompletion(
        job.id,
        600000, // 10 minutes
        30000,  // 30 seconds
        (status) => {
          console.log(`🔄 Status update: ${status}`);
          onStatusUpdate?.(status, job.id);
        }
      );

      console.log('✅ Transcription completed successfully');
      console.log('📄 Result:', result);

      // NOW create the database record with transcription results
      try {
        console.log('📝 Creating database record with transcription results...');
        
        // Get the transcript text
        const transcriptText = result.merged_text || result.text || '';
        console.log('📝 Transcript text length:', transcriptText.length);
        
        // Calculate duration from metadata or timestamps
        let duration = 0;
        if (result.audio_duration_seconds) {
          duration = result.audio_duration_seconds;
        } else if (result.duration) {
          duration = result.duration;
        } else if (result.timestamps && result.timestamps.length > 0) {
          const lastTimestamp = result.timestamps[result.timestamps.length - 1];
          duration = lastTimestamp.end;
        }
        console.log('⏱️ Calculated duration:', duration);
        
        console.log('📝 About to call databaseService.createSTTRecord...');
        console.log('📝 Data being passed:', {
          audio_id: request.audio_url?.split('/').pop() || 'unknown',
          file_url: request.audio_url || '',
          transcript: transcriptText.substring(0, 100) + '...',
          duration: duration,
          language: 'en',
          status: 'completed'
        });
        
        // Create the STT record in database with all the data
        const recordId = await databaseService.createSTTRecord({
          user_id: auth.currentUser?.uid || 'unknown',
          audio_id: request.audio_url?.split('/').pop() || 'unknown',
          name: filename || 'Untitled Transcription', // Use the original filename
          audio_file_url: request.audio_url || '', // ✅ Use audio_file_url to match interface
          transcript: transcriptText,
          duration: duration,
          language: 'en',
          status: 'completed',
          // Add timestamps and diarization data for word-level highlighting
          timestamps: result.timestamps || [],
          diarized_transcript: result.diarized_transcript || [],
          metadata: {
            word_count: transcriptText.split(/\s+/).length,
            speaker_count: result.speaker_count || result.diarized_transcript?.length || 0,
            processing_method: result.model_used || 'unknown',
            chunks_processed: result.metadata?.whole_file_processed ? 1 : 0
          }
        }, result); // ✅ Pass the full transcription result to save to Storage
        
        console.log('✅ Database record created with transcription results, ID:', recordId);
      } catch (dbError) {
        console.error('❌ Failed to create database record:', dbError);
        console.error('❌ Error details:', {
          message: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined,
          error: dbError
        });
        // Don't fail the transcription if database creation fails
      }

      return result;
    } catch (error) {
      console.error('❌ ===== TRANSCRIPTION WORKFLOW FAILED =====');
      console.error('❌ Error details:', error);
      throw error;
    }
  }

  /**
   * Upload file to Firebase and get URL (replaces base64 method)
   * This is now the preferred method as per the Firebase Pipeline Guide
   */
  async uploadFileToFirebase(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; filename: string; recordId: string }> {
    console.log('🔄 Using Firebase upload method as required by API...');
    
    // Only upload to Storage, don't create database record yet
    const result = await firebaseService.uploadAudioFileToStorageOnly(file, onProgress);
    
    if (!result.success || !result.url) {
      throw new Error(`Firebase upload failed: ${result.error}`);
    }
    
    console.log('✅ Firebase upload successful:', result.url);
    console.log('📁 Original filename:', file.name);
    
    // Create database record after transcription is complete
    return {
      url: result.url,
      filename: file.name, // Save the original filename
      recordId: '' // Will be set after transcription completes
    };
  }

  /**
   * Convert file to base64 for direct upload (DEPRECATED - Legacy mode disabled)
   * @deprecated Use uploadFileToFirebase instead
   */
  async fileToBase64(file: File): Promise<string> {
    console.warn('⚠️ Base64 upload is deprecated. API requires Firebase URLs now.');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix to get just the base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac'];
  }

  /**
   * Validate audio file for Firebase upload (no size limits)
   */
  validateAudioFile(file: File): { valid: boolean; error?: string } {
    // Use Firebase service validation (no size limits)
    return firebaseService.validateAudioFile(file);
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();
export default transcriptionService;
