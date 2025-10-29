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
  Star,
  Archive
} from 'lucide-react';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favoritedTranscriptions, setFavoritedTranscriptions] = useState<STTRecord[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<STTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadFavoritedTranscriptions();
    }
  }, [user]);

  // Filter transcriptions when search changes
  useEffect(() => {
    let filtered = [...favoritedTranscriptions];

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
  }, [favoritedTranscriptions, searchQuery]);

  const loadFavoritedTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('⭐ Loading favorited transcriptions...');
      
      if (!user) return;
      
      // Get all transcriptions and filter favorited ones (excluding archived)
      const allTranscriptions = await databaseService.getSTTRecords(1000);
      const favorited = allTranscriptions.filter(t => t.favorited === true && !t.archived);
      
      console.log('✅ Favorited transcriptions loaded:', favorited.length);
      setFavoritedTranscriptions(favorited);
    } catch (err) {
      console.error('❌ Error loading favorited transcriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorited transcriptions');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (transcription: STTRecord) => {
    try {
      await databaseService.toggleFavoriteSTTRecord(transcription.id!, false);
      
      // Remove from local state
      setFavoritedTranscriptions(prev => prev.filter(t => t.id !== transcription.id));
      
      console.log('✅ Transcription unfavorited');
    } catch (error) {
      console.error('❌ Error unfavoriting:', error);
    }
  };

  const toggleArchive = async (transcription: STTRecord) => {
    try {
      await databaseService.toggleArchiveSTTRecord(transcription.id!, true);
      
      // Remove from local state (archived items don't show in favorites)
      setFavoritedTranscriptions(prev => prev.filter(t => t.id !== transcription.id));
      
      console.log('✅ Transcription archived');
    } catch (error) {
      console.error('❌ Error archiving:', error);
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
                <h1 className="text-3xl font-bold text-gray-900">⭐ Favorite Transcriptions</h1>
                <p className="text-gray-600 mt-1">Quick access to your starred transcriptions</p>
              </div>
              <button
                onClick={loadFavoritedTranscriptions}
                className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Favorited Transcriptions</p>
                  <p className="text-2xl font-bold text-yellow-600">{favoritedTranscriptions.length}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-400 fill-current" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search favorites..."
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
              <Star className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
              <p className="text-gray-600 mb-6">Star transcriptions to add them to your favorites</p>
              <a
                href="/all-transcriptions"
                className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                View All Transcriptions
              </a>
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
                Showing {filteredTranscriptions.length} favorite(s)
              </p>

              {filteredTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="bg-white rounded-lg border-2 border-yellow-200 hover:border-yellow-300 transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Star className="w-5 h-5 text-yellow-500 fill-current" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {transcription.name || 'Untitled'}
                          </h3>
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
                        {/* Unfavorite */}
                        <button
                          onClick={() => toggleFavorite(transcription)}
                          className="p-2 text-yellow-500 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                          title="Remove from favorites"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>

                        {/* Archive */}
                        <button
                          onClick={() => toggleArchive(transcription)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
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

