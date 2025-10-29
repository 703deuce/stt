import { useState, useEffect, useCallback } from 'react';
import { backgroundProcessingService, ProcessingJob } from '../services/backgroundProcessingService';
import { useAuth } from '../context/AuthContext';

export function useBackgroundProcessing() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user jobs on mount
  useEffect(() => {
    if (!user) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    const userJobs = backgroundProcessingService.getUserJobs(user.uid);
    setJobs(userJobs);
    setIsLoading(false);

    // Subscribe to job updates
    const unsubscribe = backgroundProcessingService.subscribeToUserJobs(user.uid, (updatedJobs) => {
      setJobs(updatedJobs);
    });

    return unsubscribe;
  }, [user]);

  // Start a new background job
  const startJob = useCallback(async (
    audioFile: File,
    fileName: string,
    settings: any = {},
    onProgress?: (progress: number, status: string) => void
  ): Promise<string> => {
    console.log('🚀 useBackgroundProcessing.startJob called with:', {
      fileName,
      fileSize: audioFile.size,
      settings,
      userId: user?.uid
    });
    
    if (!user) throw new Error('User not authenticated');

    try {
      const jobId = await backgroundProcessingService.startJob(
        user.uid,
        `file_${Date.now()}`,
        fileName,
        audioFile,
        settings,
        onProgress
      );
      
      console.log('✅ Background job started successfully with ID:', jobId);
      return jobId;
    } catch (error) {
      console.error('❌ Failed to start background job:', error);
      throw error;
    }
  }, [user]);

  // Get job by ID
  const getJob = useCallback((jobId: string): ProcessingJob | undefined => {
    return backgroundProcessingService.getJob(jobId);
  }, []);

  // Get jobs by status
  const getJobsByStatus = useCallback((status: ProcessingJob['status']): ProcessingJob[] => {
    return jobs.filter(job => job.status === status);
  }, [jobs]);

  // Get active jobs (uploading or processing)
  const getActiveJobs = useCallback((): ProcessingJob[] => {
    return jobs.filter(job => job.status === 'uploading' || job.status === 'processing');
  }, [jobs]);

  // Get completed jobs
  const getCompletedJobs = useCallback((): ProcessingJob[] => {
    return jobs.filter(job => job.status === 'completed');
  }, [jobs]);

  // Get failed jobs
  const getFailedJobs = useCallback((): ProcessingJob[] => {
    return jobs.filter(job => job.status === 'failed');
  }, [jobs]);

  return {
    jobs,
    isLoading,
    startJob,
    getJob,
    getJobsByStatus,
    getActiveJobs,
    getCompletedJobs,
    getFailedJobs
  };
}

export default useBackgroundProcessing;
