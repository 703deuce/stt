import { NextRequest, NextResponse } from 'next/server';
import { contentRepurposeService } from '@/services/contentRepurposeService';
import { rateLimitService } from '@/services/rateLimitService';
import { jobPriorityService } from '@/services/jobPriorityService';
import { activeJobsService } from '@/services/activeJobsService';
import { serverTimestamp, Timestamp } from 'firebase/firestore';

interface ContentRepurposeRequest {
  transcription_id?: string;
  content: string;
  content_type: 'blog' | 'social_media' | 'video_script' | 'email';
  target_platforms?: string[];
  model?: 'deepseek-chat' | 'deepseek-reasoning';
  userId: string;
  custom_instructions?: string;
}

/**
 * API endpoint for Content Repurpose generation with scalable job tracking
 * Uses same patterns as STT: rate limiting, priority queue, activeJobs tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body: ContentRepurposeRequest = await request.json();
    
    // Validate request
    if (!body.content || !body.userId || !body.content_type) {
      return NextResponse.json(
        { error: 'Content, userId, and content_type are required' },
        { status: 400 }
      );
    }

    if (!['blog', 'social_media', 'video_script', 'email'].includes(body.content_type)) {
      return NextResponse.json(
        { error: 'content_type must be blog, social_media, video_script, or email' },
        { status: 400 }
      );
    }

    // Check rate limits
    const rateLimitResult = await rateLimitService.canUserSubmitJob(body.userId, 'content-repurpose');
    
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
    const jobId = await contentRepurposeService.createContentRepurposeRecord({
      transcription_id: body.transcription_id,
      original_content: body.content,
      content_type: body.content_type,
      target_platforms: body.target_platforms || [],
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
      'content-repurpose'
    );

    // Build prompts for each target platform
    const targetPlatforms = body.target_platforms || ['all'];
    const repurposedContent: Record<string, string> = {};

    try {
      const deepseekEndpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
      const deepseekKey = process.env.DEEPSEEK_API_KEY;
      
      if (!deepseekKey) {
        throw new Error('DeepSeek API key not configured');
      }

      // Generate content for each platform
      for (const platform of targetPlatforms) {
        const platformInstructions: Record<string, string> = {
          linkedin: 'Create a professional LinkedIn post with engaging hook and clear value proposition.',
          twitter: 'Create a concise Twitter/X thread (280 chars per tweet, 3-5 tweets).',
          instagram: 'Create an Instagram caption with engaging opening and relevant hashtags.',
          facebook: 'Create a Facebook post with engaging narrative and call-to-action.',
          blog: 'Create a blog post with introduction, body paragraphs, and conclusion.',
          all: `Repurpose this content for ${body.content_type} format.`
        };

        const platformPrompt = platformInstructions[platform] || platformInstructions['all'];
        
        const messages = [
          {
            role: 'system',
            content: 'You are an expert content creator who repurposes content for different platforms while maintaining the core message.'
          },
          {
            role: 'user',
            content: `${platformPrompt}\n${body.custom_instructions ? `Additional instructions: ${body.custom_instructions}\n` : ''}\nOriginal content:\n\n${body.content}`
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
            max_tokens: body.content_type === 'social_media' ? 500 : 2000,
            temperature: 0.8
          })
        });

        if (!deepseekResponse.ok) {
          throw new Error(`DeepSeek API error for ${platform}: ${deepseekResponse.status}`);
        }

        const deepseekData = await deepseekResponse.json();
        repurposedContent[platform] = deepseekData.choices?.[0]?.message?.content || '';
      }

      // Calculate total tokens used
      let totalTokens = 0;
      // Note: DeepSeek doesn't return usage per-platform in this flow
      // In production, you'd track this separately or aggregate

      // Update job record with results
      await contentRepurposeService.updateContentRepurposeRecord(jobId, {
        status: 'completed',
        repurposed_content: repurposedContent,
        deepseek_request_id: `deepseek-${Date.now()}`,
        total_tokens: totalTokens,
        completed_at: serverTimestamp() as Timestamp
      }, body.userId);

      // Remove from activeJobs
      await activeJobsService.removeActiveJob(body.userId, jobId, 'content-repurpose');

      return NextResponse.json({
        success: true,
        jobId: jobId,
        repurposed_content: repurposedContent
      });

    } catch (error) {
      console.error('❌ Error generating repurposed content:', error);
      
      // Update job record with error
      await contentRepurposeService.updateContentRepurposeRecord(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, body.userId);

      // Remove from activeJobs
      await activeJobsService.removeActiveJob(body.userId, jobId, 'content-repurpose');

      return NextResponse.json(
        { 
          error: 'Failed to generate repurposed content',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Content Repurpose API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get content repurpose job status
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

    const record = await contentRepurposeService.getContentRepurposeRecordById(jobId, userId);

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
        repurposed_content: record.repurposed_content,
        content_type: record.content_type,
        created_at: record.created_at,
        completed_at: record.completed_at,
        processing_time: record.processing_time,
        tokens_used: record.total_tokens
      }
    });

  } catch (error) {
    console.error('❌ Error getting content repurpose job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

