'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { transcriptionService } from '../services/transcriptionService';
import { audioExtractionService } from '../services/audioExtractionService';
import { firebaseService } from '../services/firebaseService';
import { databaseService } from '../services/databaseService';
import { useTranscription } from '../hooks/useTranscription';
import { trialService } from '../services/trialService';
import { useBackgroundProcessing } from '../hooks/useBackgroundProcessing';
import UpgradeModal from './UpgradeModal';
import { useProgressNotification } from '../context/ProgressNotificationContext';
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
  FileText,
  Scissors,
  Layers
} from 'lucide-react';

interface BatchFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  isVideo: boolean;
  status: 'pending' | 'uploading' | 'transcribing' | 'completed' | 'failed' | 'splitting' | 'stitching';
  progress: number;
  transcriptionId?: string;
  transcriptionText?: string;
  error?: string;
  audioUrl?: string;
  // Enhanced chunking properties
  isLongAudio?: boolean;
  chunks?: any[];
  processingPhase?: 'idle' | 'splitting' | 'diarizing' | 'transcribing' | 'stitching' | 'complete';
}

export default function BatchTranscriptionUpload() {
  const { user } = useAuth();
  const router = useRouter();
  const { startJob } = useBackgroundProcessing();
  const { showNotification, updateNotification, hideNotification } = useProgressNotification();
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
                
                // Show completion notification
                updateNotification({ 
                  isVisible: true,
                  progress: 100, 
                  status: 'completed',
                  fileName: changeData.name
                });
                
                // Hide notification after delay
                setTimeout(() => {
                  console.log('🕐 [BatchTranscriptionUpload] Hiding notification after completion');
                  hideNotification();
                }, 5000);
                
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
                
                // Show failure notification
                updateNotification({ 
                  isVisible: true,
                  progress: 0, 
                  status: 'failed',
                  fileName: changeData.name,
                  error: 'Transcription failed'
                });
                
                setTimeout(() => hideNotification(), 3000);
                
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
  }, [user?.uid, hideNotification, updateNotification]);

    // Process single file - upload only
  const uploadFile = async (batchFile: BatchFile): Promise<{ audioFile: File; originalName: string; uploadResult: any }> => {
    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === batchFile.id 
        ? { ...f, status: 'uploading', progress: 0 }
        : f
    ));

    let audioFile: File;
    let originalName: string;

    // Handle video files - extract audio first
    if (batchFile.isVideo) {
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, progress: 10 }
          : f
      ));

      const extractionResult = await audioExtractionService.extractAudioFromVideo(batchFile.file);
      if (!extractionResult.success || !extractionResult.audioBlob) {
        throw new Error(`Audio extraction failed: ${extractionResult.error}`);
      }

      // Create a new file from the extracted audio
      audioFile = new File([extractionResult.audioBlob], `${batchFile.name}_audio.wav`, {
        type: 'audio/wav'
      });
      originalName = batchFile.name;
    } else {
      audioFile = batchFile.file;
      originalName = batchFile.name;
    }

    // Update progress
    setFiles(prev => prev.map(f => 
      f.id === batchFile.id 
        ? { ...f, progress: 30 }
        : f
    ));

    // Upload to Firebase first (same as regular transcription)
    const uploadResult = await transcriptionService.uploadFileToFirebase(audioFile);
    
    // Update progress
    setFiles(prev => prev.map(f => 
      f.id === batchFile.id 
        ? { ...f, progress: 60, status: 'pending' }
        : f
    ));

    return { audioFile, originalName, uploadResult };
  };

  // Check if file needs enhanced chunking
  const checkAudioDuration = async (audioFile: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioFile);
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        URL.revokeObjectURL(audio.src);
        resolve(duration);
      }, { once: true });
    });
  };

  // Optimized transcription for ALL files (no more chunking)
  const startEnhancedTranscription = async (batchFile: BatchFile, audioFile: File, originalName: string): Promise<void> => {
    try {
      console.log(`🎯 Starting optimized transcription workflow for ${originalName}...`);
      
      // Use the same optimized workflow for ALL files (no duration check needed)
      await handleOptimizedTranscription(batchFile, audioFile, originalName);
      
    } catch (error) {
      console.error(`Failed to transcribe file ${batchFile.name}:`, error);
      
      // Clean up tracking
      processedFileNamesRef.current.delete(batchFile.name);
      
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { 
              ...f, 
              status: 'failed', 
              error: error instanceof Error ? error.message : 'Transcription failed'
            }
          : f
      ));
    }
  };

  // Optimized transcription for ALL files (same as regular transcription)
  const handleOptimizedTranscription = async (batchFile: BatchFile, audioFile: File, originalName: string): Promise<void> => {
    try {
      console.log(`🎯 Starting optimized transcription for ${originalName}...`);
      
      // Track this file for Firestore listener
      processedFileNamesRef.current.add(originalName);
      console.log(`📝 [BatchTranscriptionUpload] Tracking file: ${originalName}`);
      
      // Step 1: Upload to Firebase
      console.log(`📤 Uploading ${originalName} to Firebase Storage...`);
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, status: 'uploading', progress: 10 }
          : f
      ));
      
      const uploadResult = await transcriptionService.uploadFileToFirebase(audioFile, (progress) => {
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, progress: 10 + (progress * 0.2) } // 10-30% for upload
            : f
        ));
      });
      
      console.log(`✅ ${originalName} uploaded to Firebase:`, uploadResult.url);
      
      // Step 2: Call optimized transcription API (same as regular transcription)
      console.log(`🎤 Calling optimized transcription API for ${originalName}...`);
    setFiles(prev => prev.map(f => 
      f.id === batchFile.id 
          ? { ...f, status: 'transcribing', progress: 30 }
        : f
    ));

      const response = await fetch('/api/transcribe-complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        audio_url: uploadResult.url,
          filename: originalName,
          settings: {
            use_diarization: useDiarization,
            max_speakers: null,
        include_timestamps: true,
            speaker_threshold: 0.35,
            single_speaker_mode: false
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Transcription API failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log(`✅ Optimized transcription complete for ${originalName}:`, {
        words: result.word_count,
        speakers: result.speaker_count,
        segments: result.diarized_transcript?.length
      });
      
      // Step 3: Save to database
      console.log(`💾 Saving ${originalName} to database...`);
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, progress: 90 }
          : f
      ));
      
      const recordId = await databaseService.createSTTRecord({
        user_id: user?.uid || 'unknown',
        audio_id: uploadResult.url.split('/').pop() || 'unknown',
        name: originalName,
        audio_file_url: uploadResult.url, // ✅ Use audio_file_url to match interface
        transcript: result.transcript || '',
        duration: result.duration || 0,
        language: 'en',
        status: 'completed',
        timestamps: result.timestamps || [],
        diarized_transcript: result.diarized_transcript || [],
        metadata: {
          word_count: (result.transcript || '').split(/\s+/).length,
          speaker_count: result.diarized_transcript?.length || 0,
          processing_method: 'optimized_pyannote_parakeet',
          chunks_processed: 1
        }
      }, result); // Pass full result to save to Storage
      
      console.log(`✅ ${originalName} saved to database with ID: ${recordId}`);

      // ✅ DEDUCT TRIAL MINUTES
      try {
        const actualDuration = result.metadata?.duration || result.duration || 0;
        const actualMinutes = Math.ceil(actualDuration / 60); // Convert seconds to minutes
        console.log(`📊 Deducting ${actualMinutes} minutes from trial for ${originalName}`);
        await trialService.deductMinutes(actualMinutes);
      } catch (error) {
        console.error('⚠️ Error deducting trial minutes:', error);
        // Don't fail the transcription if minute deduction fails
      }

    // Update with success
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              transcriptionId: recordId,
              transcriptionText: `Completed: ${result.word_count || 0} words, ${result.speaker_count || 0} speakers`,
              audioUrl: uploadResult.url
            }
          : f
      ));
      
    } catch (error) {
      console.error(`❌ Optimized transcription failed for ${originalName}:`, error);
      // Clean up tracking on error
      processedFileNamesRef.current.delete(originalName);
      throw error;
    }
  };

  // Enhanced long audio transcription with chunking
  const handleLongAudioTranscription = async (batchFile: BatchFile, audioFile: File, originalName: string): Promise<void> => {
    try {
      // Track this file for Firestore listener
      processedFileNamesRef.current.add(originalName);
      console.log(`📝 [BatchTranscriptionUpload] Tracking file: ${originalName}`);
      
      // Step 0: Upload full audio file for diarization
      console.log(`📤 Uploading ${originalName} for full-audio diarization...`);
      const fullAudioUpload = await transcriptionService.uploadFileToFirebase(audioFile);
      
      // Step 0.5: Run speaker diarization on FULL audio FIRST (if enabled)
      let fullAudioDiarizationSegments: any[] = [];
      if (useDiarization) {
        console.log(`🎤 Running speaker diarization on FULL audio for ${originalName}...`);
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, progress: 5, processingPhase: 'diarizing' }
            : f
        ));
        
        try {
          const diarizationResponse = await fetch('/api/transcribe-complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_url: fullAudioUpload.url,
              filename: originalName,
              settings: {
                use_diarization: true,
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
            console.log(`✅ Full audio diarization complete for ${originalName}: ${fullAudioDiarizationSegments.length} speaker segments`);
          } else {
            console.warn(`⚠️ Full audio diarization failed for ${originalName}, continuing without diarization`);
          }
        } catch (diarizationError) {
          console.warn(`⚠️ Full audio diarization error for ${originalName}:`, diarizationError);
        }
      }
      
      // Step 1: Split audio into chunks
      console.log(`🔪 Splitting ${originalName} into intelligent 15-minute chunks...`);
      const chunks = await splitTranscriptAudioIntoChunks(audioFile);
      
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, chunks, progress: 10, processingPhase: 'transcribing' }
          : f
      ));

      console.log(`✅ Split ${originalName} into ${chunks.length} chunks`);

      // Step 2: Transcribe each chunk
      const transcribedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎤 Transcribing ${originalName} chunk ${i + 1}/${chunks.length}`);
        
        // Update progress
        const chunkProgress = 10 + (i / chunks.length) * 70; // 10-80% for transcription
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, progress: chunkProgress }
            : f
        ));

        // Get chunk audio file
        const chunkResponse = await fetch(`/api/get-chunk-file?path=${encodeURIComponent(chunk.file_path)}`);
        if (!chunkResponse.ok) {
          throw new Error(`Failed to get chunk file ${i + 1} for ${originalName}`);
        }
        
        const chunkBlob = await chunkResponse.blob();
        const chunkFile = new File([chunkBlob], `${originalName}_chunk_${i + 1}.wav`, { type: 'audio/wav' });
        
        // Upload chunk to Firebase and transcribe - same pattern as regular transcription
        const chunkUploadResult = await transcriptionService.uploadFileToFirebase(chunkFile);
        
        const chunkResult = await transcriptionService.transcribeAudio(
          {
            audio_url: chunkUploadResult.url,
            audio_format: 'wav',
            include_timestamps: true,
            use_diarization: false  // ✅ No diarization per chunk - handled at full audio level
          },
          `${originalName}_chunk_${i + 1}`,
          undefined,
          (chunkStatus) => {
            console.log(`${originalName} Chunk ${i + 1}: ${chunkStatus}`);
          }
        );
        
        transcribedChunks.push({
          ...chunk,
          transcription_result: chunkResult
        });
      }

      // Step 3: Stitch transcripts together
      console.log(`🧩 Stitching ${originalName} transcripts with enhanced metadata...`);
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { ...f, status: 'stitching', progress: 85, processingPhase: 'stitching' }
          : f
      ));

      const finalResult = await stitchTranscriptsWithMetadata(transcribedChunks, fullAudioDiarizationSegments);
      
      console.log(`✅ Enhanced transcription completed for ${originalName}`);
      console.log(`📊 Final result: ${finalResult.word_count} words, ${finalResult.speaker_count} speakers`);

      // Save the final result to database
      console.log(`💾 Saving final result to database for ${originalName}...`);
      try {
        const recordId = await databaseService.createSTTRecord({
          user_id: user?.uid || 'unknown',
          audio_id: fullAudioUpload.url.split('/').pop() || 'unknown',
          name: originalName,
          audio_file_url: fullAudioUpload.url,
          transcript: finalResult.merged_text || finalResult.text || '',
          duration: finalResult.duration || 0,
          language: 'en',
          status: 'completed',
          timestamps: finalResult.timestamps || [],
          diarized_transcript: finalResult.diarized_transcript || [],
          metadata: {
            word_count: (finalResult.merged_text || finalResult.text || '').split(/\s+/).length,
            speaker_count: finalResult.diarized_transcript?.length || 0,
            processing_method: 'batch_enhanced_stitching',
            chunks_processed: finalResult.chunks?.length || 0
          }
        }, finalResult); // Pass full result to save to Storage
        
        console.log(`✅ Database record created for ${originalName}, ID: ${recordId}`);
        
        // Update with success including record ID
      setFiles(prev => prev.map(f => 
        f.id === batchFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100,
              processingPhase: 'complete',
                transcriptionId: recordId,
              transcriptionText: `Enhanced transcription: ${finalResult.word_count} words, ${finalResult.speaker_count} speakers`
            }
          : f
      ));
      } catch (dbError) {
        console.error(`❌ Failed to save ${originalName} to database:`, dbError);
        // Still update UI but mark as failed
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { 
                ...f, 
                status: 'failed', 
                error: 'Failed to save to database'
              }
            : f
        ));
      }

    } catch (error) {
      console.error(`❌ Enhanced transcription failed for ${originalName}:`, error);
      // Clean up tracking on error
      processedFileNamesRef.current.delete(originalName);
      throw error;
    }
  };

  // Helper functions for chunking (same as TranscriptionUpload)
  const splitTranscriptAudioIntoChunks = async (inputFile: File): Promise<any[]> => {
    try {
      const formData = new FormData();
      formData.append('inputFile', inputFile);
      formData.append('useSmartSplitting', 'true'); // Always use smart splitting for batch
      
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

  const stitchTranscriptsWithMetadata = async (transcribedChunks: any[], fullAudioDiarizationSegments?: any[]): Promise<any> => {
    try {
      const response = await fetch('/api/stitch-transcript-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunks: transcribedChunks,
          use_voice_embeddings: true,
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
    
    console.log('✅ User can transcribe batch, starting background processing...');

    // Mark the start of this batch session (to ignore old completed records)
    batchSessionStartTimeRef.current = Date.now();
    console.log(`📅 [BatchTranscriptionUpload] Batch session started at: ${new Date(batchSessionStartTimeRef.current).toISOString()}`);

    // Start background processing for each file
    const jobIds: string[] = [];
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const batchFile = pendingFiles[i];
      
      // Track this file BEFORE starting transcription so Firestore listener can match it
      processedFileNamesRef.current.add(batchFile.name);
      console.log(`📝 [BatchTranscriptionUpload] Tracking file for background processing: ${batchFile.name}`);
      try {
        // Show progress for current file
        showNotification(batchFile.name, 'uploading', 0);
        
        const jobId = await startJob(
          batchFile.file,
          batchFile.name,
          { use_diarization: useDiarization },
          (progress, status) => {
            updateNotification({
              progress,
              status: status as 'uploading' | 'processing' | 'completed' | 'failed'
            });
            
            // Auto-hide notification when completed
            if (status === 'completed') {
              setTimeout(() => {
                hideNotification();
              }, 2000);
            }
          }
        );
        jobIds.push(jobId);
        console.log(`🚀 Background job started for ${batchFile.name}: ${jobId}`);
        
        // Small delay between files to show progress
        if (i < pendingFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to start job for ${batchFile.name}:`, error);
        
        // Clean up tracking for failed files
        processedFileNamesRef.current.delete(batchFile.name);
        
        // Update file status to failed
        setFiles(prev => prev.map(f => 
          f.id === batchFile.id 
            ? { ...f, status: 'failed', error: error instanceof Error ? error.message : 'Failed to start transcription' }
            : f
        ));
        
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
    }
    
    // Show success message
    alert(`Batch transcription started! ${jobIds.length} files are being processed in the background. You can navigate away and check back later.`);
    
    // DON'T clear files - keep them so Firestore listener can update them when they complete
    // Update file statuses to 'transcribing' instead
    setFiles(prev => prev.map(f => {
      if (f.status === 'pending') {
        return { ...f, status: 'transcribing', progress: 50 };
      }
      return f;
    }));
    
    setIsUploading(false);
  };



  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' };
      case 'uploading':
        return { icon: Upload, color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'splitting':
        return { icon: Scissors, color: 'text-purple-500', bg: 'bg-purple-100' };
      case 'transcribing':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' };
      case 'stitching':
        return { icon: Layers, color: 'text-purple-500', bg: 'bg-purple-100' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' };
      default:
        return { icon: Info, color: 'text-gray-500', bg: 'bg-gray-100' };
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'uploading': return 'Uploading';
      case 'splitting': return 'Smart Splitting';
      case 'transcribing': return 'Transcribing';
      case 'stitching': return 'Stitching Results';
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
                  id="use-diarization"
                  checked={useDiarization}
                  onChange={(e) => setUseDiarization(e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="use-diarization" className="text-sm font-medium text-gray-700">
                  Speaker Diarization
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
                        <span>{getStatusText(file.status)}</span>
                      </div>
                      {file.status === 'uploading' || file.status === 'transcribing' ? (
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

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
                         <h4 className="font-medium mb-1">Optimized Batch Transcription</h4>
             <ul className="space-y-1">
               <li>• Video files will automatically have audio extracted for transcription</li>
               <li>• All files are uploaded to Firebase first (parallel processing)</li>
               <li>• Transcription jobs are started back-to-back to maximize GPU efficiency</li>
               <li>• Optimized for serverless GPU instances to reduce costs</li>
               <li>• All transcriptions are saved to your account with full diarization</li>
             </ul>
          </div>
        </div>
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
