import { NextRequest, NextResponse } from 'next/server';
import { deepseekBackgroundProcessingService } from '@/services/deepseekBackgroundProcessingService';

/**
 * Start DeepSeek Summary Job
 * Creates a background job for AI summary generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      transcriptionId, 
      transcriptionText, 
      summaryType = 'brief',
      maxLength = 200
    } = body;

    // Validate required fields
    if (!userId || !transcriptionText) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, transcriptionText' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting DeepSeek summary job:', {
      userId,
      transcriptionId,
      summaryType,
      maxLength,
      transcriptionLength: transcriptionText.length,
      transcriptionPreview: transcriptionText.substring(0, 200) + '...'
    });

    // Create prompt based on summary type
    let prompt = '';
    switch (summaryType) {
      case 'brief':
        prompt = `Please provide a brief summary of this transcription in approximately ${maxLength} words. Focus on the main topic and key points.`;
        break;
      case 'detailed':
        prompt = `Please provide a detailed summary of this transcription in approximately ${maxLength} words. Include main topics, key arguments, and important details.`;
        break;
      case 'key_points':
        prompt = `Please extract the key points from this transcription. Present them as a bulleted list with brief explanations.`;
        break;
      case 'action_items':
        prompt = `Please identify any action items, tasks, or next steps mentioned in this transcription. Present them as a clear, actionable list.`;
        break;
      default:
        prompt = `Please provide a summary of this transcription in approximately ${maxLength} words.`;
    }

    // Start background job
    const jobId = await deepseekBackgroundProcessingService.startJob({
      userId,
      jobType: 'summary',
      transcriptionId,
      transcriptionText,
      prompt,
      summaryType: summaryType // Store summary type for database save
    });

    console.log('✅ DeepSeek summary job started:', jobId);
    
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Summary job started successfully'
    });

  } catch (error) {
    console.error('❌ Error starting DeepSeek summary job:', error);
    return NextResponse.json(
      { error: 'Failed to start summary job' },
      { status: 500 }
    );
  }
}
