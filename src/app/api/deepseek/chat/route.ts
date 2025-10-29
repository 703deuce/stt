import { NextRequest, NextResponse } from 'next/server';
import { deepseekBackgroundProcessingService } from '@/services/deepseekBackgroundProcessingService';

/**
 * Start DeepSeek Chat Job
 * Creates a background job for AI chat functionality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      transcriptionId, 
      transcriptionText, 
      prompt,
      customInstructions 
    } = body;

    // Validate required fields
    if (!userId || !transcriptionText || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, transcriptionText, prompt' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting DeepSeek chat job:', {
      userId,
      transcriptionId,
      promptLength: prompt.length,
      transcriptionLength: transcriptionText.length
    });

    // Start background job
    const jobId = await deepseekBackgroundProcessingService.startJob({
      userId,
      jobType: 'chat',
      transcriptionId,
      transcriptionText,
      prompt,
      customInstructions
    });

    console.log('✅ DeepSeek chat job started:', jobId);
    
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Chat job started successfully'
    });

  } catch (error) {
    console.error('❌ Error starting DeepSeek chat job:', error);
    return NextResponse.json(
      { error: 'Failed to start chat job' },
      { status: 500 }
    );
  }
}
