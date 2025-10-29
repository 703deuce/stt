import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

/**
 * Get all transcriptions for a specific user (admin only)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId is required'
      }, { status: 400 });
    }
    
    // Get user's transcriptions
    const transcriptionsRef = collection(db, 'users', userId, 'stt');
    const transcriptionsQuery = query(transcriptionsRef, orderBy('timestamp', 'desc'));
    const transcriptionDocs = await getDocs(transcriptionsQuery);
    
    const transcriptions = transcriptionDocs.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        name: data.name,
        status: data.status,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || 'N/A',
        duration: data.duration || 0,
        language: data.language,
        audio_file_url: data.audio_file_url,
        transcription_data_url: data.transcription_data_url,
        word_count: data.metadata?.word_count || 0,
        speaker_count: data.metadata?.speaker_count || 0
      };
    });
    
    return NextResponse.json({
      success: true,
      userId,
      transcriptions
    });
    
  } catch (error: any) {
    console.error('Failed to fetch user transcriptions:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

