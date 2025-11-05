import { databaseService } from './databaseService';
import { trialService } from './trialService';
import { getWebSocketManager, JobUpdate } from '@/lib/websocket';
import { jobMappingService } from './jobMappingService';

export interface ProcessingJob {
  id: string;
  userId: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileId: string;
  fileName: string;
  error?: string;
  result?: any;
  startTime: number;
  endTime?: number;
}

class BackgroundProcessingService {
  private jobs: Map<string, ProcessingJob> = new Map();
  private listeners: Map<string, ((job: ProcessingJob) => void)[]> = new Map();
  private runpodJobMappings: Map<string, string> = new Map(); // RunPod job ID -> Internal job ID
  private isProcessing = false;

  /**
   * Start a new background processing job
   */
  async startJob(
    userId: string, 
    fileId: string, 
    fileName: string, 
    audioFile: File,
    settings: any,
    onProgress?: (progress: number, status: string) => void
  ): Promise<string> {
    console.log('🚀 BackgroundProcessingService.startJob called with:', {
      userId,
      fileId,
      fileName,
      fileSize: audioFile.size,
      settings
    });
    
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: ProcessingJob = {
      id: jobId,
      userId,
      status: 'uploading',
      progress: 0,
      fileId,
      fileName,
      startTime: Date.now()
    };

    this.jobs.set(jobId, job);
    this.notifyListeners(jobId, job);
    
    console.log('✅ Background job created:', {
      jobId,
      userId,
      fileName,
      totalJobs: this.jobs.size
    });

    // Start background processing
    this.processJob(jobId, audioFile, settings, onProgress).catch(error => {
      console.error('Background processing failed:', error);
      this.updateJobStatus(jobId, 'failed', 0, error.message);
    });

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): ProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: string): ProcessingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Map RunPod job ID to internal job ID
   */
  mapRunpodJob(runpodJobId: string, internalJobId: string) {
    this.runpodJobMappings.set(runpodJobId, internalJobId);
    console.log(`📝 Mapped RunPod job ${runpodJobId} to internal job ${internalJobId}`);
  }

  /**
   * Get internal job ID from RunPod job ID
   */
  getInternalJobId(runpodJobId: string): string | undefined {
    return this.runpodJobMappings.get(runpodJobId);
  }

  /**
   * Get job by RunPod job ID
   */
  getJobByRunpodId(runpodJobId: string): ProcessingJob | undefined {
    console.log('🔍 getJobByRunpodId called with:', runpodJobId);
    const internalJobId = this.getInternalJobId(runpodJobId);
    console.log('🔍 Internal job ID found:', internalJobId);
    if (internalJobId) {
      const job = this.jobs.get(internalJobId);
      console.log('🔍 Job found:', !!job, job ? { id: job.id, fileName: job.fileName, status: job.status } : 'null');
      return job;
    }
    console.log('🔍 No internal job ID found for RunPod job:', runpodJobId);
    return undefined;
  }

  /**
   * Subscribe to job updates
   */
  subscribeToJob(jobId: string, callback: (job: ProcessingJob) => void): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, []);
    }
    this.listeners.get(jobId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(jobId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to all user jobs
   */
  subscribeToUserJobs(userId: string, callback: (jobs: ProcessingJob[]) => void): () => void {
    const updateCallback = () => {
      const userJobs = this.getUserJobs(userId);
      callback(userJobs);
    };

    // Subscribe to all jobs for this user
    const unsubscribers: (() => void)[] = [];
    const userJobs = this.getUserJobs(userId);
    
    userJobs.forEach(job => {
      const unsubscribe = this.subscribeToJob(job.id, updateCallback);
      unsubscribers.push(unsubscribe);
    });

    // Initial call
    updateCallback();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Update job status
   */
  private updateJobStatus(jobId: string, status: ProcessingJob['status'], progress: number, error?: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    job.progress = progress;
    if (error) job.error = error;
    if (status === 'completed' || status === 'failed') {
      job.endTime = Date.now();
    }

    this.jobs.set(jobId, job);
    this.notifyListeners(jobId, job);

    // Emit real-time update
    this.emitJobUpdate(job.userId, jobId, 'transcription', status, progress, job.result);
  }

  /**
   * Notify listeners of job updates
   */
  notifyListeners(jobId: string, job: ProcessingJob) {
    const listeners = this.listeners.get(jobId);
    if (listeners) {
      listeners.forEach(callback => callback(job));
    }
  }

  /**
   * Process job in background
   */
  private async processJob(jobId: string, audioFile: File, settings: any, onProgress?: (progress: number, status: string) => void) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      // Step 1: Upload to Firebase
      console.log(`📤 Uploading ${job.fileName} to Firebase...`);
      this.updateJobStatus(jobId, 'uploading', 10);
      onProgress?.(10, 'uploading');

      const { transcriptionService } = await import('./transcriptionService');
      const uploadResult = await transcriptionService.uploadFileToFirebase(audioFile, (progress) => {
        const uploadProgress = 10 + (progress * 0.2); // 10-30%
        this.updateJobStatus(jobId, 'uploading', uploadProgress);
        onProgress?.(uploadProgress, 'uploading');
      });

      console.log(`✅ ${job.fileName} uploaded successfully`);
      this.updateJobStatus(jobId, 'processing', 30);
      onProgress?.(30, 'processing');

      // Step 2: Call transcription API
      console.log(`🎤 Starting transcription for ${job.fileName}...`);
      this.updateJobStatus(jobId, 'processing', 50);
      onProgress?.(50, 'processing');

      // Map job to user for webhook notifications (will update with RunPod job ID after API call)
      await jobMappingService.mapJobToUser(jobId, job.userId, 'transcription', job.fileName);
      
      const response = await fetch('/api/transcribe-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: uploadResult.url,
          filename: job.fileName,
          userId: job.userId,
          settings: {
            use_diarization: settings.use_diarization || true,
            pyannote_version: settings.use_diarization ? (settings.pyannote_version || '3.0') : undefined,
            max_speakers: null,
            include_timestamps: true,
            speaker_threshold: 0.35,
            single_speaker_mode: false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Transcription API failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.jobId) {
        console.log(`📤 Transcription job submitted with webhook: ${result.jobId}`);
        this.updateJobStatus(jobId, 'processing', 80);
        onProgress?.(80, 'processing');
        
        // Map RunPod job ID to internal job ID
        this.mapRunpodJob(result.jobId, jobId);
        console.log('📝 Job mapping created - RunPod ID:', result.jobId, 'Internal ID:', jobId);
        
        // Update job mapping with RunPod job ID
        await jobMappingService.updateJobMappingWithRunpodId(jobId, result.jobId);
        console.log('📝 Updated job mapping with RunPod job ID:', result.jobId);
        
        // Update job with RunPod job ID for webhook mapping
        job.result = { runpodJobId: result.jobId };
        this.jobs.set(jobId, job);
        console.log('📝 Job updated with RunPod ID:', job.result.runpodJobId);
        
        // Also create persistent mapping in database for webhook access
        try {
          await jobMappingService.mapJobToUser(result.jobId, job.userId, 'transcription', job.fileName);
          console.log('📝 Persistent job mapping created in database with filename:', job.fileName);
        } catch (mappingError) {
          console.error('❌ Failed to create persistent job mapping:', mappingError);
        }
        
        // The webhook will handle completion - we just wait
        console.log('⏳ Waiting for webhook notification...');
        return; // Exit early - webhook will complete the job
      }
      
      // Fallback to old polling method if webhook fails
      console.log(`✅ Transcription completed for ${job.fileName}`);
      this.updateJobStatus(jobId, 'processing', 80);
      onProgress?.(80, 'processing');

      // Step 3: Save to database
      console.log(`💾 Saving ${job.fileName} to database...`);
      const recordId = await databaseService.createSTTRecord({
        user_id: job.userId,
        audio_id: uploadResult.url.split('/').pop() || 'unknown',
        name: job.fileName,
        audio_file_url: uploadResult.url,
        transcript: result.transcript || '',
        duration: result.duration || 0,
        language: 'en',
        status: 'completed',
        timestamps: result.timestamps || [],
        diarized_transcript: result.diarized_transcript || [],
        metadata: {
          word_count: (result.transcript || '').split(/\s+/).length,
          speaker_count: result.diarized_transcript?.length || 0,
          processing_method: 'background_processing',
          chunks_processed: 1
        }
      }, result);

      console.log(`✅ ${job.fileName} saved to database with ID: ${recordId}`);

      // Step 4: Deduct trial minutes
      try {
        const actualDuration = result.metadata?.duration || result.duration || 0;
        const actualMinutes = Math.ceil(actualDuration / 60);
        console.log(`📊 Deducting ${actualMinutes} minutes from trial for ${job.fileName}`);
        await trialService.deductMinutes(actualMinutes);
      } catch (error) {
        console.error('⚠️ Error deducting trial minutes:', error);
      }

      // Step 5: Mark as completed
      job.result = { ...result, recordId };
      this.updateJobStatus(jobId, 'completed', 100);
      onProgress?.(100, 'completed');

      console.log(`🎉 Background processing completed for ${job.fileName}`);

    } catch (error) {
      console.error(`❌ Background processing failed for ${job.fileName}:`, error);
      this.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Emit real-time job update
   */
  private async emitJobUpdate(
    userId: string, 
    jobId: string, 
    type: 'transcription' | 'content', 
    status: string, 
    progress: number, 
    data?: any
  ) {
    try {
      const wsManager = getWebSocketManager();
      if (wsManager) {
        await wsManager.emitJobUpdate({
          userId,
          jobId,
          type,
          status: status as 'processing' | 'completed' | 'failed',
          progress,
          data
        });
      }
    } catch (error) {
      console.error('❌ Failed to emit job update:', error);
    }
  }

  /**
   * Clean up old completed jobs (older than 24 hours)
   */
  cleanupOldJobs() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.endTime && (now - job.endTime) > maxAge) {
        this.jobs.delete(jobId);
        this.listeners.delete(jobId);
      }
    }
  }
}

// Export singleton instance
export const backgroundProcessingService = new BackgroundProcessingService();

// Clean up old jobs every hour
setInterval(() => {
  backgroundProcessingService.cleanupOldJobs();
}, 60 * 60 * 1000);

export default backgroundProcessingService;
