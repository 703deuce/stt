'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useSpeakerMapping } from '@/context/SpeakerMappingContext';
import { databaseService } from '@/services/databaseService';
import { STTRecord } from '@/services/databaseService';
import AISummaryPanel from '@/components/AISummaryPanel';
import AIChatPanel from '@/components/AIChatPanel';
import ContentRepurposingPanel from '@/components/ContentRepurposingPanel';
import SpeakerMappingModal from '@/components/SpeakerMappingModal';
import DownloadModal from '@/components/DownloadModal';
import ShareModal from '@/components/ShareModal';
import { 
  ArrowLeft,
  Edit3,
  Save,
  X,
  Copy,
  Download,
  Share2,
  Play,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Volume2
} from 'lucide-react';

export default function TranscriptionViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getSpeakerDisplayName, loadSpeakerMappings, updateSpeakerMapping, resetSpeakerMappings, isLoading: speakerMappingLoading } = useSpeakerMapping();
  const transcriptionId = params.id as string;
  
  const [transcription, setTranscription] = useState<STTRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());
  const [downloadFormat, setDownloadFormat] = useState<'formatted' | 'plain' | 'speakers_only' | 'speakers_with_timestamps'>('formatted');
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Get unique speakers from diarized transcript
  const uniqueSpeakers = React.useMemo(() => {
    if (!transcription?.diarized_transcript) return [];
    const speakers = new Set<string>();
    transcription.diarized_transcript.forEach(segment => {
      if (segment.speaker) {
        speakers.add(segment.speaker);
      }
    });
    return Array.from(speakers).sort();
  }, [transcription?.diarized_transcript]);

  // Use the pre-merged segments from the database (no client-side processing needed)
  const combinedSegments = transcription?.diarized_transcript || [];

  useEffect(() => {
    if (user && transcriptionId) {
      loadTranscription();
    }
  }, [user, transcriptionId]);

  const retryLoadFullData = async () => {
    if (!transcription?.transcription_data_url) return;
    
    try {
      setRetryLoading(true);
      setError(null);
      console.log('🔄 Retrying to load full transcription data...');
      
      const fullTranscriptionData = await databaseService.getFullTranscriptionData(transcription.transcription_data_url);
      console.log('📦 Full transcription data loaded on retry:', {
        hasTranscript: !!fullTranscriptionData.transcript,
        hasTimestamps: !!fullTranscriptionData.timestamps,
        hasDiarizedTranscript: !!fullTranscriptionData.diarized_transcript,
        timestampCount: fullTranscriptionData.timestamps?.length || 0,
        diarizedSegmentCount: fullTranscriptionData.diarized_transcript?.length || 0
      });
      
      // Merge the full data with the current transcription
      const mergedRecord = {
        ...transcription,
        transcript: fullTranscriptionData.transcript || transcription.transcript,
        timestamps: fullTranscriptionData.timestamps || transcription.timestamps,
        diarized_transcript: fullTranscriptionData.diarized_transcript || transcription.diarized_transcript
      };
      
      setTranscription(mergedRecord);
      console.log('✅ Full transcription data loaded successfully on retry!');
      
    } catch (storageError) {
      console.error('❌ Retry failed to load full transcription data:', storageError);
      setError('Retry failed. Full transcription data still unavailable.');
    } finally {
      setRetryLoading(false);
    }
  };

  const loadTranscription = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const record = await databaseService.getSTTRecordById(transcriptionId, user.uid);
      if (record) {
        console.log('🔍 Loaded transcription record:', {
          id: record.id,
          name: record.name,
          audio_file_url: record.audio_file_url,
          hasAudioFileUrl: !!record.audio_file_url,
          duration: record.duration,
          status: record.status,
          hasTranscriptionDataUrl: !!record.transcription_data_url,
          transcriptionDataUrl: record.transcription_data_url
        });
        
        // If there's a transcription_data_url, load the full transcription data from Storage
        if (record.transcription_data_url) {
          try {
            console.log('📦 Loading full transcription data from Storage...');
            const fullTranscriptionData = await databaseService.getFullTranscriptionData(record.transcription_data_url);
            console.log('📦 Full transcription data loaded:', {
              hasTranscript: !!fullTranscriptionData.transcript,
              hasTimestamps: !!fullTranscriptionData.timestamps,
              hasDiarizedTranscript: !!fullTranscriptionData.diarized_transcript,
              timestampCount: fullTranscriptionData.timestamps?.length || 0,
              diarizedSegmentCount: fullTranscriptionData.diarized_transcript?.length || 0,
              firstSegmentWords: fullTranscriptionData.diarized_transcript?.[0]?.words?.length || 0,
              firstSegmentText: fullTranscriptionData.diarized_transcript?.[0]?.text?.substring(0, 50) || 'No text'
            });
            
            // Merge the full data with the record
            const mergedRecord = {
              ...record,
              transcript: fullTranscriptionData.transcript || record.transcript,
              timestamps: fullTranscriptionData.timestamps || record.timestamps,
              diarized_transcript: fullTranscriptionData.diarized_transcript || record.diarized_transcript
            };
            
            setTranscription(mergedRecord);
            
            // Load speaker mappings for this transcription
            await loadSpeakerMappings(transcriptionId);
          } catch (storageError) {
            console.error('❌ Failed to load full transcription data from Storage:', storageError);
            console.warn('⚠️ Falling back to basic transcription record (no word-level timestamps)');
            
            // Fall back to the basic record but show a user-friendly message
            setTranscription(record);
            setError('Full transcription data unavailable. Showing basic transcript only.');
            
            // Load speaker mappings for this transcription
            await loadSpeakerMappings(transcriptionId);
          }
        } else {
          console.log('📝 Using basic transcription record (no Storage data)');
          setTranscription(record);
          
          // Load speaker mappings for this transcription
          await loadSpeakerMappings(transcriptionId);
        }
        
        setEditName(record.name || record.audio_id || '');
        setEditTranscript(record.transcript || '');
      } else {
        setError('Transcription not found');
      }
    } catch (err) {
      console.error('Error loading transcription:', err);
      setError('Failed to load transcription');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
    // Initialize edit transcript from speaker segments if available, otherwise use main transcript
    if (transcription?.diarized_transcript && transcription.diarized_transcript.length > 0) {
      const segmentTexts = transcription.diarized_transcript.map(segment => segment.text);
      setEditTranscript(segmentTexts.join('\n'));
    } else {
      setEditTranscript(transcription?.transcript || '');
    }
  };

  const saveChanges = async () => {
    if (!transcription) return;
    
    try {
      // If we have speaker segments, update them with the edited text while preserving all timing data
      let updatedTranscript = editTranscript;
      let updatedDiarizedTranscript = transcription.diarized_transcript;
      
      if (transcription.diarized_transcript && transcription.diarized_transcript.length > 0) {
        // Split the edited transcript by lines and update each speaker segment
        const editedLines = editTranscript.split('\n');
        updatedDiarizedTranscript = transcription.diarized_transcript.map((segment, index) => ({
          ...segment, // Preserve ALL original data (speaker, start_time, end_time)
          text: editedLines[index] || segment.text // Only update the text
        }));
        
        // Update the main transcript by joining all speaker segments
        updatedTranscript = updatedDiarizedTranscript.map(segment => segment.text).join(' ');
      }
      
      await databaseService.updateSTTRecord(transcription.id!, {
        name: editName.trim(),
        transcript: updatedTranscript.trim(),
        diarized_transcript: updatedDiarizedTranscript, // Preserve all timing data
        timestamps: transcription.timestamps // Preserve all timestamp data
      });
      
      // Update local state
      setTranscription(prev => prev ? {
        ...prev,
        name: editName.trim(),
        transcript: updatedTranscript.trim(),
        diarized_transcript: updatedDiarizedTranscript,
        timestamps: transcription.timestamps
      } : null);
      
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save changes:', error);
      // You could add error handling here
    }
  };

  const cancelEditing = () => {
    setEditName(transcription?.name || transcription?.audio_id || '');
    setEditTranscript(transcription?.transcript || '');
    setIsEditing(false);
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

  const formatTranscriptForDownload = () => {
    // Plain text format
    if (downloadFormat === 'plain') {
      return transcription.transcript || 'No transcript available';
    }

    // If no diarization data, fall back to plain text
    if (!transcription.diarized_transcript || !transcription.timestamps) {
      return transcription.transcript || 'No transcript available';
    }

    const combinedSegments = combineConsecutiveSpeakers(transcription.diarized_transcript, transcription.timestamps);
    
    // Speakers only format (no timestamps, no metadata)
    if (downloadFormat === 'speakers_only') {
      let formattedText = '';
      combinedSegments.forEach((segment, index) => {
        formattedText += `${getSpeakerDisplayName(transcriptionId, segment.speaker)}:\n`;
        formattedText += `${segment.text}\n\n`;
      });
      return formattedText.trim();
    }

    // Speakers with timestamps format (no metadata header)
    if (downloadFormat === 'speakers_with_timestamps') {
      let formattedText = '';
      combinedSegments.forEach((segment, index) => {
        const startTime = formatTime(segment.start_time);
        const endTime = formatTime(segment.end_time);
        
        formattedText += `${getSpeakerDisplayName(transcriptionId, segment.speaker)} [${startTime} - ${endTime}]:\n`;
        formattedText += `${segment.text}\n\n`;
      });
      return formattedText.trim();
    }

    // Full formatted version (default - with metadata header)
    let formattedText = `TRANSCRIPT: ${transcription.name || 'Untitled'}\n`;
    formattedText += `Duration: ${formatDuration(transcription.duration)}\n`;
    formattedText += `Generated: ${formatDate(transcription.timestamp)}\n\n`;
    formattedText += '='.repeat(50) + '\n\n';

    combinedSegments.forEach((segment, index) => {
      const startTime = formatTime(segment.start_time);
      const endTime = formatTime(segment.end_time);
      
      formattedText += `${getSpeakerDisplayName(transcriptionId, segment.speaker)} [${startTime} - ${endTime}]:\n`;
      formattedText += `${segment.text}\n\n`;
    });

    return formattedText;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Unknown';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Word-level highlighting functions
  const updateWordHighlighting = (currentTime: number) => {
    if (!transcription?.timestamps) return;
    
    const newHighlightedWords = new Set<number>();
    
    transcription.timestamps.forEach((timestamp, index) => {
      if (currentTime >= timestamp.start && currentTime <= timestamp.end) {
        newHighlightedWords.add(index);
      }
    });
    
    setHighlightedWords(newHighlightedWords);
    setCurrentAudioTime(currentTime);
  };

  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.target as HTMLAudioElement;
    const currentTime = audio.currentTime;
    updateWordHighlighting(currentTime);
  };

  const handleTimestampClick = (startTime: number) => {
    const audio = document.getElementById('transcription-audio') as HTMLAudioElement;
    console.log('🎯 Jump-to clicked:', { startTime, audioFound: !!audio, audioSrc: audio?.src });
    if (audio) {
      audio.currentTime = startTime;
      audio.play();
    } else {
      console.error('❌ Audio element not found for jump-to functionality');
    }
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!transcription?.id) return;
    
    try {
      await databaseService.togglePublicSTTRecord(transcription.id, isPublic);
      
      // Update local state
      setTranscription(prev => prev ? { ...prev, isPublic } : null);
    } catch (error) {
      console.error('Failed to toggle public status:', error);
      throw error;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  if (loading || !user) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6 max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {!user ? 'Loading authentication...' : 'Loading transcription...'}
              </p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !transcription) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6 max-w-4xl mx-auto">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error || 'Transcription not found'}</p>
              <div className="flex gap-3 justify-center">
                {error && error.includes('Full transcription data unavailable') && transcription?.transcription_data_url && (
                  <button
                    onClick={retryLoadFullData}
                    disabled={retryLoading}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {retryLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                        Retrying...
                      </>
                    ) : (
                      'Retry Loading Full Data'
                    )}
                  </button>
                )}
                <button
                  onClick={() => router.push('/transcriptions')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Back to Transcriptions
                </button>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          {/* Full-Width Top Toolbar */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
            {/* Main Toolbar */}
            <div className="border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <h2 className="text-lg font-semibold text-gray-900">Document Editor</h2>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <span className="text-sm text-gray-500">
                    {isEditing ? 'Editing Mode' : 'View Mode'}
                  </span>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <span className="text-sm text-gray-600">
                    {transcription?.name || transcription?.audio_id?.split('/').pop()?.split('?')[0] || 'Untitled Document'}
                  </span>
                </div>
                

              </div>
            </div>

            {/* Rich Text Toolbar - Full Width */}
            {isEditing && (
              <div className="px-6 py-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Text Formatting */}
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-medium text-gray-500 mr-2">Format:</span>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Bold">
                        <strong className="text-sm">B</strong>
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Italic">
                        <em className="text-sm">I</em>
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Underline">
                        <u className="text-sm">U</u>
                      </button>
                    </div>

                    {/* Text Alignment */}
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-medium text-gray-500 mr-2">Align:</span>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Align Left">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                        </svg>
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Align Center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h10a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                        </svg>
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Align Right">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm2 4a1 1 0 011-1h10a1 1 0 110 2H8a1 1 0 01-1-1zm2 4a1 1 0 011-1h6a1 1 0 110 2H10a1 1 0 01-1-1z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Lists */}
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-medium text-gray-500 mr-2">Lists:</span>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Bullet List">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                        </svg>
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" title="Numbered List">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Font Size */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500">Size:</span>
                      <select className="text-sm border border-gray-200 rounded px-2 py-1 bg-white">
                        <option>12</option>
                        <option>14</option>
                        <option>16</option>
                        <option>18</option>
                        <option>20</option>
                        <option>24</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Side Actions */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => copyToClipboard(editTranscript)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" 
                      title="Copy All"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowDownloadModal(true)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded border border-gray-200" 
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span className="text-xs text-gray-500">
                      Characters: {editTranscript.length} | Words: {editTranscript.split(/\s+/).filter(Boolean).length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <button
                onClick={() => router.push('/transcriptions')}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Transcriptions
              </button>
              
              <div className="flex items-center space-x-3">
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center bg-orange-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-sm"
                  >
                    <Edit3 className="w-5 h-5 mr-2" />
                    Edit Document
                  </button>
                ) : (
                  <>
                    <button
                      onClick={saveChanges}
                    className="inline-flex items-center bg-green-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-green-600 transition-colors font-medium shadow-sm"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </button>
                    <button
                      onClick={cancelEditing}
                    className="inline-flex items-center bg-gray-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div className="mb-6">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-2xl sm:text-4xl font-bold text-gray-900 border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 pb-3 bg-transparent"
                  placeholder={transcription.audio_id?.split('/').pop()?.split('?')[0] || "Enter document title..."}
                />
              ) : (
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">
                  {transcription.name || transcription.audio_id?.split('/').pop()?.split('?')[0] || 'Untitled Transcription'}
                </h1>
              )}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-3">
                {getStatusIcon(transcription.status)}
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium text-gray-900">{getStatusText(transcription.status)}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="font-medium text-gray-900">{formatDuration(transcription.duration)}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Language</div>
                  <div className="font-medium text-gray-900">{transcription.language || 'en'}</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="font-medium text-gray-900">{formatDate(transcription.timestamp)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mb-8 flex-wrap gap-3">
              {transcription.transcript && (
                <>
                  <button
                    onClick={() => copyToClipboard(transcription.transcript)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Transcript
                  </button>
                  
                  {/* Share Button */}
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </button>
                  
                  {/* Download Button */}
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </>
              )}
              
              {transcription.audio_file_url && (
                <a
                  href={transcription.audio_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play Audio
                </a>
              )}
            </div>
          </div>

          {/* Inline Error/Retry Notification */}
          {error && error.includes('Full transcription data unavailable') && transcription?.transcription_data_url && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Limited Transcript Available</h4>
                    <p className="text-sm text-yellow-700">Word-level timestamps and speaker diarization are unavailable due to a network issue.</p>
                  </div>
                </div>
                <button
                  onClick={retryLoadFullData}
                  disabled={retryLoading}
                  className="bg-yellow-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {retryLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Retrying...
                    </>
                  ) : (
                    'Retry'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Transcript Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Main Content - 3 columns */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200">
                {/* Document Content Area */}
                <div className="p-4 sm:p-6">
              {/* Complete Transcript Component - Hidden from UI but code preserved for TTS components */}
              {false && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Transcript</h3>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 max-h-96 overflow-y-auto">
                    <div className="prose prose-lg max-w-none">
                      <div
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        className={`text-gray-800 leading-relaxed text-base ${
                          isEditing 
                            ? 'outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded px-3 py-2 min-h-[2rem] bg-white border border-gray-200' 
                            : ''
                        }`}
                        onBlur={isEditing ? (e) => {
                          setEditTranscript(e.currentTarget.textContent || transcription?.transcript || '');
                        } : undefined}
                      >
                        {isEditing ? (editTranscript || transcription?.transcript || 'No transcript available') : (
                          // Render words with individual highlighting in Complete Transcript
                          transcription?.timestamps?.length ? (
                            <span>
                              {transcription?.timestamps?.map((word, wordIndex) => {
                                const nextWord = transcription.timestamps[wordIndex + 1];
                                const nextStartTime = nextWord ? nextWord.start : word.end;
                                // Add small buffer to account for audio processing delay
                                const buffer = 0.1; // 100ms buffer
                                const isHighlighted = currentAudioTime >= (word.start - buffer) && currentAudioTime < nextStartTime;
                                return (
                                  <span
                                    key={wordIndex}
                                    className={`transition-all duration-200 ${
                                      isHighlighted
                                        ? 'bg-yellow-300 text-yellow-900 font-bold px-1 rounded'
                                        : 'text-gray-800'
                                    }`}
                                    onClick={() => handleTimestampClick(word.start)}
                                    style={{ cursor: 'pointer' }}
                                    title={`${word.text} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s) - Current: ${currentAudioTime.toFixed(2)}s`}
                                  >
                                    {word.text}
                                    {wordIndex < (transcription?.timestamps?.length || 0) - 1 ? ' ' : ''}
                                  </span>
                                );
                              })}
                            </span>
                          ) : (transcription?.transcript || 'No transcript available')
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Speaker Segments - Detailed View */}
              {transcription.diarized_transcript && transcription.diarized_transcript.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Speaker Segments</h3>
                    <button
                      onClick={() => setShowSpeakerMapping(true)}
                      className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Rename Speakers</span>
                    </button>
                  </div>
                  
                  
                  {/* Speaker Segments in Transcript Format */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="space-y-6">
                      {combinedSegments.map((segment, index) => (
                        <div 
                          key={index} 
                          className={`transition-all duration-200 ${
                            currentAudioTime >= segment.start_time && currentAudioTime <= segment.end_time
                              ? 'bg-yellow-50 border-l-4 border-l-yellow-500 pl-4' 
                              : ''
                          } ${isEditing ? '' : 'cursor-pointer hover:bg-gray-50'}`}
                          onClick={isEditing ? undefined : () => handleTimestampClick(segment.start_time)}
                        >
                          {/* Speaker and Time Header */}
                          <div className="flex items-center space-x-3 mb-3">
                            <span className="font-semibold text-blue-600 text-sm">
                              {getSpeakerDisplayName(transcriptionId, segment.speaker)}:
                            </span>
                            <span className="text-xs text-gray-500 font-mono">
                              {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                            </span>
                            {currentAudioTime >= segment.start_time && currentAudioTime <= segment.end_time && (
                              <span className="text-xs text-yellow-700 bg-yellow-200 px-2 py-1 rounded animate-pulse">
                                🔴 Playing now
                              </span>
                            )}
                            {!isEditing && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                Click to jump
                              </span>
                            )}
                          </div>
                          
                          {/* Speaker Text Content with Word-Level Highlighting */}
                          <div
                            contentEditable={isEditing}
                            suppressContentEditableWarning
                            className={`text-gray-800 leading-relaxed text-base ${
                              isEditing 
                                ? 'outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset rounded px-3 py-2 min-h-[1.5rem] bg-white border border-gray-200' 
                                : 'pl-4'
                            }`}
                            onBlur={isEditing ? (e) => {
                              const lines = editTranscript.split('\n');
                              lines[index] = e.currentTarget.textContent || segment.text;
                              setEditTranscript(lines.join('\n'));
                            } : undefined}
                            onKeyDown={isEditing ? (e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            } : undefined}
                          >
                            {isEditing ? (editTranscript.split('\n')[index] || segment.text) : (
                              // Render words with individual highlighting in Speaker Segments
                              segment.words && segment.words.length > 0 ? (
                                <span>
                                  {segment.words.map((word, wordIndex) => {
                                    // Highlight word with buffer to account for audio processing delay
                                    const nextWord = segment.words[wordIndex + 1];
                                    const nextStartTime = nextWord ? nextWord.start : word.end;
                                    // Add small buffer to account for audio processing delay
                                    const buffer = 0.1; // 100ms buffer
                                    const isHighlighted = currentAudioTime >= (word.start - buffer) && currentAudioTime < nextStartTime;
                                    
                                    if (word.text === 'the' && isHighlighted) {
                                      // Word highlighting logic
                                    }
                                    
                                    return (
                                      <span
                                        key={wordIndex}
                                        className={`transition-all duration-200 ${
                                          isHighlighted
                                            ? 'bg-yellow-300 text-yellow-900 font-bold px-1 rounded'
                                            : 'text-gray-800'
                                        }`}
                                        onClick={() => handleTimestampClick(word.start)}
                                        style={{ cursor: 'pointer' }}
                                        title={`${word.text || word.word} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s) - Current: ${currentAudioTime.toFixed(2)}s`}
                                      >
                                        {word.text || word.word}
                                        {wordIndex < segment.words.length - 1 ? ' ' : ''}
                                      </span>
                                    );
                                  })}
                                </span>
                              ) : segment.text
                            )}
                      </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

                </div>
              </div>

              {/* Document Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
                <div className="flex items-center space-x-4">
                  <span className="whitespace-nowrap">Characters: {isEditing ? editTranscript.length : (transcription.transcript?.length || 0)}</span>
                  <span className="whitespace-nowrap">Words: {isEditing ? editTranscript.split(/\s+/).filter(Boolean).length : (transcription.transcript?.split(/\s+/).filter(Boolean).length || 0)}</span>
                  {transcription.timestamps && (
                    <span className="whitespace-nowrap">Timestamps: {transcription.timestamps.length}</span>
                  )}
                  {transcription.diarized_transcript && (
                    <span className="whitespace-nowrap">Speaker Segments: {transcription.diarized_transcript.length}</span>
                  )}
                  {isEditing && (
                    <span className="text-orange-600 font-medium">• Timing data preserved</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span>Last saved: {new Date().toLocaleTimeString()}</span>
                  {isEditing && (
                    <span className="text-orange-600 font-medium">• Editing</span>
                  )}
                </div>
                </div>
              </div>
            </div>

            {/* AI Panels Sidebar - 1 column */}
            <div className="lg:col-span-1 space-y-6">
              <AISummaryPanel 
                transcriptionText={transcription.transcript || ''} 
                transcriptionId={transcriptionId}
                className="sticky top-6"
              />
              <AIChatPanel 
                transcriptionText={transcription.transcript || ''} 
                transcriptionId={transcriptionId}
                className="sticky top-6"
              />
              <ContentRepurposingPanel 
                transcriptionText={transcription.transcript || ''} 
                transcriptionId={transcriptionId}
                className="sticky top-6"
              />
            </div>
          </div>
        </div>
      </Layout>
      {/* Audio Player - Pinned at Bottom */}
      {(transcription.audio_file_url || (transcription.metadata as any)?.original_audio_url) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          {(() => { console.log('🎵 Rendering audio player with URL:', transcription.audio_file_url || (transcription.metadata as any)?.original_audio_url); return null; })()}
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Audio Info */}
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Volume2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">{transcription.name || transcription.audio_id?.split('/').pop()?.split('?')[0]}</h4>
                  <p className="text-xs text-gray-500">
                    Duration: {formatDuration(transcription.duration)} • 
                    {transcription.timestamps ? ` ${transcription.timestamps.length} timestamped words` : ' No timestamps'}
                  </p>
                </div>
              </div>

              {/* Center: Audio Controls */}
              <div className="flex-1 max-w-2xl mx-8">
                <div className="flex items-center space-x-4">
                  {/* Audio Player */}
                  <audio
                    id="transcription-audio"
                    controls
                    className="flex-1"
                    src={transcription.audio_file_url || (transcription.metadata as any)?.original_audio_url}
                    onTimeUpdate={handleAudioTimeUpdate}
                  />
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{formatTime(currentAudioTime)}</span>
                    <span>{formatDuration(transcription.duration)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-100 shadow-sm"
                      style={{ 
                        width: `${transcription.duration ? (currentAudioTime / transcription.duration) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Right: Status & Actions */}
              <div className="flex items-center space-x-3">
                {/* Highlighting Status */}
                {transcription.timestamps && transcription.timestamps.length > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-yellow-700 font-medium">
                      Highlighting Active
                    </span>
                  </div>
                )}
                
                {/* Current Position Info */}
                <div className="text-right">
                  <div className="text-xs text-gray-500">Current Position</div>
                  <div className="text-sm font-mono text-gray-900">
                    {formatTime(currentAudioTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Spacing for Fixed Audio Player */}
      {(transcription.audio_file_url || (transcription.metadata as any)?.original_audio_url) && <div className="h-24"></div>}

      {/* Speaker Mapping Modal */}
      <SpeakerMappingModal
        isOpen={showSpeakerMapping}
        onClose={() => setShowSpeakerMapping(false)}
        speakers={uniqueSpeakers}
        transcriptionId={transcriptionId}
        updateSpeakerMapping={updateSpeakerMapping}
        resetSpeakerMappings={resetSpeakerMappings}
        isLoading={speakerMappingLoading}
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        transcription={transcription}
        getSpeakerDisplayName={getSpeakerDisplayName}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        transcriptionId={transcription?.id || ''}
        transcriptionName={transcription?.name || 'Transcript'}
        isPublic={transcription?.isPublic || false}
        onTogglePublic={handleTogglePublic}
      />
    </ProtectedRoute>
  );
}
