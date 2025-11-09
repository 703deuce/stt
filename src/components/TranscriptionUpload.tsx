'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { clientTranscriptionService } from '@/services/clientTranscriptionService';
import { audioExtractionService } from '@/services/audioExtractionService';
import { trialService } from '@/services/trialService';
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing';
import TranscriptionResults from './TranscriptionResults';
import UpgradeModal from './UpgradeModal';
import { useProgressNotification } from '@/context/ProgressNotificationContext';
import { auth } from '@/config/firebase';
import { 
  Upload, 
  FileAudio, 
  FileVideo,
  Settings, 
  Play, 
  Download, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Clock,
  Mic,
  X,
  Volume2,
  Users
} from 'lucide-react';

interface TranscriptionUploadProps {
  onTranscriptionComplete?: (result: any) => void;
}

export default function TranscriptionUpload({ onTranscriptionComplete }: TranscriptionUploadProps) {
  const { state, transcribe, reset, setResult } = useTranscription();
  const { startJob, getActiveJobs } = useBackgroundProcessing();
  const { notification, showNotification, updateNotification, hideNotification } = useProgressNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handledCompletionIdsRef = useRef<Set<string>>(new Set());
  
  // State declarations - must be before useEffect hooks that use them
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedAudioFile, setExtractedAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentRunpodJobId, setCurrentRunpodJobId] = useState<string | null>(null); // Track the current RunPod job ID
  const [currentFileName, setCurrentFileName] = useState<string | null>(null); // Track filename as fallback for background jobs
  const [settings, setSettings] = useState({
    use_diarization: true,
    num_speakers: null as number | null,
    include_timestamps: true,
    audio_format: 'wav'
  });

  // Enhanced long transcription state
  const [isLongAudio, setIsLongAudio] = useState(false);
  const [useSmartSplitting, setUseSmartSplitting] = useState(true);
  const [useVoiceEmbeddings, setUseVoiceEmbeddings] = useState(true);
  const [chunks, setChunks] = useState<any[]>([]);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'converting' | 'uploading' | 'diarizing' | 'transcribing' | 'saving' | 'splitting' | 'stitching' | 'complete'>('idle');
  const [chunkProgress, setChunkProgress] = useState(0);
  
  // Trial & upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  // Cleanup audio extraction service on unmount
  useEffect(() => {
    return () => {
      audioExtractionService.cleanup();
    };
  }, []);

  // Global listener: Listen to ALL user transcriptions (catches jobs completed while away)
  useEffect(() => {
    if (!auth.currentUser) return;

    console.log('👂 Setting up global Firestore listener for all user transcriptions...');
    
    let globalUnsubscribe: (() => void) | null = null;
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { collection, onSnapshot, query, orderBy, limit, Timestamp } = firestore;
      // Listen to ALL of the user's transcriptions (recent 20 to catch jobs that completed while away)
      const sttCollection = collection(db, 'users', auth.currentUser!.uid, 'stt');
      
      const queryRef = firestore.query(
        sttCollection,
        orderBy('timestamp', 'desc'),
        limit(20) // Listen to recent 20 transcriptions
      );
      
      globalUnsubscribe = onSnapshot(queryRef, (snapshot) => {
        console.log('📡 [TranscriptionUpload] Global listener snapshot:', {
          size: snapshot.size,
          changes: snapshot.docChanges().length
        });
        
        // Check for any newly completed transcriptions
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const docId = change.doc.id;
          const alreadyHandled = handledCompletionIdsRef.current.has(docId);
          if (alreadyHandled) {
            console.log('⏭️ [TranscriptionUpload] Skipping completion (already handled):', docId);
            return;
          }
          
          // Check if this is a completion we should handle
          const matchesJobId = currentRunpodJobId && data.metadata?.runpod_job_id === currentRunpodJobId;
          const matchesFileName = currentFileName && data.name === currentFileName;
          const isNewCompletion = (change.type === 'modified' || change.type === 'added') && data.status === 'completed';
          const isNewFailure = (change.type === 'modified' || change.type === 'added') && data.status === 'failed';

          const getTimestampMillis = (value: any): number | null => {
            if (!value) return null;
            if (value instanceof Date) return value.getTime();
            if (value instanceof Timestamp) return value.toDate().getTime();
            if (typeof value === 'object' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
              return value.seconds * 1000 + value.nanoseconds / 1_000_000;
            }
            if (typeof value === 'string' || typeof value === 'number') {
              const parsed = new Date(value);
              return isNaN(parsed.getTime()) ? null : parsed.getTime();
            }
            return null;
          };

          const createdTimestamp = getTimestampMillis(data.completedAt) 
            || getTimestampMillis(data.timestamp)
            || getTimestampMillis(data.createdAt);
          const isRecentCompletion = Boolean(createdTimestamp && (Date.now() - createdTimestamp) < 10 * 60 * 1000);

          // Detect webhook-created completions when no tracked job exists
          const isWebhookCompletion = isNewCompletion 
            && change.type === 'added'
            && data.metadata?.processing_method === 'webhook_processing'
            && isRecentCompletion
            && !currentRunpodJobId
            && !currentFileName;

          // Check if we should handle this completion
          // Priority: tracked job > active processing > webhook completion fallback
          const shouldHandleCompletion = isNewCompletion && (
            matchesJobId ||
            matchesFileName ||
            isWebhookCompletion ||
            isRecentCompletion
          );

          if (isNewCompletion && !shouldHandleCompletion) {
            console.log('⏭️ [TranscriptionUpload] Skipping completion (no match):', {
              docId: change.doc.id,
              name: data.name,
              matchesJobId,
              matchesFileName,
              isProcessing,
              isWebhookCompletion,
              isRecentCompletion,
              alreadyHandled: handledCompletionIdsRef.current.has(docId)
            });
          }

          const hasTrackedJob = Boolean(currentRunpodJobId || currentFileName || isProcessing);

          if (shouldHandleCompletion) {
            console.log('✅ [TranscriptionUpload] Transcription completed (global listener):', {
              docId,
              name: data.name,
              runpodJobId: data.metadata?.runpod_job_id,
              matchesJobId,
              matchesFileName,
              isProcessing,
              isWebhookCompletion,
              isRecentCompletion
            });
            handledCompletionIdsRef.current.add(docId);

            updateNotification({ progress: 100, status: 'completed' });

            setTimeout(() => {
              hideNotification();
            }, 5000);

            setIsProcessing(false);
            setUploadProgress(0);

            setCurrentRunpodJobId(null);
            setCurrentFileName(null);

            if ((hasTrackedJob || isWebhookCompletion || isRecentCompletion) && onTranscriptionComplete) {
              onTranscriptionComplete({ jobId: change.doc.id, status: 'completed' });
            }
          } else if (isNewFailure && (matchesJobId || matchesFileName)) {
            console.log('❌ [TranscriptionUpload] Transcription failed (global listener):', {
              docId,
              name: data.name,
              error: data.error
            });
            
            updateNotification({ progress: 0, status: 'failed' });
            setTimeout(() => hideNotification(), 5000);
            
            setIsProcessing(false);
            setUploadProgress(0);
            setCurrentRunpodJobId(null);
            setCurrentFileName(null);
          }
        });
      }, (error) => {
        console.error('❌ [TranscriptionUpload] Global Firestore listener error:', error);
      });
      
      console.log('✅ [TranscriptionUpload] Global Firestore listener set up');
    });

    return () => {
      if (globalUnsubscribe) {
        console.log('👂 [TranscriptionUpload] Cleaning up global Firestore listener');
        globalUnsubscribe();
      }
    };
  }, [auth.currentUser, currentRunpodJobId, currentFileName, hideNotification, updateNotification, onTranscriptionComplete]);

  // Job-specific listener: Listen for specific job completion (for real-time updates while waiting)
  useEffect(() => {
    if (!auth.currentUser || (!currentRunpodJobId && !currentFileName)) return;

    console.log('👂 Setting up job-specific Firestore listener for job:', {
      runpodJobId: currentRunpodJobId,
      fileName: currentFileName
    });
    
    let unsubscribe: (() => void) | null = null;
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { collection, onSnapshot, query, where, limit } = firestore;
      // Listen to the user's STT subcollection for documents matching our job
      const sttCollection = collection(db, 'users', auth.currentUser!.uid, 'stt');
      
      // Build query: match by RunPod job ID if available, otherwise by filename
      let queryRef;
      if (currentRunpodJobId) {
        // Primary: track by RunPod job ID
        queryRef = firestore.query(
          sttCollection,
          where('metadata.runpod_job_id', '==', currentRunpodJobId),
          limit(1)
        );
      } else if (currentFileName) {
        // Fallback: track by filename (for background jobs)
        queryRef = firestore.query(
          sttCollection,
          where('name', '==', currentFileName),
          limit(1)
        );
      } else {
        return; // No tracking criteria
      }
      
      unsubscribe = onSnapshot(queryRef, (snapshot) => {
        console.log('📡 [TranscriptionUpload] Firestore snapshot received for job:', {
          jobId: currentRunpodJobId,
          isEmpty: snapshot.empty,
          size: snapshot.size,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          docChanges: snapshot.docChanges().length
        });
        
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          const docId = doc.id;
          const alreadyHandled = handledCompletionIdsRef.current.has(docId);
          if (alreadyHandled) {
            console.log('⏭️ [TranscriptionUpload] Skipping completion (already handled):', docId);
            return;
          }
          
          console.log('📡 [TranscriptionUpload] Document found for job:', {
            docId: doc.id,
            status: data.status,
            name: data.name,
            runpodJobId: data.metadata?.runpod_job_id
          });
          
          // Check if document is already completed (might have been created before listener started)
          const hasTrackedJob = Boolean(currentRunpodJobId || currentFileName || isProcessing);

          if (data.status === 'completed') {
            console.log('✅ [TranscriptionUpload] Transcription already completed for job:', currentRunpodJobId || currentFileName);
            handledCompletionIdsRef.current.add(doc.id);
            
            // Always show completion notification and update UI
            updateNotification({ progress: 100, status: 'completed' });
            
            setTimeout(() => {
              console.log('🕐 [TranscriptionUpload] Hiding notification after completion');
              hideNotification();
            }, 5000);
            
                // Reset processing state
                setIsProcessing(false);
                setUploadProgress(0);
                
                // Remove from localStorage
                const userId = auth.currentUser?.uid;
                if (userId && currentRunpodJobId) {
                  const activeJobsKey = `activeJobs_${userId}`;
                  const activeJobs = JSON.parse(localStorage.getItem(activeJobsKey) || '[]');
                  const updatedJobs = activeJobs.filter((id: string) => id !== currentRunpodJobId);
                  localStorage.setItem(activeJobsKey, JSON.stringify(updatedJobs));
                  console.log('🧹 [TranscriptionUpload] Removed completed job from localStorage:', currentRunpodJobId);
                }
                
                setCurrentRunpodJobId(null); // Clear job tracking
                setCurrentFileName(null); // Clear filename tracking
                
                // Call completion callback
                if (hasTrackedJob && onTranscriptionComplete) {
                  onTranscriptionComplete({ jobId: doc.id, status: 'completed' });
                }
            return; // Don't process changes if already completed
          }
          
          // Check what changed
          const changes = snapshot.docChanges();
          changes.forEach((change) => {
            const changeData = change.doc.data();
            const changeDocId = change.doc.id;
            const alreadyHandled = handledCompletionIdsRef.current.has(changeDocId);
            if (alreadyHandled) {
              console.log('⏭️ [TranscriptionUpload] Skipping completion (already handled):', changeDocId);
              return;
            }
            
            console.log('📝 [TranscriptionUpload] Document change:', {
              type: change.type,
              docId: change.doc.id,
              status: changeData.status
            });
            
            if (change.type === 'modified' || change.type === 'added') {
              if (changeData.status === 'completed') {
                console.log('✅ [TranscriptionUpload] Transcription completed for job:', currentRunpodJobId || currentFileName);
                handledCompletionIdsRef.current.add(change.doc.id);
                
                // Always show completion notification and update UI
                updateNotification({ progress: 100, status: 'completed' });
                
                setTimeout(() => {
                  console.log('🕐 [TranscriptionUpload] Hiding notification after completion');
                  hideNotification();
                }, 5000);
                
                // Reset processing state
                setIsProcessing(false);
                setUploadProgress(0);
                
                setCurrentRunpodJobId(null); // Clear job tracking
                setCurrentFileName(null); // Clear filename tracking
                
                // Call completion callback
                if (hasTrackedJob && onTranscriptionComplete) {
                  onTranscriptionComplete({ jobId: change.doc.id, status: 'completed' });
                }
              } else if (changeData.status === 'failed') {
                console.log('❌ [TranscriptionUpload] Transcription failed for job:', currentRunpodJobId || currentFileName);
                
                // Always show failure notification
                updateNotification({ progress: 0, status: 'failed' });
                setTimeout(() => hideNotification(), 3000);
                
                // Reset processing state
                setIsProcessing(false);
                setUploadProgress(0);
                
                setCurrentRunpodJobId(null); // Clear job tracking
                setCurrentFileName(null); // Clear filename tracking
              }
            }
          });
        } else {
          console.log('📭 [TranscriptionUpload] No document found yet for job:', currentRunpodJobId || currentFileName);
        }
      }, (error) => {
        console.error('❌ [TranscriptionUpload] Firestore listener error:', error);
      });
      
      console.log('✅ [TranscriptionUpload] Job-specific Firestore listener successfully set up for job:', currentRunpodJobId || currentFileName);
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 [TranscriptionUpload] Cleaning up job-specific Firestore listener for job:', currentRunpodJobId || currentFileName);
        unsubscribe();
      }
    };
  }, [currentRunpodJobId, currentFileName, hideNotification, updateNotification, onTranscriptionComplete, notification.isVisible]);

  // Check for processing jobs on mount/login (catches jobs that completed while user was away)
  // Uses Firestore instead of localStorage - works across devices!
  useEffect(() => {
    if (!auth.currentUser) return;

    const checkProcessingJobs = async () => {
      try {
        console.log('🔍 [TranscriptionUpload] Checking for processing jobs on mount/login...');
        const { databaseService } = await import('@/services/databaseService');
        
        // Query for any records with status "processing" - these are active jobs
        // This is database-persistent, works across devices!
        const processingJobs = await databaseService.getSTTRecords(50, 'processing');
        
        if (processingJobs.length === 0) {
          console.log('📭 [TranscriptionUpload] No processing jobs found');
          return;
        }
        
        console.log(`🔍 [TranscriptionUpload] Found ${processingJobs.length} processing job(s):`, 
          processingJobs.map(j => ({ id: j.id, name: j.name, runpodJobId: j.metadata?.runpod_job_id }))
        );
        
        // Check if any of these have completed (they might have completed while user was away)
        // The global listener will catch when they complete, but we can check now too
        const allRecords = await databaseService.getSTTRecords(50);
        
        processingJobs.forEach((job) => {
          // Check if this processing job is actually completed (race condition)
          const completedRecord = allRecords.find(
            r => r.metadata?.runpod_job_id === job.metadata?.runpod_job_id && r.status === 'completed'
          );
          
          if (completedRecord) {
            console.log('✅ [TranscriptionUpload] Found completed job from previous session:', {
              docId: completedRecord.id,
              name: completedRecord.name,
              runpodJobId: completedRecord.metadata?.runpod_job_id
            });
            
            updateNotification({ progress: 100, status: 'completed' });
            setTimeout(() => hideNotification(), 5000);
            
            if (onTranscriptionComplete) {
              onTranscriptionComplete({ jobId: completedRecord.id, status: 'completed' });
            }
          }
        });
        
        // If we have a current tracked job, check if it's already completed
        if (currentRunpodJobId) {
          const completedJob = allRecords.find(
            t => t.metadata?.runpod_job_id === currentRunpodJobId && t.status === 'completed'
          );
          
          if (completedJob) {
            console.log('✅ [TranscriptionUpload] Current job already completed:', completedJob.id);
            setIsProcessing(false);
            setUploadProgress(0);
            setCurrentRunpodJobId(null);
            setCurrentFileName(null);
          }
        }
      } catch (error) {
        console.error('❌ [TranscriptionUpload] Error checking for processing jobs:', error);
      }
    };

    // Check on mount/login
    checkProcessingJobs();
  }, [auth.currentUser]); // Only run on mount/login

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('📁 File selected:', file);
    if (file) {
      console.log('✅ File validation starting...');
      
      // Check if it's a video file that needs audio extraction
      if (audioExtractionService.isVideoFile(file)) {
        console.log('🎬 Video file detected, extracting audio...');
        setIsExtractingAudio(true);
        
        try {
          const extractionResult = await audioExtractionService.extractAudioFromVideo(file);
          if (extractionResult.success && extractionResult.audioBlob) {
            console.log('✅ Audio extraction successful');
            
            // Create a new File object from the extracted audio blob
            const audioFile = new File([extractionResult.audioBlob], 
              `${file.name.split('.')[0]}_audio.wav`, 
              { type: 'audio/wav' }
            );
            
            setSelectedFile(file); // Keep original video file for reference
            setExtractedAudioFile(audioFile); // Use extracted audio for transcription
            console.log('✅ Video and extracted audio set to state');
          } else {
            console.error('❌ Audio extraction failed:', extractionResult.error);
            alert(`Failed to extract audio from video: ${extractionResult.error}`);
            return;
          }
        } catch (error) {
          console.error('❌ Audio extraction error:', error);
          alert('Failed to extract audio from video file');
          return;
        } finally {
          setIsExtractingAudio(false);
        }
      } else {
        // Regular audio file
        console.log('🎵 Audio file detected, proceeding with validation...');
        // Simple client-side validation
        if (!file || file.size === 0) {
          console.log('❌ File validation failed: Invalid file');
          alert('Please select a valid file');
          return;
        }
        console.log('✅ File validation passed');
        console.log('✅ File validation passed, setting file in state...');
        setSelectedFile(file);
        setExtractedAudioFile(null); // No extracted audio for regular files
        console.log('✅ Audio file set to state:', file.name);
      }
    }
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Check if it's a video file that needs audio extraction
      if (audioExtractionService.isVideoFile(file)) {
        console.log('🎬 Video file dropped, extracting audio...');
        setIsExtractingAudio(true);
        
        try {
          const extractionResult = await audioExtractionService.extractAudioFromVideo(file);
          if (extractionResult.success && extractionResult.audioBlob) {
            console.log('✅ Audio extraction successful');
            
            // Create a new File object from the extracted audio blob
            const audioFile = new File([extractionResult.audioBlob], 
              `${file.name.split('.')[0]}_audio.wav`, 
              { type: 'audio/wav' }
            );
            
            setSelectedFile(file); // Keep original video file for reference
            setExtractedAudioFile(audioFile); // Use extracted audio for transcription
            console.log('✅ Video and extracted audio set to state');
          } else {
            console.error('❌ Audio extraction failed:', extractionResult.error);
            alert(`Failed to extract audio from video: ${extractionResult.error}`);
            return;
          }
        } catch (error) {
          console.error('❌ Audio extraction error:', error);
          alert('Failed to extract audio from video file');
          return;
        } finally {
          setIsExtractingAudio(false);
        }
      } else {
        // Regular audio file
        if (!file || file.size === 0) {
          alert('Please select a valid file');
          return;
        }
        setSelectedFile(file);
        setExtractedAudioFile(null);
      }
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleTranscribe = async () => {
    console.log('🔄 ===== HANDLE TRANSCRIBE CALLED =====');
    console.log('📁 Selected file:', selectedFile);
    console.log('📁 File name:', selectedFile?.name);
    console.log('📁 File size:', selectedFile?.size);
    console.log('📁 File type:', selectedFile?.type);
    console.log('⚙️ Settings:', settings);
    
    try {
      if (selectedFile) {
        // Set local loading state immediately
        setIsProcessing(true);
        setProcessingPhase('idle');
        console.log('✅ File selected, setting processing state');
        
        // Reset any previous state first
        console.log('🔄 Resetting previous state...');
        reset();
        setChunks([]);
        setChunkProgress(0);
        setIsLongAudio(false);
        
        // Check audio duration to determine if we need enhanced chunking
        const fileToProcess = extractedAudioFile || selectedFile;
        console.log('🎵 Checking audio duration...');
        
        const audio = new Audio();
        audio.src = URL.createObjectURL(fileToProcess);
        
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', resolve, { once: true });
        });
        
        const duration = audio.duration;
        URL.revokeObjectURL(audio.src);
        
        console.log(`🎵 Audio duration: ${duration.toFixed(1)} seconds (${(duration / 60).toFixed(1)} minutes)`);
        
        // ✅ CHECK TRIAL STATUS FIRST
        console.log('🔍 Checking trial/subscription status...');
        const estimatedMinutes = Math.ceil(duration / 60);
        console.log(`📊 Estimated duration: ${estimatedMinutes} minutes`);
        
        const canTranscribeResult = await trialService.checkCanTranscribe(estimatedMinutes);
        
        if (!canTranscribeResult.canTranscribe) {
          console.log('❌ Cannot transcribe:', canTranscribeResult.reason);
          setUpgradeReason(canTranscribeResult.reason || 'Your trial has ended');
          setShowUpgradeModal(true);
          setIsProcessing(false);
          return;
        }
        
        console.log('✅ User can transcribe, starting background processing...');
        
        // Show progress notification
        showNotification(selectedFile.name, 'uploading', 0);
        
        // Start background processing with progress updates
        try {
          console.log('🚀 Starting background job with params:', {
            fileName: selectedFile.name,
            fileSize: fileToProcess.size,
            settings: settings,
            userId: auth.currentUser?.uid
          });
          
          const jobId = await startJob(
            fileToProcess,
            selectedFile.name,
            settings,
            (progress, status, details) => {
              if (status === 'runpod_job_mapped' && details?.runpodJobId) {
                console.log('🎯 Received RunPod job ID from background service:', details.runpodJobId);
                setCurrentRunpodJobId(details.runpodJobId);
                return;
              }

              console.log(`📊 Progress update: ${progress}% - ${status}`);
              updateNotification({
                progress,
                status: status as 'uploading' | 'processing' | 'completed' | 'failed'
              });

              if (status === 'completed') {
                console.log('✅ Transcription completed, hiding notification in 5 seconds');
                setTimeout(() => {
                  hideNotification();
                }, 5000);
              }
            }
          );
          console.log(`🚀 Background job started with ID: ${jobId}`);
          
          // Clear any previous job tracking before starting new one
          setCurrentRunpodJobId(null);
          setCurrentFileName(null);
          
          // Track by filename for background jobs (RunPod job ID will be set later by the service)
          setCurrentFileName(selectedFile.name);
          console.log('🎯 Tracking transcription by filename:', selectedFile.name);
          
          // Reset form
          setSelectedFile(null);
          setExtractedAudioFile(null);
          setIsProcessing(false);
          setProcessingPhase('idle');
          
          // Call completion callback if provided
          if (onTranscriptionComplete) {
            onTranscriptionComplete({ jobId, status: 'started' });
          }
          
        } catch (error) {
          console.error('❌ Failed to start background job:', error);
          console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            error: error
          });
          updateNotification({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Failed to start transcription',
            progress: 0
          });
          
          // Auto-hide notification after 5 seconds for errors
          setTimeout(() => {
            hideNotification();
          }, 5000);
        }
        
      } else {
        console.log('❌ No file selected');
        alert('Please select a file to transcribe');
        return;
      }
    } catch (error) {
      console.error('❌ Transcription failed:', error);
      alert('Failed to start transcription. Please try again.');
    } finally {
      // Always clear the local loading state
      setIsProcessing(false);
      setProcessingPhase('idle');
      console.log('🔄 Processing state cleared');
    }
  };

  // Handle regular transcription (existing logic)
  const handleRegularTranscription = async (fileToUpload: File) => {
        // Upload to Firebase first (required by new API)
        console.log('🔄 Starting Firebase upload...');
        console.log('⏱️ Starting upload at:', new Date().toLocaleTimeString());
        
        try {
          console.log('📤 Calling transcriptionService.uploadFileToFirebase...');
          console.log('📁 File to upload for transcription:', fileToUpload.name);
          
          const uploadResult = await clientTranscriptionService.uploadFileToFirebase(fileToUpload);
          console.log('✅ Firebase upload successful at:', new Date().toLocaleTimeString());
          console.log('🔗 Firebase URL:', uploadResult.url);
          console.log('📝 Database record will be created after transcription completes');
          
      const fileExtension = selectedFile?.name.split('.').pop()?.toLowerCase() || 'wav';
          console.log('📄 File extension:', fileExtension);
          
          console.log('🎯 About to call transcribe function...');
          console.log('⏱️ Starting transcription at:', new Date().toLocaleTimeString());
          
          const transcribeRequest = {
            audio_url: uploadResult.url,  // Use Firebase URL
            ...settings
          };
          
          console.log('📤 Transcribe request:', JSON.stringify(transcribeRequest, null, 2));
          
          await transcribe(transcribeRequest, uploadResult.filename); // Pass the filename
          console.log('✅ Transcribe function completed at:', new Date().toLocaleTimeString());
        } catch (uploadError) {
          console.error('❌ Firebase upload failed:', uploadError);
          throw uploadError;
        }
  };

  // New complete transcription function using Parakeet API
  const handleCompleteTranscription = async (fileToUpload: File) => {
    try {
      console.log('🎯 Starting complete transcription via API');
      
      // ✅ CHECK TRIAL STATUS FIRST
      console.log('🔍 Checking trial/subscription status...');
      const audioDuration = await trialService.getAudioDuration(fileToUpload);
      const estimatedMinutes = Math.ceil(audioDuration);
      console.log(`📊 Estimated duration: ${estimatedMinutes} minutes`);
      
      const canTranscribeResult = await trialService.checkCanTranscribe(estimatedMinutes);
      
      if (!canTranscribeResult.canTranscribe) {
        console.log('❌ Cannot transcribe:', canTranscribeResult.reason);
        setUpgradeReason(canTranscribeResult.reason || 'Your trial has ended');
        setShowUpgradeModal(true);
        return;
      }
      
      console.log('✅ User can transcribe, proceeding...');
      
      setProcessingPhase('converting');
      setChunkProgress(10);
      
      // Step 1: Check if file needs conversion (skip MP3, WAV, M4A - already supported)
      let processedFile = fileToUpload;
      const supportedFormats = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];
      const fileExtension = fileToUpload.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
      
      if (!supportedFormats.includes(fileExtension)) {
        console.log('🔄 File format not directly supported, attempting conversion...');
        // For video files, extract audio (this will be handled by audioExtractionService)
        if (fileToUpload.type.startsWith('video/')) {
          console.log('🎬 Extracting audio from video file...');
          const extractionResult = await audioExtractionService.extractAudioFromVideo(fileToUpload);
          if (!extractionResult.success || !extractionResult.audioBlob) {
            throw new Error(extractionResult.error || 'Audio extraction failed');
          }
          processedFile = new File([extractionResult.audioBlob], fileToUpload.name.replace(/\.[^/.]+$/, '.mp3'), {
            type: 'audio/mpeg',
            lastModified: Date.now()
          });
          console.log('✅ Audio extracted:', processedFile.name);
        } else {
          console.log('⚠️ Unsupported audio format, uploading as-is');
        }
      } else {
        console.log('✅ File format supported, no conversion needed:', fileExtension);
      }
      
      setProcessingPhase('uploading');
      setChunkProgress(30);
      setUploadProgress(0);
      
      // Step 2: Upload MP3 to Firebase Storage
      console.log('📤 Uploading MP3 to Firebase Storage...');
      const uploadResult = await clientTranscriptionService.uploadFileToFirebase(processedFile, (progress) => {
        setUploadProgress(progress);
      });
      console.log('✅ MP3 uploaded to Firebase:', uploadResult.url);
      setUploadProgress(100);
      
      setProcessingPhase('transcribing');
      setChunkProgress(50);
      
      // Clear any previous job tracking before starting new one
      setCurrentRunpodJobId(null);
      setCurrentFileName(null);
      
      // Step 3: Call the complete transcription API
      console.log('🎤 Calling complete transcription API...');
      const response = await fetch('/api/transcribe-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: uploadResult.url,
          filename: processedFile.name,
          userId: (await import('@/config/firebase')).auth.currentUser?.uid || 'unknown',
          settings: {
            use_diarization: settings.use_diarization,
            pyannote_version: settings.use_diarization ? '3.1' : undefined,
            max_speakers: null, // Always auto-detect speakers
            include_timestamps: settings.include_timestamps,
            speaker_threshold: 0.35, // Lower threshold for better speaker detection
            single_speaker_mode: false // Allow multiple speakers
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Complete transcription API response:', result);
      console.log('🔍 Job ID check:', { jobId: result.jobId, hasJobId: !!result.jobId, type: typeof result.jobId });
      console.log('📋 Full API response:', JSON.stringify(result, null, 2));
      
      // Check if this is a webhook-based job (jobId returned) or synchronous (transcript returned)
      if (result.jobId) {
        // Webhook path: Create a "queued" record in Firestore (queue worker will submit to RunPod)
        setCurrentRunpodJobId(result.jobId);
        // ALWAYS also track by filename as fallback (in case jobId is lost or doesn't match)
        setCurrentFileName(processedFile.name);
        
        console.log('🎯 Tracking RunPod job ID:', result.jobId);
        console.log('🎯 Also tracking by filename (fallback):', processedFile.name);
        console.log('💾 Creating queued record in Firestore...');
        
        // Check rate limits before creating job
        try {
          const { rateLimitService } = await import('@/services/rateLimitService');
          const { auth } = await import('@/config/firebase');
          
          const rateLimitResult = await rateLimitService.canUserSubmitJob(auth.currentUser?.uid);
          
          if (!rateLimitResult.allowed) {
            throw new Error(rateLimitResult.reason || 'Rate limit exceeded');
          }
          
          console.log('✅ Rate limit check passed:', rateLimitResult);
        } catch (rateLimitError) {
          console.error('❌ Rate limit check failed:', rateLimitError);
          throw rateLimitError; // Stop job creation if rate limited
        }
        
        // Create a Firestore record with status "queued" (queue worker will process it)
        // This persists across devices and survives page refresh/logout
        try {
          const { databaseService } = await import('@/services/databaseService');
          const { jobPriorityService } = await import('@/services/jobPriorityService');
          const { activeJobsService } = await import('@/services/activeJobsService');
          const { auth } = await import('@/config/firebase');
          
          // Get user priority based on subscription (for 10K+ user scale)
          const priority = await jobPriorityService.getUserPriority(auth.currentUser?.uid);
          
          const { serverTimestamp } = await import('firebase/firestore');
          
          // Create record with status 'processing' immediately after RunPod submission
          // RunPod serverless starts processing within seconds, so we assume it's processing
          console.log('💾 [TranscriptionUpload] Creating Firestore record with:', {
            jobId: result.jobId,
            fileName: processedFile.name,
            status: 'processing',
            hasJobId: !!result.jobId
          });
          
          // Create unique name by appending timestamp if duplicate exists
          const uniqueName = `${processedFile.name.replace(/\.[^/.]+$/, '')} (${new Date().toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })})${processedFile.name.match(/\.[^/.]+$/)?.[0] || ''}`;

          const processingRecordId = await databaseService.createSTTRecord({
            user_id: auth.currentUser?.uid || 'unknown',
            audio_id: uploadResult.url,
            name: uniqueName, // Use unique name with timestamp
            audio_file_url: uploadResult.url,
            transcript: '', // Empty until webhook completes
            duration: 0, // Will be updated by webhook
            language: 'en',
            status: 'processing', // RunPod starts processing immediately
            startedAt: Timestamp.now(), // Use Timestamp.now() for immediate visibility in UI
            priority: priority, // Set priority for queue management
            retryCount: 0, // Initialize retry count
            maxRetries: 3, // Maximum retry attempts
            metadata: {
              ...(result.jobId && { runpod_job_id: result.jobId }), // Only include if jobId exists (prevents undefined from being removed)
              processing_method: 'webhook_processing'
            }
          });
          
          console.log('✅ [TranscriptionUpload] Firestore record created:', {
            recordId: processingRecordId,
            jobId: result.jobId,
            fileName: processedFile.name
          });
          
          // CRITICAL: Verify the record was created with the job ID
          if (!result.jobId) {
            console.error('⚠️ WARNING: jobId is null/undefined! Record created without runpod_job_id in metadata.');
            console.error('⚠️ This will prevent webhook from finding the record. Using filename as fallback.');
            console.error('⚠️ Webhook will need to find record by filename instead of job ID.');
          } else {
            console.log('✅ Record created with runpod_job_id:', result.jobId);
            console.log('✅ Metadata being saved:', { runpod_job_id: result.jobId, processing_method: 'webhook_processing' });
          }
          
          // Add to activeJobs collection for efficient cleanup queries
          await activeJobsService.addActiveJob(
            auth.currentUser?.uid || 'unknown',
            processingRecordId,
            {
              status: 'processing',
              startedAt: serverTimestamp() as Timestamp,
              priority: priority,
              retryCount: 0,
              maxRetries: 3,
              name: processedFile.name
            },
            'stt' // Feature type for STT
          );
          
          console.log('✅ Created processing record in Firestore:', {
            recordId: processingRecordId,
            priority: priority,
            runpodJobId: result.jobId,
            fileName: processedFile.name,
            startedAt: 'set'
          });
          
          // CRITICAL: Verify the record was actually saved
          const { databaseService: verifyService } = await import('@/services/databaseService');
          try {
            const savedRecord = await verifyService.getSTTRecord(processingRecordId);
            console.log('🔍 VERIFICATION: Record in Firestore:', {
              exists: !!savedRecord,
              id: savedRecord?.id,
              status: savedRecord?.status,
              name: savedRecord?.name,
              runpodJobId: savedRecord?.metadata?.runpod_job_id,
              metadataKeys: savedRecord?.metadata ? Object.keys(savedRecord.metadata) : []
            });
          } catch (verifyError) {
            console.error('❌ VERIFICATION FAILED: Could not read back record:', verifyError);
          }
          console.log('⏳ Job submitted to RunPod - processing started, waiting for completion...');
        } catch (error) {
          console.error('❌ Failed to create queued record:', error);
          throw error; // Re-throw to show error to user
        }
        
        // Keep processing state active - webhook will update UI when complete
        setIsProcessing(true); // CRITICAL: Set processing state so listener can detect completion
        setProcessingPhase('transcribing');
        setChunkProgress(80); // Show we're waiting for processing
        // Don't deduct minutes here - webhook will handle it
        // Don't set result here - webhook will update via Firestore listener
      } else if (result.transcript) {
        // Synchronous path: Save immediately (fallback for non-webhook jobs)
        setCurrentFileName(processedFile.name);
        console.log('🎯 Synchronous transcription complete, saving immediately');
        
        setProcessingPhase('saving');
        setChunkProgress(90);
        
        // Step 4: Save to database
        console.log('💾 Saving transcription to database...');
        const { databaseService } = await import('@/services/databaseService');
        const { auth } = await import('@/config/firebase');
        const dbResult = await databaseService.createSTTRecord({
          user_id: auth.currentUser?.uid || 'unknown',
          audio_id: uploadResult.url,
          name: processedFile.name,
          transcript: result.transcript || '',
          audio_file_url: uploadResult.url, // Use Firebase URL for audio player
          duration: result.metadata?.duration || 0,
          language: 'en',
          status: 'completed',
          metadata: {
            word_count: result.timestamps?.length || 0,
            speaker_count: result.diarized_transcript?.length || 0,
            processing_method: result.metadata?.processing_method || 'OPTIMIZED_FULL_PYANNOTE_SEPARATE_PARAKET_WITH_SPEAKER_COMBINATION',
            chunks_processed: result.metadata?.chunks_processed || 1
          }
        }, result); // Pass full transcription data as second parameter
        
        console.log('✅ Transcription saved to database:', dbResult);
        
        setProcessingPhase('complete');
        setChunkProgress(100);
        
        // Update the transcription state for UI display
        setResult(result);
        
        // ✅ DEDUCT TRIAL MINUTES
        try {
          const actualDuration = result.metadata?.duration || result.duration || estimatedMinutes;
          const actualMinutes = Math.ceil(actualDuration / 60); // Convert seconds to minutes
          console.log(`📊 Deducting ${actualMinutes} minutes from trial`);
          await trialService.deductMinutes(actualMinutes);
        } catch (error) {
          console.error('⚠️ Error deducting trial minutes:', error);
          // Don't fail the transcription if minute deduction fails
        }
      } else {
        // Fallback: track by filename if no job ID or transcript
        setCurrentFileName(processedFile.name);
        console.log('🎯 Tracking transcription by filename (no job ID or transcript):', processedFile.name);
        setProcessingPhase('transcribing');
        setChunkProgress(80);
      }
      
      // Call completion callback
      if (onTranscriptionComplete) {
        onTranscriptionComplete(result);
      }
      
    } catch (error) {
      console.error('❌ Complete transcription failed:', error);
      // Error will be handled by the useTranscription hook's state
      setProcessingPhase('idle');
      setChunkProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  // MP3 conversion utility function
  const convertToMP3 = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const fileReader = new FileReader();

        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Convert to MP3 format (simplified - in production use a proper MP3 encoder)
            const mp3Blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
            const mp3File = new File([mp3Blob], file.name.replace(/\.[^/.]+$/, '.mp3'), {
              type: 'audio/mpeg',
              lastModified: file.lastModified
            });

            console.log('✅ File converted to MP3:', mp3File.name, 'Size:', mp3File.size);
            resolve(mp3File);
          } catch (error) {
            console.warn('MP3 conversion failed, using original file:', error);
            resolve(file);
          }
        };

        fileReader.onerror = () => {
          console.warn('File reading failed, using original file');
          resolve(file);
        };

        fileReader.readAsArrayBuffer(file);
      } catch (error) {
        console.warn('Audio context creation failed, using original file:', error);
        resolve(file);
      }
    });
  };

  // Handle long audio transcription with enhanced chunking (DEPRECATED - keeping for reference)
  const handleLongAudioTranscription = async (fileToUpload: File) => {
    try {
      console.log('🎯 Starting enhanced long audio transcription workflow');
      setProcessingPhase('splitting');
      
      // Step 0: Upload the complete original audio file for playback
      console.log('📤 Uploading complete original audio file for playback...');
      setUploadProgress(0);
      const originalAudioUpload = await clientTranscriptionService.uploadFileToFirebase(fileToUpload, (progress) => {
        setUploadProgress(progress);
      });
      console.log('✅ Original audio uploaded for playback:', originalAudioUpload.url);
      setUploadProgress(100);
      
      // Step 0.5: Run speaker diarization on FULL audio FIRST (if enabled)
      let fullAudioDiarizationSegments: any[] = [];
      if (settings.use_diarization) {
        console.log('🎤 Running speaker diarization on FULL audio before chunking...');
        setProcessingPhase('diarizing');
        
        try {
          const diarizationResponse = await fetch('/api/transcribe-complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_url: originalAudioUpload.url,
              filename: fileToUpload.name,
              userId: (await import('@/config/firebase')).auth.currentUser?.uid || 'unknown',
              settings: {
                use_diarization: true,
                pyannote_version: '3.1', // Always use 3.1 when diarization is enabled
                max_speakers: null,
                include_timestamps: false, // Only need speaker segments
                speaker_threshold: 0.35,
                single_speaker_mode: false
              }
            })
          });
          
          if (diarizationResponse.ok) {
            const diarizationResult = await diarizationResponse.json();
            fullAudioDiarizationSegments = diarizationResult.diarized_transcript || [];
            console.log(`✅ Full audio diarization complete: ${fullAudioDiarizationSegments.length} speaker segments`);
          } else {
            console.warn('⚠️ Full audio diarization failed, continuing without diarization');
          }
        } catch (diarizationError) {
          console.warn('⚠️ Full audio diarization error:', diarizationError);
        }
      }
      
      // Step 1: Split audio into 15-minute chunks
      console.log('🔪 Splitting audio into intelligent 15-minute chunks...');
      const chunks = await splitTranscriptAudioIntoChunks(fileToUpload);
      setChunks(chunks);
      console.log(`✅ Split into ${chunks.length} chunks`);
      setProcessingPhase('transcribing');
      
      // Step 2: Transcribe each chunk
      const transcribedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎤 Transcribing chunk ${i + 1}/${chunks.length} (${chunk.formatted_start_time} - ${chunk.formatted_end_time})`);
        setChunkProgress((i / chunks.length) * 70); // 70% for transcription
        
        // Update chunk status
        const updatedChunks = [...chunks];
        updatedChunks[i] = { ...chunk, status: 'processing' };
        setChunks(updatedChunks);
        
        // Get chunk audio file
        const chunkResponse = await fetch(`/api/get-chunk-file?path=${encodeURIComponent(chunk.file_path)}`);
        if (!chunkResponse.ok) {
          throw new Error(`Failed to get chunk file ${i + 1}`);
        }
        
        const chunkBlob = await chunkResponse.blob();
        const chunkFile = new File([chunkBlob], `transcript_chunk_${i + 1}.wav`, { type: 'audio/wav' });
        
        // Upload chunk to Firebase and transcribe - same pattern as regular transcription
        const chunkUploadResult = await clientTranscriptionService.uploadFileToFirebase(chunkFile);
        
        const chunkResult = await clientTranscriptionService.transcribeAudio(
          {
            audio_url: chunkUploadResult.url,
            filename: `chunk_${i + 1}`
          },
          {
            use_diarization: false,
            max_speakers: null,
            include_timestamps: true,
            speaker_threshold: 0.35,
            single_speaker_mode: false
          }
        );
        
        // Update chunk status to completed
        updatedChunks[i] = { ...chunk, status: 'completed', transcription_result: chunkResult };
        setChunks(updatedChunks);
        
        // Store transcription result with chunk info
        transcribedChunks.push({
          ...chunk,
          transcription_result: chunkResult
        });
      }
      
      // Step 3: Stitch transcripts together with enhanced metadata preservation
      console.log('🧩 Stitching transcripts with speaker diarization and timestamps...');
      setProcessingPhase('stitching');
      setChunkProgress(80);
      
      const finalResult = await stitchTranscriptsWithMetadata(transcribedChunks, fullAudioDiarizationSegments);
      
      // Save the final stitched result as ONE transcription record
      console.log('💾 Saving final stitched transcription to database...');
      
      // Import databaseService
      const { databaseService } = await import('@/services/databaseService');
      const { auth } = await import('@/config/firebase');
      
      const savedTranscriptionId = await databaseService.createSTTRecord({
        user_id: auth.currentUser?.uid || 'unknown',
        audio_id: selectedFile?.name || 'enhanced_long_transcription',
        name: `Enhanced: ${selectedFile?.name || 'Long Audio Transcription'}`,
        transcript: finalResult.merged_text || finalResult.text || '',
        audio_file_url: originalAudioUpload.url, // Use the complete original audio file for playback
        duration: finalResult.duration || 0,
        language: 'en',
        status: 'completed',
        metadata: {
          word_count: finalResult.word_count,
          speaker_count: finalResult.speaker_count || 0,
          processing_method: 'enhanced_chunking',
          chunks_processed: transcribedChunks.length
        }
      }, finalResult); // Pass full transcription data as second parameter
      
      console.log('✅ Enhanced long transcription completed successfully');
      console.log(`📊 Final result: ${finalResult.word_count} words, ${finalResult.speaker_count} speakers, ${finalResult.diarized_segments} segments`);
      console.log('📄 Saved as single transcription record:', savedTranscriptionId);
      
      // Update the state with the enhanced result
      setResult(finalResult);
      
      setChunkProgress(100);
      setProcessingPhase('complete');
      
      // Trigger the callback to refresh the transcription list
      if (onTranscriptionComplete) {
        onTranscriptionComplete(finalResult);
      }
      
    } catch (error) {
      console.error('❌ Enhanced long transcription failed:', error);
      setProcessingPhase('idle');
      throw error;
    }
  };

  // Helper function to split audio for transcription
  const splitTranscriptAudioIntoChunks = async (inputFile: File): Promise<any[]> => {
    try {
      const formData = new FormData();
      formData.append('inputFile', inputFile);
      formData.append('useSmartSplitting', 'true'); // Always enabled
      
      const response = await fetch('/api/split-transcript-audio', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to split audio for transcription');
      }
      
      const result = await response.json();
      return result.chunks;
    } catch (error) {
      throw new Error(`Failed to split audio: ${error}`);
    }
  };

  // Helper function to stitch transcripts with enhanced metadata and voice embeddings
  const stitchTranscriptsWithMetadata = async (transcribedChunks: any[], fullAudioDiarizationSegments?: any[]): Promise<any> => {
    try {
      // Use the advanced API route with voice embedding option
      const response = await fetch('/api/stitch-transcript-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunks: transcribedChunks,
          use_voice_embeddings: true, // Always enabled
          similarity_threshold: 0.75,
          full_audio_diarization_segments: fullAudioDiarizationSegments || [] // ✅ Pass full diarization segments
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to stitch transcripts');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to stitch transcripts: ${error}`);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
    setExtractedAudioFile(null);
    setIsProcessing(false);
    setIsLongAudio(false);
    setChunks([]);
    setChunkProgress(0);
    setProcessingPhase('idle');
    setUseSmartSplitting(true);
    setUseVoiceEmbeddings(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const downloadTranscript = (text: string, filename: string = 'transcript.txt') => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'SUBMITTING':
      case 'IN_QUEUE':
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      

      {/* File Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Audio/Video File</h3>
          <p className="text-sm text-gray-600">Upload audio or video files for AI-powered transcription.</p>
        </div>

        {/* File Upload */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.m4a,.aac,.mp4,.mov,.avi,.mkv"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="flex items-center justify-center space-x-3">
              {selectedFile.type.startsWith('video/') ? (
                <FileVideo className="w-8 h-8 text-blue-500" />
              ) : (
                <FileAudio className="w-8 h-8 text-green-500" />
              )}
              <div>
                <div className="font-medium text-gray-900">{selectedFile.name}</div>
                <div className="text-sm text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  {selectedFile.type.startsWith('video/') && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Video
                    </span>
                  )}
                  {extractedAudioFile && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Audio Extracted
                    </span>
                  )}
                </div>
                {extractedAudioFile && (
                  <div className="text-xs text-gray-600 mt-1">
                    Using extracted audio: {extractedAudioFile.name}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="mx-auto w-12 h-12 text-gray-400 mb-4" />
              <div className="text-lg font-medium text-gray-900 mb-2">
                Drop audio or video file here or click to browse
              </div>
              <div className="text-sm text-gray-500">
                Supports WAV, MP3, FLAC, OGG, MP4, MOV, AVI, MKV (no size limits - uses Firebase Storage)
              </div>
            </div>
          )}
          
          {/* Audio Extraction Status */}
          {isExtractingAudio && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-800 font-medium">
                  Extracting audio from video... This may take a moment.
                </span>
              </div>
            </div>
          )}
        </div>
        
      </div>

      {/* Transcription Settings */}
      <div id="transcription-settings" className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcription Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Speaker Diarization</label>
              <p className="text-sm text-gray-500">Identify "who spoke when" using PyAnnote 3.1</p>
            </div>
            <input
              type="checkbox"
              checked={settings.use_diarization}
              onChange={(e) => setSettings(prev => ({ ...prev, use_diarization: e.target.checked }))}
              className="w-4 h-4 text-orange-500 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Include Timestamps</label>
              <p className="text-sm text-gray-500">Add time markers to segments</p>
            </div>
            <input
              type="checkbox"
              checked={settings.include_timestamps}
              onChange={(e) => setSettings(prev => ({ ...prev, include_timestamps: e.target.checked }))}
              className="w-4 h-4 text-orange-500 rounded"
            />
          </div>

          {settings.use_diarization && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Speakers (optional)
              </label>
              <select
                value={settings.num_speakers || ''}
                onChange={(e) => setSettings(prev => ({ 
                  ...prev, 
                  num_speakers: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Auto-detect</option>
                <option value="2">2 speakers</option>
                <option value="3">3 speakers</option>
                <option value="4">4 speakers</option>
                <option value="5">5 speakers</option>
                <option value="6">6 speakers</option>
              </select>
            </div>
          )}

        </div>

      </div>

      {/* Processing Status */}
      {state.isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-gray-900">
                {state.status === 'SUBMITTING' && 'Submitting job...'}
                {state.status === 'IN_QUEUE' && 'Job queued for processing...'}
                {state.status === 'IN_PROGRESS' && 'Processing audio...'}
              </div>
              {state.jobId && (
                <div className="text-sm text-gray-500">Job ID: {state.jobId}</div>
              )}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">{state.progress}% complete</div>
        </div>
      )}

      {/* Enhanced Long Audio Processing Status */}
      {isLongAudio && isProcessing && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="w-5 h-5 text-purple-600 animate-pulse" />
            <div>
              <div className="font-medium text-gray-900">Enhanced Long Audio Processing</div>
              <div className="text-sm text-gray-600">
                {processingPhase === 'converting' && 'Converting file to MP3...'}
                {processingPhase === 'uploading' && 'File uploading'}
                {processingPhase === 'transcribing' && 'Transcribing with Parakeet API...'}
                {processingPhase === 'saving' && 'Saving results to database...'}
                {processingPhase === 'splitting' && 'Intelligently splitting audio into chunks...'}
                {processingPhase === 'stitching' && 'Stitching transcripts with speaker diarization...'}
              </div>
            </div>
          </div>

          {/* Phase Progress Indicator */}
          <div className="flex items-center space-x-4 text-sm text-purple-700 mb-4">
            <div className={`flex items-center space-x-2 ${processingPhase === 'converting' ? 'font-medium' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${processingPhase === 'converting' ? 'bg-purple-600 animate-pulse' : processingPhase === 'uploading' || processingPhase === 'transcribing' || processingPhase === 'saving' || processingPhase === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Converting</span>
            </div>
            <div className={`flex items-center space-x-2 ${processingPhase === 'uploading' ? 'font-medium' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${processingPhase === 'uploading' ? 'bg-purple-600 animate-pulse' : processingPhase === 'transcribing' || processingPhase === 'saving' || processingPhase === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Uploading</span>
            </div>
            <div className={`flex items-center space-x-2 ${processingPhase === 'transcribing' ? 'font-medium' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${processingPhase === 'transcribing' ? 'bg-purple-600 animate-pulse' : processingPhase === 'saving' || processingPhase === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Transcribing</span>
            </div>
            <div className={`flex items-center space-x-2 ${processingPhase === 'saving' ? 'font-medium' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${processingPhase === 'saving' ? 'bg-purple-600 animate-pulse' : processingPhase === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Saving</span>
            </div>
            <div className={`flex items-center space-x-2 ${processingPhase === 'complete' ? 'font-medium' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${processingPhase === 'complete' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Complete</span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {processingPhase === 'uploading' && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                <span>File uploading</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Overall Progress Bar */}
          {chunkProgress > 0 && (
            <div>
              <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${chunkProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Chunk Status Grid */}
          {chunks.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Processing {chunks.length} chunks:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {chunks.map((chunk, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded border">
                    <div className={`w-3 h-3 rounded-full ${
                      chunk.status === 'completed' ? 'bg-green-500' :
                      chunk.status === 'processing' ? 'bg-purple-500 animate-pulse' :
                      chunk.status === 'failed' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`}></div>
                    <div className="text-xs">
                      <div className="font-medium">Chunk {index + 1}</div>
                      <div className="text-gray-600">
                        {chunk.formatted_start_time} - {chunk.formatted_end_time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Transcription Failed</div>
              <div className="text-sm text-red-700 mt-1">{state.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {state.result && (
        <TranscriptionResults 
          result={state.result as any} 
          audioUrl={extractedAudioFile ? URL.createObjectURL(extractedAudioFile) : undefined}
        />
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {!isProcessing && !state.isLoading && !state.result && (
          <button
            onClick={() => {
              console.log('🔘 Button clicked!');
              console.log('📁 Selected file:', selectedFile);
              console.log('🚫 Button disabled:', !selectedFile);
              console.log('🎯 Calling handleTranscribe...');
              handleTranscribe();
            }}
            disabled={!selectedFile}
            className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
          >
            <Mic className="w-5 h-5" />
            <span>Start Transcription (File: {selectedFile?.name || 'None'})</span>
          </button>
        )}

        {/* Initial Processing Indicator */}
        {isProcessing && !state.isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-orange-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
              <span>Starting transcription... Please wait</span>
            </div>
          </div>
        )}

        {/* Transcription Progress Indicator */}
        {state.isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-purple-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            <span>Transcribing audio... {state.status}</span>
          </div>
          </div>
        )}

        {/* Status Display */}
        {(isProcessing || state.isLoading) && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-purple-800">
                <div className="font-medium mb-1">Current Status:</div>
                <div className="text-xs">
                  {isProcessing && !state.isLoading && "🔄 Initializing transcription..."}
                  {state.isLoading && state.status === 'SUBMITTING' && "📤 Submitting to RunPod API..."}
                  {state.isLoading && state.status === 'IN_QUEUE' && "⏳ Job queued, waiting to start..."}
                  {state.isLoading && state.status === 'IN_PROGRESS' && "🎯 Processing audio with NVIDIA Parakeet..."}
                  {state.isLoading && state.status === 'COMPLETED' && "✅ Transcription completed!"}
                </div>
              </div>
            </div>
          </div>
        )}

        {(state.result || state.error) && (
          <button
            onClick={handleReset}
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 font-medium"
          >
            Start New Transcription
          </button>
        )}
      </div>
      
      {/* Upgrade Modal - shown when trial ends */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
