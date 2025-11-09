'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { clientTranscriptionService } from '../services/clientTranscriptionService';
import { audioExtractionService } from '../services/audioExtractionService';
import { trialService } from '../services/trialService';
import UpgradeModal from './UpgradeModal';
import { 
  Upload, 
  FileAudio, 
  FileVideo, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Trash2,
  AlertTriangle,
  Info,
  FileText
} from 'lucide-react';

interface BatchFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isVideo: boolean;
  status: 'pending' | 'uploading' | 'queued' | 'transcribing' | 'completed' | 'failed';
  progress: number;
  transcriptionId?: string;
  error?: string;
  audioUrl?: string;
  queuePosition?: number; // Position in queue
}

export default function BatchTranscriptionUpload() {
  const { user } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [useDiarization, setUseDiarization] = useState(true);
  
  // Trial & upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  
  // Track processed files to match Firestore updates
  const processedFileNamesRef = useRef<Set<string>>(new Set());
  
  // Track when batch transcription session started (to ignore old completed records)
  const batchSessionStartTimeRef = useRef<number | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const newFiles: BatchFile[] = fileArray.map((file, index) => ({
      id: `${Date.now()}_${index}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      isVideo: audioExtractionService.isVideoFile(file),
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Remove file from batch
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Clear all files
  const clearAllFiles = () => {
    setFiles([]);
    processedFileNamesRef.current.clear();
    batchSessionStartTimeRef.current = null;
  };

  // Real-time Firestore listener: Listen for batch transcription completion
  useEffect(() => {
    if (!user?.uid) return;

    console.log('👂 [BatchTranscriptionUpload] Setting up Firestore listener for batch transcription updates...');
    
    let unsubscribe: (() => void) | null = null;
    let isInitialLoad = true; // Track if this is the initial load
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { collection, onSnapshot, orderBy, limit } = firestore;
      // Listen to the user's STT subcollection for ANY changes
      const sttCollection = collection(db, 'users', user.uid, 'stt');
      
      const queryRef = firestore.query(
        sttCollection,
        orderBy('timestamp', 'desc'),
        limit(10) // Listen to recent 10 transcriptions (more for batch)
      );
      
      unsubscribe = onSnapshot(queryRef, (snapshot) => {
        console.log('📡 [BatchTranscriptionUpload] Firestore snapshot received:', {
          isEmpty: snapshot.empty,
          size: snapshot.size,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          docChanges: snapshot.docChanges().length,
          isInitialLoad
        });
        
        if (!snapshot.empty) {
          // Check what changed
          const changes = snapshot.docChanges();
          changes.forEach((change) => {
            const changeData = change.doc.data();
            const docId = change.doc.id;
            
            // Normalize filenames for comparison (trim whitespace, handle case)
            const normalizeFilename = (name: string) => name?.trim().toLowerCase() || '';
            const changeName = normalizeFilename(changeData.name);
            const trackedFiles = Array.from(processedFileNamesRef.current).map(n => normalizeFilename(n));
            const isTracked = trackedFiles.includes(changeName);
            
            // Check if this record was created after the current batch session started
            // This prevents matching old completed records from previous runs
            let recordTimestamp: number | null = null;
            if (changeData.timestamp) {
              // Handle Firestore Timestamp object
              if (typeof changeData.timestamp.toMillis === 'function') {
                recordTimestamp = changeData.timestamp.toMillis();
              } else if (typeof changeData.timestamp.toDate === 'function') {
                recordTimestamp = changeData.timestamp.toDate().getTime();
              } else if (changeData.timestamp.seconds) {
                recordTimestamp = changeData.timestamp.seconds * 1000 + (changeData.timestamp.nanoseconds || 0) / 1000000;
              } else if (changeData.timestamp instanceof Date) {
                recordTimestamp = changeData.timestamp.getTime();
              }
            }
            
            const recordCreatedAfterSessionStart = batchSessionStartTimeRef.current && recordTimestamp 
              ? recordTimestamp >= batchSessionStartTimeRef.current 
              : null; // If we can't determine, we'll allow it if tracked
            
            // Store these in scope for nested callbacks
            const firestoreFileName = changeData.name;
            const firestoreDocId = docId;
            
            console.log('📝 [BatchTranscriptionUpload] Document change:', {
              type: change.type, // 'added', 'modified', 'removed'
              docId: docId,
              status: changeData.status,
              name: changeData.name,
              normalizedName: changeName,
              isInitialLoad,
              isTracked,
              trackedFiles: Array.from(processedFileNamesRef.current),
              trackedFilesNormalized: trackedFiles,
              recordTimestamp: recordTimestamp ? new Date(recordTimestamp).toISOString() : 'unknown',
              batchSessionStart: batchSessionStartTimeRef.current ? new Date(batchSessionStartTimeRef.current).toISOString() : 'not started',
              recordCreatedAfterSessionStart
            });
            
            // Only process changes for files we're currently processing
            if (!isTracked) {
              if (isInitialLoad) {
                console.log('⏭️ [BatchTranscriptionUpload] Skipping initial load changes for non-tracked file:', changeData.name, 'Tracked files:', Array.from(processedFileNamesRef.current));
              } else {
                console.log('⏭️ [BatchTranscriptionUpload] File not in processing set, skipping:', changeData.name, 'Tracked files:', Array.from(processedFileNamesRef.current));
              }
              return;
            }
            
            // If we have a batch session start time and can compare timestamps, only process records created after session start
            // This prevents matching old completed records from previous batch runs
            if (batchSessionStartTimeRef.current && recordCreatedAfterSessionStart === false && recordTimestamp) {
              console.log('⏭️ [BatchTranscriptionUpload] Skipping old record created before current batch session:', changeData.name, 'Record:', new Date(recordTimestamp).toISOString(), 'Session:', new Date(batchSessionStartTimeRef.current).toISOString());
              return;
            }
            
            // If this is initial load but we're tracking this file, we can process it
            if (isInitialLoad && isTracked) {
              console.log('📝 [BatchTranscriptionUpload] Processing initial load for tracked file:', changeData.name);
            }
            
            // If status changed to completed or failed, update notification and file status
            if (change.type === 'modified' || change.type === 'added') {
              if (changeData.status === 'completed') {
                console.log('✅ [BatchTranscriptionUpload] Batch transcription completed!', changeData.name);
                
                // Find the matching file in our state (use normalized comparison)
                setFiles(prev => {
                  const normalizedChangeName = normalizeFilename(changeData.name);
                  const updated = prev.map(f => {
                    const normalizedFileName = normalizeFilename(f.name);
                    if (normalizedFileName === normalizedChangeName) {
                      console.log(`🎯 [BatchTranscriptionUpload] Matched file: "${f.name}" with Firestore record: "${changeData.name}"`);
                      // Update file status
                      return {
                        ...f,
                        status: 'completed' as const,
                        progress: 100,
                        transcriptionId: docId,
                        processingPhase: 'complete' as const
                      };
                    }
                    return f;
                  });
                  
                  // Log if no match found
                  const foundMatch = updated.some(f => f.transcriptionId === docId);
                  if (!foundMatch) {
                    console.warn('⚠️ [BatchTranscriptionUpload] No matching file found in state for:', changeData.name, 'Current files:', prev.map(f => f.name));
                  }
                  
                  return updated;
                });
                
                // Note: Batch component has its own UI for showing completion status
                
                // Remove from processed set after a delay to allow for cleanup
                // Find and remove the actual tracked name (case-insensitive)
                setTimeout(() => {
                  const trackedName = Array.from(processedFileNamesRef.current).find(
                    name => normalizeFilename(name) === changeName
                  );
                  if (trackedName) {
                    processedFileNamesRef.current.delete(trackedName);
                    console.log(`🗑️ [BatchTranscriptionUpload] Removed "${trackedName}" from tracking`);
                  }
                }, 10000);
                
              } else if (changeData.status === 'failed') {
                console.log('❌ [BatchTranscriptionUpload] Batch transcription failed!', changeData.name);
                
                // Find the matching file in our state (use normalized comparison)
                setFiles(prev => {
                  const normalizedChangeName = normalizeFilename(changeData.name);
                  return prev.map(f => {
                    const normalizedFileName = normalizeFilename(f.name);
                    if (normalizedFileName === normalizedChangeName) {
                      return {
                        ...f,
                        status: 'failed',
                        error: 'Transcription failed'
                      };
                    }
                    return f;
                  });
                });
                
                // Note: Batch component has its own UI for showing failure status
                
                // Remove from processed set (find actual tracked name)
                const trackedName = Array.from(processedFileNamesRef.current).find(
                  name => normalizeFilename(name) === changeName
                );
                if (trackedName) {
                  processedFileNamesRef.current.delete(trackedName);
                  console.log(`🗑️ [BatchTranscriptionUpload] Removed "${trackedName}" from tracking`);
                }
              }
            }
          });
          
          // Mark initial load as complete after first snapshot
          if (isInitialLoad) {
            isInitialLoad = false;
            console.log('✅ [BatchTranscriptionUpload] Initial load complete, now listening for real changes');
          }
        } else {
          console.log('📭 [BatchTranscriptionUpload] No transcriptions found');
          isInitialLoad = false; // Mark as complete even if no data
        }
      }, (error) => {
        console.error('❌ [BatchTranscriptionUpload] Firestore listener error:', error);
      });
      
      console.log('✅ [BatchTranscriptionUpload] Firestore listener successfully set up');
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 [BatchTranscriptionUpload] Cleaning up Firestore listener');
        unsubscribe();
      }
    };
  }, [user?.uid]);

  const extractAudioIfNeeded = async (batchFile: BatchFile): Promise<{ audioFile: File; originalName: string }> => {
    let audioFile: File = batchFile.file;
    let originalName: string = batchFile.name;

    const supportedFormats = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm'];
    const fileExtension = batchFile.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    const isVideo = batchFile.isVideo || audioExtractionService.isVideoFile(batchFile.file);

    if (isVideo) {
      console.log(`🎬 [BatchTranscriptionUpload] Extracting audio from video: ${batchFile.name}`);
      const extractionResult = await audioExtractionService.extractAudioFromVideo(batchFile.file);

      if (!extractionResult.success || !extractionResult.audioBlob) {
        throw new Error(`Audio extraction failed: ${extractionResult.error || 'Unknown error'}`);
      }

      audioFile = new File(
        [extractionResult.audioBlob],
        batchFile.name.replace(/\.[^/.]+$/, '.mp3'),
        { type: 'audio/mpeg', lastModified: Date.now() }
      );
      originalName = audioFile.name;
      console.log(`✅ [BatchTranscriptionUpload] Audio extracted: ${originalName}`);
    } else if (!supportedFormats.includes(fileExtension)) {
      console.log(`⚠️ [BatchTranscriptionUpload] Unsupported audio format for ${batchFile.name}, using original file`);
    }

    return { audioFile, originalName };
  };

  // Submit file to the scalable queue system
  const submitFileToQueue = async (batchFile: BatchFile, audioFile: File, originalName: string): Promise<void> => {
    try {
      // Track for Firestore listener
      processedFileNamesRef.current.add(originalName);
      console.log(`📝 [BatchTranscriptionUpload] Tracking file: ${originalName}`);
      
      // Upload to Firebase
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id ? { ...f, status: 'uploading', progress: 20 } : f
      ));
      
      const uploadResult = await clientTranscriptionService.uploadFileToFirebase(audioFile, (progress) => {
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id ? { ...f, progress: 20 + (progress * 0.2) } : f
        ));
      });
      
      console.log(`✅ ${originalName} uploaded to Firebase:`, uploadResult.url);
      
      // Submit to queue (fire-and-forget)
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id ? { ...f, status: 'transcribing', progress: 40 } : f
      ));
      
      const response = await fetch('/api/transcribe-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: uploadResult.url,
          filename: originalName,
          userId: user?.uid,
          settings: {
            use_diarization: useDiarization,
            pyannote_version: useDiarization ? '3.1' : undefined,
            max_speakers: null,
            include_timestamps: true,
            speaker_threshold: 0.35,
            single_speaker_mode: false
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || response.statusText);
      }
      
      const result = await response.json();
      
      if (result.queued) {
        // Job is queued, not processing yet
        console.log(`⏳ ${originalName} queued at position ${result.queuePosition}`);
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { 
                ...f, 
                status: 'queued', 
                progress: 30,
                transcriptionId: result.recordId,
                queuePosition: result.queuePosition
              }
            : f
        ));
      } else {
        // Job is processing immediately
        console.log(`✅ Submitted ${originalName} to queue, jobId: ${result.jobId}, recordId: ${result.recordId}`);
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, status: 'transcribing', progress: 50, transcriptionId: result.recordId }
            : f
        ));
      }
      
    } catch (error) {
      console.error(`❌ Failed to submit ${originalName}:`, error);
      processedFileNamesRef.current.delete(originalName);
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Failed' }
          : f
      ));
      throw error;
    }
  };

  // Process all files
  const processAllFiles = async () => {
    if (!user) {
      alert('Please log in to transcribe files');
      return;
    }

    if (files.length === 0) {
      alert('Please add some files first');
      return;
    }

    // ✅ CHECK TRIAL STATUS BEFORE PROCESSING
    console.log('🔍 Checking trial/subscription status for batch processing...');
    
    // Calculate total estimated minutes for all pending files
    let totalEstimatedMinutes = 0;
    const pendingFiles = files.filter(file => file.status === 'pending');
    
    for (const batchFile of pendingFiles) {
      try {
        const audioDuration = await trialService.getAudioDuration(batchFile.file);
        const estimatedMinutes = Math.ceil(audioDuration / 60); // Convert seconds to minutes
        totalEstimatedMinutes += estimatedMinutes;
        console.log(`📊 ${batchFile.name}: ${estimatedMinutes} minutes`);
      } catch (error) {
        console.warn(`⚠️ Could not estimate duration for ${batchFile.name}, using 1 minute default`);
        totalEstimatedMinutes += 1; // Default to 1 minute if duration check fails
      }
    }
    
    console.log(`📊 Total estimated duration: ${totalEstimatedMinutes} minutes`);
    
    const canTranscribeResult = await trialService.checkCanTranscribe(totalEstimatedMinutes);
    
    if (!canTranscribeResult.canTranscribe) {
      console.log('❌ Cannot transcribe batch:', canTranscribeResult.reason);
      setUpgradeReason(canTranscribeResult.reason || 'Your trial has ended');
      setShowUpgradeModal(true);
      return;
    }
    
    console.log('✅ User can transcribe batch, starting scalable queue processing...');

    // Mark the start of this batch session (to ignore old completed records)
    batchSessionStartTimeRef.current = Date.now();
    console.log(`📅 [BatchTranscriptionUpload] Batch session started at: ${new Date(batchSessionStartTimeRef.current).toISOString()}`);

    setIsUploading(true);
    
    // Submit files sequentially (don't wait for completion - webhook handles that)
    for (const batchFile of pendingFiles) {
      try {
        const { audioFile, originalName } = await extractAudioIfNeeded(batchFile);
        await submitFileToQueue(batchFile, audioFile, originalName);
        
        // Small delay between submissions to avoid rate limit bursts
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to process ${batchFile.name}:`, error);
        // Continue with next file even if one fails
      }
    }
    
    setIsUploading(false);
    console.log('✅ All files submitted to queue - webhook will update when complete');
  };



  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' };
      case 'uploading':
        return { icon: Upload, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'queued':
        return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100' };
      case 'transcribing':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' };
      default:
        return { icon: Info, color: 'text-gray-500', bg: 'bg-gray-100' };
    }
  };

  // Get status text
  const getStatusText = (status: string, queuePosition?: number) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'uploading': return 'Uploading';
      case 'queued': return queuePosition ? `Queued (position ${queuePosition})` : 'Queued';
      case 'transcribing': return 'Transcribing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  // Calculate overall progress
  const overallProgress = files.length > 0 
    ? files.reduce((sum, f) => sum + f.progress, 0) / files.length 
    : 0;

  const completedCount = files.filter(f => f.status === 'completed').length;
  const failedCount = files.filter(f => f.status === 'failed').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Drop audio/video files here, or{' '}
            <label className="text-orange-600 hover:text-orange-700 cursor-pointer">
              browse files
              <input
                type="file"
                multiple
                accept="audio/*,video/*,.mp4,.mov,.avi,.mkv,.wav,.mp3,.m4a"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
            </label>
          </p>
          <p className="text-sm text-gray-500">
            Supports MP3, WAV, M4A, MP4, MOV, AVI, MKV and more
          </p>
        </div>
      </div>

      {/* Batch Controls */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Batch Files</h3>
              <p className="text-sm text-gray-500">
                {files.length} file(s) • {completedCount} completed • {failedCount} failed • {pendingCount} pending
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Diarization Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="batch-use-diarization"
                  checked={useDiarization}
                  onChange={(e) => setUseDiarization(e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="batch-use-diarization" className="text-sm font-medium text-gray-700">
                  Speaker Diarization (PyAnnote 3.1)
                </label>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={clearAllFiles}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear All
              </button>
                             <button
                 onClick={processAllFiles}
                 disabled={isUploading || pendingCount === 0}
                 className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
               >
                 {isUploading ? 'Processing...' : `Upload & Transcribe ${pendingCount} Files`}
               </button>
            </div>
          </div>

          {/* Overall Progress */}
          {isUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* File List */}
          <div className="space-y-3">
            {files.map((file) => {
              const statusDisplay = getStatusDisplay(file.status);
              const StatusIcon = statusDisplay.icon;

              return (
                <div 
                  key={file.id}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusDisplay.bg}`}>
                      {file.isVideo ? (
                        <FileVideo className={`w-5 h-5 ${statusDisplay.color}`} />
                      ) : (
                        <FileAudio className={`w-5 h-5 ${statusDisplay.color}`} />
                      )}
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
                      {file.isVideo && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Video
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <StatusIcon className="w-4 h-4" />
                        <span>{getStatusText(file.status, file.queuePosition)}</span>
                      </div>
                      {file.status === 'uploading' || file.status === 'queued' || file.status === 'transcribing' ? (
                        <span>{file.progress}%</span>
                      ) : null}
                    </div>
                    {file.error && (
                      <p className="text-sm text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(file.status === 'uploading' || file.status === 'transcribing') && (
                    <div className="w-24">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                                     {/* Actions */}
                   <div className="flex items-center space-x-2">
                     {file.status === 'completed' && file.transcriptionId && (
                       <button
                         onClick={() => router.push(`/transcriptions/${file.transcriptionId}`)}
                         className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                         title="View transcription"
                       >
                         <FileText className="w-4 h-4" />
                       </button>
                     )}
                     {file.status === 'completed' && !file.transcriptionId && (
                       <span 
                         className="p-2 text-gray-300 cursor-not-allowed"
                         title="Transcription ID not available"
                       >
                         <FileText className="w-4 h-4" />
                       </span>
                     )}
                     <button
                       onClick={() => removeFile(file.id)}
                       className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                       title="Remove file"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                </div>
              );
            })}
          </div>

          {/* Completed Transcriptions */}
          {completedCount > 0 && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {completedCount} transcription(s) completed successfully!
                </span>
              </div>
                             <p className="text-sm text-green-700 mt-1">
                 All transcriptions have been saved to your account and can be viewed in your transcriptions list with full speaker diarization support.
                 <a 
                   href="/transcriptions" 
                   className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium mt-2"
                 >
                   View All Transcriptions →
                 </a>
               </p>
            </div>
          )}

          {/* Failed Transcriptions */}
          {failedCount > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">
                  {failedCount} transcription(s) failed
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Check the error messages above and try again. You can remove failed files and re-add them.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Upgrade Modal - shown when trial ends */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
