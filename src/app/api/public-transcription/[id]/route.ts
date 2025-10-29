import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transcriptionId = params.id;

    if (!transcriptionId) {
      return NextResponse.json(
        { error: 'Transcription ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching public transcription:', transcriptionId);

    // Query all users to find the transcription
    // Note: In production, you might want to create a separate public_transcriptions collection
    // for better performance and security
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    for (const userDoc of usersSnapshot.docs) {
      const sttRef = doc(db, 'users', userDoc.id, 'stt', transcriptionId);
      const sttDoc = await getDoc(sttRef);

      if (sttDoc.exists()) {
        const data = sttDoc.data();

        // Check if the record is public
        if (!data.isPublic) {
          console.log('❌ Transcription is not public:', transcriptionId);
          return NextResponse.json(
            { error: 'This transcription is private' },
            { status: 403 }
          );
        }

        console.log('✅ Public transcription found:', transcriptionId);
        return NextResponse.json({
          id: sttDoc.id,
          ...data,
        });
      }
    }

    console.log('❌ Transcription not found:', transcriptionId);
    return NextResponse.json(
      { error: 'Transcription not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('❌ Error fetching public transcription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

