'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranscription } from '@/hooks/useTranscription';
import { clientTranscriptionService } from '@/services/clientTranscriptionService';
import { audioExtractionService } from '@/services/audioExtractionService';
import { trialService } from '@/services/trialService';
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing';
import TranscriptionResults from './TranscriptionResults';
import UpgradeModal from './UpgradeModal';
import RunPodFallbackTest from './RunPodFallbackTest';
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
  TestTube,
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
  
  // Cleanup audio extraction service on unmount
  useEffect(() => {
    return () => {
      audioExtractionService.cleanup();
    };
  }, []);

  // Real-time Firestore listener: Listen for transcription completion
  useEffect(() => {
    if (!auth.currentUser) return;

    console.log('👂 Setting up Firestore listener for transcription updates...');
    
    let unsubscribe: (() => void) | null = null;
    let isInitialLoad = true; // Track if this is the initial load
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { collection, onSnapshot, orderBy, limit } = firestore;
      // Listen to the user's STT subcollection for ANY changes
      const sttCollection = collection(db, 'users', auth.currentUser!.uid, 'stt');
      
      const queryRef = firestore.query(
        sttCollection,
        orderBy('timestamp', 'desc'),
        limit(3) // Listen to recent 3 transcriptions
      );
      
      unsubscribe = onSnapshot(queryRef, (snapshot) => {
        console.log('📡 [TranscriptionUpload] Firestore snapshot received:', {
          isEmpty: snapshot.empty,
          size: snapshot.size,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
          docChanges: snapshot.docChanges().length,
          isInitialLoad
        });
        
        if (!snapshot.empty) {
          const latestDoc = snapshot.docs[0];
          const data = latestDoc.data();
          
          console.log('📡 [TranscriptionUpload] Latest transcription:', {
            id: latestDoc.id,
            status: data.status,
            name: data.name
          });
          
          // Check what changed
          const changes = snapshot.docChanges();
          changes.forEach((change) => {
            console.log('📝 [TranscriptionUpload] Document change:', {
              type: change.type, // 'added', 'modified', 'removed'
              docId: change.doc.id,
              status: change.doc.data().status,
              isInitialLoad
            });
            
            // Skip processing on initial load to avoid triggering notifications for existing transcriptions
            if (isInitialLoad) {
              console.log('⏭️ [TranscriptionUpload] Skipping initial load changes');
              return;
            }
            
            // If status changed to completed or failed, update notification
            if (change.type === 'modified' || change.type === 'added') {
              const changeData = change.doc.data();
              
              if (changeData.status === 'completed') {
                console.log('✅ [TranscriptionUpload] Transcription completed! Updating notification to 100%');
                
                // Only show notification if there's an active notification
                if (notification.isVisible) {
                  updateNotification({ progress: 100, status: 'completed' });
                  
                  setTimeout(() => {
                    console.log('🕐 [TranscriptionUpload] Hiding notification after completion');
                    hideNotification();
                  }, 5000);
                }
                
                if (onTranscriptionComplete) {
                  onTranscriptionComplete({ jobId: change.doc.id, status: 'completed' });
                }
              } else if (changeData.status === 'failed') {
                console.log('❌ [TranscriptionUpload] Transcription failed!');
                
                // Only show notification if there's an active notification
                if (notification.isVisible) {
                  updateNotification({ progress: 0, status: 'failed' });
                  setTimeout(() => hideNotification(), 3000);
                }
              }
            }
          });
          
          // Mark initial load as complete after first snapshot
          if (isInitialLoad) {
            isInitialLoad = false;
            console.log('✅ [TranscriptionUpload] Initial load complete, now listening for real changes');
          }
        } else {
          console.log('📭 [TranscriptionUpload] No transcriptions found');
          isInitialLoad = false; // Mark as complete even if no data
        }
      }, (error) => {
        console.error('❌ [TranscriptionUpload] Firestore listener error:', error);
      });
      
      console.log('✅ [TranscriptionUpload] Firestore listener successfully set up');
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 [TranscriptionUpload] Cleaning up Firestore listener');
        unsubscribe();
      }
    };
  }, [hideNotification, updateNotification, onTranscriptionComplete, notification.isVisible]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedAudioFile, setExtractedAudioFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
        const validation = transcriptionService.validateAudioFile(file);
        console.log('🔍 Validation result:', validation);
        if (!validation.valid) {
          console.log('❌ File validation failed:', validation.error);
          alert(validation.error);
          return;
        }
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
        const validation = transcriptionService.validateAudioFile(file);
        if (!validation.valid) {
          alert(validation.error);
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
            (progress, status) => {
              console.log(`📊 Progress update: ${progress}% - ${status}`);
              updateNotification({
                progress,
                status: status as 'uploading' | 'processing' | 'completed' | 'failed'
              });
              
              // Auto-hide notification when completed
              if (status === 'completed') {
                console.log('✅ Transcription completed, hiding notification in 5 seconds');
                setTimeout(() => {
                  hideNotification();
                }, 5000);
              }
            }
          );
          console.log(`🚀 Background job started with ID: ${jobId}`);
          
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
            audio_format: 'wav',
            include_timestamps: true,
            use_diarization: false  // ✅ No diarization per chunk - handled at full audio level
          },
          `chunk_${i + 1}`,
          undefined,
          (chunkStatus) => {
            console.log(`Chunk ${i + 1}: ${chunkStatus}`);
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
      formData.append('useSmartSplitting', useSmartSplitting.toString());
      
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
          use_voice_embeddings: useVoiceEmbeddings,
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

  const testAPIConnection = async () => {
    console.log('🧪 ===== TESTING API CONNECTION =====');
    try {
      const isConnected = await transcriptionService.testAPIConnection();
      if (isConnected) {
        alert('✅ API connection test successful!');
      } else {
        alert('❌ API connection test failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ API connection test error:', error);
      alert('❌ API connection test error. Check console for details.');
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
      
      {/* RunPod Fallback Test Component */}
      <RunPodFallbackTest />

      {/* File Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Audio/Video File</h3>
          <p className="text-sm text-gray-600">Your file will be automatically uploaded to Firebase Storage for transcription. Parakeet supports both audio and video files.</p>
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
        
        {/* Firebase Info */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Firebase Storage Integration:</p>
              <p className="text-xs mt-1">
                All audio and video files are automatically uploaded to your Firebase Storage before transcription. 
                This ensures optimal processing and no file size limits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transcription Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transcription Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Speaker Diarization</label>
              <p className="text-sm text-gray-500">Identify "who spoke when"</p>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Audio Format
            </label>
            <select
              value={settings.audio_format}
              onChange={(e) => setSettings(prev => ({ ...prev, audio_format: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
              <option value="flac">FLAC</option>
              <option value="ogg">OGG</option>
              <option value="m4a">M4A</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Smart Splitting (Long Audio)</label>
              <p className="text-sm text-gray-500">Split at silence boundaries for audio over 15 minutes</p>
            </div>
            <input
              type="checkbox"
              checked={useSmartSplitting}
              onChange={(e) => setUseSmartSplitting(e.target.checked)}
              className="w-4 h-4 text-purple-500 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Voice Embeddings (Advanced)</label>
              <p className="text-sm text-gray-500">Use AI voice recognition for speaker consistency across chunks</p>
            </div>
            <input
              type="checkbox"
              checked={useVoiceEmbeddings}
              onChange={(e) => setUseVoiceEmbeddings(e.target.checked)}
              className="w-4 h-4 text-blue-500 rounded"
            />
          </div>
        </div>

        {/* Enhanced Long Transcription Info */}
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Clock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-purple-800">
              <p className="font-medium">Enhanced Long Audio Support:</p>
              <p className="text-xs mt-1">
                Files over 15 minutes are automatically chunked into intelligent segments with preserved speaker diarization and timestamps. 
                Smart splitting avoids cutting words mid-speech for professional quality.
              </p>
              {useVoiceEmbeddings && (
                <p className="text-xs mt-2 font-medium text-blue-800">
                  🎤 Voice Embeddings: Advanced AI speaker recognition ensures the same speaker gets consistent IDs across all chunks.
                </p>
              )}
            </div>
          </div>
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
                {processingPhase === 'uploading' && 'Uploading to Firebase Storage...'}
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
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Uploading to Firebase Storage...</span>
                <span className="font-medium">{uploadProgress.toFixed(1)}%</span>
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
              <div className="text-sm text-purple-600">{chunkProgress.toFixed(1)}% complete</div>
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
        {/* Test API Connection Button */}
        <button
          onClick={testAPIConnection}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-medium flex items-center space-x-2"
        >
          <TestTube className="w-4 h-4" />
          <span>Test API Connection</span>
        </button>

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
