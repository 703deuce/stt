'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { databaseService } from '@/services/databaseService';
import { STTRecord } from '@/services/databaseService';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  FileText, 
  Clock, 
  Calendar,
  ArrowRight,
  Play,
  Copy,
  CheckCircle,
  AlertCircle,
  Search,
  Loader,
  ArchiveRestore,
  Trash2,
  Star
} from 'lucide-react';

export default function ArchivedPage() {
  const { user } = useAuth();
  const [archivedTranscriptions, setArchivedTranscriptions] = useState<STTRecord[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<STTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadArchivedTranscriptions();
    }
  }, [user]);

  // Filter transcriptions when search changes
  useEffect(() => {
    let filtered = [...archivedTranscriptions];

    if (searchQuery.trim()) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.transcript?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : (a.timestamp as any).toDate();
      const dateB = b.timestamp instanceof Date ? b.timestamp : (b.timestamp as any).toDate();
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredTranscriptions(filtered);
  }, [archivedTranscriptions, searchQuery]);

  const loadArchivedTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📦 Loading archived transcriptions...');
      
      if (!user) return;
      
      // Get all transcriptions and filter archived ones
      const allTranscriptions = await databaseService.getSTTRecords(1000);
      const archived = allTranscriptions.filter(t => t.archived === true);
      
      console.log('✅ Archived transcriptions loaded:', archived.length);
      setArchivedTranscriptions(archived);
    } catch (err) {
      console.error('❌ Error loading archived transcriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load archived transcriptions');
    } finally {
      setLoading(false);
    }
  };

  const unarchive = async (transcription: STTRecord) => {
    try {
      await databaseService.toggleArchiveSTTRecord(transcription.id!, false);
      
      // Remove from local state
      setArchivedTranscriptions(prev => prev.filter(t => t.id !== transcription.id));
      
      console.log('✅ Transcription unarchived');
    } catch (error) {
      console.error('❌ Error unarchiving:', error);
    }
  };

  const deleteTranscription = async (transcription: STTRecord) => {
    if (!confirm(`Are you sure you want to permanently delete "${transcription.name}"?`)) {
      return;
    }

    try {
      await databaseService.deleteSTTRecord(transcription.id!);
      
      // Remove from local state
      setArchivedTranscriptions(prev => prev.filter(t => t.id !== transcription.id));
      
      console.log('✅ Transcription deleted');
    } catch (error) {
      console.error('❌ Error deleting:', error);
    }
  };

  const toggleFavorite = async (transcription: STTRecord) => {
    try {
      const newFavoritedStatus = !transcription.favorited;
      await databaseService.toggleFavoriteSTTRecord(transcription.id!, newFavoritedStatus);
      
      // Update local state
      setArchivedTranscriptions(prev => prev.map(t => 
        t.id === transcription.id ? { ...t, favorited: newFavoritedStatus } : t
      ));
      
      console.log(`✅ Transcription ${newFavoritedStatus ? 'favorited' : 'unfavorited'}`);
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
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
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Archived Transcriptions</h1>
                <p className="text-gray-600 mt-1">View and restore archived transcriptions</p>
              </div>
              <button
                onClick={loadArchivedTranscriptions}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Archived Transcriptions</p>
                  <p className="text-2xl font-bold text-gray-900">{archivedTranscriptions.length}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search archived transcriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin h-12 w-12 text-orange-500" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <AlertCircle className="w-5 h-5 text-red-500 mb-2" />
              <p className="text-red-900">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredTranscriptions.length === 0 && !searchQuery && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No archived transcriptions</h3>
              <p className="text-gray-600">Archived items will appear here</p>
            </div>
          )}

          {/* No Search Results */}
          {!loading && !error && filteredTranscriptions.length === 0 && searchQuery && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try a different search term</p>
            </div>
          )}

          {/* Transcriptions List */}
          {!loading && !error && filteredTranscriptions.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Showing {filteredTranscriptions.length} archived transcription(s)
              </p>

              {filteredTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="bg-white rounded-lg border border-gray-200 hover:border-orange-300 transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {transcription.name || 'Untitled'}
                          </h3>
                          {transcription.favorited && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {transcription.transcript || 'No transcript'}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(transcription.timestamp)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(transcription.duration)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {/* Favorite */}
                        <button
                          onClick={() => toggleFavorite(transcription)}
                          className={`p-2 rounded-lg transition-colors ${
                            transcription.favorited 
                              ? 'text-yellow-500 bg-yellow-50' 
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={transcription.favorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${transcription.favorited ? 'fill-current' : ''}`} />
                        </button>

                        {/* Unarchive */}
                        <button
                          onClick={() => unarchive(transcription)}
                          className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Restore from archive"
                        >
                          <ArchiveRestore className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => deleteTranscription(transcription)}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Copy */}
                        <button
                          onClick={() => copyToClipboard(transcription.transcript || '')}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Copy transcript"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* View Details */}
                        <a
                          href={`/transcriptions/${transcription.id}`}
                          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                          <span className="mr-2">View</span>
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
      </Layout>
    </ProtectedRoute>
  );
}

