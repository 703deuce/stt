'use client';

import { useEffect, useState } from 'react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';

interface JobStatus {
  jobId: string;
  type: 'transcription' | 'content';
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  data?: any;
  timestamp: string;
}

interface RealtimeJobStatusProps {
  onJobComplete?: (job: JobStatus) => void;
  onJobFailed?: (job: JobStatus) => void;
}

export default function RealtimeJobStatus({ 
  onJobComplete, 
  onJobFailed 
}: RealtimeJobStatusProps) {
  const { user } = useAuth();
  const [recentJobs, setRecentJobs] = useState<JobStatus[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const handleJobUpdate = (update: JobStatus) => {
    console.log('📥 Received job update:', update);
    
    setRecentJobs(prev => {
      const existing = prev.find(job => job.jobId === update.jobId);
      if (existing) {
        // Update existing job
        return prev.map(job => 
          job.jobId === update.jobId ? { ...job, ...update } : job
        );
      } else {
        // Add new job
        return [update, ...prev].slice(0, 10); // Keep last 10 jobs
      }
    });

    // Trigger callbacks
    if (update.status === 'completed') {
      onJobComplete?.(update);
    } else if (update.status === 'failed') {
      onJobFailed?.(update);
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  };

  const { isConnected, connectionError } = useRealtimeUpdates({
    userId: user?.uid || '',
    onJobUpdate: handleJobUpdate,
    onConnectionChange: handleConnectionChange
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span className={isConnected ? 'text-green-700' : 'text-red-700'}>
          {isConnected ? 'Connected to real-time updates' : 'Disconnected'}
        </span>
        {connectionError && (
          <span className="text-red-600 text-xs">({connectionError})</span>
        )}
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentJobs.map((job) => (
              <div
                key={`${job.jobId}-${job.timestamp}`}
                className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {job.type === 'transcription' ? 'Transcription' : 'Content Generation'}
                      </p>
                      <p className="text-xs opacity-75">
                        {new Date(job.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {job.status === 'processing' ? `${job.progress}%` : job.status}
                    </p>
                    {job.status === 'processing' && (
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
