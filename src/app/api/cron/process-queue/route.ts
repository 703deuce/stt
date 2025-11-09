import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, orderBy, limit, collectionGroup, Timestamp } from 'firebase/firestore';
import { rateLimitService } from '@/services/rateLimitService';
import { databaseService } from '@/services/databaseService';
import { activeJobsService } from '@/services/activeJobsService';

/**
 * Queue Processor Cron Job
 * 
 * Runs every 1 minute to process queued STT jobs.
 * 
 * Flow:
 * 1. Find all jobs with status='queued' (ordered by priority, then queuedAt)
 * 2. For each job, check if user now has capacity
 * 3. If yes: submit to RunPod and update to 'processing'
 * 4. If no: leave in queue for next run
 * 
 * Security:
 * - Requires CRON_SECRET in Authorization header or query param
 * 
 * Setup:
 * - Add to Hetzner/Coolify cron: * * * * * curl -H "Authorization: Bearer SECRET" https://transovo.ai/api/cron/process-queue
 */

// Support both GET and POST methods for flexibility
export async function GET(req: NextRequest) {
  return handleQueueProcessing(req);
}

export async function POST(req: NextRequest) {
  return handleQueueProcessing(req);
}

async function handleQueueProcessing(req: NextRequest) {
  try {
    // ✅ SECURITY: Check authorization
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const expectedSecret = `Bearer ${cronSecret}`;
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get('token');

    if (authHeader !== expectedSecret && tokenFromQuery !== cronSecret) {
      console.error('❌ Unauthorized queue processor access attempt');
      console.error('   Expected:', expectedSecret);
      console.error('   Received:', authHeader || 'none');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 ===== QUEUE PROCESSOR CRON STARTED =====');
    console.log('⏰ Timestamp:', new Date().toISOString());

    // Find all queued STT jobs across all users (ordered by priority, then queuedAt)
    const queuedJobsQuery = query(
      collectionGroup(db, 'stt'),
      where('status', '==', 'queued'),
      orderBy('priority', 'asc'), // Lower number = higher priority (1=premium, 2=paid, 3=trial)
      orderBy('queuedAt', 'asc'), // Older jobs first
      limit(100) // Process up to 100 jobs per run
    );

    const queuedJobsSnapshot = await getDocs(queuedJobsQuery);
    
    console.log(`📋 Found ${queuedJobsSnapshot.size} queued jobs`);

    let processed = 0;
    let stillQueued = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const jobDoc of queuedJobsSnapshot.docs) {
      const jobData = jobDoc.data();
      const userId = jobData.user_id;
      const recordId = jobDoc.id;

      console.log(`\n🔍 Processing queued job ${recordId} for user ${userId}...`);
      console.log(`   Priority: ${jobData.priority}, Queued at: ${jobData.queuedAt?.toDate?.()?.toISOString() || 'unknown'}`);

      try {
        // Check if user now has capacity
        const rateLimitCheck = await rateLimitService.canUserSubmitJob(userId, 'stt');

        if (rateLimitCheck.allowed) {
          console.log(`✅ User ${userId} has capacity, processing queued job ${recordId}`);
          console.log(`   Current usage: ${rateLimitCheck.current.concurrent}/${rateLimitCheck.limits.concurrent} concurrent`);

          // Get API keys
          const apiKey = process.env.RUNPOD_API_KEY;
          const hfToken = process.env.HUGGINGFACE_TOKEN;
          
          if (!apiKey || !hfToken) {
            throw new Error('Missing API keys (RUNPOD_API_KEY or HUGGINGFACE_TOKEN)');
          }

          // Import RunPod service
          const { runpodFallbackService } = await import('@/services/runpodFallbackService');
          
          // Build API params
          const apiParams: any = {
            audio_url: jobData.audio_file_url,
            audio_format: 'mp3',
            include_timestamps: true,
            use_diarization: jobData.metadata?.use_diarization || false,
            num_speakers: null,
            speaker_threshold: 0.35,
            single_speaker_mode: false,
            filename: jobData.name
          };

          if (jobData.metadata?.use_diarization) {
            apiParams.pyannote_version = '3.1';
            apiParams.hf_token = hfToken;
          }

          console.log(`🚀 Submitting to RunPod...`);
          
          // Submit to RunPod
          const webhookUrl = process.env.NEXT_PUBLIC_APP_URL;
          const result = await runpodFallbackService.transcribeWithFallback(
            apiParams,
            `${webhookUrl}/api/webhooks/runpod`
          );

          if (result.success && result.jobId) {
            console.log(`✅ RunPod submission successful, jobId: ${result.jobId}`);
            
            // Update record to processing
            const now = Timestamp.now();
            await databaseService.updateSTTRecord(recordId, {
              status: 'processing',
              startedAt: now,
              metadata: {
                ...jobData.metadata,
                runpod_job_id: result.jobId,
                processing_method: 'queued_then_processed',
                queue_processed_at: now
              }
            }, userId);

            // Add to activeJobs
            await activeJobsService.addActiveJob(
              userId,
              recordId,
              {
                status: 'processing',
                priority: jobData.priority,
                runpodJobId: result.jobId,
                filename: jobData.name
              },
              'stt'
            );

            processed++;
            console.log(`✅ Queued job ${recordId} submitted to RunPod: ${result.jobId}`);
          } else {
            throw new Error(`Failed to submit to RunPod: ${result.error || 'Unknown error'}`);
          }
        } else {
          // Still over limit, leave in queue
          stillQueued++;
          console.log(`⏳ User ${userId} still over limit, job ${recordId} remains queued`);
          console.log(`   Reason: ${rateLimitCheck.reason}`);
          console.log(`   Current: ${rateLimitCheck.current.concurrent}/${rateLimitCheck.limits.concurrent} concurrent`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to process queued job ${recordId}:`, errorMsg);
        errors.push(`Job ${recordId}: ${errorMsg}`);
        failed++;
      }
    }

    console.log('\n📊 ===== QUEUE PROCESSOR SUMMARY =====');
    console.log(`   Total found: ${queuedJobsSnapshot.size}`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⏳ Still queued: ${stillQueued}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log('=====================================\n');

    return NextResponse.json({
      success: true,
      results: {
        found: queuedJobsSnapshot.size,
        processed,
        stillQueued,
        failed,
        errors: errors.length > 0 ? errors : undefined
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Queue processor error:', error);
    return NextResponse.json(
      { 
        error: 'Queue processing failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
