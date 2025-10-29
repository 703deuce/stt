import { NextRequest, NextResponse } from 'next/server';
import { ValidationUtils, addSecurityHeaders, secureErrorResponse } from '@/middleware/security';

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
    
    // Server-side fetch (no CORS issues)
    const response = await fetch(transcriptionDataUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const fullData = await response.json();
    
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
