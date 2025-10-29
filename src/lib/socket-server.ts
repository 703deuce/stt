import { Server as HTTPServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { initializeWebSocket } from './websocket';

// Global variable to store the WebSocket server
let wsServer: HTTPServer | null = null;

export function setupWebSocketServer(req: NextApiRequest, res: NextApiResponse) {
  if (!wsServer) {
    // Create HTTP server
    wsServer = new HTTPServer();
    
    // Initialize WebSocket manager
    const wsManager = initializeWebSocket();
    
    console.log('🔌 WebSocket server initialized');
  }
  
  return wsServer;
}

export function getWebSocketServer(): HTTPServer | null {
  return wsServer;
}
