import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sseManager';

/**
 * Server-Sent Events endpoint for job updates
 * This provides real-time updates to clients about job status changes
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID is required', { status: 400 });
  }

  console.log(`📡 Starting SSE connection for user: ${userId}`);
  console.log(`📡 Current stats:`, sseManager.getStats());

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        message: 'Connected to job updates',
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);

      // Store this controller for the user using sseManager
      sseManager.addConnection(userId, controller);

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        const heartbeatData = JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
        controller.enqueue(`data: ${heartbeatData}\n\n`);
      }, 30000); // Send heartbeat every 30 seconds

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        sseManager.removeConnection(userId, controller);
        console.log(`🔌 SSE connection closed for user: ${userId}`);
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
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

/**
 * Send job update to specific user's SSE connections
 */
export function sendJobUpdate(userId: string, jobUpdate: any) {
  console.log(`📡 sendJobUpdate called for user: ${userId}`, jobUpdate);
  console.log(`📡 Total connections in map:`, sseConnections.size);
  console.log(`📡 All user IDs in map:`, Array.from(sseConnections.keys()));
  const userConnections = sseConnections.get(userId);
  console.log(`📡 User connections found:`, userConnections?.length || 0);
  
  if (!userConnections || userConnections.length === 0) {
    console.log(`📡 No SSE connections found for user: ${userId}`);
    console.log(`📡 SSE connections Map contents:`, Object.fromEntries(sseConnections));
    return;
  }

  const data = JSON.stringify(jobUpdate);
  const message = `data: ${data}\n\n`;

  // Send to all connections for this user
  userConnections.forEach((controller, index) => {
    try {
      controller.enqueue(message);
      console.log(`📡 Job update sent to user ${userId} (connection ${index + 1})`);
    } catch (error) {
      console.error(`❌ Failed to send to connection ${index + 1} for user ${userId}:`, error);
      // Remove failed connection
      userConnections.splice(index, 1);
    }
  });

  // Clean up empty connection arrays
  if (userConnections.length === 0) {
    sseConnections.delete(userId);
  }
}
