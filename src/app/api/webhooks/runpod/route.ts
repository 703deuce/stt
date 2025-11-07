import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase/firestore';
import { getWebSocketManager } from '@/lib/websocket';
import { jobMappingService } from '@/services/jobMappingService';

interface RunPodWebhookPayload {
  id: string;
  status: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
  output?: any;
  error?: string;
  executionTime?: number;
}

interface RunPodOutput {
  text?: string;
  transcript?: string;
  merged_text?: string;
  diarized_transcript?: Array<{
    speaker: string;
    start_time: number;
    end_time: number;
    text: string;
  }>;
  word_timestamps?: Array<{
    start: number;
    end: number;
    word: string;
    text?: string;
    confidence?: number;
  }>;
  segment_timestamps?: Array<{
    start: number;
    end: number;
    segment: string;
    start_offset?: number;
    end_offset?: number;
  }>;
  char_timestamps?: Array<{
    start: number;
    end: number;
    char: string[];
    start_offset?: number;
    end_offset?: number;
  }>;
  audio_duration_seconds?: number;
  duration?: number;
  speakers_detected?: number;
  chunks_processed?: number;
  workflow?: string;
  processing_method?: string;
  model_used?: string;
  audio_url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: RunPodWebhookPayload = await request.json();

    console.log('🔔 ========== WEBHOOK RECEIVED FROM RUNPOD ==========');
    console.log('📦 Raw payload:', JSON.stringify(payload, null, 2));
    console.log('🆔 Job ID:', payload.id);
    console.log('📊 Status:', payload.status);
    console.log('⏱️ Execution Time:', payload.executionTime);
    console.log('📤 Has Output:', !!payload.output);
    console.log('❌ Has Error:', !!payload.error);
    console.log('====================================================');

    // Validate webhook payload
    if (!payload.id || !payload.status) {
      console.error('❌ Invalid webhook payload - missing id or status');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Get WebSocket manager
    const wsManager = getWebSocketManager();
    
    // Get user ID for this job
    const userId = await jobMappingService.getUserForJob(payload.id);
    
    if (!userId) {
      return NextResponse.json({ error: 'No user mapping found' }, { status: 400 });
    }
    
    if (payload.status === 'COMPLETED') {
      
        // Fetch the actual results from RunPod since webhook might not include full output
        try {
          const { transcriptionService } = await import('@/services/transcriptionService');
          
          // Try to get job status - the service will try both endpoints
          console.log(`🔍 Attempting to fetch job status for: ${payload.id}`);
          const fullResult = await transcriptionService.checkJobStatus(payload.id);
          console.log('📦 Full RunPod job status response:', JSON.stringify(fullResult, null, 2));
        
        if (fullResult.output) {
          // Type assertion for RunPod output
          const output = fullResult.output as RunPodOutput;
          
          // With single API call, we should always get the complete result
          // Check if we have the essential data
          const hasText = output.text || output.transcript || output.merged_text;
          const hasDiarization = output.diarized_transcript && output.diarized_transcript.length > 0;
          const hasWordTimestamps = (output.word_timestamps && output.word_timestamps.length > 0) ||
                                   (output.segment_timestamps && output.segment_timestamps.length > 0) ||
                                   (output.char_timestamps && output.char_timestamps.length > 0);
        

          // Update database with the completed transcription
          try {
            const { databaseService } = await import('@/services/databaseService');
            
            // First, try to find existing "processing" record by RunPod job ID
            console.log(`🔍 Looking for existing processing record with RunPod job ID: ${payload.id}`);
            console.log(`🔍 User ID: ${userId}`);
            let existingRecord = await databaseService.findSTTRecordByRunpodJobId(payload.id, userId);
            console.log(`🔍 Existing record found by job ID:`, existingRecord ? { id: existingRecord.id, status: existingRecord.status, runpodJobId: existingRecord.metadata?.runpod_job_id } : 'null');
            
            // Fallback: Try to find by filename if job ID lookup failed
            if (!existingRecord) {
              console.log(`🔍 Job ID lookup failed, trying to find by filename from job mapping...`);
              try {
                const { jobMappingService } = await import('@/services/jobMappingService');
                const jobMapping = await jobMappingService.getJobMappingByRunpodId(payload.id);
                if (jobMapping?.fileName) {
                  console.log(`🔍 Found job mapping with filename: ${jobMapping.fileName}`);
                  // Query for processing records with this filename
                  const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
                  const { db } = await import('@/config/firebase');
                  const sttCollection = collection(db, 'users', userId, 'stt');
                  const q = query(
                    sttCollection,
                    where('name', '==', jobMapping.fileName),
                    where('status', 'in', ['processing', 'queued']),
                    limit(1)
                  );
                  const snapshot = await getDocs(q);
                  if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    const foundRecord = { id: doc.id, ...doc.data() } as any;
                    existingRecord = foundRecord;
                    console.log(`✅ Found existing record by filename: ${foundRecord.id}`);
                  }
                }
              } catch (error) {
                console.error('⚠️ Error finding record by filename:', error);
              }
            }
            
            // Extract the actual transcription text from the correct field
            const transcriptText = output.text || output.transcript || output.merged_text || '';
            
            // Get the best available timestamp data
            const wordTimestamps = output.word_timestamps || [];
            const segmentTimestamps = output.segment_timestamps || [];
            const charTimestamps = output.char_timestamps || [];
            
            // Use word timestamps if available, otherwise use segment timestamps
            const timestamps = wordTimestamps.length > 0 ? wordTimestamps.map(w => ({
              start: w.start,
              end: w.end,
              text: w.word || w.text || ''
            })) : segmentTimestamps.length > 0 ? segmentTimestamps.map(s => ({
              start: s.start,
              end: s.end,
              text: s.segment || ''
            })) : charTimestamps.length > 0 ? charTimestamps.map(c => ({
              start: c.start,
              end: c.end,
              text: c.char?.join('') || ''
            })) : [];
            
            
            // Transform diarized transcript to include word-level data
            const enhancedDiarizedTranscript = (output.diarized_transcript || []).map(segment => {
              // Find words that fall within this segment's time range
              const segmentWords = (output.word_timestamps || []).filter(word => 
                word.start >= segment.start_time && word.end <= segment.end_time
              );
              
              return {
                ...segment,
                words: segmentWords.map(word => ({
                  start: word.start,
                  end: word.end,
                  text: word.word || word.text || '',
                  speaker: segment.speaker
                }))
              };
            });
            
            
            // Combine consecutive speakers into merged segments
            const mergedSegments = [];
            let currentSegment = null;
            
            for (const segment of enhancedDiarizedTranscript) {
              if (!currentSegment || currentSegment.speaker !== segment.speaker) {
                // Different speaker - start new segment
                if (currentSegment) {
                  mergedSegments.push(currentSegment);
                }
                currentSegment = {
                  speaker: segment.speaker,
                  start_time: segment.start_time,
                  end_time: segment.end_time,
                  text: segment.text,
                  words: segment.words || []
                };
              } else {
                // Same speaker - combine with current segment
                currentSegment.end_time = segment.end_time;
                currentSegment.text += ' ' + segment.text;
                currentSegment.words.push(...(segment.words || []));
              }
            }
            
            // Add the last segment
            if (currentSegment) {
              mergedSegments.push(currentSegment);
            }
            
            
            // Transform RunPod data to match expected format
            const transformedData = {
              transcript: transcriptText,
              timestamps: timestamps,
              diarized_transcript: mergedSegments,
              runpod_output: output
            };

            let recordId: string;
            let fileName: string;

            if (existingRecord && (existingRecord.status === 'processing' || existingRecord.status === 'queued')) {
              // Update existing processing/queued record
              console.log(`✅ Found existing ${existingRecord.status} record, updating: ${existingRecord.id}`);
              recordId = existingRecord.id!;
              fileName = existingRecord.name || 'transcription';
              
              // Reset retry count on successful completion
              const retryCount = existingRecord.retryCount || 0;
              
              // Import activeJobsService for cleanup
              const { activeJobsService } = await import('@/services/activeJobsService');
              const { serverTimestamp } = await import('firebase/firestore');
              
              // Calculate processing time if startedAt exists
              let processingTime: number | undefined;
              if (existingRecord.startedAt) {
                const startedAt = existingRecord.startedAt instanceof Date 
                  ? existingRecord.startedAt.getTime() 
                  : existingRecord.startedAt instanceof Timestamp 
                    ? existingRecord.startedAt.toDate().getTime()
                    : typeof existingRecord.startedAt === 'number'
                      ? existingRecord.startedAt
                      : Date.now();
                processingTime = Math.round((Date.now() - startedAt) / 1000); // Convert to seconds
              }
              
              const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
              const { storage, db } = await import('@/config/firebase');
              const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

              const recordRef = firestoreDoc(db, 'users', userId, 'stt', recordId);

              let transcriptionDataUrl: string | undefined;
              try {
                const transcriptionDataRef = ref(storage, `transcription_data/${userId}/transcription_data_${payload.id}.json`);
                await uploadBytes(transcriptionDataRef, new Blob([JSON.stringify(transformedData)], { type: 'application/json' }));
                transcriptionDataUrl = await getDownloadURL(transcriptionDataRef);
                console.log(`✅ Updated transcription data URL: ${transcriptionDataUrl}`);
              } catch (storageError) {
                console.error('⚠️ Failed to save transcription data to Storage:', storageError);
              }

              const updatePayload: any = {
                status: 'completed',
                transcript: transcriptText,
                duration: output.audio_duration_seconds || output.duration || 0,
                timestamps,
                diarized_transcript: mergedSegments,
                retryCount: 0,
                error: null,
                completedAt: serverTimestamp(),
                processingTime,
                metadata: {
                  ...existingRecord.metadata,
                  word_count: transcriptText.split(/\s+/).length,
                  speaker_count: output.segment_timestamps?.length || output.diarized_transcript?.length || 0,
                  processing_method: 'webhook_processing',
                  chunks_processed: 1,
                  runpod_job_id: payload.id,
                  execution_time: payload.executionTime
                }
              };

              if (transcriptionDataUrl) {
                updatePayload.transcription_data_url = transcriptionDataUrl;
              }

              await setDoc(recordRef, updatePayload, { merge: true });

              console.log(`✅ Updated existing record ${recordId} to completed status`);
              
              await activeJobsService.removeActiveJob(userId, recordId, 'stt');
            } else {
              // No existing record found - create new one (fallback for old jobs)
              console.log('⚠️ No existing processing record found, creating new record (fallback)');
              
              // Get job info from database mapping for filename
              fileName = 'Transcription';
              try {
                const { jobMappingService } = await import('@/services/jobMappingService');
                const jobMapping = await jobMappingService.getJobMappingByRunpodId(payload.id);
                if (jobMapping?.fileName) {
                  fileName = jobMapping.fileName;
                }
              } catch (error) {
                console.warn('⚠️ Could not get job mapping:', error);
              }
              
              recordId = await databaseService.createSTTRecord({
                user_id: userId,
                audio_id: payload.id,
                name: fileName,
                audio_file_url: output.audio_url || '',
                transcript: transcriptText,
                duration: output.audio_duration_seconds || output.duration || 0,
                language: 'en',
                status: 'completed',
                timestamps: timestamps,
                diarized_transcript: mergedSegments,
                metadata: {
                  word_count: transcriptText.split(/\s+/).length,
                  speaker_count: output.segment_timestamps?.length || output.diarized_transcript?.length || 0,
                  processing_method: 'webhook_processing',
                  chunks_processed: 1,
                  runpod_job_id: payload.id,
                  execution_time: payload.executionTime
                } as any
              }, transformedData, userId);
            }
              
            // Deduct trial minutes
            try {
              const { trialService } = await import('@/services/trialService');
              const actualDuration = output.audio_duration_seconds || output.duration || 0;
              const actualMinutes = Math.ceil(actualDuration / 60); // Convert seconds to minutes
              console.log(`📊 Deducting ${actualMinutes} minutes from trial for: ${fileName}`);
              await trialService.deductMinutesForUser(userId, actualMinutes);
            } catch (error) {
              console.error('⚠️ Error deducting trial minutes:', error);
              // Don't fail the transcription if minute deduction fails
            }
              
            // Initialize default speaker mappings (with retry logic to avoid race condition)
            try {
              const { speakerMappingService } = await import('@/services/speakerMappingService');
              const uniqueSpeakers = [...new Set(mergedSegments.map(seg => seg.speaker))];
              
              console.log(`🔧 Debug: Initializing speaker mappings for recordId: ${recordId}, userId: ${userId}, speakers: ${uniqueSpeakers.length}`);
              
              // Retry logic to handle race condition
              let retries = 3;
              while (retries > 0) {
                try {
                  await speakerMappingService.initializeDefaultMappings(recordId, uniqueSpeakers, userId);
                  console.log(`✅ Speaker mappings initialized for ${recordId}`);
                  break;
                } catch (error: any) {
                  console.log(`❌ Speaker mapping attempt failed: ${error.message}, collection: ${error.message.includes('stt_records') ? 'stt_records (OLD)' : 'users subcollection (NEW)'}`);
                  if (error.code === 'not-found' && retries > 1) {
                    console.log(`⏳ Document not ready, retrying in 500ms... (${retries} retries left)`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    retries--;
                  } else {
                    throw error;
                  }
                }
              }
            } catch (error) {
              console.error('❌ Error initializing speaker mappings:', error);
              // This is not critical - speaker mappings can be initialized later
            }
          } catch (error) {
            console.error('❌ Error saving transcription to database:', error);
          }
        } else {
          console.warn('⚠️ No output data in RunPod result for job:', payload.id);
        }
      } catch (error) {
        console.error('❌ Error fetching full results from RunPod:', error);
      }

    } else if (payload.status === 'FAILED') {
      console.log('❌ Transcription failed for job:', payload.id);
      
      // Update job status to failed
      try {
        const { databaseService } = await import('@/services/databaseService');
        const { activeJobsService } = await import('@/services/activeJobsService');
        
        // Find existing record by RunPod job ID
        const existingRecord = await databaseService.findSTTRecordByRunpodJobId(payload.id, userId);
        
        if (existingRecord) {
          // Update main STT record
          await databaseService.updateSTTRecord(existingRecord.id!, {
            status: 'failed',
            error: payload.error || 'Job failed in RunPod'
          }, userId);
          
          // Remove from activeJobs
          await activeJobsService.removeActiveJob(userId, existingRecord.id!, 'stt');
          
          console.log(`✅ Job ${existingRecord.id} marked as failed`);
        }
      } catch (error) {
        console.error('❌ Error updating job to failed status:', error);
        // Don't fail the webhook - continue with failure update
      }
      
      // Emit failure update
      if (wsManager) {
        await wsManager.emitJobUpdate({
          userId: userId || 'system',
          jobId: payload.id,
          type: 'transcription',
          status: 'failed',
          progress: 0,
          data: {
            error: payload.error
          }
        });
      }

    } else if (payload.status === 'IN_PROGRESS') {
      console.log('⏳ Transcription in progress for job:', payload.id);
      
      // Update status to 'processing' and set startedAt timestamp
      try {
        const { databaseService } = await import('@/services/databaseService');
        const { activeJobsService } = await import('@/services/activeJobsService');
        const { serverTimestamp } = await import('firebase/firestore');
        
        // Find existing record by RunPod job ID
        const existingRecord = await databaseService.findSTTRecordByRunpodJobId(payload.id, userId);
        
        // Note: IN_PROGRESS webhook is not typically sent by RunPod
        // Status should already be 'processing' from immediate update after submission
        // This handler is kept for edge cases but shouldn't normally be needed
        if (existingRecord && existingRecord.status === 'queued') {
          console.log(`🔄 Updating job ${existingRecord.id} from queued to processing`);
          
          // Update main STT record
          await databaseService.updateSTTRecord(existingRecord.id!, {
            status: 'processing',
            startedAt: serverTimestamp() as Timestamp
          }, userId);
          
          // Update activeJobs record
          await activeJobsService.addActiveJob(userId, existingRecord.id!, {
            status: 'processing',
            startedAt: serverTimestamp() as Timestamp
          });
          
          console.log(`✅ Job ${existingRecord.id} updated to processing with startedAt timestamp`);
        } else {
          console.log(`ℹ️ Job ${existingRecord?.id} already in processing state (expected)`);
        }
      } catch (error) {
        console.error('❌ Error updating job to processing status:', error);
        // Don't fail the webhook - continue with progress update
      }
      
      // Emit progress update
      if (wsManager) {
        await wsManager.emitJobUpdate({
          userId: userId || 'system',
          jobId: payload.id,
          type: 'transcription',
          status: 'processing',
          progress: 50,
          data: {
            executionTime: payload.executionTime
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('❌ Error processing RunPod webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

