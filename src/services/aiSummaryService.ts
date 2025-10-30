import axios from 'axios';
import { deepseekBackgroundProcessingService } from './deepseekBackgroundProcessingService';

export interface SummaryRequest {
  text: string;
  summaryType?: 'brief' | 'detailed' | 'key_points' | 'action_items';
  maxLength?: number;
  userId?: string;
  transcriptionId?: string;
}

export interface SummaryResponse {
  summary: string;
  key_points?: string[];
  action_items?: string[];
  word_count: number;
  summary_length: number;
}

export interface SummaryJobResponse {
  jobId: string;
  status: 'started' | 'completed';
  summary?: string;
  word_count?: number;
  summary_length?: number;
}

class AISummaryService {
  private readonly API_KEY = typeof window === 'undefined' ? process.env.DEEPSEEK_API_KEY : null;
  private readonly API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';

  constructor() {
    if (!this.API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }
  }

  /**
   * Generate AI summary using background processing (recommended for production)
   */
  async generateSummaryBackground(request: SummaryRequest): Promise<SummaryJobResponse> {
    if (!request.userId || !request.transcriptionId) {
      throw new Error('userId and transcriptionId are required for background processing');
    }

    console.log('📝 Starting background summary job...');

    // Create prompt based on summary type
    const prompt = this.buildPrompt(request);

    // Start background job
    const jobId = await deepseekBackgroundProcessingService.startJob({
      userId: request.userId,
      jobType: 'summary',
      transcriptionId: request.transcriptionId,
      transcriptionText: request.text,
      prompt
    });

    console.log('✅ Background summary job started:', jobId);

    return {
      jobId,
      status: 'started'
    };
  }

  /**
   * Generate AI summary of transcription text (legacy synchronous method)
   */
  async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    try {
      console.log('🤖 Generating AI summary...');
      
      const prompt = this.buildPrompt(request);
      
      const response = await axios.post(this.API_ENDPOINT, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing and summarizing audio transcriptions. Provide clear, concise summaries that capture the main points and insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const summary = response.data.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No summary generated');
      }

      console.log('✅ AI summary generated successfully');
      
      return {
        summary: summary.trim(),
        word_count: request.text.split(' ').length,
        summary_length: summary.split(' ').length
      };
    } catch (error) {
      console.error('❌ Error generating AI summary:', error);
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the prompt based on summary type
   */
  private buildPrompt(request: SummaryRequest): string {
    const { text, summaryType = 'brief', maxLength = 200 } = request;
    
    let instruction = '';
    
    switch (summaryType) {
      case 'brief':
        instruction = `Please provide a brief summary of this transcription in approximately ${maxLength} words. Focus on the main topic and key points.`;
        break;
      case 'detailed':
        instruction = `Please provide a detailed summary of this transcription in approximately ${maxLength} words. Include main topics, key arguments, and important details.`;
        break;
      case 'key_points':
        instruction = `Please extract the key points from this transcription. Present them as a bulleted list with brief explanations.`;
        break;
      case 'action_items':
        instruction = `Please identify any action items, tasks, or next steps mentioned in this transcription. Present them as a clear, actionable list.`;
        break;
      default:
        instruction = `Please provide a summary of this transcription in approximately ${maxLength} words.`;
    }

    return `${instruction}

Transcription:
${text}

Please format your response clearly and concisely.`;
  }

  /**
   * Generate multiple summary types for comparison
   */
  async generateMultipleSummaries(text: string): Promise<{
    brief: SummaryResponse;
    detailed: SummaryResponse;
    key_points: SummaryResponse;
    action_items: SummaryResponse;
  }> {
    try {
      console.log('🤖 Generating multiple summary types...');
      
      const [brief, detailed, key_points, action_items] = await Promise.all([
        this.generateSummary({ text, summaryType: 'brief', maxLength: 100 }),
        this.generateSummary({ text, summaryType: 'detailed', maxLength: 300 }),
        this.generateSummary({ text, summaryType: 'key_points' }),
        this.generateSummary({ text, summaryType: 'action_items' })
      ]);

      return { brief, detailed, key_points, action_items };
    } catch (error) {
      console.error('❌ Error generating multiple summaries:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiSummaryService = new AISummaryService();
export default aiSummaryService;
