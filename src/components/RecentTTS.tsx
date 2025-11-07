'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ttsDatabaseService, TTSRecord } from '../services/ttsDatabaseService';
import { 
  Volume2, 
  Calendar, 
  User, 
  ArrowRight, 
  Play, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Edit3,
  X,
  Clock
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function RecentTTS() {
  const { user } = useAuth();
  const [recentTTS, setRecentTTS] = useState<TTSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  // Expose refresh function to parent components
  const refresh = () => {
    if (user) {
      loadRecentTTS();
    }
  };

  // Make refresh function available globally for other components to call
  useEffect(() => {
    (window as any).refreshRecentTTS = refresh;
    return () => {
      delete (window as any).refreshRecentTTS;
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadRecentTTS();
    }
  }, [user]);

  const loadRecentTTS = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the 5 most recent TTS generations
      const ttsRecords = await ttsDatabaseService.getTTSRecords(user!.uid, 5);
      setRecentTTS(ttsRecords);
    } catch (err) {
      console.error('Error loading recent TTS:', err);
      setError('Failed to load recent TTS generations');
    } finally {
      setLoading(false);
    }
  };

  const normalizeDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
      return new Date(value.seconds * 1000 + value.nanoseconds / 1_000_000);
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const formatDate = (record: TTSRecord) => {
    const date = normalizeDate(record.completedAt)
      || normalizeDate(record.timestamp)
      || normalizeDate(record.createdAt);

    if (!date) return 'Unknown';

    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const playTTSAudio = (ttsRecord: TTSRecord) => {
    if (ttsRecord.audio_url) {
      // Play from Firebase URL
      const audio = new Audio(ttsRecord.audio_url);
      audio.play();
    }
  };

  const startEditing = (ttsRecord: TTSRecord) => {
    setEditingId(ttsRecord.id || '');
    setEditName(ttsRecord.name || `TTS - ${ttsRecord.voice_name}`);
  };

  const saveName = async (ttsRecord: TTSRecord) => {
    if (!ttsRecord.id || !editName.trim()) return;
    
    try {
      await ttsDatabaseService.updateTTSRecord(ttsRecord.id, { name: editName.trim() });
      
      // Update local state
      setRecentTTS(prev => 
        prev.map(t => 
          t.id === ttsRecord.id 
            ? { ...t, name: editName.trim() }
            : t
        )
      );
      
      setEditingId(null);
      setEditName('');
    } catch (error) {
      console.error('Failed to update name:', error);
      // You could add error handling here
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent TTS Generations</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent TTS Generations</h2>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRecentTTS}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Recent TTS Generations</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{recentTTS.length} documents</span>
          <a 
            href="/tts" 
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>

      {recentTTS.length === 0 ? (
        <div className="text-center py-12">
          <Volume2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No TTS generations yet</h3>
          <p className="text-gray-600 mb-4">Start by generating speech from text</p>
          <a 
            href="/tts" 
            className="inline-flex items-center bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <Volume2 className="w-5 h-5 mr-2" />
            Start Generating
          </a>
        </div>
      ) : (
        <div className="space-y-0">
          {recentTTS.map((ttsRecord) => (
            <div 
              key={ttsRecord.id} 
              className="flex items-center space-x-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group last:border-b-0"
            >
              {/* Document Icon */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-green-600" />
                </div>
              </div>

              {/* Document Name and Voice */}
              <div className="flex-1 min-w-0">
                {editingId === ttsRecord.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName(ttsRecord);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => saveName(ttsRecord)}
                      className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                      title="Save"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium text-gray-900 truncate">
                      {ttsRecord.name || 'Untitled TTS Generation'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium">
                        {ttsRecord.voice_name || 'Unknown Voice'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp and Status */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{formatDate(ttsRecord)}</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(ttsRecord.status)}
                  <span className="text-xs font-medium text-gray-600">
                    {getStatusText(ttsRecord.status)}
                  </span>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center space-x-2">
                {ttsRecord.input_text && (
                  <button
                    onClick={() => copyToClipboard(ttsRecord.input_text)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy input text"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                
                {ttsRecord.audio_url && (
                  <button
                    onClick={() => playTTSAudio(ttsRecord)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Play audio"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}

                {/* More options menu (like the "..." in the image) */}
                {/* Edit button removed as requested */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
