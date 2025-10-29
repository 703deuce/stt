import { useEffect, useRef, useState } from 'react';

interface JobUpdate {
  jobId: string;
  type: 'transcription' | 'content';
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  data?: any;
  timestamp: string;
}

interface UseRealtimeUpdatesOptions {
  userId: string;
  onJobUpdate?: (update: JobUpdate) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useRealtimeUpdates({
  userId,
  onJobUpdate,
  onConnectionChange
}: UseRealtimeUpdatesOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Use Server-Sent Events for real-time updates
    const connectSSE = () => {
      try {
        const eventSource = new EventSource(
          `/api/events/job-status?userId=${userId}`
        );

        eventSource.onopen = () => {
          console.log('📡 SSE connected for user:', userId);
          setIsConnected(true);
          setConnectionError(null);
          onConnectionChange?.(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'job-update') {
              console.log('📥 Received job update via SSE:', data);
              onJobUpdate?.(data);
            } else if (data.type === 'heartbeat') {
              // Keep connection alive
              console.log('💓 SSE heartbeat received');
            }
          } catch (error) {
            console.error('❌ Failed to parse SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('❌ SSE connection error:', error);
          setConnectionError('Failed to connect to real-time updates');
          setIsConnected(false);
          onConnectionChange?.(false);
        };

        eventSourceRef.current = eventSource;
      } catch (error) {
        console.error('❌ SSE setup failed:', error);
        setConnectionError('Failed to establish real-time connection');
        setIsConnected(false);
        onConnectionChange?.(false);
      }
    };

    // Start SSE connection
    connectSSE();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [userId, onJobUpdate, onConnectionChange]);

  // Manual job update trigger (for testing)
  const triggerJobUpdate = (update: JobUpdate) => {
    onJobUpdate?.(update);
  };

  return {
    isConnected,
    connectionError,
    triggerJobUpdate
  };
}