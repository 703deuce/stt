import { NextRequest, NextResponse } from 'next/server';
import { aiSummaryService } from '@/services/aiSummaryService';
import { rateLimitService } from '@/services/rateLimitService';
import { jobPriorityService } from '@/services/jobPriorityService';
import { activeJobsService } from '@/services/activeJobsService';
import { db, auth } from '@/config/firebase';
import { doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

interface AISummaryRequest {
  transcription_id?: string;
  content: string;
  summary_length: 'short' | 'medium' | 'long';
  model?: 'deepseek-chat' | 'deepseek-reasoning';
  userId: string;
}

/**
 * API endpoint for AI Summary generation with scalable job tracking
 * Uses same patterns as STT: rate limiting, priority queue, activeJobs tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body: AISummaryRequest = await request.json();
    
    // Validate request
    if (!body.content || !body.userId) {
      return NextResponse.json(
        { error: 'Content and userId are required' },
        { status: 400 }
      );
    }

    if (!['short', 'medium', 'long'].includes(body.summary_length)) {
      return NextResponse.json(
        { error: 'summary_length must be short, medium, or long' },
        { status: 400 }
      );
    }

    // Check rate limits
    const rateLimitResult = await rateLimitService.canUserSubmitJob(body.userId, 'ai-summary');
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitResult.reason || 'Rate limit exceeded',
          limits: rateLimitResult.limits,
          current: rateLimitResult.current
        },
        { status: 429 }
      );
    }

    // Get user priority
    const priority = await jobPriorityService.getUserPriority(body.userId);

    // Create job record immediately
    const jobId = await aiSummaryService.createAISummaryRecord({
      transcription_id: body.transcription_id,
      original_content: body.content,
      summary_length: body.summary_length,
      deepseek_model: body.model || 'deepseek-chat',
      priority: priority as 1 | 2 | 3
    });

    // Add to activeJobs for efficient cleanup
    await activeJobsService.addActiveJob(
      body.userId,
      jobId,
      {
        status: 'processing',
        started_at: serverTimestamp() as Timestamp,
        priority: priority,
        retry_count: 0,
        max_retries: 3
      },
      'ai-summary'
    );

    // Call DeepSeek API
    try {
      const deepseekEndpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      
      if (!deepseekKey) {
        throw new Error('DeepSeek API key not configured');
      }

      // Build prompt based on summary length
      const lengthInstructions = {
        short: 'Create a brief summary in 2-3 sentences.',
        medium: 'Create a concise summary in 4-6 sentences.',
        long: 'Create a detailed summary covering all key points.'
      };

      const messages = [
        {
          role: 'system',
          content: 'You are an expert at summarizing content. Provide clear, concise summaries.'
        },
        {
          role: 'user',
          content: `${lengthInstructions[body.summary_length]}\n\nContent to summarize:\n\n${body.content}`
        }
      ];

      const deepseekResponse = await fetch(deepseekEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepseekKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: body.model || 'deepseek-chat',
          messages: messages,
          max_tokens: body.summary_length === 'short' ? 200 : body.summary_length === 'medium' ? 500 : 1000,
          temperature: 0.7
        })
      });

      if (!deepseekResponse.ok) {
        const errorText = await deepseekResponse.text();
        throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
      }

      const deepseekData = await deepseekResponse.json();
      const summary = deepseekData.choices?.[0]?.message?.content || '';
      const usage = deepseekData.usage || {};

      // Update job record with results
      await aiSummaryService.updateAISummaryRecord(jobId, {
        status: 'completed',
        summary: summary,
        deepseek_request_id: deepseekData.id || `deepseek-${Date.now()}`,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        completed_at: serverTimestamp() as Timestamp
      }, body.userId);

      // Remove from activeJobs
      await activeJobsService.removeActiveJob(body.userId, jobId, 'ai-summary');

      return NextResponse.json({
        success: true,
        jobId: jobId,
        summary: summary,
        tokens: {
          prompt: usage.prompt_tokens,
          completion: usage.completion_tokens,
          total: usage.total_tokens
        }
      });

    } catch (error) {
      console.error('❌ Error generating AI summary:', error);
      
      // Update job record with error
      await aiSummaryService.updateAISummaryRecord(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, body.userId);

      // Remove from activeJobs
      await activeJobsService.removeActiveJob(body.userId, jobId, 'ai-summary');

      return NextResponse.json(
        { 
          error: 'Failed to generate summary',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ AI Summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get AI summary job status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const userId = searchParams.get('userId');

    if (!jobId || !userId) {
      return NextResponse.json(
        { error: 'jobId and userId are required' },
        { status: 400 }
      );
    }

    const record = await aiSummaryService.getAISummaryRecordById(jobId, userId);

    if (!record) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: record.id,
        status: record.status,
        summary: record.summary,
        created_at: record.created_at,
        completed_at: record.completed_at,
        processing_time: record.processing_time,
        tokens: {
          prompt: record.prompt_tokens,
          completion: record.completion_tokens,
          total: record.total_tokens
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting AI summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

