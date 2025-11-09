'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { STTRecord, databaseService } from '../services/databaseService';
import {
  FileText,
  Clock,
  Calendar,
  ArrowRight,
  Play,
  Copy,
  CheckCircle,
  AlertCircle,
  Edit3,
  X,
} from 'lucide-react';
import { useTranscriptionPagination } from '@/hooks/useTranscriptionPagination';

interface RecentTranscriptionsProps {
  pendingTranscriptions?: STTRecord[];
}

const toDate = (value: any): Date | null => {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (value && typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
    const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
    return new Date(value.seconds * 1000 + nanoseconds / 1_000_000);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const getRecordTimestamp = (record: STTRecord): number => {
  const sources = [
    record.completedAt,
    record.timestamp,
    record.createdAt,
    record.startedAt,
    record.queuedAt,
  ];

  for (const source of sources) {
    const date = toDate(source);
    if (date) {
      return date.getTime();
    }
  }

  return 0;
};

const formatDate = (record: STTRecord): string => {
  const date = toDate(record.completedAt)
    || toDate(record.timestamp)
    || toDate(record.createdAt)
    || toDate(record.startedAt)
    || toDate(record.queuedAt);

  if (!date) {
    return 'Unknown';
  }

  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInHours < 48) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds: number) => {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'processing':
      return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
    case 'queued':
      return <Clock className="w-4 h-4 text-purple-500" />;
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
    case 'queued':
      return 'Queued';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
};

const getPendingKey = (record: STTRecord): string | undefined => {
  return (
    record.id ??
    ((record.metadata as { client_pending_id?: string } | undefined)?.client_pending_id)
  );
};

export default function RecentTranscriptions({ pendingTranscriptions = [] }: RecentTranscriptionsProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const {
    items,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    error,
  } = useTranscriptionPagination(user?.uid, {
    pageSize: 20,
    enableRealtime: true,
  });

  const combinedTranscriptions = useMemo(() => {
    const ordered: STTRecord[] = [];
    const seen = new Set<string>();

    const addRecord = (record: STTRecord) => {
      const key = getPendingKey(record);
      if (key && seen.has(key)) {
        return;
      }

      ordered.push(record);
      if (key) {
        seen.add(key);
      }
    };

    pendingTranscriptions.forEach(addRecord);
    items.forEach(addRecord);

    ordered.sort((a, b) => getRecordTimestamp(b) - getRecordTimestamp(a));
    return ordered;
  }, [items, pendingTranscriptions]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // no-op: clipboard permission denied
    });
  };

  const startEditing = (transcription: STTRecord) => {
    setEditingId(transcription.id || '');
    setEditName(transcription.name || transcription.audio_id || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveName = async (transcription: STTRecord) => {
    if (!transcription.id || !editName.trim()) return;

    try {
      await databaseService.updateSTTRecord(transcription.id, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      refresh();
    } catch (err) {
      console.error('Failed to update transcription name:', err);
    }
  };

  if (loadingInitial && combinedTranscriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transcriptions</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && combinedTranscriptions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transcriptions</h2>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
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
        <h2 className="text-xl font-semibold text-gray-900">Recent Transcriptions</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{combinedTranscriptions.length} documents</span>
          <a
            href="/transcriptions"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>

      {combinedTranscriptions.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transcriptions yet</h3>
          <p className="text-gray-600 mb-4">Start by uploading an audio file to transcribe</p>
          <a
            href="/transcriptions"
            className="inline-flex items-center bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <FileText className="w-5 h-5 mr-2" />
            Start Transcribing
          </a>
        </div>
      ) : (
        <div className="space-y-0">
          {combinedTranscriptions.map((transcription, index) => {
            const key = getPendingKey(transcription) ?? `transcription-${index}`;

            return (
              <div
                key={key}
                className="flex items-center space-x-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group last:border-b-0"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === transcription.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveName(transcription);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => saveName(transcription)}
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
                      <h3 className="font-medium text-gray-900 truncate mb-1">
                        <a
                          href={`/transcriptions/${transcription.id}`}
                          className="hover:text-orange-600 transition-colors"
                        >
                          {transcription.name || transcription.audio_id || 'Untitled Transcription'}
                        </a>
                      </h3>
                      {transcription.transcript && (
                        <p className="text-sm text-gray-600 truncate mb-2">
                          {transcription.transcript.substring(0, 100)}...
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(transcription)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(transcription.duration)}</span>
                        </div>
                        {transcription.metadata?.word_count && (
                          <div className="flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>{transcription.metadata.word_count.toLocaleString()} words</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(transcription.status)}
                          <span className="font-medium">{getStatusText(transcription.status)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {transcription.transcript && (
                    <button
                      onClick={() => copyToClipboard(transcription.transcript)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy transcript"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}

                  {transcription.audio_file_url && (
                    <a
                      href={transcription.audio_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Play audio"
                    >
                      <Play className="w-4 h-4" />
                    </a>
                  )}

                  {transcription.id && (
                    <button
                      onClick={() => startEditing(transcription)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit name"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && combinedTranscriptions.length > 0 && (
        <div className="mt-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {loadingMore && (
        <div className="mt-4 text-center text-sm text-gray-500">Loading more…</div>
      )}

      {hasMore && !loadingMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
