import { NextRequest, NextResponse } from 'next/server';
import { getWebSocketManager } from '@/lib/websocket';

export async function POST(request: NextRequest) {
  try {
    const { userId, jobId, status } = await request.json();
    
    console.log('🧪 Test webhook triggered:', { userId, jobId, status });
    
    // Get WebSocket manager
    const wsManager = getWebSocketManager();
    
    if (wsManager) {
      await wsManager.emitJobUpdate({
        userId: userId || 'test-user',
        jobId: jobId || 'test-job-123',
        type: 'transcription',
        status: status || 'completed',
        progress: 100,
        data: {
          transcript: 'This is a test transcript from the webhook system!',
          duration: 120,
          wordCount: 10
        }
      });
      
      console.log('📤 Test webhook update sent');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook sent successfully' 
    });
    
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test webhook' 
    }, { status: 500 });
  }
}
