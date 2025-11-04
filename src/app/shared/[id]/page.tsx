'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { databaseService, STTRecord } from '@/services/databaseService';
import { useSpeakerMapping } from '@/context/SpeakerMappingContext';
import DownloadModal from '@/components/DownloadModal';
import SpeakerMappingModal from '@/components/SpeakerMappingModal';
import Layout from '@/components/Layout';
import { 
  ArrowLeft,
  Download,
  Copy,
  Play,
  Volume2,
  Clock,
  FileText,
  Users,
  Sparkles,
  Lock,
  AlertCircle,
  User,
  Calendar,
  CheckCircle,
  Edit3
} from 'lucide-react';

export default function SharedTranscriptionPage() {
  const params = useParams();
  const router = useRouter();
  const transcriptionId = params.id as string;
  const { getSpeakerDisplayName } = useSpeakerMapping();
  
  const [transcription, setTranscription] = useState<STTRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [highlightedWords, setHighlightedWords] = useState<Set<number>>(new Set());

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

  // Function to combine consecutive speakers into paragraphs using word-level timestamps
  const combineConsecutiveSpeakers = (diarizedTranscript: any[], timestamps: any[]) => {
    if (!diarizedTranscript || diarizedTranscript.length === 0 || !timestamps || timestamps.length === 0) return [];
    
    const combinedSegments = [];
    let currentSegment = null;
    
    for (const segment of diarizedTranscript) {
      // Get all words that fall within this diarization segment's time range
      const segmentWords = timestamps
        .filter(word => word.start >= segment.start_time && word.end <= segment.end_time)
        .sort((a, b) => a.start - b.start); // Sort by timestamp
      
      if (segmentWords.length === 0) continue; // Skip empty segments
      
      const segmentText = segmentWords.map(word => word.text).join(' ');
      
      if (!currentSegment || currentSegment.speaker !== segment.speaker) {
        // New speaker - start new segment
        if (currentSegment) {
          combinedSegments.push(currentSegment);
        }
        currentSegment = {
          speaker: segment.speaker,
          start_time: segmentWords[0].start,
          end_time: segmentWords[segmentWords.length - 1].end,
          text: segmentText,
          words: segmentWords
        };
      } else {
        // Same speaker - combine with current segment
        currentSegment.end_time = segmentWords[segmentWords.length - 1].end;
        currentSegment.text += ' ' + segmentText;
        currentSegment.words.push(...segmentWords);
      }
    }
    
    // Add the last segment
    if (currentSegment) {
      combinedSegments.push(currentSegment);
    }
    
    return combinedSegments;
  };

  useEffect(() => {
    // Scroll to top when page loads or transcription ID changes
    window.scrollTo(0, 0);
    
    loadSharedTranscription();
  }, [transcriptionId]);

  const loadSharedTranscription = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the public transcription record
      const record = await databaseService.getPublicSTTRecord(transcriptionId);
      
      if (!record) {
        setError('This transcription is private or does not exist');
        setLoading(false);
        return;
      }

      console.log('🔍 Loaded public transcription record:', {
        id: record.id,
        name: record.name,
        hasTranscriptionDataUrl: !!record.transcription_data_url,
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
          });
          
          // Merge the full data with the record
          const mergedRecord = {
            ...record,
            transcript: fullTranscriptionData.transcript || record.transcript,
            timestamps: fullTranscriptionData.timestamps || record.timestamps,
            diarized_transcript: fullTranscriptionData.diarized_transcript || record.diarized_transcript
          };
          
          setTranscription(mergedRecord);
        } catch (storageError) {
          console.error('❌ Failed to load full transcription data from Storage:', storageError);
          console.warn('⚠️ Falling back to basic transcription record');
          setTranscription(record);
          setError('Full transcription data unavailable. Showing basic transcript only.');
        }
      } else {
        console.log('📝 Using basic transcription record (no Storage data)');
        setTranscription(record);
      }
    } catch (error) {
      console.error('Error loading shared transcription:', error);
      setError('Failed to load transcription');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
    const audio = document.getElementById('shared-transcription-audio') as HTMLAudioElement;
    console.log('🎯 Jump-to clicked:', { startTime, audioFound: !!audio });
    if (audio) {
      audio.currentTime = startTime;
      audio.play();
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

  if (loading) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transcription...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !transcription) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error || 'Transcription not found'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Sign Up Banner at Top */}
        <div className="bg-gradient-to-r from-purple-600 to-teal-600 text-white py-3 px-6 rounded-lg shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Want to create your own transcriptions?</p>
                <p className="text-xs text-purple-100">Get started with a free trial - no credit card required!</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors shadow-md text-sm"
            >
              Start Free Trial
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Homepage
            </button>
            
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Public View
            </div>
          </div>

          {/* Document Title */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900">
              {transcription.name || transcription.audio_id?.split('/').pop()?.split('?')[0] || 'Untitled Transcription'}
            </h1>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
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
          <div className="flex items-center space-x-3 mb-8">
            {transcription.transcript && (
              <>
                <button
                  onClick={() => copyToClipboard(transcription.transcript)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Transcript
                </button>
                
                {/* Download Button */}
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
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

        {/* Transcript Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200">
              {/* Document Content Area */}
              <div className="p-6">
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
                        {combineConsecutiveSpeakers(transcription.diarized_transcript, transcription.timestamps).map((segment, index) => (
                          <div 
                            key={index} 
                            className={`transition-all duration-200 ${
                              currentAudioTime >= segment.start_time && currentAudioTime <= segment.end_time
                                ? 'bg-yellow-50 border-l-4 border-l-yellow-500 pl-4' 
                                : ''
                            } cursor-pointer hover:bg-gray-50`}
                            onClick={() => handleTimestampClick(segment.start_time)}
                          >
                            {/* Speaker and Time Header */}
                            <div className="flex items-center space-x-3 mb-3">
                              <span className="font-semibold text-blue-600 text-sm">
                                {getSpeakerDisplayName(segment.speaker)}:
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                              </span>
                              {currentAudioTime >= segment.start_time && currentAudioTime <= segment.end_time && (
                                <span className="text-xs text-yellow-700 bg-yellow-200 px-2 py-1 rounded animate-pulse">
                                  🔴 Playing now
                                </span>
                              )}
                              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                Click to jump
                              </span>
                            </div>
                            
                            {/* Speaker Text Content with Word-Level Highlighting */}
                            <div className="text-gray-800 leading-relaxed text-base pl-4">
                              {/* Render words with individual highlighting in Speaker Segments */}
                              {segment.words && segment.words.length > 0 ? (
                                <span>
                                  {segment.words.map((word, wordIndex) => {
                                    // Highlight word slightly before it starts to account for timing delays
                                    const buffer = 0.15; // 150ms early buffer
                                    const nextWord = segment.words[wordIndex + 1];
                                    const nextStartTime = nextWord ? nextWord.start : segment.end_time;
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
                                        title={`${word.text} (${word.start.toFixed(2)}s - ${word.end.toFixed(2)}s)`}
                                      >
                                        {word.text}
                                        {wordIndex < segment.words.length - 1 ? ' ' : ''}
                                      </span>
                                    );
                                  })}
                                </span>
                              ) : segment.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Footer */}
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Characters: {transcription.transcript?.length || 0}</span>
                    <span>Words: {transcription.transcript?.split(/\s+/).filter(Boolean).length || 0}</span>
                    {transcription.timestamps && (
                      <span>Timestamps: {transcription.timestamps.length}</span>
                    )}
                    {transcription.diarized_transcript && (
                      <span>Speaker Segments: {transcription.diarized_transcript.length}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-600 font-medium">Public View</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Panels Sidebar - 1 column - LOCKED */}
          <div className="xl:col-span-1 space-y-6">
            {/* Locked AI Summary Panel */}
            <div className="relative bg-white rounded-lg border border-gray-200 p-6 min-h-[400px]">
              <div className="absolute inset-0 bg-gray-900 bg-opacity-60 rounded-lg flex items-center justify-center backdrop-blur-sm z-10">
                <div className="text-center text-white p-6">
                  <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">AI Features Locked</h3>
                  <p className="text-sm text-gray-200 mb-4">Sign up to unlock AI Summary & Chat</p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Summary</h3>
              <div className="text-gray-500 text-sm">
                AI-powered summary will appear here...
              </div>
            </div>

            {/* Locked AI Chat Panel */}
            <div className="relative bg-white rounded-lg border border-gray-200 p-6 min-h-[400px]">
              <div className="absolute inset-0 bg-gray-900 bg-opacity-60 rounded-lg flex items-center justify-center backdrop-blur-sm z-10">
                <div className="text-center text-white p-6">
                  <Lock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">AI Chat Locked</h3>
                  <p className="text-sm text-gray-200 mb-4">Sign up to chat with your transcript</p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Start Free Trial
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Chat</h3>
              <div className="text-gray-500 text-sm">
                Ask questions about your transcript...
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player - Pinned at Bottom */}
      {(transcription.audio_file_url || (transcription.metadata as any)?.original_audio_url) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
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
                    id="shared-transcription-audio"
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
      />

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        transcription={transcription}
        getSpeakerDisplayName={getSpeakerDisplayName}
      />
    </Layout>
  );
}

