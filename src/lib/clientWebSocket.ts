'use client';

import { useEffect, useRef, useState } from 'react';

export interface JobUpdate {
  userId: string;
  jobId: string;
  type: 'transcription' | 'content';
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  data?: any;
}

class ClientWebSocketManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: JobUpdate) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    console.log('🔌 Client WebSocket manager initialized');
  }

  /**
   * Connect to Server-Sent Events for job updates
   */
  connect(userId: string) {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      // Use Server-Sent Events as WebSocket alternative
      const url = `/api/sse/job-updates?userId=${userId}`;
      console.log(`🔌 Connecting to SSE endpoint: ${url}`);
      this.eventSource = new EventSource(url);
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connection opened for user:', userId);
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data: JobUpdate = JSON.parse(event.data);
          console.log('📨 Received job update:', data);
          this.notifyListeners(data);
        } catch (error) {
          console.error('❌ Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        // Only reconnect if the connection was actually closed
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.handleReconnect(userId);
        }
      };

    } catch (error) {
      console.error('❌ Failed to create SSE connection:', error);
    }
  }

  /**
   * Disconnect from SSE
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('🔌 SSE connection closed');
    }
  }

  /**
   * Subscribe to job updates
   */
  subscribe(eventType: string, callback: (data: JobUpdate) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    console.log(`📡 Subscribed to ${eventType} events`);
  }

  /**
   * Unsubscribe from job updates
   */
  unsubscribe(eventType: string, callback: (data: JobUpdate) => void) {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventType);
      }
      console.log(`📡 Unsubscribed from ${eventType} events`);
    }
  }

  /**
   * Notify all listeners of an event
   */
  private notifyListeners(data: JobUpdate) {
    const listeners = this.listeners.get('job_update') || new Set();
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error in event listener:', error);
      }
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(userId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(userId);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Singleton instance
let clientWsManager: ClientWebSocketManager | null = null;

export function getClientWebSocketManager(): ClientWebSocketManager {
  if (!clientWsManager) {
    clientWsManager = new ClientWebSocketManager();
  }
  return clientWsManager;
}

/**
 * React hook for WebSocket job updates
 */
export function useJobUpdates(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const wsManager = useRef<ClientWebSocketManager | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Only reconnect if userId actually changed
    if (userIdRef.current !== userId) {
      userIdRef.current = userId;
      
      wsManager.current = getClientWebSocketManager();
      wsManager.current.connect(userId);
      console.log('🔌 SSE connection established for user:', userId);
    }

    const checkConnection = () => {
      const connected = wsManager.current?.isConnected() || false;
      setIsConnected(connected);
    };

    // Check connection status periodically
    const statusInterval = setInterval(checkConnection, 2000);

    return () => {
      clearInterval(statusInterval);
      // Don't disconnect on every effect cleanup - only on unmount
      // This prevents disconnection during Fast Refresh
    };
  }, [userId]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (wsManager.current) {
        wsManager.current.disconnect();
        console.log('🔌 SSE connection cleaned up on unmount');
      }
    };
  }, []);

  return {
    isConnected,
    subscribe: (callback: (data: JobUpdate) => void) => {
      if (wsManager.current) {
        wsManager.current.subscribe('job_update', callback);
        return () => wsManager.current?.unsubscribe('job_update', callback);
      }
      return () => {};
    }
  };
}
