import { NextRequest, NextResponse } from 'next/server';
import { ValidationUtils, addSecurityHeaders, secureErrorResponse } from '@/middleware/security';

async function fetchStorageUrl(url: string) {
  const baseHeaders: Record<string, string> = {
    'Accept': 'application/json'
  };

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: baseHeaders,
      cache: 'no-store'
    });

    if (response.status === 401) {
      console.warn('⚠️ [get-transcription-data] Received 401, retrying without headers...');
      const retryResponse = await fetch(url, {
        method: 'GET',
        cache: 'no-store'
      });
      if (!retryResponse.ok) {
        throw retryResponse;
      }
      return retryResponse;
    }

    if (!response.ok) {
      throw response;
    }

    return response;
  } catch (err) {
    if (err instanceof Response) {
      const text = await err.text().catch(() => '');
      throw new Error(`HTTP ${err.status}: ${err.statusText} ${text ? '- ' + text : ''}`);
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { transcriptionDataUrl } = await request.json();
    
    // ✅ SECURITY: Validate URL
    if (!transcriptionDataUrl || !ValidationUtils.validateAudioUrl(transcriptionDataUrl)) {
      return secureErrorResponse({ message: 'Invalid transcription data URL' }, 400);
    }

    console.log('📥 Server-side fetch of transcription data from:', transcriptionDataUrl.substring(0, 50) + '...');
    
    // ✅ SECURITY: Verify it's a Firebase Storage URL
    if (!transcriptionDataUrl.includes('firebasestorage.googleapis.com')) {
      return secureErrorResponse({ message: 'Invalid storage URL' }, 400);
    }
    
    // Server-side fetch (with retry logic)
    const response = await fetchStorageUrl(transcriptionDataUrl);
    const raw = await response.text();
    let fullData: any = raw;

    try {
      fullData = JSON.parse(raw);
    } catch {
      console.warn('⚠️ [get-transcription-data] Response was not valid JSON, returning raw string.');
      fullData = { fullText: raw };
    }
    
    console.log('✅ Server-side transcription data retrieved:', {
      hasTranscript: !!fullData.transcript,
      hasDiarizedTranscript: !!fullData.diarized_transcript,
      hasTimestamps: !!fullData.timestamps,
      transcriptLength: fullData.transcript?.length || 0,
      diarizedSegments: fullData.diarized_transcript?.length || 0,
      wordTimestamps: fullData.timestamps?.length || 0
    });
    
    // ✅ SECURITY: Add security headers
    const jsonResponse = NextResponse.json(fullData);
    return addSecurityHeaders(jsonResponse);
    
  } catch (error) {
    console.error('❌ Error fetching transcription data server-side:', error);
    // ✅ SECURITY: Use secure error response
    return secureErrorResponse(error, 500);
  }
}
