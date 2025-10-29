'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, Download, Copy, CheckCircle, Edit3 } from 'lucide-react';
import { useSpeakerMapping } from '../context/SpeakerMappingContext';
import SpeakerMappingModal from './SpeakerMappingModal';
import DownloadModal from './DownloadModal';

interface DiarizedWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string;
}

interface DiarizedSegment {
  speaker: string;
  start_time: number;
  end_time: number;
  text: string;
  words?: DiarizedWord[];
}

interface TranscriptionResultsProps {
  result: {
    transcript?: string;
    text?: string;
    merged_text?: string;
    diarized_transcript?: DiarizedSegment[];
    timestamps?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
    metadata?: any;
    // For loading full data from Storage
    transcription_data_url?: string;
  };
  audioUrl?: string;
  isPublicView?: boolean;
}

export default function TranscriptionResults({ result, audioUrl, isPublicView = false }: TranscriptionResultsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  const [showSpeakerMapping, setShowSpeakerMapping] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { getSpeakerDisplayName } = useSpeakerMapping();

  // Get transcript text from any available source
  const transcript = result.transcript || result.text || result.merged_text || '';

  // Flatten all words from all segments for highlighting
  const allWords = result.diarized_transcript?.flatMap(segment => segment.words || []) || result.timestamps || [];

  // Get unique speakers from diarized transcript
  const uniqueSpeakers = React.useMemo(() => {
    if (!result.diarized_transcript) return [];
    const speakers = new Set<string>();
    result.diarized_transcript.forEach(segment => {
      if (segment.speaker) {
        speakers.add(segment.speaker);
      }
    });
    return Array.from(speakers).sort();
  }, [result.diarized_transcript]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Find the current word being spoken
      const currentWordIndex = allWords.findIndex(word => 
        audio.currentTime >= word.start && audio.currentTime <= word.end
      );
      
      setHighlightedWordIndex(currentWordIndex >= 0 ? currentWordIndex : null);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setHighlightedWordIndex(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [allWords]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekToTime = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker: string) => {
    const colors = [
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-rose-100 text-rose-800 border-rose-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200'
    ];
    
    // Extract speaker number and use it for consistent coloring
    const speakerNum = parseInt(speaker.replace(/\D/g, '')) || 0;
    return colors[speakerNum % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      {audioUrl && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <audio ref={audioRef} src={audioUrl} preload="metadata" />
          
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlayPause}
              className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-1" />
              )}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                <Volume2 className="w-4 h-4" />
                <span>{formatTime(currentTime)} / {formatTime(result.metadata?.duration || 0)}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 cursor-pointer" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                const newTime = percentage * (result.metadata?.duration || 0);
                seekToTime(newTime);
              }}>
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-100"
                  style={{ width: `${(currentTime / (result.metadata?.duration || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Transcription Details</h3>
          {!isPublicView && (
            <button
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Duration:</span>
            <div className="font-medium">{formatTime(result.metadata?.duration || 0)}</div>
          </div>
          <div>
            <span className="text-gray-600">Speakers:</span>
            <div className="font-medium">{result.metadata?.speaker_count || 0}</div>
          </div>
          <div>
            <span className="text-gray-600">Words:</span>
            <div className="font-medium">{(result.metadata?.word_count || 0).toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-600">Processing:</span>
            <div className="font-medium text-xs">{result.metadata?.processing_method || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Speaker Segments - Only show if diarization is available */}
      {result.diarized_transcript && result.diarized_transcript.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Speaker Segments</h3>
            <div className="flex items-center space-x-2">
              {!isPublicView && (
                <button
                  onClick={() => setShowSpeakerMapping(true)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Rename Speakers</span>
                </button>
              )}
              <button
                onClick={() => copyToClipboard(
                  result.diarized_transcript?.map(segment => 
                    `${getSpeakerDisplayName('', segment.speaker)}: ${segment.text}`
                  ).join('\n\n') || '', 
                  'segments'
                )}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copiedText === 'segments' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedText === 'segments' ? 'Copied!' : 'Copy Segments'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {result.diarized_transcript.map((segment, segmentIndex) => (
            <div key={segmentIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getSpeakerColor(segment.speaker)}`}>
                  {getSpeakerDisplayName('', segment.speaker)}
                </div>
                <div className="text-sm text-gray-600">
                  {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                </div>
              </div>
              
              <div className="text-gray-900 leading-relaxed">
                {segment.words?.map((word, wordIndex) => {
                  const globalWordIndex = allWords.findIndex(w => w === word);
                  const isHighlighted = highlightedWordIndex === globalWordIndex;
                  
                  return (
                    <span
                      key={wordIndex}
                      className={`cursor-pointer transition-all duration-200 ${
                        isHighlighted 
                          ? 'bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded font-medium' 
                          : 'hover:bg-gray-100 px-1 py-0.5 rounded'
                      }`}
                      onClick={() => seekToTime(word.start)}
                      title={`${word.word} (${formatTime(word.start)} - ${formatTime(word.end)})`}
                    >
                      {word.word}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Full Transcript */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Full Transcript</h3>
          <button
            onClick={() => copyToClipboard(transcript, 'full')}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copiedText === 'full' ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedText === 'full' ? 'Copied!' : 'Copy Full Text'}</span>
          </button>
        </div>
        
        <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
          {transcript}
        </div>
      </div>

      {/* Word-level Timestamps */}
      {result.timestamps && result.timestamps.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Word Timestamps</h3>
            <button
              onClick={() => copyToClipboard(
                result.timestamps?.map(ts => `${formatTime(ts.start)} - ${formatTime(ts.end)}: ${ts.text}`).join('\n') || '',
                'timestamps'
              )}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {copiedText === 'timestamps' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedText === 'timestamps' ? 'Copied!' : 'Copy Timestamps'}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {result.timestamps.map((timestamp, index) => (
              <div
                key={index}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  highlightedWordIndex === index 
                    ? 'bg-yellow-100 border-yellow-300' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => seekToTime(timestamp.start)}
              >
                <div className="text-xs text-gray-600 mb-1">
                  {formatTime(timestamp.start)} - {formatTime(timestamp.end)}
                </div>
                <div className="text-sm font-medium">{timestamp.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speaker Mapping Modal - Only for authenticated users */}
      {!isPublicView && (
        <SpeakerMappingModal
          isOpen={showSpeakerMapping}
          onClose={() => setShowSpeakerMapping(false)}
          speakers={uniqueSpeakers}
          transcriptionId=""
          updateSpeakerMapping={async () => {}}
          resetSpeakerMappings={async () => {}}
          isLoading={false}
        />
      )}

      {/* Download Modal - Only for authenticated users */}
      {!isPublicView && (
        <DownloadModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          transcription={{
            name: 'Transcription',
            transcript,
            diarized_transcript: result.diarized_transcript,
            timestamps: result.timestamps,
            duration: result.metadata?.duration,
            metadata: result.metadata,
          }}
          getSpeakerDisplayName={(speaker) => getSpeakerDisplayName('', speaker)}
        />
      )}
    </div>
  );
}
