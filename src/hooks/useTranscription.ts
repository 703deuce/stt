import { useState, useCallback } from 'react';
import { transcriptionService, TranscriptionRequest, TranscriptionResult } from '@/services/transcriptionService';

export interface TranscriptionState {
  isLoading: boolean;
  status: string;
  jobId?: string;
  result?: TranscriptionResult;
  error?: string;
  progress: number;
}

export interface UseTranscriptionReturn {
  state: TranscriptionState;
  transcribe: (request: TranscriptionRequest, filename?: string, recordId?: string) => Promise<void>;
  reset: () => void;
  setResult: (result: TranscriptionResult) => void;
}

const statusToProgress: Record<string, number> = {
  'SUBMITTING': 5,
  'IN_QUEUE': 15,
  'IN_PROGRESS': 50,
  'COMPLETED': 100,
  'FAILED': 0,
  'CANCELLED': 0
};

export function useTranscription(): UseTranscriptionReturn {
  const [state, setState] = useState<TranscriptionState>({
    isLoading: false,
    status: 'IDLE',
    progress: 0
  });

  const transcribe = useCallback(async (request: TranscriptionRequest, filename?: string, recordId?: string) => {
    setState({
      isLoading: true,
      status: 'SUBMITTING',
      progress: 5,
      result: undefined,
      error: undefined
    });

    try {
      const result = await transcriptionService.transcribeAudio(
        request,
        filename, // Pass the filename
        recordId, // Pass the record ID
        (status: string, jobId?: string) => {
          setState(prev => ({
            ...prev,
            status,
            jobId,
            progress: statusToProgress[status] || prev.progress,
            error: undefined
          }));
        }
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'COMPLETED',
        progress: 100,
        result,
        error: undefined
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'FAILED',
        progress: 0,
        error: errorMessage
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      status: 'IDLE',
      progress: 0,
      result: undefined,
      error: undefined,
      jobId: undefined
    });
  }, []);

  const setResult = useCallback((result: TranscriptionResult) => {
    setState(prev => ({
      ...prev,
      result,
      status: 'COMPLETED',
      isLoading: false,
      progress: 100,
      error: undefined
    }));
  }, []);

  return {
    state,
    transcribe,
    reset,
    setResult
  };
}
