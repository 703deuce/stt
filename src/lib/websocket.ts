// Server-side only WebSocket manager using SSE fallback
// This file should only be imported on the server side

export interface JobUpdate {
  userId: string;
  jobId: string;
  type: 'transcription' | 'content';
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  data?: any;
}

class WebSocketManager {
  private isConnected = false;

  constructor() {
    // Initialize without Socket.IO to avoid client-side issues
    console.log('🔌 WebSocket manager initialized (SSE mode)');
  }

  // Method to emit job updates (called by background services)
  public async emitJobUpdate(update: JobUpdate) {
    console.log(`📤 Job update: ${update.jobId} - ${update.status} for user ${update.userId}`);
    
    // For now, just log the update
    // In production, this would trigger SSE or WebSocket updates
    console.log('📡 Update details:', {
      userId: update.userId,
      jobId: update.jobId,
      type: update.type,
      status: update.status,
      progress: update.progress,
      data: update.data
    });
  }

  // Get connected clients count (placeholder)
  public getConnectedClients() {
    return 0;
  }

  // Get rooms info (placeholder)
  public getRooms() {
    return [];
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function initializeWebSocket(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return wsManager;
}