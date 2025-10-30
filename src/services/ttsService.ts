import axios from 'axios';
import { ALL_VOICES, Voice } from '@/data/voices';
import { voiceCloningService, ClonedVoice } from './voiceCloningService';
import { voiceCloningDatabaseService } from './voiceCloningDatabaseService';
import { ttsFirebaseService } from './ttsFirebaseService';
import { ttsDatabaseService, TTSRecord } from './ttsDatabaseService';
import { auth } from '../config/firebase';

// Higgs Audio V2 API Configuration
const RUNPOD_TTS_ENDPOINT_ID = process.env.RUNPOD_TTS_ENDPOINT;
const RUNPOD_BASE_URL = process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';
const HIGGS_ENDPOINT = RUNPOD_TTS_ENDPOINT_ID ? `${RUNPOD_BASE_URL}/${RUNPOD_TTS_ENDPOINT_ID}/run` : undefined;
const API_KEY = typeof window === 'undefined' ? process.env.RUNPOD_API_KEY : undefined;

if (typeof window === 'undefined') {
  if (!API_KEY) throw new Error('RUNPOD_API_KEY is required');
  if (!HIGGS_ENDPOINT) throw new Error('RUNPOD_TTS_ENDPOINT is required');
}

export interface TTSRequest {
  text: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_new_tokens?: number;
  seed?: number;
  ref_audio_name?: string;
  ref_audio_in_system_message?: boolean;
  chunk_method?: 'word' | 'speaker' | 'sentence' | 'semantic' | 'None';
  chunk_max_word_num?: number;
  chunk_max_num_turns?: number;
  generation_chunk_buffer_size?: number;
  scene_description?: string;
  ras_win_len?: number;
  ras_win_max_num_repeat?: number;
  output_format?: string;
  user_id?: string; // Required for custom cloned voices
}

export interface TTSJob {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface TTSResult {
  audio_base64: string;
  sampling_rate: number;
  duration: number;
  format: string;
  content_type: string;
  volume_path: string;
  generated_text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  method: string;
  cache_status: {
    cache_exists: boolean;
    models_cached: number;
    total_cache_size_mb: number;
  };
  // Additional fields for database integration
  recordId?: string;
  firebaseUrl?: string;
}

export interface TTSJobResult {
  id: string;
  status: string;
  output?: TTSResult;
  error?: string;
}



class TTSService {
  private headers = {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
  } as Record<string,string>;

  /**
   * Get all available voices (regular + custom cloned)
   */
  async getAvailableVoices(): Promise<Voice[]> {
    try {
      // Get regular voices
      const regularVoices = ALL_VOICES;
      
      // Get custom cloned voices directly from Firebase Storage
      const customVoices = await voiceCloningService.getUserVoices();
      
      // DEBUG: Log what custom voices are being returned
      console.log('🔍 TTS Service - Custom voices from voiceCloningService:', customVoices.map(v => ({
        id: v.id,
        name: v.name,
        startsWithCloned: v.id.startsWith('cloned_')
      })));
      
      // Convert custom voices to Voice format
      const customVoiceList: Voice[] = customVoices.map((clonedVoice: ClonedVoice) => ({
        id: clonedVoice.id, // This is the full Firebase filename (e.g., "cloned_1756205093378_bzbfy4n4x_Maya_Pop_Culture_Queen")
        name: clonedVoice.name, // Human-readable name (e.g., "Maya Pop Culture Queen")
        gender: 'Custom', // Mark as custom
        language: 'Custom',
        category: 'Custom Voices',
        description: clonedVoice.description || `Custom cloned voice: ${clonedVoice.name}`,
        isPremium: false,
        isNew: true,
        downloadURL: clonedVoice.downloadURL // Include Firebase download URL for preview
      }));
      
      // Combine both voice lists
      const allVoices = [...regularVoices, ...customVoiceList];
      
      console.log(`🎤 Total voices available: ${regularVoices.length} regular + ${customVoices.length} custom = ${allVoices.length} total`);
      
      return allVoices;
    } catch (error) {
      console.error('Error fetching available voices:', error);
      // Fallback to just regular voices if there's an error
      return ALL_VOICES;
    }
  }

  /**
   * Get available voices synchronously (for backward compatibility)
   */
  getAvailableVoicesSync(): Voice[] {
    return ALL_VOICES;
  }

  /**
   * Get multi-speaker voice combinations using your custom voices
   */
  getMultiSpeakerCombinations(): Array<{name: string; voices: string; description: string}> {
    return [
      {
        name: 'Podcast Duo (Blake + Luna)',
        voices: 'Blake_Sports_Podcast_Host,Luna_Music_Review_Host',
        description: 'Energetic sports host and laid-back music reviewer - perfect for dynamic podcasts'
      },
      {
        name: 'Gaming Show (Zack + Maya)',
        voices: 'Zack_Gaming_Enthusiast,Maya_Pop_Culture_Queen',
        description: 'Gaming enthusiast and pop culture expert for entertainment content'
      },
      {
        name: 'Professional News (Rachel + David)',
        voices: 'Rachel_News_Reporter,David_Documentary_Voice',
        description: 'News reporter and documentary voice for professional broadcasting'
      },
      {
        name: 'Educational Pair (Emma + James)',
        voices: 'Emma_Educational_Coach,James_Corporate_Executive',
        description: 'Educational coach and corporate executive for business training content'
      },
      {
        name: 'Custom Voice Mix',
        voices: 'en_man,cloned_1756205093378_bzbfy4n4x_Maya_Pop_Culture_Queen',
        description: 'Mix regular and custom voices for unique combinations'
      }
    ];
  }

  /**
   * Get voices by category (including custom voices)
   */
  async getVoicesByCategory(category: string): Promise<Voice[]> {
    const allVoices = await this.getAvailableVoices();
    
    if (category === 'All Voices') {
      return allVoices;
    }
    
    if (category === 'Custom Voices') {
      return allVoices.filter(voice => voice.category === 'Custom Voices');
    }
    
    return allVoices.filter(voice => voice.category === category);
  }

  /**
   * Get all available categories (including custom voices)
   */
  async getAvailableCategories(): Promise<string[]> {
    // Get all voices directly from Firebase Storage
    const allVoices = await this.getAvailableVoices();
    const categories = [...new Set(allVoices.map(voice => voice.category))];
    return ['All Voices', ...categories.sort()];
  }

  /**
   * Search voices by name (including custom voices)
   */
  async searchVoices(query: string): Promise<Voice[]> {
    const allVoices = await this.getAvailableVoices();
    const lowercaseQuery = query.toLowerCase();
    
    return allVoices.filter(voice => 
      voice.name.toLowerCase().includes(lowercaseQuery) ||
      voice.description.toLowerCase().includes(lowercaseQuery) ||
      voice.category.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get voice by ID (works for both regular and custom voices)
   */
  async getVoiceById(voiceId: string): Promise<Voice | null> {
    const allVoices = await this.getAvailableVoices();
    return allVoices.find(voice => voice.id === voiceId) || null;
  }

  /**
   * Check if a voice is custom/cloned
   */
  isCustomVoice(voiceId: string): boolean {
    return voiceId.startsWith('cloned_');
  }



  /**
   * Submit a TTS generation job
   */
  async submitTTSJob(request: TTSRequest): Promise<TTSJob> {
    try {
      // DEBUG: Check authentication state
      console.log('🔍 TTS Debug - Auth State:', {
        currentUser: auth.currentUser,
        uid: auth.currentUser?.uid,
        ref_audio_name: request.ref_audio_name,
        isCustomVoice: request.ref_audio_name?.startsWith('cloned_'),
        request_user_id: request.user_id
      });

      // Get current authenticated user for custom voices
      let userId = request.user_id;
      if (!userId && request.ref_audio_name?.startsWith('cloned_')) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          userId = currentUser.uid;
          console.log('🎤 TTS: Using authenticated user ID for custom voice:', userId);
        } else {
          console.error('❌ TTS: No authenticated user found for custom voice!');
          throw new Error('User must be authenticated to use custom cloned voices');
        }
      }

      // Filter chunking parameters based on chunk method
      const { chunk_method, chunk_max_word_num, chunk_max_num_turns, ...otherParams } = request;
      
      // Only include the appropriate chunking parameter
      const chunkingParams: any = {};
      if (chunk_method === 'word') {
        chunkingParams.chunk_method = 'word';
        chunkingParams.chunk_max_word_num = chunk_max_word_num;
        // DO NOT include chunk_max_num_turns for word chunking
      } else if (chunk_method === 'speaker') {
        chunkingParams.chunk_method = 'speaker';
        chunkingParams.chunk_max_num_turns = chunk_max_num_turns;
        // DO NOT include chunk_max_word_num for speaker chunking
      } else if (chunk_method === 'sentence') {
        chunkingParams.chunk_method = 'sentence';
        // No additional parameters for sentence chunking
      } else {
        // chunk_method === 'None' - no chunking parameters
      }

      const payload = {
        input: {
          ...otherParams,
          ...chunkingParams,
          user_id: userId, // Include user_id for custom voices
          output_format: request.output_format || 'wav'
        }
      };

      console.log('🚀 TTS Final Payload:', payload);
      console.log('🔍 Chunking Parameters:', {
        chunk_method,
        chunk_max_word_num: chunk_method === 'word' ? chunk_max_word_num : 'NOT INCLUDED',
        chunk_max_num_turns: chunk_method === 'speaker' ? chunk_max_num_turns : 'NOT INCLUDED'
      });

      const response = await axios.post(HIGGS_ENDPOINT, payload, {
        headers: this.headers
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const jobData = response.data;
      console.log('✅ TTS job submitted:', jobData.id);

      return {
        id: jobData.id,
        status: jobData.status || 'IN_QUEUE'
      };
    } catch (error) {
      console.error('❌ Error submitting TTS job:', error);
      throw new Error(`Failed to submit TTS job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check the status of a TTS job
   */
  async checkJobStatus(jobId: string): Promise<TTSJobResult> {
    try {
      const statusUrl = RUNPOD_TTS_ENDPOINT_ID ? `${RUNPOD_BASE_URL}/${RUNPOD_TTS_ENDPOINT_ID}/status/${jobId}` : null;
      if (!statusUrl) throw new Error('RUNPOD_TTS_ENDPOINT is required');
      
      const response = await axios.get(statusUrl, {
        headers: this.headers
      });

      if (response.status !== 200) {
        throw new Error(`Status check failed with status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error checking TTS job status:', error);
      throw new Error(`Failed to check job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for job completion with timeout
   */
  async pollForCompletion(
    jobId: string,
    maxWaitTime: number = 300000, // 5 minutes
    checkInterval: number = 3000, // 3 seconds
    onStatusUpdate?: (status: string) => void
  ): Promise<TTSResult> {
    const maxAttempts = Math.floor(maxWaitTime / checkInterval);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`⏳ Checking TTS status (attempt ${attempt + 1}/${maxAttempts})...`);
        
        const jobResult = await this.checkJobStatus(jobId);
        const status = jobResult.status;

        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        if (status === 'COMPLETED') {
          console.log('✅ TTS job completed!');
          if (!jobResult.output) {
            throw new Error('Job completed but no output received');
          }
          return jobResult.output;
        } else if (status === 'FAILED') {
          console.log('❌ TTS job failed:', jobResult.error);
          throw new Error(`TTS generation failed: ${jobResult.error || 'Unknown error'}`);
        } else if (status === 'CANCELLED') {
          throw new Error('TTS job was cancelled');
        } else {
          console.log(`🔄 TTS Status: ${status}`);
        }

        // Wait before next check (except on last attempt)
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes('failed') || error.message.includes('cancelled'))) {
          throw error; // Re-throw terminal errors
        }
        console.warn(`⚠️ TTS status check attempt ${attempt + 1} failed:`, error);
        
        // If this was the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        
        // Otherwise, wait and try again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error(`Timeout waiting for TTS generation to complete after ${maxWaitTime / 1000} seconds`);
  }

  /**
   * Complete TTS workflow: submit + poll + save to database
   */
  async generateSpeech(
    request: TTSRequest,
    onStatusUpdate?: (status: string, jobId?: string) => void
  ): Promise<TTSResult> {
    try {
      // Submit job
      onStatusUpdate?.('SUBMITTING');
      const job = await this.submitTTSJob(request);
      
      onStatusUpdate?.('IN_QUEUE', job.id);
      
      // Poll for completion
      const result = await this.pollForCompletion(
        job.id,
        300000, // 5 minutes
        3000,   // 3 seconds
        (status) => onStatusUpdate?.(status, job.id)
      );

      // Save the TTS generation to database and Firebase Storage
      try {
        await this.saveTTSGeneration(request, result);
      } catch (saveError) {
        console.error('❌ Failed to save TTS generation:', saveError);
        // Don't fail the generation if saving fails
      }

      return result;
    } catch (error) {
      console.error('❌ TTS workflow failed:', error);
      throw error;
    }
  }

  /**
   * Save TTS generation to database and Firebase Storage
   */
  private async saveTTSGeneration(request: TTSRequest, result: TTSResult): Promise<void> {
    try {
      console.log('💾 Saving TTS generation to database and storage...');
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Generate a filename for the TTS generation
      const originalFilename = `TTS_${request.text.substring(0, 30).replace(/[^a-zA-Z0-9\s]/g, '')}`;
      const filename = ttsFirebaseService.generateTTSFilename(originalFilename, result.content_type);
      
      console.log('📁 Generated filename:', filename);
      console.log('📁 Original filename:', originalFilename);

      // Upload audio to Firebase Storage
      console.log('📤 Uploading audio to Firebase Storage...');
      const uploadResult = await ttsFirebaseService.uploadTTSAudioFromBase64(
        result.audio_base64,
        userId,
        filename,
        result.content_type
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(`Firebase upload failed: ${uploadResult.error}`);
      }

      console.log('✅ Audio uploaded to Firebase Storage');
      console.log('🔗 Firebase URL:', uploadResult.url);

      // Get voice information
      const voiceId = request.ref_audio_name || 'unknown';
      const voiceName = await this.getVoiceDisplayName(voiceId);

      // Create TTS record in database
      console.log('📝 Creating TTS record in database...');
      const ttsRecord: Omit<TTSRecord, 'id' | 'timestamp'> = {
        user_id: userId,
        name: originalFilename,
        input_text: request.text,
        voice_id: voiceId,
        voice_name: voiceName,
        audio_url: uploadResult.url,
        duration: result.duration,
        format: result.format,
        content_type: result.content_type,
        status: 'completed',
        metadata: {
          temperature: request.temperature,
          top_p: request.top_p,
          top_k: request.top_k,
          chunk_method: request.chunk_method,
          is_multi_speaker: request.chunk_method === 'speaker',
          total_tokens: result.usage?.total_tokens,
          prompt_tokens: result.usage?.prompt_tokens,
          completion_tokens: result.usage?.completion_tokens,
          cache_status: result.cache_status
        }
      };

      const recordId = await ttsDatabaseService.createTTSRecord(ttsRecord);
      console.log('✅ TTS record created in database with ID:', recordId);

      // Update the result with the database record ID and Firebase URL
      result.recordId = recordId;
      result.firebaseUrl = uploadResult.url;

    } catch (error) {
      console.error('❌ Failed to save TTS generation:', error);
      throw error;
    }
  }

  /**
   * Get voice display name from voice ID
   */
  private async getVoiceDisplayName(voiceId: string): Promise<string> {
    try {
      // Check if it's a custom cloned voice
      if (voiceId.startsWith('cloned_')) {
        try {
          // Try to get voice info from database first
          const currentUser = auth.currentUser;
          if (currentUser) {
            // Get all user's voice clones and find the matching one
            const userVoices = await voiceCloningDatabaseService.getUserVoiceClones(currentUser.uid);
            const matchingVoice = userVoices.find(v => v.firebase_path.includes(voiceId));
            if (matchingVoice) {
              return matchingVoice.name;
            }
          }
        } catch (dbError) {
          console.warn('Failed to get voice info from database, falling back to filename parsing:', dbError);
        }

        // Fallback to filename parsing
        const parts = voiceId.split('_');
        if (parts.length >= 4) {
          return parts.slice(3).join('_'); // Skip 'cloned', timestamp, and random ID
        }
        return 'Custom Cloned Voice';
      }

      // Check regular voices
      const voice = ALL_VOICES.find(v => v.id === voiceId);
      if (voice) {
        return voice.name;
      }
      
      return voiceId;
    } catch (error) {
      console.error('Error getting voice display name:', error);
      return voiceId;
    }
  }

  /**
   * Convert base64 audio to blob for playback
   */
  base64ToBlob(base64Data: string, contentType: string = 'audio/wav'): Blob {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  /**
   * Create audio URL from base64 data
   */
  createAudioURL(base64Data: string, contentType: string = 'audio/wav'): string {
    const blob = this.base64ToBlob(base64Data, contentType);
    return URL.createObjectURL(blob);
  }

  /**
   * Download audio file from base64 data
   */
  downloadAudio(base64Data: string, filename: string = 'generated_audio.wav', contentType: string = 'audio/wav'): void {
    const blob = this.base64ToBlob(base64Data, contentType);
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Get preset configurations for stable, natural-sounding speech
   */
  getPresetConfigurations() {
    return {
      neutral_professional: {
        name: 'Neutral Professional',
        description: 'Clear, neutral, professional tone',
        config: {
          temperature: 0.32,
          top_p: 0.94,
          top_k: 45,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Speak with a clear, neutral, professional tone.'
        }
      },
      friendly_conversational: {
        name: 'Friendly Conversational',
        description: 'Casual, approachable, friendly style',
        config: {
          temperature: 0.35,
          top_p: 0.95,
          top_k: 50,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Casual, approachable, friendly style.'
        }
      },
      calm_soothing: {
        name: 'Calm & Soothing',
        description: 'Calm, gentle, relaxing pacing',
        config: {
          temperature: 0.30,
          top_p: 0.93,
          top_k: 40,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Calm, gentle, relaxing pacing.'
        }
      },
      clear_narrator: {
        name: 'Clear Narrator',
        description: 'Neutral, articulate, steady narration',
        config: {
          temperature: 0.33,
          top_p: 0.94,
          top_k: 48,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Neutral, articulate, steady narration.'
        }
      },
      warm_supportive: {
        name: 'Warm & Supportive',
        description: 'Warm, empathetic, positive tone',
        config: {
          temperature: 0.34,
          top_p: 0.95,
          top_k: 45,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Warm, empathetic, positive tone.'
        }
      },
      serious_direct: {
        name: 'Serious & Direct',
        description: 'Serious, direct, steady delivery',
        config: {
          temperature: 0.31,
          top_p: 0.93,
          top_k: 40,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Serious, direct, steady delivery.'
        }
      },
      energetic_safe: {
        name: 'Energetic (Safe)',
        description: 'Upbeat, lively, positive energy',
        config: {
          temperature: 0.38,
          top_p: 0.96,
          top_k: 55,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Upbeat, lively, positive energy.'
        }
      },
      academic_teacher: {
        name: 'Academic/Teacher',
        description: 'Patient, knowledgeable, steady instruction',
        config: {
          temperature: 0.34,
          top_p: 0.94,
          top_k: 45,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Patient, knowledgeable, steady instruction.'
        }
      },
      news_anchor: {
        name: 'News Anchor',
        description: 'Crisp, clear, headline-focused delivery',
        config: {
          temperature: 0.35,
          top_p: 0.95,
          top_k: 50,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Crisp, clear, headline-focused delivery.'
        }
      },
      gentle_storyteller: {
        name: 'Gentle Storyteller',
        description: 'Soft, warm, engaging storytelling',
        config: {
          temperature: 0.33,
          top_p: 0.94,
          top_k: 48,
          chunk_method: 'word' as const,
          chunk_max_word_num: 50,
          generation_chunk_buffer_size: 2,
          ras_win_len: 7,
          ras_win_max_num_repeat: 2,
          scene_description: 'Soft, warm, engaging storytelling.'
        }
      }
    };
  }

  /**
   * Format text for multi-speaker content
   */
  formatMultiSpeakerText(text: string): string {
    console.log('🔤 Original text:', text);
    
    // Convert various speaker formats to [SPEAKER0], [SPEAKER1], etc.
    let formatted = text
      .replace(/Speaker (\d+):/gi, '[SPEAKER$1]')
      .replace(/Speaker_(\d+):/gi, '[SPEAKER$1]')
      .replace(/Speaker(\d+):/gi, '[SPEAKER$1]')
      .replace(/\[Speaker (\d+)\]/gi, '[SPEAKER$1]')
      .replace(/\[Speaker_(\d+)\]/gi, '[SPEAKER$1]')
      .replace(/\[Speaker(\d+)\]/gi, '[SPEAKER$1]')
      // Handle cases with spaces before colons
      .replace(/Speaker (\d+)\s*:/gi, '[SPEAKER$1]')
      .replace(/Speaker_(\d+)\s*:/gi, '[SPEAKER$1]')
      .replace(/Speaker(\d+)\s*:/gi, '[SPEAKER$1]');
    
    // Ensure proper spacing after speaker tags
    formatted = formatted.replace(/\[SPEAKER(\d+)\]([^\s])/g, '[SPEAKER$1] $2');
    
    // Ensure proper spacing before speaker tags (if they're at start of line)
    formatted = formatted.replace(/([^\s])\[SPEAKER(\d+)\]/g, '$1 [SPEAKER$2]');
    
    console.log('🔤 Formatted text:', formatted);
    
    // Count speaker tags to verify they're all caught
    const speakerMatches = formatted.match(/\[SPEAKER\d+\]/g);
    console.log('🔤 Found speaker tags:', speakerMatches);
    console.log('🔤 Total speaker tags:', speakerMatches ? speakerMatches.length : 0);
    
    return formatted;
  }

  /**
   * Validate text input
   */
  validateText(text: string): { valid: boolean; error?: string; warning?: string } {
    if (!text.trim()) {
      return { valid: false, error: 'Text cannot be empty' };
    }

    if (text.length > 5000) {
      return { 
        valid: true, 
        warning: 'Text is quite long. Consider using chunking parameters for optimal results.' 
      };
    }

    if (text.length > 1000) {
      return {
        valid: true,
        warning: 'For texts longer than 200 words, chunking is recommended for best quality.'
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const ttsService = new TTSService();
export default ttsService;
