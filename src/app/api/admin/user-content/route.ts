import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

/**
 * Get all generated content for a specific user (admin only)
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
    
    // Get user's generated content
    const contentRef = collection(db, 'users', userId, 'generated_content');
    const contentQuery = query(contentRef, orderBy('timestamp', 'desc'));
    const contentDocs = await getDocs(contentQuery);
    
    const content = contentDocs.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId,
        title: data.title,
        status: data.status,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || 'N/A',
        content_type_name: data.content_type_name,
        content_category: data.content_category,
        word_count: data.word_count || 0,
        character_count: data.character_count || 0,
        transcription_id: data.transcription_id,
        transcription_name: data.transcription_name
      };
    });
    
    return NextResponse.json({
      success: true,
      userId,
      content
    });
    
  } catch (error: any) {
    console.error('Failed to fetch user content:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

