declare module 'whisper-node' {
  export interface WhisperOptions {
    language?: string;
    task?: 'transcribe' | 'translate';
    outputFormat?: 'text' | 'json' | 'srt' | 'vtt';
    wordTimestamps?: boolean;
    verbose?: boolean;
  }

  export interface WhisperResult {
    text: string;
    segments?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  }

  export function whisper(
    audioBuffer: Buffer,
    options: {
      modelName: string;
      whisperOptions: WhisperOptions;
    }
  ): Promise<WhisperResult>;
}
