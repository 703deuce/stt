// Client-side wrappers for AI services
// These call API routes instead of server-side services directly

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  message: ChatMessage;
  status: 'started' | 'completed';
}

export interface SummaryResponse {
  summary: string;
  word_count?: number;
  summary_length?: number;
}

class ClientAIChatService {
  async chatWithTranscription(
    transcriptionId: string,
    message: string,
    onUpdate?: (response: ChatResponse) => void
  ): Promise<ChatResponse> {
    const response = await fetch('/api/deepseek/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptionId,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to chat with transcription');
    }

    const result = await response.json();
    return result;
  }

  async analyzeTranscription(transcriptionText: string): Promise<any> {
    // For now, return a mock analysis - this could be moved to an API route later
    return {
      sentiment: 'neutral',
      keyTopics: ['General discussion'],
      summary: 'Analysis feature coming soon'
    };
  }

  getSuggestedQuestions(transcriptionText: string): string[] {
    // Return some generic suggested questions
    return [
      "What are the main topics discussed?",
      "Can you summarize the key points?",
      "What decisions were made?",
      "Who are the main speakers?",
      "What are the next steps mentioned?"
    ];
  }
}

class ClientAISummaryService {
  async generateSummary(
    transcriptionId: string,
    options?: {
      word_count?: number;
      summary_length?: number;
    }
  ): Promise<SummaryResponse> {
    const response = await fetch('/api/deepseek/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcriptionId,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate summary');
    }

    const result = await response.json();
    return result;
  }
}

export const clientAIChatService = new ClientAIChatService();
export const clientAISummaryService = new ClientAISummaryService();

export default { clientAIChatService, clientAISummaryService };
