import axios from 'axios';
import { contentService } from './contentService';
import { contentLimitService } from './contentLimitService';
import { getWebSocketManager, JobUpdate } from '@/lib/websocket';
import { deepseekBackgroundProcessingService } from './deepseekBackgroundProcessingService';

interface ContentGenerationJob {
  id: string;
  transcriptionId: string;
  transcriptionName: string;
  transcriptionText: string;
  contentTypeId: string;
  contentTypeName: string;
  contentCategory: string;
  prompt: string;
  customInstructions?: string;
  userId: string;
  maxWords?: number; // Maximum word count to generate
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

class BackgroundContentService {
  private jobs: Map<string, ContentGenerationJob> = new Map();
  private API_KEY = process.env.DEEPSEEK_API_KEY;
  private API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';

  constructor() {
    if (typeof window === 'undefined' && !this.API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }
  }

  /**
   * Start a background content generation job using the new DeepSeek background system
   */
  async startContentGenerationNew(params: {
    transcriptionId: string;
    transcriptionName: string;
    transcriptionText: string;
    contentTypeId: string;
    contentTypeName: string;
    contentCategory: string;
    prompt: string;
    customInstructions?: string;
    userId: string;
    maxWords?: number; // Maximum word count to generate
  }): Promise<string> {
    console.log('🚀 Starting background content generation with new DeepSeek system...');

    // Create initial record in database with "generating" status
    const contentId = await contentService.createContentRecord({
      user_id: params.userId,
      transcription_id: params.transcriptionId,
      transcription_name: params.transcriptionName,
      content_type_id: params.contentTypeId,
      content_type_name: params.contentTypeName,
      content_category: params.contentCategory,
      title: `${params.contentTypeName} - ${params.transcriptionName}`,
      content: '', // Empty initially
      status: 'generating'
    });

    console.log('📝 Created content record with ID:', contentId);

    // Start background job using the new DeepSeek system
    const jobId = await deepseekBackgroundProcessingService.startJob({
      userId: params.userId,
      jobType: 'content_generation',
      transcriptionId: params.transcriptionId,
      transcriptionText: params.transcriptionText,
      prompt: params.prompt,
      customInstructions: params.customInstructions,
      contentTypeId: params.contentTypeId,
      contentTypeName: params.contentTypeName,
      contentCategory: params.contentCategory,
      maxWords: params.maxWords,
      fileName: params.transcriptionName
    });

    console.log('✅ Background content generation job started:', jobId);
    return jobId;
  }

  /**
   * Start a background content generation job (legacy method)
   */
  async startContentGeneration(params: {
    transcriptionId: string;
    transcriptionName: string;
    transcriptionText: string;
    contentTypeId: string;
    contentTypeName: string;
    contentCategory: string;
    prompt: string;
    customInstructions?: string;
    userId: string;
    maxWords?: number; // Maximum word count to generate
  }): Promise<string> {
    console.log('🚀 Starting background content generation...');

    // Create initial record in database with "generating" status
    const contentId = await contentService.createContentRecord({
      user_id: params.userId,
      transcription_id: params.transcriptionId,
      transcription_name: params.transcriptionName,
      content_type_id: params.contentTypeId,
      content_type_name: params.contentTypeName,
      content_category: params.contentCategory,
      title: `${params.contentTypeName} - ${params.transcriptionName}`,
      content: '', // Empty initially
      status: 'generating'
    });

    console.log('📝 Created content record with ID:', contentId);

    // Create job
    const job: ContentGenerationJob = {
      id: contentId,
      transcriptionId: params.transcriptionId,
      transcriptionName: params.transcriptionName,
      transcriptionText: params.transcriptionText,
      contentTypeId: params.contentTypeId,
      contentTypeName: params.contentTypeName,
      contentCategory: params.contentCategory,
      prompt: params.prompt,
      customInstructions: params.customInstructions,
      userId: params.userId,
      maxWords: params.maxWords,
      status: 'pending'
    };

    this.jobs.set(contentId, job);

    // Start processing in background (don't await)
    this.processJob(contentId).catch(err => {
      console.error('❌ Background job failed:', err);
    });

    return contentId;
  }

  /**
   * Process a content generation job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('❌ Job not found:', jobId);
      return;
    }

    try {
      console.log('⚙️ Processing content generation job:', jobId);
      job.status = 'generating';

      // Build the prompt with optional custom instructions and word limit
      let finalPrompt = job.prompt;
      
      // Add word limit constraint if specified
      if (job.maxWords) {
        finalPrompt = `${finalPrompt}\n\nIMPORTANT WORD LIMIT: Generate MAXIMUM ${job.maxWords} words. Keep it concise and within this limit.`;
        console.log(`📏 Setting word limit: ${job.maxWords} words`);
      }
      
      if (job.customInstructions && job.customInstructions.trim()) {
        console.log('🎨 Using custom instructions:', job.customInstructions);
        finalPrompt = `${finalPrompt}\n\nADDITIONAL CREATIVE DIRECTION:\n${job.customInstructions.trim()}\n\nYou may reframe, reinterpret, or adjust the angle/tone as instructed, but still base the content on the transcript.`;
      }

      // Generate content using DeepSeek
      const response = await axios.post(this.API_ENDPOINT, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are an expert content creator and marketer. Create high-quality, engaging content that is ready to publish. ${job.maxWords ? `STRICT REQUIREMENT: Your response must be MAXIMUM ${job.maxWords} words. Count carefully and stop at exactly ${job.maxWords} words or less.` : ''} IMPORTANT: Return ONLY the final content without any preamble, explanations, or remarks like "Here is..." or "Of course...". Start directly with the content itself.`
          },
          {
            role: 'user',
            content: `${finalPrompt}\n\nTranscript:\n${job.transcriptionText}\n\nIMPORTANT: Return ONLY the content. Do not include any introductory phrases, explanations, or meta-commentary. Start with the actual content immediately.${job.maxWords ? ` MAXIMUM ${job.maxWords} WORDS.` : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      const trimmedContent = content.trim();
      console.log('✅ Content generated successfully');

      // Calculate word count
      const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;
      console.log(`📊 Generated content: ${wordCount} words`);

      // Deduct words from user's limit
      try {
        await contentLimitService.deductWords(wordCount);
        console.log(`💳 Deducted ${wordCount} words from user limit`);
      } catch (deductError) {
        console.error('⚠️ Warning: Could not deduct words from limit:', deductError);
        // Continue anyway - content was generated successfully
      }

      // Update database record with completed content
      await contentService.updateContentRecord(jobId, {
        content: trimmedContent,
        status: 'completed'
      });

      job.status = 'completed';
      console.log('💾 Content saved to database');

      // Emit real-time update
      await this.emitJobUpdate(job.userId, jobId, 'content', 'completed', 100, { contentId: jobId });

    } catch (error) {
      console.error('❌ Error processing content generation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.status = 'failed';
      job.error = errorMessage;

      // Update database with failed status
      await contentService.updateContentRecord(jobId, {
        status: 'failed',
        error_message: errorMessage
      });
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ContentGenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): ContentGenerationJob[] {
    return Array.from(this.jobs.values()).filter(
      job => job.status === 'pending' || job.status === 'generating'
    );
  }

  /**
   * Clear completed/failed jobs from memory
   */
  clearJob(jobId: string): void {
    this.jobs.delete(jobId);
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
}

// Export singleton instance
export const backgroundContentService = new BackgroundContentService();
export default backgroundContentService;

