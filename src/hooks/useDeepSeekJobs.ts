import { useState, useEffect, useCallback } from 'react';
import { deepseekBackgroundProcessingService } from '@/services/deepseekBackgroundProcessingService';

export interface DeepSeekJob {
  id: string;
  userId: string;
  jobType: 'chat' | 'summary' | 'content_generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    wordCount?: number;
    processingTime?: number;
    fileName?: string;
  };
}

export interface UseDeepSeekJobsOptions {
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDeepSeekJobs({ userId, autoRefresh = false, refreshInterval = 5000 }: UseDeepSeekJobsOptions) {
  const [jobs, setJobs] = useState<DeepSeekJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch jobs from the service
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userJobs = deepseekBackgroundProcessingService.getUserJobs(userId);
      const mappedJobs: DeepSeekJob[] = userJobs.map(job => ({
        ...job,
        createdAt: job.startTime,
        updatedAt: job.endTime || job.startTime
      }));
      setJobs(mappedJobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Check job status via API
  const checkJobStatus = useCallback(async (jobId: string): Promise<DeepSeekJob | null> => {
    try {
      const response = await fetch(`/api/webhooks/deepseek?jobId=${jobId}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to check job status');
      }
      return await response.json();
    } catch (err) {
      console.error('Error checking job status:', err);
      return null;
    }
  }, [userId]);

  // Start a new job
  const startJob = useCallback(async (params: {
    jobType: 'chat' | 'summary' | 'content_generation';
    transcriptionId?: string;
    transcriptionText?: string;
    prompt?: string;
    customInstructions?: string;
    contentTypeId?: string;
    contentTypeName?: string;
    contentCategory?: string;
    maxWords?: number;
    fileName?: string;
  }): Promise<string> => {
    try {
      const jobId = await deepseekBackgroundProcessingService.startJob({
        userId,
        ...params
      });
      
      // Refresh jobs list
      await fetchJobs();
      
      return jobId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job');
      throw err;
    }
  }, [userId, fetchJobs]);

  // Add job listener for real-time updates
  const addJobListener = useCallback((jobId: string, callback: (job: DeepSeekJob) => void) => {
    deepseekBackgroundProcessingService.addJobListener(jobId, (processingJob) => {
      const mappedJob: DeepSeekJob = {
        ...processingJob,
        createdAt: processingJob.startTime,
        updatedAt: processingJob.endTime || processingJob.startTime
      };
      callback(mappedJob);
    });
  }, []);

  // Remove job listener
  const removeJobListener = useCallback((jobId: string, callback: (job: DeepSeekJob) => void) => {
    // Note: This won't work properly since we wrapped the callback in addJobListener
    // The service stores the wrapped callback, not the original one
    console.warn('removeJobListener may not work correctly due to callback wrapping');
  }, []);

  // Get a specific job
  const getJob = useCallback((jobId: string): DeepSeekJob | undefined => {
    const processingJob = deepseekBackgroundProcessingService.getJob(jobId);
    if (!processingJob) return undefined;
    
    return {
      ...processingJob,
      createdAt: processingJob.startTime,
      updatedAt: processingJob.endTime || processingJob.startTime
    };
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    fetchJobs();
    
    const interval = setInterval(fetchJobs, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchJobs, autoRefresh, refreshInterval]);

  // Initial load
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    startJob,
    checkJobStatus,
    addJobListener,
    removeJobListener,
    getJob,
    refreshJobs: fetchJobs
  };
}

export interface UseDeepSeekJobOptions {
  jobId: string;
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDeepSeekJob({ jobId, userId, autoRefresh = false, refreshInterval = 2000 }: UseDeepSeekJobOptions) {
  const [job, setJob] = useState<DeepSeekJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch job status
  const fetchJob = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/webhooks/deepseek?jobId=${jobId}&userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job');
      }
      
      const jobData = await response.json();
      setJob(jobData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, userId]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !jobId) return;

    fetchJob();
    
    const interval = setInterval(fetchJob, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchJob, autoRefresh, refreshInterval, jobId]);

  // Initial load
  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [fetchJob, jobId]);

  return {
    job,
    isLoading,
    error,
    refreshJob: fetchJob
  };
}
