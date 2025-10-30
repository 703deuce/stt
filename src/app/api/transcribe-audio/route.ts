import { NextRequest, NextResponse } from 'next/server';
import { transcriptionService } from '@/services/transcriptionService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio_url, filename, settings } = body;
    
    if (!audio_url) {
      return NextResponse.json({ error: 'No audio URL provided' }, { status: 400 });
    }

    const result = await transcriptionService.transcribeAudio(
      { audio_url, filename },
      settings || {
        use_diarization: true,
        max_speakers: null,
        include_timestamps: true,
        speaker_threshold: 0.35,
        single_speaker_mode: false
      }
    );
    
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: result.message
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
