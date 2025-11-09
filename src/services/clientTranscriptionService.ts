// Client-side wrapper for transcription operations
// This calls API routes instead of server-side services directly

export interface UploadResult {
  url: string;
  filename: string;
}

export interface TranscriptionSettings {
  use_diarization: boolean;
  max_speakers: number | null;
  include_timestamps: boolean;
  speaker_threshold: number;
  single_speaker_mode: boolean;
}

export interface TranscriptionResult {
  jobId: string;
  message: string;
}

class ClientTranscriptionService {
  async uploadFileToFirebase(
    file: File, 
    onProgress?: (progress: number) => void,
    userId?: string
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) {
      formData.append('userId', userId);
    }

    const response = await fetch('/api/upload-to-firebase', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    const result = await response.json();
    return {
      url: result.url,
      filename: result.filename
    };
  }

  async transcribeAudio(
    params: { audio_url: string; filename?: string },
    settings: TranscriptionSettings
  ): Promise<TranscriptionResult> {
    const response = await fetch('/api/transcribe-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: params.audio_url,
        filename: params.filename,
        settings
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to transcribe audio');
    }

    const result = await response.json();
    return {
      jobId: result.jobId,
      message: result.message
    };
  }
}

export const clientTranscriptionService = new ClientTranscriptionService();
export default clientTranscriptionService;
