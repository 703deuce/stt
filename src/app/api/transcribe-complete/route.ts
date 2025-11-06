import { NextRequest, NextResponse } from 'next/server';
import { runpodFallbackService } from '@/services/runpodFallbackService';
import { jobMappingService } from '@/services/jobMappingService';
import { ValidationUtils, addSecurityHeaders, secureErrorResponse } from '@/middleware/security';

interface TranscriptionRequest {
  audio_url: string;
  filename: string;
  userId: string;
  settings: {
    use_diarization: boolean;
    pyannote_version?: string; // "2.1" (faster) or "3.1" (more accurate)
    max_speakers: number | null;
    include_timestamps: boolean;
    speaker_threshold: number;
    single_speaker_mode: boolean;
  };
}

interface TranscriptionResult {
  transcript: string;
  text?: string;
  merged_text?: string;
  diarized_transcript: Array<{
    speaker: string;
    start_time: number;
    end_time: number;
    text: string;
  }>;
  timestamps: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  word_timestamps?: Array<{
    start: number;
    end: number;
    word: string;
    text?: string;
    confidence?: number;
  }>;
  segment_timestamps?: Array<{
    start: number;
    end: number;
    segment: string;
    start_offset?: number;
    end_offset?: number;
  }>;
  char_timestamps?: Array<{
    start: number;
    end: number;
    char: string[];
    start_offset?: number;
    end_offset?: number;
  }>;
  audio_duration_seconds?: number;
  duration?: number;
  speakers_detected?: number;
  chunks_processed?: number;
  workflow?: string;
  processing_method?: string;
  model_used?: string;
  audio_url?: string;
  metadata: {
    duration: number;
    speaker_count: number;
    word_count: number;
    chunks_processed: number;
  };
}

// Parakeet API integration class using fallback service
class ParakeetAPI {
  private apiKey: string;
  private userId: string;

  constructor(apiKey: string, userId: string) {
    this.apiKey = apiKey;
    this.userId = userId;
  }

  async transcribeAudio(params: any, filename?: string) {
    // Use fallback service for intelligent endpoint selection
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!webhookUrl) throw new Error('NEXT_PUBLIC_APP_URL is required');
    
    console.log('🔗 Webhook URL being sent:', `${webhookUrl}/api/webhooks/runpod`);
    console.log('📤 Full params being sent to RunPod:', JSON.stringify(params, null, 2));

    const result = await runpodFallbackService.transcribeWithFallback(
      params,
      `${webhookUrl}/api/webhooks/runpod`
    );

    if (!result.success) {
      console.error('❌ RunPod fallback service error:', result.error);
      throw new Error(`Failed to submit job: ${result.error || 'Unknown error'}`);
    }

    console.log('📤 Job submitted with webhook:', result.jobId);
    console.log('📍 Endpoint used:', result.endpoint);
    console.log('🔗 Webhook URL:', `${webhookUrl}/api/webhooks/runpod`);

    // Create job mapping for webhook handling (include filename so webhook can use it)
    try {
      await jobMappingService.mapJobToUser(
        result.jobId!, 
        this.userId, 
        'transcription', 
        filename, // Pass filename for webhook to use
        result.jobId   // RunPod job ID
      );
      console.log('📝 Job mapping created for webhook handling with filename:', filename);
    } catch (mappingError) {
      console.error('❌ Failed to create job mapping:', mappingError);
      // Don't fail the job submission if mapping fails
    }

    // Return job ID immediately - webhook will handle completion
    return {
      success: true,
      jobId: result.jobId,
      endpoint: result.endpoint,
      message: 'Job submitted with webhook notification'
    };
  }

  async pollForResults(jobId: string, maxWaitMinutes: number = 30) {
    const maxAttempts = maxWaitMinutes * 6; // Check every 10 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Try both endpoints for status checks since we don't know which one was used
      const endpointWithStorage = process.env.RUNPOD_ENDPOINT_WITH_STORAGE;
      const endpointNoStorage = process.env.RUNPOD_ENDPOINT_NO_STORAGE;
      const baseUrl = process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';
      
      if (!endpointWithStorage || !endpointNoStorage) {
        throw new Error('RUNPOD_ENDPOINT_WITH_STORAGE and RUNPOD_ENDPOINT_NO_STORAGE are required');
      }
      
      const primaryStatusUrl = `${baseUrl}/${endpointWithStorage}/status/${jobId}`;
      const backupStatusUrl = `${baseUrl}/${endpointNoStorage}/status/${jobId}`;
      
      let response;
      try {
        // Try primary endpoint first
        response = await fetch(primaryStatusUrl, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
      } catch (error) {
        // If primary fails, try backup endpoint
        console.log(`🔄 Primary status check failed, trying backup endpoint...`);
        response = await fetch(backupStatusUrl, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
      }
      
      const result = await response.json();
      
      if (result.status === 'COMPLETED') {
        return {
          success: true,
          data: result.output,
          text: result.output.text || result.output.transcript,
          words: result.output.word_timestamps || [],
          segments: result.output.segment_timestamps || [],
          speakers: result.output.diarized_transcript || [],
          duration: result.output.audio_duration_seconds,
          speakerCount: result.output.speakers_detected
        };
      }
      
      if (result.status === 'FAILED') {
        return { success: false, error: result.error };
      }
      
      // Wait 10 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    return { success: false, error: 'Timeout waiting for results' };
  }
}

// Note: Word-to-speaker mapping and speaker combination are now handled by RunPod API
// The API returns complete diarized_transcript with proper speaker assignments

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 OPTIMIZED Complete transcription API called');
    
    const body: TranscriptionRequest = await request.json();
    
    // ✅ SECURITY: Validate and sanitize inputs
    if (!body.audio_url || !ValidationUtils.validateAudioUrl(body.audio_url)) {
      return secureErrorResponse({ message: 'Invalid audio URL' }, 400);
    }

    if (!body.filename) {
      return secureErrorResponse({ message: 'Filename is required' }, 400);
    }

    // Sanitize filename
    try {
      body.filename = ValidationUtils.sanitizeFilename(body.filename);
    } catch (error: any) {
      return secureErrorResponse({ message: error.message }, 400);
    }

    if (!body.settings || !ValidationUtils.validateSettings(body.settings)) {
      return secureErrorResponse({ message: 'Invalid settings' }, 400);
    }
    
    console.log('✅ Request validated:', {
      audio_url: body.audio_url.substring(0, 50) + '...',
      filename: body.filename,
      settings: body.settings
    });

    // ✅ SECURITY: Get API keys from environment variables (never hardcode secrets)
    const apiKey = process.env.RUNPOD_API_KEY;
    const hfToken = process.env.HUGGINGFACE_TOKEN;
    
    if (!apiKey || !hfToken) {
      console.error('❌ Missing required API keys in environment variables');
      return secureErrorResponse({ message: 'Server configuration error' }, 500);
    }
    
    console.log('✅ Using API keys from environment variables');
    console.log('🎯 Starting OPTIMIZED processing workflow...');

    // Validate userId
    if (!body.userId) {
      return secureErrorResponse({ message: 'User ID is required' }, 400);
    }

    const parakeetAPI = new ParakeetAPI(apiKey, body.userId);

    // SINGLE CALL: Run both diarization and transcription together
    console.log('🎯 SINGLE CALL: Running both diarization and transcription together...');
    // Build API params with pyannote_version if diarization is enabled
    const apiParams: any = {
      audio_url: body.audio_url,
      audio_format: 'mp3',
      include_timestamps: true, // Get word-level timestamps
      use_diarization: body.settings.use_diarization, // Enable diarization if requested
      num_speakers: body.settings.max_speakers,
      speaker_threshold: body.settings.speaker_threshold,
      single_speaker_mode: body.settings.single_speaker_mode,
      filename: body.filename // Pass the filename to RunPod
    };

    // Add pyannote_version only if diarization is enabled
    // Always pass it explicitly to ensure handler uses the correct version
    if (body.settings.use_diarization) {
      // Always use 3.1 when diarization is enabled
      apiParams.pyannote_version = '3.1';
      apiParams.hf_token = hfToken;
      console.log(`✅ Using PyAnnote version ${apiParams.pyannote_version} for diarization`);
    }

    console.log('🚀 Calling RunPod API with params:', {
      ...apiParams,
      hf_token: apiParams.hf_token ? `${apiParams.hf_token.substring(0, 10)}...` : 'not provided'
    });
    
    let result;
    try {
      result = await parakeetAPI.transcribeAudio(apiParams, body.filename); // Also pass filename for job mapping
    } catch (apiError) {
      console.error('❌ RunPod API call failed:', apiError);
      return NextResponse.json(
        { error: `RunPod API call failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (!result.success) {
      console.error('❌ RunPod API failed');
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 500 }
      );
    }

    console.log('✅ RunPod API success - job submitted with webhook:', result.jobId);
    console.log('📝 Job will be processed by RunPod and results will come via webhook');

    // Return job ID immediately - webhook will handle completion
    const response = NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: 'Job submitted successfully. Results will be delivered via webhook.'
    });
    return addSecurityHeaders(response);

  } catch (error) {
    console.error('❌ Complete transcription API error:', error);
    // ✅ SECURITY: Use secure error response (no sensitive data leakage)
    return secureErrorResponse(error, 500);
  }
}
