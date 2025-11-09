'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProgressNotification } from '../context/ProgressNotificationContext';
import { databaseService } from '../services/databaseService';
import { STTRecord } from '../services/databaseService';
import { Timestamp } from 'firebase/firestore';
import { 
  FileText, 
  Clock, 
  User, 
  Calendar,
  ArrowRight,
  Play,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Edit3,
  X
} from 'lucide-react';

export default function RecentTranscriptions() {
  const { user } = useAuth();
  const { updateNotification, hideNotification } = useProgressNotification();
  const [recentTranscriptions, setRecentTranscriptions] = useState<STTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadRecentTranscriptions();
    }
  }, [user]);

  // Real-time Firestore listener: Listen to transcriptions collection changes
  useEffect(() => {
    if (!user) return;

    console.log('👂 Setting up real-time Firestore listener for transcriptions...');
    
    let unsubscribe: (() => void) | null = null;
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { collection, onSnapshot, orderBy, limit, Timestamp } = firestore;
      // Listen to the user's STT subcollection
      const sttCollection = collection(db, 'users', user.uid, 'stt');
      
      const queryRef = firestore.query(
        sttCollection,
        orderBy('timestamp', 'desc'),
        limit(100) // Increased to match loadRecentTranscriptions fetch limit
      );
      
      unsubscribe = onSnapshot(queryRef, (snapshot) => {
        console.log('📡 Transcriptions collection changed:', {
          docCount: snapshot.size,
          hasPendingWrites: snapshot.metadata.hasPendingWrites
        });
        
        // Check if any docs changed
        const changes = snapshot.docChanges();
        if (changes.length > 0) {
          console.log(`🔄 Detected ${changes.length} changes, reloading transcriptions...`);
          
          // Check for completed transcriptions and update notification
          changes.forEach((change) => {
            const data = change.doc.data();
            console.log(`📝 Change detected:`, {
              type: change.type,
              status: data.status,
              name: data.name
            });
            
            if ((change.type === 'modified' || change.type === 'added') && data.status === 'completed') {
              console.log('✅ Transcription completed! Updating notification...');
              updateNotification({ progress: 100, status: 'completed' });
              
              setTimeout(() => {
                console.log('🕐 Hiding notification after 5 seconds');
                hideNotification();
              }, 5000);
            }
          });
          
          loadRecentTranscriptions();
        }
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
      });
      
      console.log('✅ Firestore listener successfully set up for transcriptions');
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 Cleaning up Firestore listener for transcriptions');
        unsubscribe();
      }
    };
  }, [user]);

  const loadRecentTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📝 Loading recent transcriptions...');
      
      // Get the 5 most recent transcriptions
      // Fetch more records to filter out broken ones (same as All Transcriptions page)
      const allTranscriptions = await databaseService.getSTTRecords(100); // Get enough to find valid records
      
      // Filter out records with broken timestamps (serverTimestamp sentinel values)
      // Show both processing and completed transcriptions
      // These are old records where webhook updates failed
      const validTranscriptions = allTranscriptions.filter(record => {
        // Check for valid timestamp (not a sentinel value)
        const hasValidTimestamp = record.timestamp && 
          typeof record.timestamp === 'object' && 
          (record.timestamp as any)._methodName !== 'serverTimestamp';
        
        // Show processing and completed transcriptions
        const isValidStatus = record.status === 'completed' || record.status === 'processing';
        
        if (!hasValidTimestamp) {
          console.warn('⏭️ [RecentTranscriptions] Skipping record with broken timestamp:', record.id, record.name);
        }
        
        if (!isValidStatus) {
          console.log('⏭️ [RecentTranscriptions] Skipping invalid status record:', record.id, record.status);
        }
        
        return hasValidTimestamp && isValidStatus;
      }).slice(0, 5); // Take top 5 valid records

      console.log('✅ [RecentTranscriptions] Loaded:', validTranscriptions.length, 'valid records (filtered', allTranscriptions.length - validTranscriptions.length, 'broken/incomplete)');
      setRecentTranscriptions(validTranscriptions);
    } catch (err) {
      console.error('❌ Error loading recent transcriptions:', err);
      
      let errorMessage = 'Failed to load recent transcriptions';
      if (err instanceof Error) {
        if (err.message.includes('Network connectivity issue')) {
          errorMessage = 'Network connectivity issue. Please check your internet connection.';
        } else if (err.message.includes('Could not reach Cloud Firestore backend')) {
          errorMessage = 'Firestore backend is not responding. This may be a temporary issue.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const normalizeDate = (value: any): Date | null => {
    if (!value) return null;
    
    console.log('🔍 normalizeDate input:', { value, type: typeof value, constructor: value?.constructor?.name });
    
    // Check if it's already a Date
    if (value instanceof Date) {
      console.log('✅ Is Date instance');
      return value;
    }
    
    // Check if it's a Firestore Timestamp
    if (value instanceof Timestamp) {
      console.log('✅ Is Timestamp instance');
      return value.toDate();
    }
    
    // Check if it has toDate method (Firestore Timestamp)
    if (value && typeof value.toDate === 'function') {
      console.log('✅ Has toDate method');
      try {
        return value.toDate();
      } catch (e) {
        console.warn('⚠️ toDate() failed:', e);
      }
    }
    
    // Check if it's a plain object with seconds/nanoseconds (Firestore Timestamp structure)
    if (typeof value === 'object' && value !== null && typeof value.seconds === 'number') {
      console.log('✅ Has seconds property');
      const nanoseconds = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
      return new Date(value.seconds * 1000 + nanoseconds / 1_000_000);
    }
    
    // Try parsing as string or number
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        console.log('✅ Parsed from string/number');
        return parsed;
      }
    }
    
    console.warn('❌ Could not normalize date:', value);
    return null;
  };

  const formatDate = (record: STTRecord) => {
    console.log('🔍 [RecentTranscriptions] formatDate called for:', {
      id: record.id,
      name: record.name,
      completedAt: record.completedAt,
      timestamp: record.timestamp,
      createdAt: record.createdAt,
      startedAt: record.startedAt,
      queuedAt: record.queuedAt
    });

    const date = normalizeDate(record.completedAt) 
      || normalizeDate(record.timestamp)
      || normalizeDate(record.createdAt)
      || normalizeDate(record.startedAt)
      || normalizeDate(record.queuedAt);

    if (!date) {
      console.warn('⚠️ [RecentTranscriptions] No valid date found for record:', {
        id: record.id,
        completedAt: record.completedAt,
        timestamp: record.timestamp,
        createdAt: record.createdAt,
        startedAt: record.startedAt,
        queuedAt: record.queuedAt
      });
      return 'Unknown';
    }

    console.log('✅ [RecentTranscriptions] Date found:', date);

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

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const startEditing = (transcription: STTRecord) => {
    setEditingId(transcription.id || '');
    setEditName(transcription.name || transcription.audio_id || '');
  };

  const saveName = async (transcription: STTRecord) => {
    if (!transcription.id || !editName.trim()) return;
    
    try {
      await databaseService.updateSTTRecord(transcription.id, { name: editName.trim() });
      
      // Update local state
      setRecentTranscriptions(prev => 
        prev.map(t => 
          t.id === transcription.id 
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transcriptions</h2>
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transcriptions</h2>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRecentTranscriptions}
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
          <span className="text-sm text-gray-500">{recentTranscriptions.length} documents</span>
          <a 
            href="/transcriptions" 
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>

      {recentTranscriptions.length === 0 ? (
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
          {recentTranscriptions.map((transcription) => (
            <div 
              key={transcription.id} 
              className="flex items-center space-x-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group last:border-b-0"
            >
              {/* Document Icon */}
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
              </div>

              {/* Document Info */}
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
                    {/* Preview Text */}
                    {transcription.transcript && (
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {transcription.transcript.substring(0, 100)}...
                      </p>
                    )}
                    {/* Metadata Row */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
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
                        <span className="font-medium">
                          {getStatusText(transcription.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Icons */}
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

                {/* More options menu (like the "..." in the image) */}
                <button 
                  onClick={() => startEditing(transcription)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit name"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
