import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';

/**
 * Job Monitoring Endpoint
 * Tracks transcription and content generation job health
 * 
 * Checks:
 * - Stuck jobs (generating > 10 minutes)
 * - Failed job rate
 * - Queue backlog
 * - Average completion time
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindowMinutes = parseInt(searchParams.get('window') || '60');
    const includeDetails = searchParams.get('details') === 'true';
    
    const cutoffTime = Timestamp.fromDate(
      new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    );
    
    console.log('📊 Job monitoring request:', {
      timeWindowMinutes,
      cutoffTime: cutoffTime.toDate().toISOString(),
      now: new Date().toISOString()
    });
    
    // Check transcription jobs - need to query across all users
    let transcriptions: any[] = [];
    
    try {
      // Get all users
      const usersRef = collection(db, 'users');
      const userDocs = await getDocs(usersRef);
      
      console.log(`📊 Found ${userDocs.size} users, fetching their transcriptions...`);
      
      // For each user, get their transcriptions (stored in 'stt' subcollection)
      for (const userDoc of userDocs.docs) {
        const userTranscriptionsRef = collection(db, 'users', userDoc.id, 'stt');
        
        try {
          const userTranscriptionDocs = await getDocs(userTranscriptionsRef);
          const userTranscriptions = userTranscriptionDocs.docs.map(doc => ({
            id: doc.id,
            userId: userDoc.id,
            ...doc.data()
          }));
          
          // Filter by time window
          const recentUserTranscriptions = userTranscriptions.filter((job: any) => {
            const createdAt = job.timestamp?.toDate?.() || new Date(job.timestamp);
            return createdAt.getTime() >= cutoffTime.toDate().getTime();
          });
          
          transcriptions.push(...recentUserTranscriptions);
        } catch (error: any) {
          console.warn(`⚠️ Failed to fetch transcriptions for user ${userDoc.id}:`, error.message);
        }
      }
      
      // Sort by timestamp desc
      transcriptions.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.()?.getTime() || 0;
        const bTime = b.timestamp?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      console.log(`✅ Found ${transcriptions.length} transcriptions across all users`);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch transcriptions:', error.message);
    }
    
    // Check content generation jobs - stored in users/{userId}/generated_content
    let contentRecords: any[] = [];
    
    try {
      // Get all users
      const usersRef = collection(db, 'users');
      const userDocs = await getDocs(usersRef);
      
      console.log(`📊 Found ${userDocs.size} users, fetching their generated content...`);
      
      for (const userDoc of userDocs.docs) {
        const userContentRef = collection(db, 'users', userDoc.id, 'generated_content');
        
        try {
          const userContentDocs = await getDocs(userContentRef);
          const userContent = userContentDocs.docs.map(doc => ({
            id: doc.id,
            userId: userDoc.id,
            ...doc.data()
          }));
          
          // Filter by time window (content uses 'timestamp' field, not 'createdAt')
          const recentUserContent = userContent.filter((job: any) => {
            const createdAt = job.timestamp?.toDate?.() || job.createdAt?.toDate?.() || new Date(job.timestamp || job.createdAt);
            return createdAt.getTime() >= cutoffTime.toDate().getTime();
          });
          
          contentRecords.push(...recentUserContent);
        } catch (error: any) {
          console.warn(`⚠️ Failed to fetch content for user ${userDoc.id}:`, error.message);
        }
      }
      
      // Sort by timestamp desc (content uses 'timestamp' field)
      contentRecords.sort((a, b) => {
        const aTime = a.timestamp?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.timestamp?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      
      console.log(`✅ Found ${contentRecords.length} content records across all users`);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch content records:', error.message);
    }
    
    console.log('📊 Data fetched:', {
      transcriptionCount: transcriptions.length,
      contentCount: contentRecords.length,
      transcriptionIds: transcriptions.map((t: any) => t.id),
      contentIds: contentRecords.map((c: any) => c.id),
      contentSample: contentRecords.slice(0, 3).map((c: any) => ({
        id: c.id,
        title: c.title,
        timestamp: c.timestamp?.toDate?.()?.toISOString() || c.timestamp,
        status: c.status
      }))
    });
    
    // Analyze transcription jobs
    const transcriptionStats = analyzeJobs(transcriptions, 'transcription');
    
    // Analyze content generation jobs
    const contentStats = analyzeJobs(contentRecords, 'content');
    
    console.log('📊 Stats calculated:', {
      transcriptionStats,
      contentStats
    });
    
    // Detect stuck jobs
    const stuckThreshold = 10 * 60 * 1000; // 10 minutes
    const now = Date.now();
    
    const stuckTranscriptions = transcriptions.filter((job: any) => {
      const createdAt = job.timestamp?.toDate?.() || new Date(job.timestamp);
      return job.status === 'processing' && (now - createdAt.getTime()) > stuckThreshold;
    });
    
    const stuckContent = contentRecords.filter((job: any) => {
      const createdAt = job.timestamp?.toDate?.() || job.createdAt?.toDate?.() || new Date(job.timestamp || job.createdAt);
      return job.status === 'generating' && (now - createdAt.getTime()) > stuckThreshold;
    });
    
    const health = {
      status: (stuckTranscriptions.length > 0 || stuckContent.length > 0 || 
               transcriptionStats.failureRate > 10 || contentStats.failureRate > 10) 
        ? 'warning' : 'healthy',
      timestamp: new Date().toISOString(),
      timeWindow: `${timeWindowMinutes} minutes`,
      
      transcriptions: {
        total: transcriptionStats.total,
        completed: transcriptionStats.completed,
        failed: transcriptionStats.failed,
        processing: transcriptionStats.processing,
        failureRate: `${transcriptionStats.failureRate.toFixed(2)}%`,
        stuckJobs: stuckTranscriptions.length,
        avgCompletionTime: transcriptionStats.avgCompletionTime
      },
      
      content: {
        total: contentStats.total,
        completed: contentStats.completed,
        failed: contentStats.failed,
        generating: contentStats.processing,
        failureRate: `${contentStats.failureRate.toFixed(2)}%`,
        stuckJobs: stuckContent.length,
        avgCompletionTime: contentStats.avgCompletionTime
      },
      
      alerts: [
        ...stuckTranscriptions.map((job: any) => ({
          type: 'stuck_transcription',
          severity: 'high',
          message: `Transcription ${job.id} stuck for ${Math.round((now - (job.timestamp?.toDate?.()?.getTime() || Date.now())) / 60000)} minutes`,
          jobId: job.id
        })),
        ...stuckContent.map((job: any) => ({
          type: 'stuck_content',
          severity: 'high',
          message: `Content generation ${job.id} stuck for ${Math.round((now - (job.timestamp?.toDate?.()?.getTime() || job.createdAt?.toDate?.()?.getTime() || Date.now())) / 60000)} minutes`,
          jobId: job.id
        })),
        ...(transcriptionStats.failureRate > 10 ? [{
          type: 'high_failure_rate',
          severity: 'medium',
          message: `Transcription failure rate is ${transcriptionStats.failureRate.toFixed(2)}%`
        }] : []),
        ...(contentStats.failureRate > 10 ? [{
          type: 'high_failure_rate',
          severity: 'medium',
          message: `Content generation failure rate is ${contentStats.failureRate.toFixed(2)}%`
        }] : [])
      ]
    };
    
    if (includeDetails) {
      (health as any).details = {
        stuckTranscriptions: stuckTranscriptions.map((job: any) => ({
          id: job.id,
          fileName: job.name,
          createdAt: job.timestamp?.toDate?.()?.toISOString() || job.timestamp
        })),
        stuckContent: stuckContent.map((job: any) => ({
          id: job.id,
          title: job.title,
          type: job.content_type_name,
          createdAt: job.timestamp?.toDate?.()?.toISOString() || job.createdAt?.toDate?.()?.toISOString() || job.timestamp || job.createdAt
        }))
      };
    }
    
    return NextResponse.json(health, { 
      status: health.status === 'warning' ? 200 : 200 
    });
    
  } catch (error) {
    console.error('Job monitoring failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function analyzeJobs(jobs: any[], type: string) {
  const total = jobs.length;
  const completed = jobs.filter((job: any) => job.status === 'completed').length;
  const failed = jobs.filter((job: any) => job.status === 'failed').length;
  const processing = jobs.filter((job: any) => 
    job.status === 'processing' || job.status === 'generating'
  ).length;
  
  const failureRate = total > 0 ? (failed / total) * 100 : 0;
  
  // Calculate average completion time for completed jobs
  // Note: For transcriptions, we don't have separate completed_at timestamps,
  // so we can't calculate actual processing time. Just mark as N/A.
  let avgCompletionTime = 'N/A';
  
  if (type === 'content') {
    // Content records use 'timestamp' field, and don't have separate completion time
    // So we can't calculate processing time accurately
    avgCompletionTime = 'N/A';
  }
  
  return {
    total,
    completed,
    failed,
    processing,
    failureRate,
    avgCompletionTime
  };
}

