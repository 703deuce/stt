import { NextRequest, NextResponse } from 'next/server';
import { jobCleanupService } from '@/services/jobCleanupService';

/**
 * API route for cron job to clean up stalled transcription jobs
 * 
 * Setup:
 * - Add to Vercel Cron Jobs or use external cron service
 * - Recommended schedule: Every 5-10 minutes
 * - Example cron expression: every 5 minutes
 * 
 * Security:
 * - Add a secret token in env: CRON_SECRET
 * - Verify in request headers or query params
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Also check query parameter as fallback
      const querySecret = request.nextUrl.searchParams.get('secret');
      if (querySecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('⏰ Cron job triggered: Cleaning up stalled jobs...');
    
    const results = await jobCleanupService.cleanupStalledJobs();

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results: {
        cleaned: results.cleaned,
        retried: results.retried,
        failed: results.failed,
        movedToDeadLetter: results.movedToDeadLetter,
        errors: results.errors.length > 0 ? results.errors : undefined
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('❌ Error in cleanup cron job:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for external cron services
export async function POST(request: NextRequest) {
  return GET(request);
}

