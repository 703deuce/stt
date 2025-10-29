'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProgressNotification } from '../context/ProgressNotificationContext';
import { databaseService } from '../services/databaseService';
import { STTRecord } from '../services/databaseService';
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
        limit(5)
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
            
            if (change.type === 'modified' && data.status === 'completed') {
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
      const transcriptions = await databaseService.getSTTRecords(5);
      console.log('✅ Recent transcriptions loaded:', transcriptions.length);
      setRecentTranscriptions(transcriptions);
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
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
    } catch (err) {
      return 'Unknown';
    }
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

              {/* Document Name */}
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
                  <h3 className="font-medium text-gray-900 truncate">
                    <a 
                      href={`/transcriptions/${transcription.id}`}
                      className="hover:text-orange-600 transition-colors"
                    >
                      {transcription.name || transcription.audio_id || 'Untitled Transcription'}
                    </a>
                  </h3>
                )}
              </div>

              {/* Timestamp and Status */}
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{transcription.timestamp ? formatDate(transcription.timestamp) : 'Unknown'}</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(transcription.status)}
                  <span className="text-xs font-medium text-gray-600">
                    {getStatusText(transcription.status)}
                  </span>
                </div>
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
