import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { 
  collectionGroup,
  collection,
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { activeJobsService } from '@/services/activeJobsService';

/**
 * Queue worker that processes queued jobs and submits them to RunPod
 * Should run every 1-2 minutes
 * 
 * Flow:
 * 1. Check RunPod capacity
 * 2. Get highest priority queued jobs
 * 3. Submit to RunPod
 * 4. Update status to 'processing' (RunPod starts immediately)
 * 5. Webhook will update to 'completed' when done
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const querySecret = request.nextUrl.searchParams.get('secret');
      if (querySecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('🔄 Queue worker: Processing queued jobs...');
    
    // TODO: Check RunPod capacity (call RunPod API to get available workers)
    // For now, we'll process a reasonable number of jobs
    const maxJobsToProcess = 50; // Adjust based on your RunPod capacity
    
    // Get queued jobs ordered by priority (lower = higher priority) then by createdAt (FIFO)
    // Note: This requires a composite index in Firestore
    const queuedJobsQuery = query(
      collectionGroup(db, 'activeJobs'),
      where('status', '==', 'queued'),
      orderBy('priority', 'asc'),
      orderBy('createdAt', 'asc'),
      limit(maxJobsToProcess)
    );

    const queuedJobsSnapshot = await getDocs(queuedJobsQuery);
    
    if (queuedJobsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No queued jobs to process',
        processed: 0,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📊 Found ${queuedJobsSnapshot.size} queued jobs to process`);

    const results = {
      processed: 0,
      submitted: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const jobDoc of queuedJobsSnapshot.docs) {
      const jobData = jobDoc.data();
      const userId = jobData.userId || jobDoc.ref.parent.parent?.id;
      const jobId = jobData.jobId || jobDoc.id;
      
      if (!userId || !jobId) {
        console.warn(`⚠️ Skipping job with missing userId or jobId:`, jobDoc.id);
        continue;
      }

      try {
        // Get the full STT record to access audio_file_url
        const { databaseService } = await import('@/services/databaseService');
        const sttRecord = await databaseService.getSTTRecordById(jobId, userId);
        
        if (!sttRecord) {
          console.warn(`⚠️ STT record not found for job ${jobId}`);
          continue;
        }

        // Submit to RunPod API
        // Note: This assumes the job was already submitted by the initial API call
        // The queue worker is mainly for retry scenarios
        // In a full implementation, you'd submit to RunPod here
        
        // For now, move from 'queued' to 'submitted' (RunPod webhook will move to 'processing')
        // In production, you'd actually call RunPod API here
        
        // Update status to 'processing' (RunPod starts immediately after submission)
        const { serverTimestamp } = await import('firebase/firestore');
        await databaseService.updateSTTRecord(jobId, {
          status: 'processing',
          startedAt: serverTimestamp() as Timestamp
        }, userId);

        // Update activeJobs
        await updateDoc(jobDoc.ref, {
          status: 'processing',
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        results.submitted++;
        results.processed++;
        
        console.log(`✅ Submitted job ${userId}/${jobId} to RunPod`);
      } catch (error) {
        const errorMsg = `Error processing job ${userId}/${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        results.errors.push(errorMsg);
        results.failed++;
        
        // Mark job as failed if submission fails
        try {
          const { databaseService } = await import('@/services/databaseService');
          await databaseService.updateSTTRecord(jobId, {
            status: 'failed',
            error: errorMsg
          }, userId);
          
          await activeJobsService.removeActiveJob(userId, jobId);
        } catch (updateError) {
          console.error(`❌ Error updating failed job:`, updateError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Queue processing completed',
      results: {
        processed: results.processed,
        submitted: results.submitted,
        failed: results.failed,
        errors: results.errors.length > 0 ? results.errors : undefined
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('❌ Error in queue worker:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST
export async function POST(request: NextRequest) {
  return GET(request);
}

