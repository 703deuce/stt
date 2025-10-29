import { NextRequest, NextResponse } from 'next/server';
import { deepseekJobMappingService } from '@/services/deepseekJobMappingService';
import { deepseekBackgroundProcessingService } from '@/services/deepseekBackgroundProcessingService';
import { getWebSocketManager } from '@/lib/websocket';
import { sseManager } from '@/lib/sseManager';

/**
 * DeepSeek Job Status Check API
 * This endpoint checks the status of DeepSeek jobs and updates the database
 * It's designed to be called periodically or when users return to check their jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    console.log(`🔍 Checking DeepSeek job status: ${jobId}`);

    // Get job from database
    const jobMapping = await deepseekJobMappingService.getJobMapping(jobId);
    if (!jobMapping) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if user has permission to view this job
    if (userId && jobMapping.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get current job status from memory (if available)
    const currentJob = deepseekBackgroundProcessingService.getJob(jobId);
    
    // Return job status
    const response = {
      jobId: jobMapping.id,
      userId: jobMapping.userId,
      jobType: jobMapping.jobType,
      status: jobMapping.status,
      progress: currentJob?.progress || (jobMapping.status === 'completed' ? 100 : 0),
      result: jobMapping.result,
      error: jobMapping.error,
      createdAt: jobMapping.createdAt,
      updatedAt: jobMapping.updatedAt,
      metadata: {
        wordCount: jobMapping.wordCount,
        processingTime: jobMapping.processingTime,
        fileName: jobMapping.fileName
      }
    };

    console.log(`✅ DeepSeek job status retrieved: ${jobId} - ${jobMapping.status}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error checking DeepSeek job status:', error);
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    );
  }
}

/**
 * DeepSeek Job Completion Webhook
 * This endpoint simulates a webhook for job completion
 * In a real implementation, this would be called by DeepSeek when jobs complete
 * For now, it's used internally by the background processing service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, status, result, error, metadata } = body;

    if (!jobId || !status) {
      return NextResponse.json({ error: 'Job ID and status are required' }, { status: 400 });
    }

    console.log(`📨 DeepSeek job completion webhook received: ${jobId} - ${status}`);

    // Update job status in database
    await deepseekJobMappingService.updateJobStatus(
      jobId,
      status as 'pending' | 'processing' | 'completed' | 'failed',
      result,
      error,
      metadata
    );

    // Get job mapping for user notification
    const jobMapping = await deepseekJobMappingService.getJobMapping(jobId);
    if (jobMapping) {
      // Send SSE update to the user
      const jobUpdate = {
        userId: jobMapping.userId,
        jobId,
        type: 'content',
        status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'processing',
        progress: status === 'completed' ? 100 : 0,
        data: {
          result,
          error,
          jobType: jobMapping.jobType
        }
      };
      
      console.log(`📡 Sending SSE update to user: ${jobMapping.userId}`);
      sseManager.sendUpdate(jobMapping.userId, jobUpdate);
    }

    console.log(`✅ DeepSeek job completion processed: ${jobId}`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Error processing DeepSeek job completion:', error);
    return NextResponse.json(
      { error: 'Failed to process job completion' },
      { status: 500 }
    );
  }
}

/**
 * Resume Interrupted Jobs
 * This endpoint can be called to resume any interrupted DeepSeek jobs
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 Resuming interrupted DeepSeek jobs...');
    
    await deepseekBackgroundProcessingService.resumeInterruptedJobs();
    
    console.log('✅ DeepSeek job resumption completed');
    return NextResponse.json({ success: true, message: 'Jobs resumed successfully' });

  } catch (error) {
    console.error('❌ Error resuming DeepSeek jobs:', error);
    return NextResponse.json(
      { error: 'Failed to resume jobs' },
      { status: 500 }
    );
  }
}
