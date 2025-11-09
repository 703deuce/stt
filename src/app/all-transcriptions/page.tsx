'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSpeakerMapping } from '@/context/SpeakerMappingContext';
import { databaseService } from '@/services/databaseService';
import { STTRecord } from '@/services/databaseService';
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing';
import { Timestamp } from 'firebase/firestore';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  FileText, 
  Clock, 
  Calendar,
  ArrowRight,
  Play,
  Download,
  Copy,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  Loader,
  Upload,
  Archive,
  Star,
  ArchiveRestore,
  Mic,
  User
} from 'lucide-react';

export default function AllTranscriptionsPage() {
  const { user } = useAuth();
  const { getSpeakerDisplayName } = useSpeakerMapping();
  const { getActiveJobs, getCompletedJobs, getFailedJobs } = useBackgroundProcessing();
  const [transcriptions, setTranscriptions] = useState<STTRecord[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<STTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'duration'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'failed' | 'processing'>('all');

  useEffect(() => {
    if (user) {
      loadAllTranscriptions();
    }
  }, [user]);

  // Filter and sort transcriptions when search/filters change
  useEffect(() => {
    let filtered = [...transcriptions];

    // ✅ Exclude archived items from main list
    filtered = filtered.filter(t => !t.archived);

    // Add background processing jobs as virtual transcriptions
    const activeJobs = getActiveJobs();
    const completedJobs = getCompletedJobs();
    const failedJobs = getFailedJobs();

    // Convert background jobs to virtual transcriptions
    const virtualTranscriptions: STTRecord[] = [
      ...activeJobs.map(job => ({
        id: job.id,
        user_id: user?.uid || '',
        audio_id: '',
        name: job.fileName,
        transcript: '',
        duration: 0,
        status: job.status === 'uploading' ? 'uploading' : 'processing',
        timestamp: new Date(job.startTime),
        audio_file_url: '',
        language: 'en',
        type: 'stt',
        metadata: {
          word_count: 0,
          speaker_count: 0,
          processing_method: 'background_processing',
          chunks_processed: 1
        },
        progress: job.progress,
        error: job.error,
        isVirtual: true
      } as STTRecord)),
      ...completedJobs.map(job => ({
        id: job.id,
        user_id: user?.uid || '',
        audio_id: '',
        name: job.fileName,
        transcript: '',
        duration: 0,
        status: 'completed',
        timestamp: new Date(job.startTime),
        audio_file_url: '',
        language: 'en',
        type: 'stt',
        metadata: {
          word_count: 0,
          speaker_count: 0,
          processing_method: 'background_processing',
          chunks_processed: 1
        },
        isVirtual: true
      } as STTRecord)),
      ...failedJobs.map(job => ({
        id: job.id,
        user_id: user?.uid || '',
        audio_id: '',
        name: job.fileName,
        transcript: '',
        duration: 0,
        status: 'failed',
        timestamp: new Date(job.startTime),
        audio_file_url: '',
        language: 'en',
        type: 'stt',
        metadata: {
          word_count: 0,
          speaker_count: 0,
          processing_method: 'background_processing',
          chunks_processed: 1
        },
        error: job.error,
        isVirtual: true
      } as STTRecord))
    ];

    // Combine real and virtual transcriptions
    filtered = [...filtered, ...virtualTranscriptions];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.transcript?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'processing') {
        filtered = filtered.filter(t => (t as any).isVirtual && ((t as any).status === 'uploading' || t.status === 'processing'));
      } else {
        filtered = filtered.filter(t => t.status === filterStatus);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          // Handle different timestamp formats
          let dateA: Date;
          if (a.timestamp instanceof Date) {
            dateA = a.timestamp;
          } else if (a.timestamp instanceof Timestamp) {
            dateA = a.timestamp.toDate();
          } else if (typeof a.timestamp === 'string') {
            dateA = new Date(a.timestamp);
          } else if (typeof a.timestamp === 'number') {
            dateA = new Date(a.timestamp);
          } else {
            dateA = new Date(0); // Fallback to epoch
          }
          
          let dateB: Date;
          if (b.timestamp instanceof Date) {
            dateB = b.timestamp;
          } else if (b.timestamp instanceof Timestamp) {
            dateB = b.timestamp.toDate();
          } else if (typeof b.timestamp === 'string') {
            dateB = new Date(b.timestamp);
          } else if (typeof b.timestamp === 'number') {
            dateB = new Date(b.timestamp);
          } else {
            dateB = new Date(0); // Fallback to epoch
          }
          
          return dateB.getTime() - dateA.getTime(); // Newest first
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0); // Longest first
        default:
          return 0;
      }
    });

    setFilteredTranscriptions(filtered);
  }, [transcriptions, searchQuery, sortBy, filterStatus, getActiveJobs, getCompletedJobs, getFailedJobs]);

  const loadAllTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📝 Loading ALL transcriptions for user:', user?.uid);
      
      if (!user) {
        console.log('⚠️ No user found, skipping load');
        return;
      }
      
      // Get ALL transcriptions (no limit)
      const allRecords = await databaseService.getSTTRecords(1000); // High limit to get all
      
      // Filter out records with broken timestamps (serverTimestamp sentinel values)
      // These are old records where webhook updates failed
      const validTranscriptions = allRecords.filter(record => {
        const hasValidTimestamp = record.timestamp && 
          typeof record.timestamp === 'object' && 
          (record.timestamp as any)._methodName !== 'serverTimestamp';
        
        if (!hasValidTimestamp) {
          console.warn('⏭️ Skipping record with broken timestamp:', record.id, record.name);
        }
        
        return hasValidTimestamp;
      });
      
      console.log('✅ All transcriptions loaded:', validTranscriptions.length, '(filtered', allRecords.length - validTranscriptions.length, 'broken records)');
      setTranscriptions(validTranscriptions);
    } catch (err) {
      console.error('❌ Error loading transcriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcriptions');
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

  const formatDate = (record: STTRecord) => {
    // Try multiple timestamp fields in priority order
    const date = normalizeDate(record.completedAt) 
      || normalizeDate(record.timestamp)
      || normalizeDate(record.createdAt)
      || normalizeDate(record.startedAt)
      || normalizeDate(record.queuedAt);
    
    if (!date) {
      console.warn('⚠️ No valid date found for record:', record.id);
      return 'Unknown';
    }
    
    try {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const toggleArchive = async (transcription: STTRecord) => {
    try {
      const newArchivedStatus = !transcription.archived;
      await databaseService.toggleArchiveSTTRecord(transcription.id!, newArchivedStatus);
      
      // Update local state
      setTranscriptions(prev => prev.map(t => 
        t.id === transcription.id ? { ...t, archived: newArchivedStatus } : t
      ));
      
      console.log(`✅ Transcription ${newArchivedStatus ? 'archived' : 'unarchived'}`);
    } catch (error) {
      console.error('❌ Error toggling archive:', error);
    }
  };

  const toggleFavorite = async (transcription: STTRecord) => {
    try {
      const newFavoritedStatus = !transcription.favorited;
      await databaseService.toggleFavoriteSTTRecord(transcription.id!, newFavoritedStatus);
      
      // Update local state
      setTranscriptions(prev => prev.map(t => 
        t.id === transcription.id ? { ...t, favorited: newFavoritedStatus } : t
      ));
      
      console.log(`✅ Transcription ${newFavoritedStatus ? 'favorited' : 'unfavorited'}`);
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <Mic className="w-3 h-3 mr-1 animate-pulse" />
            Transcribing
          </span>
        );
      case 'uploading':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Upload className="w-3 h-3 mr-1 animate-pulse" />
            Uploading
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Transcriptions</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage all your transcriptions</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={loadAllTranscriptions}
                  className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{transcriptions.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {transcriptions.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {transcriptions.filter(t => t.status === 'processing').length}
                    </p>
                  </div>
                  <Loader className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {transcriptions.filter(t => t.status === 'failed').length}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search transcriptions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Sort By */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'duration')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="date">Date (Newest)</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="duration">Duration (Longest)</option>
                </select>
              </div>

              {/* Filter Status */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'failed' | 'processing')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">All</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-900">Error Loading Transcriptions</div>
                  <div className="text-sm text-red-700 mt-1">{error}</div>
                  <button
                    onClick={loadAllTranscriptions}
                    className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-sm font-medium"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transcriptions List */}
          {!loading && !error && (
            <div className="space-y-4">
              {/* Results Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {filteredTranscriptions.length} of {transcriptions.length} transcriptions
                </p>
              </div>

              {/* Empty State */}
              {filteredTranscriptions.length === 0 && !searchQuery && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transcriptions yet</h3>
                  <p className="text-gray-600 mb-6">Start by creating your first transcription</p>
                  <a
                    href="/transcriptions"
                    className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Create Transcription
                  </a>
                </div>
              )}

              {/* No Search Results */}
              {filteredTranscriptions.length === 0 && searchQuery && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              )}

              {/* Transcriptions Grid */}
              {filteredTranscriptions.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  {filteredTranscriptions.map((transcription) => (
                    <div
                      key={transcription.id}
                      className="bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          {/* Left Side - Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <FileText className="w-5 h-5 text-orange-500" />
                              <h3 className="text-lg font-semibold text-gray-900">
                                {transcription.name || 'Untitled Transcription'}
                              </h3>
                              {getStatusBadge(transcription.status)}
                            </div>

                            {/* Progress Bar for Processing Jobs */}
                            {(transcription as any).isVirtual && ((transcription as any).status === 'uploading' || transcription.status === 'processing') && (
                              <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-2">
                                  <span>
                                    {(transcription as any).status === 'uploading' ? 'File uploading' : 'Transcribing audio...'}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      (transcription as any).status === 'uploading' 
                                        ? 'bg-blue-500' 
                                        : 'bg-purple-500'
                                    }`}
                                    style={{ width: `${(transcription as any).progress || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Error Message for Failed Jobs */}
                            {(transcription as any).isVirtual && transcription.status === 'failed' && (transcription as any).error && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                  <div className="text-sm text-red-700">
                                    <div className="font-medium">Processing Failed</div>
                                    <div className="text-xs mt-1">{(transcription as any).error}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Transcript Preview */}
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {transcription.transcript || 'No transcript available'}
                            </p>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(transcription)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDuration(transcription.duration)}</span>
                              </div>
                              {transcription.metadata?.word_count && (
                                <div className="flex items-center space-x-1">
                                  <FileText className="w-4 h-4" />
                                  <span className="font-medium">
                                    {transcription.metadata.word_count.toLocaleString()} words
                                  </span>
                                </div>
                              )}
                              {transcription.metadata?.speaker_count && (
                                <div className="flex items-center space-x-1">
                                  <User className="w-4 h-4" />
                                  <span className="font-medium">
                                    {transcription.metadata.speaker_count} speakers
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Side - Actions */}
                          <div className="flex items-center space-x-2 ml-4">
                            {/* Favorite Button */}
                            <button
                              onClick={() => toggleFavorite(transcription)}
                              className={`p-2 rounded-lg transition-colors ${
                                transcription.favorited 
                                  ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50' 
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title={transcription.favorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Star className={`w-4 h-4 ${transcription.favorited ? 'fill-current' : ''}`} />
                            </button>

                            {/* Archive Button */}
                            <button
                              onClick={() => toggleArchive(transcription)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Archive transcription"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                            
                            <button
                              onClick={() => copyToClipboard(transcription.transcript || '')}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Copy transcript"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            
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
                            
                            <a
                              href={`/transcriptions/${transcription.id}`}
                              className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                              <span className="mr-2">View Details</span>
                              <ArrowRight className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

