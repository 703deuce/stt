import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Get all users and their transcription/content statistics
 * This gives the admin a complete view of all user activity
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindowMinutes = parseInt(searchParams.get('window') || '1440'); // Default 24 hours
    
    const cutoffTime = Timestamp.fromDate(
      new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    );
    
    console.log('📊 Fetching all users data...');
    
    // Get all users from Firestore users collection
    const usersRef = collection(db, 'users');
    const userDocs = await getDocs(usersRef);
    
    const usersData = [];
    
    for (const userDoc of userDocs.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      // Get user's transcriptions (stored in 'stt' subcollection)
      const transcriptionsRef = collection(db, 'users', userId, 'stt');
      const transcriptionDocs = await getDocs(transcriptionsRef);
      
      const transcriptions = transcriptionDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter recent transcriptions
      const recentTranscriptions = transcriptions.filter((t: any) => {
        const createdAt = t.timestamp?.toDate?.() || new Date(t.timestamp);
        return createdAt.getTime() >= cutoffTime.toDate().getTime();
      });
      
      // Calculate stats
      const totalTranscriptions = transcriptions.length;
      const completedTranscriptions = transcriptions.filter((t: any) => t.status === 'completed').length;
      const failedTranscriptions = transcriptions.filter((t: any) => t.status === 'failed').length;
      const processingTranscriptions = transcriptions.filter((t: any) => t.status === 'processing').length;
      
      // Get user's content records (stored in generated_content subcollection)
      const contentRef = collection(db, 'users', userId, 'generated_content');
      let contentDocs;
      try {
        contentDocs = await getDocs(contentRef);
      } catch (error) {
        // If user doesn't have generated_content subcollection, that's okay
        contentDocs = { docs: [] } as any;
      }
      
      const totalContent = contentDocs.docs?.length || 0;
      const completedContent = contentDocs.docs?.filter((doc: any) => doc.data().status === 'completed').length || 0;
      
      usersData.push({
        userId,
        email: userData.email || 'N/A',
        displayName: userData.displayName || userData.email || 'Unknown',
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || 'N/A',
        subscriptionPlan: userData.subscriptionPlan || 'free',
        subscriptionStatus: userData.subscriptionStatus || 'inactive',
        minutesUsed: userData.minutesUsed || 0,
        minutesLimit: userData.minutesLimit || 0,
        wordsUsedThisMonth: userData.wordsUsedThisMonth || 0,
        monthlyWordLimit: userData.monthlyWordLimit || 0,
        boostWords: userData.boostWords || 0,
        stats: {
          transcriptions: {
            total: totalTranscriptions,
            recent: recentTranscriptions.length,
            completed: completedTranscriptions,
            failed: failedTranscriptions,
            processing: processingTranscriptions
          },
          content: {
            total: totalContent,
            completed: completedContent
          }
        },
        recentActivity: recentTranscriptions.slice(0, 5).map((t: any) => ({
          id: t.id,
          filename: t.name,
          status: t.status,
          createdAt: t.timestamp?.toDate?.()?.toISOString() || 'N/A'
        }))
      });
    }
    
    // Sort by recent activity
    usersData.sort((a, b) => {
      const aActivity = a.stats.transcriptions.recent + a.stats.content.total;
      const bActivity = b.stats.transcriptions.recent + b.stats.content.total;
      return bActivity - aActivity;
    });
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeWindow: `${timeWindowMinutes} minutes`,
      totalUsers: usersData.length,
      users: usersData
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch users data:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

