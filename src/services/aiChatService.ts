import axios from 'axios';
import { deepseekBackgroundProcessingService } from './deepseekBackgroundProcessingService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  transcriptionText: string;
  systemPrompt?: string;
  userId?: string;
  transcriptionId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatJobResponse {
  jobId: string;
  message: ChatMessage;
  status: 'started' | 'completed';
}

class AIChatService {
  private readonly API_KEY = typeof window === 'undefined' ? process.env.DEEPSEEK_API_KEY : null;
  private readonly API_ENDPOINT = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';

  constructor() {
    if (typeof window === 'undefined' && !this.API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is required');
    }
  }

  /**
   * Send a chat message using background processing (recommended for production)
   */
  async sendMessageBackground(request: ChatRequest): Promise<ChatJobResponse> {
    if (!request.userId || !request.transcriptionId) {
      throw new Error('userId and transcriptionId are required for background processing');
    }

    console.log('💬 Starting background chat job...');
    
    // Get the latest user message
    const userMessage = request.messages[request.messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('Last message must be from user');
    }

    // Start background job
    const jobId = await deepseekBackgroundProcessingService.startJob({
      userId: request.userId,
      jobType: 'chat',
      transcriptionId: request.transcriptionId,
      transcriptionText: request.transcriptionText,
      prompt: userMessage.content,
      customInstructions: request.systemPrompt
    });

    console.log('✅ Background chat job started:', jobId);

    return {
      jobId,
      message: userMessage,
      status: 'started'
    };
  }

  /**
   * Send a chat message and get AI response (legacy synchronous method)
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      console.log('💬 Sending chat message...');
      
      const systemPrompt = request.systemPrompt || this.getDefaultSystemPrompt(request.transcriptionText);
      
      // Prepare messages for the API
      const apiMessages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        ...request.messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      ];

      console.log('📤 API Messages:', apiMessages.length, 'messages');
      
      const response = await axios.post(this.API_ENDPOINT, {
        model: 'deepseek-chat',
        messages: apiMessages,
        max_tokens: 1500,
        temperature: 0.7,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const assistantMessage = response.data.choices[0]?.message;
      if (!assistantMessage || !assistantMessage.content) {
        throw new Error('No response content received');
      }

      console.log('✅ Chat response received successfully');
      
      const chatMessage: ChatMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: assistantMessage.content.trim(),
        timestamp: new Date()
      };

      return {
        message: chatMessage,
        usage: response.data.usage
      };
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default system prompt for transcription chat
   */
  private getDefaultSystemPrompt(transcriptionText: string): string {
    return `You are an AI assistant helping a user understand and analyze their audio transcription. 

TRANSCRIPTION CONTEXT:
${transcriptionText.substring(0, 1000)}${transcriptionText.length > 1000 ? '...' : ''}

INSTRUCTIONS:
- Answer questions about the transcription content, speakers, topics, and insights
- Help identify key themes, action items, or important points
- Provide analysis and interpretation of the conversation
- Be helpful, accurate, and conversational
- If asked about something not in the transcription, politely say so
- Keep responses concise but informative
- Use the transcription context to provide relevant answers

Remember: You have access to the full transcription text and can reference specific parts when answering questions.`;
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get suggested questions for the transcription
   */
  getSuggestedQuestions(transcriptionText: string): string[] {
    const questions = [
      "What are the main topics discussed?",
      "Who are the speakers and what are their roles?",
      "What are the key takeaways from this conversation?",
      "Are there any action items or next steps mentioned?",
      "What was the overall tone of the discussion?",
      "Can you summarize the main arguments or points made?",
      "What questions or concerns were raised?",
      "How did the conversation conclude?"
    ];

    // If transcription is short, provide more basic questions
    if (transcriptionText.length < 500) {
      return [
        "What is this conversation about?",
        "Who is speaking?",
        "What are the main points?",
        "What was the outcome?"
      ];
    }

    return questions;
  }

  /**
   * Analyze transcription sentiment and provide insights
   */
  async analyzeTranscription(transcriptionText: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    keyThemes: string[];
    speakerDynamics: string[];
    overallTone: string;
  }> {
    try {
      const prompt = `Analyze this transcription and provide insights in JSON format:

TRANSCRIPTION:
${transcriptionText}

Please analyze and return a JSON object with:
- sentiment: overall emotional tone (positive/negative/neutral/mixed)
- keyThemes: main topics discussed (array of strings)
- speakerDynamics: how speakers interact (array of strings)
- overallTone: brief description of conversation atmosphere

Format as valid JSON only.`;

      const response = await axios.post(this.API_ENDPOINT, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are an AI analyst. Return only valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No analysis content received');
      }

      // Try to parse JSON response
      try {
        const analysis = JSON.parse(content);
        return {
          sentiment: analysis.sentiment || 'neutral',
          keyThemes: analysis.keyThemes || [],
          speakerDynamics: analysis.speakerDynamics || [],
          overallTone: analysis.overallTone || 'Neutral'
        };
      } catch (parseError) {
        console.warn('Failed to parse analysis JSON, using fallback:', parseError);
        return {
          sentiment: 'neutral',
          keyThemes: ['Analysis unavailable'],
          speakerDynamics: ['Analysis unavailable'],
          overallTone: 'Unable to determine'
        };
      }
    } catch (error) {
      console.error('❌ Error analyzing transcription:', error);
      return {
        sentiment: 'neutral',
        keyThemes: ['Analysis failed'],
        speakerDynamics: ['Analysis failed'],
        overallTone: 'Unable to determine'
      };
    }
  }
}

// Export singleton instance
export const aiChatService = new AIChatService();
export default aiChatService;
