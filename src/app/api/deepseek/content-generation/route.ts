import { NextRequest, NextResponse } from 'next/server';
import { deepseekBackgroundProcessingService } from '@/services/deepseekBackgroundProcessingService';

/**
 * Start DeepSeek Content Generation Job
 * Creates a background job for AI content repurposing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      transcriptionId, 
      transcriptionText, 
      contentTypeId,
      contentTypeName,
      contentCategory,
      prompt,
      customInstructions,
      maxWords
    } = body;

    // Validate required fields
    if (!userId || !transcriptionText || !prompt || !contentTypeId || !contentTypeName) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, transcriptionText, prompt, contentTypeId, contentTypeName' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting DeepSeek content generation job:', {
      userId,
      transcriptionId,
      contentTypeId,
      contentTypeName,
      contentCategory,
      maxWords,
      promptLength: prompt.length,
      transcriptionLength: transcriptionText.length
    });

    // Start background job
    const jobId = await deepseekBackgroundProcessingService.startJob({
      userId,
      jobType: 'content_generation',
      transcriptionId,
      transcriptionText,
      prompt,
      customInstructions,
      contentTypeId,
      contentTypeName,
      contentCategory,
      maxWords
    });

    console.log('✅ DeepSeek content generation job started:', jobId);
    
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Content generation job started successfully'
    });

  } catch (error) {
    console.error('❌ Error starting DeepSeek content generation job:', error);
    return NextResponse.json(
      { error: 'Failed to start content generation job' },
      { status: 500 }
    );
  }
}
