import { deepseekJobMappingService, DeepSeekJobMapping } from './deepseekJobMappingService';
import { getWebSocketManager, JobUpdate } from '@/lib/websocket';
import { contentLimitService } from './contentLimitService';

export interface DeepSeekProcessingJob {
  id: string;
  userId: string;
  jobType: 'chat' | 'summary' | 'content_generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  
  // Job-specific data
  transcriptionId?: string;
  transcriptionText?: string;
  prompt?: string;
  customInstructions?: string;
  contentTypeId?: string;
  contentTypeName?: string;
  contentCategory?: string;
  maxWords?: number;
  summaryType?: 'brief' | 'detailed' | 'key_points'; // For summary jobs
  
  // Results
  result?: string;
  error?: string;
  
  // Metadata
  fileName?: string;
  wordCount?: number;
  processingTime?: number;
  
  startTime: number;
  endTime?: number;
}

class DeepSeekBackgroundProcessingService {
  private jobs: Map<string, DeepSeekProcessingJob> = new Map();
  private listeners: Map<string, ((job: DeepSeekProcessingJob) => void)[]> = new Map();
  private isProcessing = false;
  private processingQueue: string[] = [];
  private maxConcurrentJobs = 50; // Increased for 500+ user capacity
  private activeJobs = 0;

  private API_KEY = (() => {
    let key = (process.env.DEEPSEEK_API_KEY || '').trim();
    if (key.toLowerCase().startsWith('bearer ')) {
      key = key.slice(7).trim();
    }
    return key;
  })();
  private API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';

  constructor() {
    if (typeof window === 'undefined' && !this.API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }
  }

  /**
   * Start a new DeepSeek background processing job
   */
  async startJob(params: {
    userId: string;
    jobType: 'chat' | 'summary' | 'content_generation';
    transcriptionId?: string;
    transcriptionText?: string;
    prompt?: string;
    customInstructions?: string;
    contentTypeId?: string;
    contentTypeName?: string;
    contentCategory?: string;
    maxWords?: number;
    fileName?: string;
    summaryType?: 'brief' | 'detailed' | 'key_points';
  }): Promise<string> {
    console.log('🚀 DeepSeek BackgroundProcessingService.startJob called with:', {
      userId: params.userId,
      jobType: params.jobType,
      transcriptionId: params.transcriptionId,
      fileName: params.fileName
    });
    
    const jobId = `deepseek_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: DeepSeekProcessingJob = {
      id: jobId,
      userId: params.userId,
      jobType: params.jobType,
      status: 'pending',
      progress: 0,
      transcriptionId: params.transcriptionId,
      transcriptionText: params.transcriptionText,
      prompt: params.prompt,
      customInstructions: params.customInstructions,
      contentTypeId: params.contentTypeId,
      contentTypeName: params.contentTypeName,
      contentCategory: params.contentCategory,
      maxWords: params.maxWords,
      fileName: params.fileName,
      summaryType: params.summaryType,
      startTime: Date.now()
    };

    this.jobs.set(jobId, job);
    this.notifyListeners(jobId, job);
    
    console.log('✅ DeepSeek background job created:', {
      jobId,
      userId: params.userId,
      jobType: params.jobType,
      totalJobs: this.jobs.size
    });

    // Create persistent job mapping
    await deepseekJobMappingService.mapJobToUser(jobId, params.userId, params.jobType, {
      transcriptionId: params.transcriptionId,
      transcriptionText: params.transcriptionText,
      prompt: params.prompt,
      customInstructions: params.customInstructions,
      contentTypeId: params.contentTypeId,
      contentTypeName: params.contentTypeName,
      contentCategory: params.contentCategory,
      maxWords: params.maxWords,
      fileName: params.fileName
    });

    // Add to processing queue
    this.processingQueue.push(jobId);
    this.processQueue();

    return jobId;
  }

  /**
   * Get job status
   */
  getJob(jobId: string): DeepSeekProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: string): DeepSeekProcessingJob[] {
    return Array.from(this.jobs.values()).filter(job => job.userId === userId);
  }

  /**
   * Add job status listener
   */
  addJobListener(jobId: string, callback: (job: DeepSeekProcessingJob) => void): void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, []);
    }
    this.listeners.get(jobId)!.push(callback);
  }

  /**
   * Remove job status listener
   */
  removeJobListener(jobId: string, callback: (job: DeepSeekProcessingJob) => void): void {
    const listeners = this.listeners.get(jobId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Update job status
   */
  private updateJobStatus(
    jobId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed', 
    progress: number = 0, 
    error?: string,
    result?: string,
    metadata?: {
      wordCount?: number;
      processingTime?: number;
    }
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    job.progress = progress;
    if (error) job.error = error;
    if (result) job.result = result;
    if (metadata?.wordCount) job.wordCount = metadata.wordCount;
    if (metadata?.processingTime) job.processingTime = metadata.processingTime;
    
    if (status === 'completed' || status === 'failed') {
      job.endTime = Date.now();
    }

    this.notifyListeners(jobId, job);

    // Update persistent storage
    deepseekJobMappingService.updateJobStatus(jobId, status, result, error, metadata).catch(err => {
      console.error('Failed to update job status in database:', err);
    });

    // Emit WebSocket update
    this.emitJobUpdate(job);

    // Trigger webhook for SSE updates when job completes or fails
    if (status === 'completed' || status === 'failed') {
      this.triggerWebhook(jobId, status, result, error);
    }
  }

  /**
   * Notify listeners of job updates
   */
  private notifyListeners(jobId: string, job: DeepSeekProcessingJob): void {
    const listeners = this.listeners.get(jobId);
    if (listeners) {
      listeners.forEach(callback => callback(job));
    }
  }

  /**
   * Emit job update via WebSocket
   */
  private emitJobUpdate(job: DeepSeekProcessingJob): void {
    try {
      const wsManager = getWebSocketManager();
      if (!wsManager) return;
      
      // Map status to JobUpdate format
      const statusMap: Record<string, 'processing' | 'completed' | 'failed'> = {
        pending: 'processing',
        processing: 'processing',
        completed: 'completed',
        failed: 'failed'
      };
      
      const update: JobUpdate = {
        jobId: job.id,
        userId: job.userId,
        type: 'content',
        status: statusMap[job.status],
        progress: job.progress,
        data: {
          result: job.result,
          error: job.error,
          jobType: job.jobType
        }
      };
      wsManager.emitJobUpdate(update);
    } catch (error) {
      console.error('Failed to emit job update:', error);
    }
  }

  /**
   * Trigger webhook for SSE updates
   */
  private async triggerWebhook(jobId: string, status: string, result?: string, error?: string): Promise<void> {
    try {
      console.log(`📡 Triggering webhook for job completion: ${jobId}`);
      
      // Call the webhook handler directly instead of making an HTTP request
      const { POST } = await import('@/app/api/webhooks/deepseek/route');
      
      // Create a mock NextRequest object
      const mockRequest = {
        json: async () => ({
          jobId,
          status,
          result,
          error,
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      } as any;
      
      // Call the webhook handler directly
      await POST(mockRequest);
      
      console.log(`✅ Webhook triggered successfully for job: ${jobId}`);
    } catch (error) {
      console.error('❌ Failed to trigger webhook:', error);
    }
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.processingQueue.length > 0 && this.activeJobs < this.maxConcurrentJobs) {
      const jobId = this.processingQueue.shift();
      if (jobId) {
        this.activeJobs++;
        this.processJob(jobId).finally(() => {
          this.activeJobs--;
          // Continue processing queue
          if (this.processingQueue.length > 0) {
            this.processQueue();
          }
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single DeepSeek job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      console.log(`🔄 Processing DeepSeek job: ${jobId} (${job.jobType})`);
      this.updateJobStatus(jobId, 'processing', 10);

      let result: string;
      let wordCount: number;

      switch (job.jobType) {
        case 'chat':
          result = await this.processChatJob(job);
          break;
        case 'summary':
          result = await this.processSummaryJob(job);
          break;
        case 'content_generation':
          result = await this.processContentGenerationJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.jobType}`);
      }

      wordCount = result.split(/\s+/).filter(Boolean).length;
      const processingTime = Date.now() - job.startTime;

      console.log(`✅ DeepSeek job completed: ${jobId}`);
      this.updateJobStatus(jobId, 'completed', 100, undefined, result, {
        wordCount,
        processingTime
      });

      // Update the content record if this is a content generation job
      if (job.jobType === 'content_generation') {
        await this.updateContentRecord(jobId, result, wordCount);
        
        // Deduct words from user's limit after content generation (server-side)
        try {
          await contentLimitService.deductWordsForUser(job.userId, wordCount);
          console.log(`💳 Deducted ${wordCount} words from user limit for job ${jobId} (userId: ${job.userId})`);
        } catch (deductError) {
          console.error('⚠️ Warning: Could not deduct words from limit:', deductError);
          // Continue anyway - content was generated successfully
        }
      }
      
      // Update AI data if this is a summary job
      if (job.jobType === 'summary' && job.transcriptionId) {
        await this.updateAISummary(job.transcriptionId, job, result);
      }
      
      // Update chat history if this is a chat job
      if (job.jobType === 'chat' && job.transcriptionId) {
        await this.updateChatHistory(jobId, job, result);
      }

    } catch (error) {
      console.error(`❌ DeepSeek job failed: ${jobId}`, error);
      this.updateJobStatus(jobId, 'failed', 0, error instanceof Error ? error.message : 'Unknown error');
      
      // Update content record with failed status if this is a content generation job
      const job = this.jobs.get(jobId);
      if (job && job.jobType === 'content_generation') {
        await this.updateContentRecordFailed(jobId, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Process chat job
   */
  private async processChatJob(job: DeepSeekProcessingJob): Promise<string> {
    if (!job.prompt || !job.transcriptionText) {
      throw new Error('Missing required data for chat job');
    }

    console.log('💬 [DeepSeek] Processing chat job:', {
      jobId: job.id,
      transcriptionId: job.transcriptionId,
      transcriptionTextLength: job.transcriptionText.length,
      transcriptionPreview: job.transcriptionText.substring(0, 200) + '...',
      prompt: job.prompt.substring(0, 100) + '...'
    });

    const isClient = typeof window !== 'undefined';
    const response = await fetch(isClient ? '/api/deepseek/proxy' : this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        ...(isClient ? { 'Content-Type': 'application/json' } : {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      },
      body: JSON.stringify(isClient ? {
        messages: [
          { role: 'system', content: `You are an AI assistant helping a user understand and analyze their audio transcription. 

TRANSCRIPTION CONTEXT:
${job.transcriptionText.substring(0, 2000)}${job.transcriptionText.length > 2000 ? '...' : ''}

INSTRUCTIONS:
- Answer questions about the transcription content, speakers, topics, and insights
- Help identify key themes, action items, or important points
- Provide analysis and interpretation of the conversation
- Be helpful, accurate, and conversational
- If asked about something not in the transcription, politely say so
- Keep responses concise but informative
- Use the transcription context to provide relevant answers` },
          { role: 'user', content: job.prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      } : {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `You are an AI assistant helping a user understand and analyze their audio transcription. 

TRANSCRIPTION CONTEXT:
${job.transcriptionText.substring(0, 2000)}${job.transcriptionText.length > 2000 ? '...' : ''}

INSTRUCTIONS:
- Answer questions about the transcription content, speakers, topics, and insights
- Help identify key themes, action items, or important points
- Provide analysis and interpretation of the conversation
- Be helpful, accurate, and conversational
- If asked about something not in the transcription, politely say so
- Keep responses concise but informative
- Use the transcription context to provide relevant answers` },
          { role: 'user', content: job.prompt }
        ],
        max_tokens: 1500,
        temperature: 0.7,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[DeepSeek chat] 401/err response:', response.status, errText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const payload: any = isClient ? data?.data : data;
    if (!response.ok || (isClient && data?.ok === false)) {
      throw new Error(`API request failed with status ${isClient ? data?.status : response.status}`);
    }
    const content = payload?.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response content received');
    }

    return content.trim();
  }

  /**
   * Process summary job
   */
  private async processSummaryJob(job: DeepSeekProcessingJob): Promise<string> {
    if (!job.transcriptionText) {
      throw new Error('Missing transcription text for summary job');
    }

    console.log('🤖 [DeepSeek] Processing summary job:', {
      jobId: job.id,
      transcriptionId: job.transcriptionId,
      transcriptionTextLength: job.transcriptionText.length,
      transcriptionPreview: job.transcriptionText.substring(0, 200) + '...',
      summaryType: job.summaryType
    });

    // Always build the prompt with the transcription text, ignore the passed prompt
    const prompt = this.buildSummaryPrompt(job.transcriptionText, job.summaryType || 'brief');

    console.log('📤 [DeepSeek] Sending request to DeepSeek API:', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 300) + '...',
      transcriptionTextInPrompt: prompt.includes(job.transcriptionText)
    });

    const isClient = typeof window !== 'undefined';
    const response = await fetch(isClient ? '/api/deepseek/proxy' : this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        ...(isClient ? { 'Content-Type': 'application/json' } : {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      },
      body: JSON.stringify(isClient ? {
        messages: [
          { role: 'system', content: 'You are a professional transcription summarizer. Return ONLY the summary content without any preamble, commentary, or introductory phrases. Start directly with the summary. Do not say "Of course" or "Here is" or any other preamble.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      } : {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a professional transcription summarizer. Return ONLY the summary content without any preamble, commentary, or introductory phrases. Start directly with the summary. Do not say "Of course" or "Here is" or any other preamble.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[DeepSeek summary] 401/err response:', response.status, errText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const payload: any = isClient ? data?.data : data;
    const content = payload?.choices?.[0]?.message?.content;
    
    console.log('📥 [DeepSeek] Received response from DeepSeek API:', {
      hasContent: !!content,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) + '...' || 'No content',
      usage: data.usage
    });
    
    if (!content) {
      throw new Error('No summary generated');
    }

    return content.trim();
  }

  /**
   * Process content generation job
   */
  private async processContentGenerationJob(job: DeepSeekProcessingJob): Promise<string> {
    if (!job.prompt || !job.transcriptionText) {
      throw new Error('Missing required data for content generation job');
    }

    // 🔍 DETAILED LOGGING FOR DEBUGGING
    console.log('🔍 [DeepSeek Content Generation] DEBUG - Full job data:');
    console.log('📝 Job ID:', job.id);
    console.log('📝 Content Type:', job.contentTypeName);
    console.log('📝 Transcription Text Length:', job.transcriptionText.length);
    console.log('📝 Transcription Text Preview:', job.transcriptionText.substring(0, 200) + '...');
    console.log('📝 Full Transcription Text:', job.transcriptionText);
    console.log('📝 Original Prompt:', job.prompt);
    console.log('📝 Custom Instructions:', job.customInstructions || 'None');
    console.log('📝 Max Words:', job.maxWords);

    // Build final prompt: regular prompt sets the format/type, custom instructions guide the topic/direction
    let finalPrompt = job.prompt;
    
    if (job.customInstructions && job.customInstructions.trim()) {
      // Custom instructions should guide what the content is ABOUT (topic/direction)
      // The regular prompt already tells the TYPE to make (Facebook post, formula, etc.)
      finalPrompt = `${job.prompt}\n\nCUSTOM TOPIC DIRECTION:\n${job.customInstructions.trim()}\n\nCRITICAL: The custom instructions above guide which aspects or topics from the transcript to emphasize. However, ALL information MUST come from the transcript below. Do NOT add any information, facts, or content that is not in the transcript. The custom instructions only guide which parts of the transcript to focus on or highlight - they do not allow adding new information. Use the content type format (defined above) while following the topic/direction to emphasize specific aspects FROM THE TRANSCRIPT ONLY.`;
    }
    
    // Always emphasize that transcript is the ONLY source, regardless of custom instructions
    finalPrompt = `${finalPrompt}\n\nTRANSCRIPT (USE THIS AS YOUR ONLY SOURCE OF INFORMATION):`;

    console.log('📝 Final Prompt Being Sent:', finalPrompt);

    const isClient = typeof window !== 'undefined';
    const response = await fetch(isClient ? '/api/deepseek/proxy' : this.API_ENDPOINT, {
      method: 'POST',
      headers: {
        ...(isClient ? { 'Content-Type': 'application/json' } : {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      },
      body: JSON.stringify(isClient ? {
        messages: [
          { role: 'system', content: `You are a content formatter who ONLY reformats existing content. You are NOT allowed to create new content, add information, or make up anything.

ABSOLUTE RULES:
1. You MUST use ONLY the exact information, topics, facts, and details from the provided transcript
2. You are FORBIDDEN from adding ANY information not explicitly stated in the transcript
3. You are FORBIDDEN from making up examples, stories, scenarios, or advice
4. You are FORBIDDEN from adding generic content, motivational quotes, or filler text
5. If the transcript is about "testing voice samples", your content MUST be about "testing voice samples"
6. If the transcript mentions specific names, dates, or facts, use ONLY those exact details
7. Your ONLY job is to reformat the transcript content into the requested format - nothing more

${job.maxWords ? `WORD LIMIT: Your response must be MAXIMUM ${job.maxWords} words. Count carefully and stop at exactly ${job.maxWords} words or less.` : ''}

Return ONLY the formatted content without any preamble, explanations, or remarks. Start directly with the content itself.` },
          { role: 'user', content: `${finalPrompt}\n\n=== TRANSCRIPT (YOUR ONLY SOURCE OF INFORMATION) ===\n${job.transcriptionText}\n=== END OF TRANSCRIPT ===\n\nCRITICAL REQUIREMENTS:\n1. Use ONLY information from the transcript above - NOTHING ELSE\n2. Do NOT add any information, facts, examples, or advice not in the transcript\n3. Do NOT make up content or use generic filler text\n4. If custom instructions are provided, they only guide which parts of the transcript to emphasize - they do NOT allow adding new information\n5. Return ONLY the final content without any preamble or meta-commentary\n6. Start with the actual content immediately${job.maxWords ? `\n7. MAXIMUM ${job.maxWords} WORDS` : ''}\n\nNow reformat the transcript above into the requested format, using ONLY the information provided in the transcript:` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      } : {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `You are a content formatter who ONLY reformats existing content. You are NOT allowed to create new content, add information, or make up anything.

ABSOLUTE RULES:
1. You MUST use ONLY the exact information, topics, facts, and details from the provided transcript
2. You are FORBIDDEN from adding ANY information not explicitly stated in the transcript
3. You are FORBIDDEN from making up examples, stories, scenarios, or advice
4. You are FORBIDDEN from adding generic content, motivational quotes, or filler text
5. If the transcript is about "testing voice samples", your content MUST be about "testing voice samples"
6. If the transcript mentions specific names, dates, or facts, use ONLY those exact details
7. Your ONLY job is to reformat the transcript content into the requested format - nothing more

${job.maxWords ? `WORD LIMIT: Your response must be MAXIMUM ${job.maxWords} words. Count carefully and stop at exactly ${job.maxWords} words or less.` : ''}

Return ONLY the formatted content without any preamble, explanations, or remarks. Start directly with the content itself.` },
          { role: 'user', content: `${finalPrompt}\n\n=== TRANSCRIPT (YOUR ONLY SOURCE OF INFORMATION) ===\n${job.transcriptionText}\n=== END OF TRANSCRIPT ===\n\nCRITICAL REQUIREMENTS:\n1. Use ONLY information from the transcript above - NOTHING ELSE\n2. Do NOT add any information, facts, examples, or advice not in the transcript\n3. Do NOT make up content or use generic filler text\n4. If custom instructions are provided, they only guide which parts of the transcript to emphasize - they do NOT allow adding new information\n5. Return ONLY the final content without any preamble or meta-commentary\n6. Start with the actual content immediately${job.maxWords ? `\n7. MAXIMUM ${job.maxWords} WORDS` : ''}\n\nNow reformat the transcript above into the requested format, using ONLY the information provided in the transcript:` }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('[DeepSeek content] 401/err response:', response.status, errText);
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const payload: any = isClient ? data?.data : data;
    const content = payload?.choices?.[0]?.message?.content;
    
    // 🔍 DETAILED RESPONSE LOGGING
    console.log('📥 [DeepSeek Content Generation] Response received:');
    console.log('📥 Response Status:', response.status);
    console.log('📥 Has Content:', !!content);
    console.log('📥 Content Length:', content?.length || 0);
    console.log('📥 Content Preview:', content?.substring(0, 300) + '...' || 'No content');
    console.log('📥 Full Generated Content:', content);
    console.log('📥 API Usage:', data.usage);
    
    if (!content) {
      throw new Error('No content generated');
    }

    return content.trim();
  }

  /**
   * Build summary prompt based on type
   */
  private buildSummaryPrompt(text: string, summaryType: string): string {
    let instruction = '';
    
    switch (summaryType) {
      case 'brief':
        instruction = 'Provide a brief summary of this transcription in approximately 200 words. Focus on the main topic and key points.';
        break;
      case 'detailed':
        instruction = 'Provide a detailed summary of this transcription in approximately 500 words. Include main topics, key arguments, and important details.';
        break;
      case 'key_points':
        instruction = 'Extract the key points from this transcription. Present them as a bulleted list with brief explanations.';
        break;
      default:
        instruction = 'Provide a summary of this transcription in approximately 300 words.';
    }

    return `You are a professional transcription summarizer. Return ONLY the summary without any preamble, commentary, or explanatory phrases like "Here is..." or "Of course...". Start directly with the summary content.

${instruction}

Transcription:
${text}

CRITICAL: Return ONLY the summary content. Do not include any introductory text, explanations, or remarks. Start directly with the summary itself.`;
  }

  /**
   * Update content record when job completes
   */
  private async updateContentRecord(jobId: string, content: string, wordCount: number): Promise<void> {
    try {
      console.log(`📝 Updating content record for job: ${jobId}`);
      
      // Import content service
      const { contentService } = await import('@/services/contentService');
      
      // Get job mapping to find the content record ID
      const jobMapping = await deepseekJobMappingService.getJobMapping(jobId);
      if (!jobMapping) {
        console.error('❌ No job mapping found for content update:', jobId);
        return;
      }
      
      // Find the content record by transcription ID and user ID
      const contentRecords = await contentService.getContentRecords(1000);
      const contentRecord = contentRecords.find(record => 
        record.transcription_id === jobMapping.transcriptionId && 
        record.user_id === jobMapping.userId &&
        record.status === 'generating'
      );
      
      if (!contentRecord) {
        console.error('❌ No generating content record found for job:', jobId);
        return;
      }
      
      // Update the content record
      await contentService.updateContentRecord(contentRecord.id!, {
        content: content,
        status: 'completed',
        word_count: wordCount,
        character_count: content.length
      });
      
      console.log(`✅ Content record updated: ${contentRecord.id}`);
      
    } catch (error) {
      console.error('❌ Failed to update content record:', error);
    }
  }

  /**
   * Update content record when job fails
   */
  private async updateContentRecordFailed(jobId: string, errorMessage: string): Promise<void> {
    try {
      console.log(`📝 Updating content record failed status for job: ${jobId}`);
      
      // Import content service
      const { contentService } = await import('@/services/contentService');
      
      // Get job mapping to find the content record ID
      const jobMapping = await deepseekJobMappingService.getJobMapping(jobId);
      if (!jobMapping) {
        console.error('❌ No job mapping found for content update:', jobId);
        return;
      }
      
      // Find the content record by transcription ID and user ID
      const contentRecords = await contentService.getContentRecords(1000);
      const contentRecord = contentRecords.find(record => 
        record.transcription_id === jobMapping.transcriptionId && 
        record.user_id === jobMapping.userId &&
        record.status === 'generating'
      );
      
      if (!contentRecord) {
        console.error('❌ No generating content record found for job:', jobId);
        return;
      }
      
      // Update the content record with failed status
      await contentService.updateContentRecord(contentRecord.id!, {
        status: 'failed',
        error_message: errorMessage
      });
      
      console.log(`✅ Content record marked as failed: ${contentRecord.id}`);
      
    } catch (error) {
      console.error('❌ Failed to update content record failed status:', error);
    }
  }

  /**
   * Update AI summary in database
   */
  private async updateAISummary(transcriptionId: string, job: DeepSeekProcessingJob, result: string): Promise<void> {
    try {
      console.log(`📝 Updating AI summary for transcription: ${transcriptionId}`);
      
      // Import AI data service
      const { aiDataService } = await import('@/services/aiDataService');
      
      // Use the summaryType from the job
      const summaryType = job.summaryType || 'brief';
      
      // Save summary to database
      await aiDataService.saveSummaryData(
        transcriptionId,
        job.userId,
        summaryType,
        {
          summary: result,
          word_count: result.split(/\s+/).filter(Boolean).length,
          summary_length: result.length
        }
      );
      
      console.log(`✅ AI summary updated: ${transcriptionId} - ${summaryType}`);
      
    } catch (error) {
      console.error('❌ Failed to update AI summary:', error);
    }
  }

  /**
   * Update chat history in database
   */
  private async updateChatHistory(jobId: string, job: DeepSeekProcessingJob, result: string): Promise<void> {
    try {
      console.log(`📝 Updating chat history for job: ${jobId}`);
      
      // Import AI data service
      const { aiDataService } = await import('@/services/aiDataService');
      
      // Get existing chat history
      const existingChatHistory = await aiDataService.getAIData(job.transcriptionId!, job.userId);
      const currentMessages = existingChatHistory?.chatHistory || [];
      
      // Add AI response
      const aiMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant' as const,
        content: result,
        timestamp: new Date()
      };
      
      // Combine old messages + new AI response
      const updatedMessages = [...currentMessages, aiMessage];
      
      // Save to database
      await aiDataService.saveChatHistory(job.transcriptionId!, job.userId, updatedMessages);
      
      console.log(`✅ Chat history updated: ${job.transcriptionId}`);
      
    } catch (error) {
      console.error('❌ Failed to update chat history:', error);
    }
  }

  /**
   * Resume processing for jobs that were interrupted
   */
  async resumeInterruptedJobs(): Promise<void> {
    try {
      console.log('🔄 Checking for interrupted DeepSeek jobs...');
      const pendingJobs = await deepseekJobMappingService.getPendingJobs(20);
      
      for (const jobMapping of pendingJobs) {
        // Check if job is still in memory
        if (!this.jobs.has(jobMapping.id)) {
          // Recreate job from database
          const job: DeepSeekProcessingJob = {
            id: jobMapping.id,
            userId: jobMapping.userId,
            jobType: jobMapping.jobType,
            status: jobMapping.status,
            progress: 0,
            transcriptionId: jobMapping.transcriptionId,
            transcriptionText: jobMapping.transcriptionText,
            prompt: jobMapping.prompt,
            customInstructions: jobMapping.customInstructions,
            contentTypeId: jobMapping.contentTypeId,
            contentTypeName: jobMapping.contentTypeName,
            contentCategory: jobMapping.contentCategory,
            maxWords: jobMapping.maxWords,
            fileName: jobMapping.fileName,
            result: jobMapping.result,
            error: jobMapping.error,
            wordCount: jobMapping.wordCount,
            processingTime: jobMapping.processingTime,
            startTime: jobMapping.createdAt,
            endTime: jobMapping.updatedAt
          };

          this.jobs.set(jobMapping.id, job);
          
          if (jobMapping.status === 'pending') {
            this.processingQueue.push(jobMapping.id);
          }
        }
      }

      if (this.processingQueue.length > 0) {
        console.log(`🔄 Resuming ${this.processingQueue.length} interrupted DeepSeek jobs`);
        this.processQueue();
      }
    } catch (error) {
      console.error('❌ Error resuming interrupted jobs:', error);
    }
  }
}

export const deepseekBackgroundProcessingService = new DeepSeekBackgroundProcessingService();
