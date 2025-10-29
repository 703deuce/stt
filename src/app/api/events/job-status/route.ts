import { NextRequest } from 'next/server';
import { createClient } from 'redis';

// Server-Sent Events endpoint for job status updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const jobId = searchParams.get('jobId');
  const type = searchParams.get('type') as 'transcription' | 'content' | null;

  if (!userId) {
    return new Response('Missing userId parameter', { status: 400 });
  }

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        message: 'Connected to job status stream',
        timestamp: new Date().toISOString()
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      // Setup Redis subscription (optional)
      let redis: any = null;
      let isConnected = false;

      const connectRedis = async () => {
        try {
          redis = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
          });
          
          await redis.connect();
          isConnected = true;
          console.log(`📡 SSE: Connected to Redis for user ${userId}`);

          // Subscribe to user-specific updates
          await redis.subscribe(`user-${userId}-jobs`, (message: string) => {
            try {
              const update = JSON.parse(message);
              
              // Filter by jobId if specified
              if (jobId && update.jobId !== jobId) return;
              
              // Filter by type if specified
              if (type && update.type !== type) return;

              const data = JSON.stringify({
                type: 'job-update',
                ...update,
                timestamp: new Date().toISOString()
              });
              
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } catch (error) {
              console.error('❌ SSE: Failed to parse job update:', error);
            }
          });

              // Note: Heartbeat removed to prevent controller errors

          // Cleanup on close
          request.signal.addEventListener('abort', async () => {
            // Heartbeat removed
            if (isConnected) {
              await redis.disconnect();
              isConnected = false;
            }
            controller.close();
          });

        } catch (error) {
          console.log('⚠️ SSE: Redis not available, using fallback mode');
              // Note: Heartbeat removed to prevent controller errors

          // Cleanup on close
          request.signal.addEventListener('abort', async () => {
            if (redis && isConnected) {
              await redis.disconnect();
            }
            controller.close();
          });
        }
      };

      connectRedis();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}
