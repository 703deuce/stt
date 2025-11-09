'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  FileText,
  List,
  Copy,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Volume2,
  Play,
  Pause
} from 'lucide-react';
import { clientAISummaryService, SummaryResponse } from '../services/clientAIServices';
import { ttsService } from '../services/ttsService';
import { summaryAudioService, SummaryAudioRecord } from '../services/summaryAudioService';
import { aiDataService } from '../services/aiDataService';
import { databaseService } from '../services/databaseService';
import { useAuth } from '../context/AuthContext';

interface AISummaryPanelProps {
  transcriptionText: string;
  transcriptionId: string;
  className?: string;
}

export default function AISummaryPanel({ transcriptionText, transcriptionId, className = '' }: AISummaryPanelProps) {
  const { user } = useAuth();
  const [fullTranscriptionText, setFullTranscriptionText] = useState<string>('');
  const [summaries, setSummaries] = useState<{
    brief?: SummaryResponse;
    detailed?: SummaryResponse;
    key_points?: SummaryResponse;
  }>({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'detailed' | 'key_points'>('brief');
  const [audioForTabs, setAudioForTabs] = useState<Record<string, string>>({});
  const [savedAudioRecords, setSavedAudioRecords] = useState<Record<string, SummaryAudioRecord>>({});
  const [expanded, setExpanded] = useState(true);
  
  // TTS state
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Fetch full transcription text on mount
  useEffect(() => {
    console.log('🚀 [AISummaryPanel] useEffect triggered:', {
      user: !!user,
      transcriptionId,
      transcriptionTextLength: transcriptionText.length
    });
    
    const fetchFullTranscriptionText = async () => {
      if (!user || !transcriptionId) {
        console.log('⚠️ [AISummaryPanel] Missing user or transcriptionId:', { user: !!user, transcriptionId });
        return;
      }
      
      try {
        console.log('🔍 [AISummaryPanel] Fetching full transcription text for AI summary...');
        
        // Get the transcription record to access transcription_data_url
        const transcriptionRecord = await databaseService.getSTTRecordById(transcriptionId, user.uid);
        
        if (transcriptionRecord?.transcription_data_url) {
          console.log('📥 Found transcription_data_url, fetching full text...');
          const fullData = await databaseService.getFullTranscriptionData(transcriptionRecord.transcription_data_url);
          
          if (fullData.transcript) {
            console.log('✅ Full transcription text loaded:', {
              length: fullData.transcript.length,
              preview: fullData.transcript.substring(0, 100) + '...'
            });
            setFullTranscriptionText(fullData.transcript);
          } else {
            console.warn('⚠️ No transcript found in full data, using provided text');
            setFullTranscriptionText(transcriptionText);
          }
        } else {
          console.warn('⚠️ No transcription_data_url found, using provided text');
          setFullTranscriptionText(transcriptionText);
        }
      } catch (error) {
        console.error('❌ Error fetching full transcription text:', error);
        console.warn('⚠️ Falling back to provided transcription text');
        setFullTranscriptionText(transcriptionText);
      }
    };

    fetchFullTranscriptionText();
  }, [user, transcriptionId]); // Remove transcriptionText from dependencies
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load existing AI data when component mounts
  useEffect(() => {
    if (user && transcriptionId) {
      loadExistingAIData();
      loadExistingSummaryAudio();
    }
  }, [user, transcriptionId]);

  // Real-time Firestore listener: Listen to AI data changes
  useEffect(() => {
    if (!user || !transcriptionId) return;

    console.log('👂 Setting up real-time Firestore listener for AI summaries...');
    
    let unsubscribe: (() => void) | null = null;
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { doc, onSnapshot } = firestore;
      // Match the document structure: ai_data/{transcriptionId}_{userId}
      const aiDataId = `${transcriptionId}_${user.uid}`;
      const aiDataRef = doc(db, 'ai_data', aiDataId);
      
      unsubscribe = onSnapshot(aiDataRef, (snapshot) => {
        console.log('📡 Firestore snapshot received:', {
          exists: snapshot.exists()
        });
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          const updatedAt = data?.updatedAt?.toMillis?.() || 0;
          const hasSummaries = !!data?.summaries && Object.keys(data.summaries).length > 0;
          
          console.log('📡 AI summary data changed:', {
            hasSummaries,
            summaryTypes: data?.summaries ? Object.keys(data.summaries) : [],
            updatedAt: new Date(updatedAt).toISOString()
          });
          
          // Only reload if data actually changed (updatedAt timestamp)
          const lastUpdate = parseInt(sessionStorage.getItem('lastSummaryUpdate') || '0');
          if (updatedAt > lastUpdate) {
            sessionStorage.setItem('lastSummaryUpdate', updatedAt.toString());
            console.log('🔄 Data changed, reloading summaries...');
            
            // If summaries exist, stop loading
            if (hasSummaries) {
              setLoading(false);
            }
            
            loadExistingAIData();
          } else {
            console.log('⏭️ No change detected, skipping reload');
          }
        } else {
          console.log('⚠️ Snapshot exists but is empty');
        }
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
      });
      
      console.log('✅ Firestore listener successfully set up for AI summaries');
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 Cleaning up AI summary Firestore listener');
        unsubscribe();
      }
    };
  }, [user, transcriptionId]);

  // Cleanup audio resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioElement, audioUrl]);

  const loadExistingAIData = async () => {
    if (!user || !transcriptionId) return;
    
    try {
      console.log('📥 Loading existing AI data...');
      const aiData = await aiDataService.getAIData(transcriptionId, user.uid);
      
      if (aiData && aiData.summaries) {
        console.log('✅ Found existing summaries:', Object.keys(aiData.summaries));
        setSummaries(aiData.summaries);
        // Stop loading when summaries are found
        setLoading(false);
      } else {
        console.log('ℹ️ No existing summaries found');
        // Keep loading if we're waiting for summaries
      }
    } catch (error) {
      console.error('❌ Error loading existing AI data:', error);
      setLoading(false);
    }
  };

  const generateSummaries = async () => {
    // Use full transcription text if available, otherwise fall back to provided text
    const textToUse = fullTranscriptionText || transcriptionText;
    
    console.log('🎯 [AISummaryPanel] generateSummaries called:', {
      fullTranscriptionTextLength: fullTranscriptionText.length,
      transcriptionTextLength: transcriptionText.length,
      textToUseLength: textToUse.length,
      usingFullText: !!fullTranscriptionText,
      fullTranscriptionPreview: fullTranscriptionText.substring(0, 100),
      transcriptionTextPreview: transcriptionText.substring(0, 100),
      textToUsePreview: textToUse.substring(0, 100)
    });
    
    if (!textToUse.trim()) {
      setError('No transcription text available');
      return;
    }

    if (!user || !transcriptionId) {
      setError('User not authenticated or transcription ID missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🤖 Generating summaries with text length:', textToUse.length);
      console.log('📝 Text preview:', textToUse.substring(0, 200) + '...');
      
      // Use background processing for better scalability
      const summaryTypes = ['brief', 'detailed', 'key_points'];
      const jobPromises = summaryTypes.map(async (type) => {
        const response = await fetch('/api/deepseek/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            transcriptionId,
            transcriptionText: textToUse, // Use full text instead of truncated
            summaryType: type,
            maxLength: type === 'brief' ? 200 : type === 'detailed' ? 500 : 300
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to start ${type} summary job`);
        }
        
        const result = await response.json();
        return { type, jobId: result.jobId };
      });
      
      const jobResults = await Promise.all(jobPromises);
      console.log('✅ All summary jobs started:', jobResults);
      
      // Keep loading state active - Firestore listener will update when summaries are ready
      setError(null);
      setLoading(true); // Keep loading until summaries arrive via Firestore listener
      
      // Results will be updated in real-time via Firestore listener
      // The listener will automatically detect when summaries are saved and update the UI
      
    } catch (err) {
      console.error('Failed to start summary jobs:', err);
      setError(err instanceof Error ? err.message : 'Failed to start summary generation');
      setLoading(false);
    }
  };

  const loadExistingSummaryAudio = async () => {
    if (!user || !transcriptionId) return;
    
    try {
      console.log('🔍 Loading existing summary audio records...');
      const records = await summaryAudioService.getSummaryAudioRecords(user.uid, transcriptionId);
      
      const recordsMap: Record<string, SummaryAudioRecord> = {};
      const audioUrlsMap: Record<string, string> = {};
      
      records.forEach(record => {
        recordsMap[record.summary_type] = record;
        audioUrlsMap[record.summary_type] = record.audio_url;
      });
      
      setSavedAudioRecords(recordsMap);
      setAudioForTabs(audioUrlsMap);
      
      console.log(`✅ Loaded ${records.length} existing summary audio records`);
    } catch (error) {
      console.error('❌ Failed to load existing summary audio:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const generateTTS = async (text: string) => {
    if (!text.trim()) {
      setTtsError('No text to convert to speech');
      return;
    }

    if (!user || !transcriptionId) {
      setTtsError('User not authenticated or transcription ID missing');
      return;
    }

    try {
      setTtsLoading(true);
      setTtsError(null);
      
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause();
        setIsPlaying(false);
      }

      // Generate TTS using the neutral professional preset
      const result = await ttsService.generateSpeech({
        text: text,
        ref_audio_name: 'belinda', // Use a default voice
        temperature: 0.32,
        top_p: 0.94,
        top_k: 45,
        chunk_method: 'word',
        chunk_max_word_num: 50,
        generation_chunk_buffer_size: 2,
        ras_win_len: 7,
        ras_win_max_num_repeat: 2,
        scene_description: 'Speak with a clear, neutral, professional tone for summarizing content.'
      });

      // Create audio blob from the result
      const audioBlob = ttsService.base64ToBlob(result.audio_base64, result.content_type);
      
      // Save audio to Firebase Storage and database
      console.log('💾 Saving summary audio to Firebase...');
      const uploadResult = await summaryAudioService.uploadSummaryAudio(
        audioBlob,
        user.uid,
        transcriptionId,
        activeTab,
        text,
        result.content_type
      );

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(`Failed to upload audio: ${uploadResult.error}`);
      }

      // Save record to database
      const recordId = await summaryAudioService.saveSummaryAudioRecord({
        user_id: user.uid,
        transcription_id: transcriptionId,
        summary_type: activeTab,
        audio_url: uploadResult.url,
        filename: uploadResult.filename!,
        content_type: result.content_type,
        duration: result.duration,
        summary_text: text
      });

      console.log('✅ Summary audio saved with record ID:', recordId);

      // Create local audio URL for immediate playback
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Store audio URL for this tab
      setAudioForTabs(prev => ({
        ...prev,
        [activeTab]: url
      }));

      // Update saved audio records
      const newRecord: SummaryAudioRecord = {
        id: recordId,
        user_id: user.uid,
        transcription_id: transcriptionId,
        summary_type: activeTab,
        audio_url: uploadResult.url,
        filename: uploadResult.filename!,
        content_type: result.content_type,
        duration: result.duration,
        timestamp: new Date(),
        summary_text: text
      };

      setSavedAudioRecords(prev => ({
        ...prev,
        [activeTab]: newRecord
      }));

      // Create audio element
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      setAudioElement(audio);

    } catch (err) {
      console.error('TTS generation failed:', err);
      setTtsError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setTtsLoading(false);
    }
  };

  const playPauseAudio = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
  };

  const stopAudio = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleTabChange = (tab: 'brief' | 'detailed' | 'key_points') => {
    setActiveTab(tab);
    
    // Stop current audio
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
    
    // Check if we have saved audio for this tab
    const savedRecord = savedAudioRecords[tab];
    if (savedRecord) {
      // Use the saved Firebase URL
      setAudioUrl(savedRecord.audio_url);
      const audio = new Audio(savedRecord.audio_url);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      setAudioElement(audio);
    } else {
      // Check for temporary audio URL (from current session)
      const existingAudioUrl = audioForTabs[tab];
      if (existingAudioUrl) {
        setAudioUrl(existingAudioUrl);
        const audio = new Audio(existingAudioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onpause = () => setIsPlaying(false);
        audio.onplay = () => setIsPlaying(true);
        setAudioElement(audio);
      } else {
        setAudioUrl(null);
        setAudioElement(null);
      }
    }
  };

  const getTabIcon = (type: string) => {
    switch (type) {
      case 'brief': return <FileText className="w-4 h-4" />;
      case 'detailed': return <FileText className="w-4 h-4" />;
      case 'key_points': return <List className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getTabLabel = (type: string) => {
    switch (type) {
      case 'brief': return 'Brief';
      case 'detailed': return 'Detailed';
      case 'key_points': return 'Key Points';
      default: return type;
    }
  };

  const renderSummaryContent = () => {
    const summary = summaries[activeTab];
    if (!summary) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTabIcon(activeTab)}
            <span className="font-medium text-gray-900">
              {getTabLabel(activeTab)} Summary
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {/* TTS Button */}
            <button
              onClick={() => generateTTS(summary.summary)}
              disabled={ttsLoading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Listen to summary"
            >
              {ttsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            
            {/* Play/Pause Button (only show if audio is available) */}
            {audioUrl && (
              <button
                onClick={playPauseAudio}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isPlaying ? 'Pause audio' : 'Play audio'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
            
            {/* Copy Button */}
          <button
              onClick={() => copyToClipboard(summary.summary)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy summary"
          >
              <Copy className="w-4 h-4" />
          </button>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed">
          {summary.summary}
          </div>
        </div>
        
        {/* TTS Error Display */}
        {ttsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">TTS Error</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{ttsError}</p>
          </div>
        )}
        
        {/* Audio Status */}
        {audioUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-green-800">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">Audio Ready</span>
                {isPlaying && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
              <button
                onClick={stopAudio}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Stop
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Original: {summary.word_count} words</span>
          <span>Summary: {summary.summary_length} words</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Summary</h3>
            <p className="text-xs text-gray-500">Powered by DeepSeek 3.1</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
        <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Generate Button */}
          {!summaries.brief && !loading && (
            <button
              onClick={generateSummaries}
              className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Summary</span>
            </button>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Generating AI summaries...</p>
              <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
        </div>
      )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-red-700 text-sm mt-2">{error}</p>
              <button
                onClick={generateSummaries}
                className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Summary Content */}
          {summaries.brief && !loading && (
            <div className="space-y-4">
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {(['brief', 'detailed', 'key_points'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                                        {getTabLabel(tab)}
                    {(audioForTabs[tab] || savedAudioRecords[tab]) && (
                      <Volume2 className="w-3 h-3 ml-1 text-purple-400" />
            )}
          </button>
        ))}
      </div>

              {/* Summary Content */}
              {renderSummaryContent()}

              {/* Regenerate Button */}
              <button
                onClick={generateSummaries}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate Summaries</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
