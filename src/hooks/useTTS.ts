import { useState, useCallback } from 'react';
import { ttsService, TTSRequest, TTSResult } from '@/services/ttsService';

export interface TTSState {
  isLoading: boolean;
  status: string;
  jobId?: string;
  result?: TTSResult;
  error?: string;
  progress: number;
  audioUrl?: string;
}

export interface UseTTSReturn {
  state: TTSState;
  generateSpeech: (request: TTSRequest) => Promise<void>;
  setChunkedResult: (result: TTSResult) => void;
  reset: () => void;
  playAudio: () => void;
  pauseAudio: () => void;
  downloadAudio: (filename?: string) => void;
}

const statusToProgress: Record<string, number> = {
  'SUBMITTING': 10,
  'IN_QUEUE': 20,
  'IN_PROGRESS': 60,
  'COMPLETED': 100,
  'FAILED': 0,
  'CANCELLED': 0
};

export function useTTS(): UseTTSReturn {
  const [state, setState] = useState<TTSState>({
    isLoading: false,
    status: 'IDLE',
    progress: 0
  });
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const generateSpeech = useCallback(async (request: TTSRequest) => {
    setState({
      isLoading: true,
      status: 'SUBMITTING',
      progress: 10,
      result: undefined,
      error: undefined,
      audioUrl: undefined
    });

    try {
      const result = await ttsService.generateSpeech(
        request,
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

      // Create audio URL from base64 data
      const audioUrl = ttsService.createAudioURL(result.audio_base64, result.content_type);

      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'COMPLETED',
        progress: 100,
        result,
        audioUrl,
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

  const playAudio = useCallback(() => {
    if (state.audioUrl) {
      if (audioElement) {
        audioElement.play();
      } else {
        const audio = new Audio(state.audioUrl);
        audio.play();
        setAudioElement(audio);
      }
    }
  }, [state.audioUrl, audioElement]);

  const pauseAudio = useCallback(() => {
    if (audioElement) {
      audioElement.pause();
    }
  }, [audioElement]);

  const downloadAudio = useCallback((filename?: string) => {
    if (state.result) {
      const defaultFilename = `generated_audio_${new Date().getTime()}.wav`;
      const requestedFilename = filename || defaultFilename;
      
      // Check if user requested MP3 but we have WAV data
      if (requestedFilename.endsWith('.mp3') && state.result.content_type === 'audio/wav') {
        // For now, download as WAV but inform user
        console.warn('⚠️ MP3 conversion not yet implemented. Downloading as WAV file.');
        const wavFilename = requestedFilename.replace('.mp3', '.wav');
        ttsService.downloadAudio(
          state.result.audio_base64,
          wavFilename,
          state.result.content_type
        );
      } else {
        // Normal download
        ttsService.downloadAudio(
          state.result.audio_base64,
          requestedFilename,
          state.result.content_type
        );
      }
    }
  }, [state.result]);

  const reset = useCallback(() => {
    // Clean up audio element and URL
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isLoading: false,
      status: 'IDLE',
      progress: 0,
      result: undefined,
      error: undefined,
      jobId: undefined,
      audioUrl: undefined
    });
  }, [audioElement, state.audioUrl]);

  const setChunkedResult = useCallback((result: TTSResult) => {
    console.log('🎵 Setting chunked result:', {
      hasAudio: !!result.audio_base64,
      duration: result.duration,
      format: result.format,
      contentType: result.content_type
    });
    
    const audioUrl = ttsService.createAudioURL(result.audio_base64, result.content_type);
    console.log('🎵 Created audio URL:', audioUrl);
    
    setState(prev => {
      const newState = {
        ...prev,
        isLoading: false,
        status: 'COMPLETED',
        progress: 100,
        result,
        error: undefined,
        audioUrl
      };
      console.log('🎵 New state set:', {
        isLoading: newState.isLoading,
        status: newState.status,
        hasResult: !!newState.result,
        hasAudioUrl: !!newState.audioUrl
      });
      return newState;
    });
  }, []);

  return {
    state,
    generateSpeech,
    setChunkedResult,
    reset,
    playAudio,
    pauseAudio,
    downloadAudio
  };
}
