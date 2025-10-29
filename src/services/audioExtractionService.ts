import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

export interface AudioExtractionResult {
  success: boolean;
  audioBlob?: Blob;
  audioUrl?: string;
  error?: string;
  originalFormat?: string;
  extractedFormat?: string;
}

class AudioExtractionService {
  private ffmpeg: FFmpeg | null = null;
  private ffmpegLoaded = false;

  /**
   * Initialize FFmpeg for audio extraction
   */
  async initializeFFmpeg(): Promise<boolean> {
    if (this.ffmpegLoaded) return true;

    try {
      console.log('🔄 Initializing FFmpeg for audio extraction...');
      
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.ffmpegLoaded = true;
      console.log('✅ FFmpeg initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize FFmpeg:', error);
      return false;
    }
  }

  /**
   * Check if file is a video file
   */
  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/') || 
           ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'].includes(
             file.name.split('.').pop()?.toLowerCase() || ''
           );
  }

  /**
   * Extract audio from video file using FFmpeg (most reliable method)
   */
  async extractAudioFromVideo(videoFile: File): Promise<AudioExtractionResult> {
    try {
      console.log('🎬 Extracting audio from video file:', videoFile.name);
      console.log('📁 File type:', videoFile.type);
      console.log('📁 File size:', (videoFile.size / (1024 * 1024)).toFixed(2), 'MB');

      // Use FFmpeg directly - most reliable for all video formats
      console.log('🔄 Using FFmpeg for audio extraction...');
      const ffmpegResult = await this.extractAudioWithFFmpeg(videoFile);
      if (ffmpegResult.success) {
        console.log('✅ Audio extracted using FFmpeg (Pyannote-compatible)');
        return ffmpegResult;
      }

      throw new Error('FFmpeg audio extraction failed');
    } catch (error) {
      console.error('❌ Audio extraction failed:', error);
      return {
        success: false,
        error: `Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalFormat: videoFile.type || 'unknown'
      };
    }
  }

  /**
   * Extract audio using FFmpeg (most reliable for all video formats)
   * Optimized for Pyannote compatibility
   */
  private async extractAudioWithFFmpeg(videoFile: File): Promise<AudioExtractionResult> {
    try {
      if (!this.ffmpeg || !this.ffmpegLoaded) {
        const initialized = await this.initializeFFmpeg();
        if (!initialized) throw new Error('FFmpeg not available');
      }

      console.log('🔄 Using FFmpeg to extract audio for Pyannote compatibility...');
      
      // Convert file to Uint8Array for FFmpeg
      const arrayBuffer = await videoFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Write video file to FFmpeg with proper filename
      const inputFileName = 'input_video' + this.getFileExtension(videoFile.name);
      console.log('📁 Writing input file:', inputFileName, 'Size:', uint8Array.length);
      
      await this.ffmpeg!.writeFile(inputFileName, uint8Array);
      console.log('✅ Input file written to FFmpeg');

      // Extract audio to WAV format optimized for Pyannote
      const outputFileName = 'extracted_audio.wav';
      console.log('🎵 Extracting audio to:', outputFileName);
      
      // Pyannote-compatible WAV settings:
      // - PCM 16-bit signed little-endian
      // - 16kHz sample rate (Pyannote standard)
      // - Mono channel
      // - Uncompressed WAV format
      const ffmpegArgs = [
        '-i', inputFileName,
        '-vn',                    // No video
        '-acodec', 'pcm_s16le',  // PCM 16-bit signed little-endian
        '-ar', '16000',          // 16kHz sample rate (Pyannote standard)
        '-ac', '1',              // Mono audio
        '-f', 'wav',             // Force WAV format
        '-y',                    // Overwrite output file
        outputFileName
      ];
      
      console.log('🔧 FFmpeg args for Pyannote:', ffmpegArgs);
      await this.ffmpeg!.exec(ffmpegArgs);
      console.log('✅ FFmpeg execution completed');

      // Read the extracted audio
      console.log('📖 Reading output file...');
      const audioData = await this.ffmpeg!.readFile(outputFileName);
      console.log('✅ Output file read, size:', audioData.length);
      
      // Create WAV blob with proper MIME type
      const uint8Data = new Uint8Array(audioData as Uint8Array);
      const audioBlob = new Blob([uint8Data], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Validate for Pyannote compatibility
      console.log('🔍 Validating audio for Pyannote compatibility...');
      const validation = this.validateForPyannote(audioBlob);
      
      if (!validation.valid) {
        console.warn('⚠️ Audio may have Pyannote compatibility issues:', validation.issues);
      }

      // Clean up FFmpeg files
      console.log('🧹 Cleaning up FFmpeg files...');
      await this.ffmpeg!.deleteFile(inputFileName);
      await this.ffmpeg!.deleteFile(outputFileName);

      console.log('✅ FFmpeg audio extraction completed - Pyannote compatible');
      console.log('📊 Final audio format: WAV, 16kHz, Mono, 16-bit PCM');
      console.log('📊 Audio size:', (audioBlob.size / (1024 * 1024)).toFixed(2), 'MB');
      
      return {
        success: true,
        audioBlob,
        audioUrl,
        originalFormat: videoFile.type || 'unknown',
        extractedFormat: 'audio/wav'
      };
    } catch (error) {
      console.error('❌ FFmpeg audio extraction failed:', error);
      
      // Try to get more detailed error information
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      return { 
        success: false, 
        error: `FFmpeg extraction failed: ${errorMessage}` 
      };
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }

  /**
   * Get supported video formats
   */
  getSupportedVideoFormats(): string[] {
    return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
  }

  /**
   * Get supported audio output formats
   */
  getSupportedAudioOutputFormats(): string[] {
    return ['wav', 'mp3', 'ogg', 'm4a'];
  }

  /**
   * Validate audio file for Pyannote compatibility
   */
  validateForPyannote(audioBlob: Blob): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check file size (Pyannote has limits)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (audioBlob.size > maxSize) {
      issues.push(`File too large: ${(audioBlob.size / (1024 * 1024)).toFixed(1)}MB (max: 100MB)`);
    }
    
    // Check MIME type
    if (audioBlob.type !== 'audio/wav') {
      issues.push(`Wrong format: ${audioBlob.type} (Pyannote prefers WAV)`);
    }
    
    // Check if it's a reasonable size for audio
    const minSize = 1024; // 1KB minimum
    if (audioBlob.size < minSize) {
      issues.push(`File too small: ${audioBlob.size} bytes (suspicious)`);
    }
    
    const valid = issues.length === 0;
    
    if (valid) {
      console.log('✅ Audio file validated for Pyannote compatibility');
    } else {
      console.warn('⚠️ Audio file has Pyannote compatibility issues:', issues);
    }
    
    return { valid, issues };
  }

  /**
   * Get Pyannote-compatible audio specifications
   */
  getPyannoteSpecs(): string {
    return `Pyannote Audio Requirements:
• Format: WAV (uncompressed)
• Sample Rate: 16kHz
• Channels: Mono (1 channel)
• Bit Depth: 16-bit PCM
• Codec: PCM signed little-endian
• Max Size: 100MB
• Preferred: Raw audio without metadata`;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
    }
    this.ffmpegLoaded = false;
  }
}

// Export singleton instance
export const audioExtractionService = new AudioExtractionService();
export default audioExtractionService;
