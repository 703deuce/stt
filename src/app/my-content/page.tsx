'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { contentService, ContentRecord } from '@/services/contentService';
import { backgroundContentService } from '@/services/backgroundContentService';
import {
  FileText,
  Calendar,
  Type,
  Hash,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Share2,
  MessageSquare,
  Video,
  Book,
  Users,
  Lightbulb,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Long-Form Written': return <FileText className="w-4 h-4" />;
    case 'Social Media': return <Share2 className="w-4 h-4" />;
    case 'Marketing': return <MessageSquare className="w-4 h-4" />;
    case 'Video & Multimedia': return <Video className="w-4 h-4" />;
    case 'Knowledge': return <Book className="w-4 h-4" />;
    case 'Community': return <Users className="w-4 h-4" />;
    case 'Creative': return <Lightbulb className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Long-Form Written': return 'bg-blue-100 text-blue-800';
    case 'Social Media': return 'bg-pink-100 text-pink-800';
    case 'Marketing': return 'bg-green-100 text-green-800';
    case 'Video & Multimedia': return 'bg-red-100 text-red-800';
    case 'Knowledge': return 'bg-purple-100 text-purple-800';
    case 'Community': return 'bg-teal-100 text-teal-800';
    case 'Creative': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function MyContentPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadContents();
    }
  }, [user]);

  // Real-time Firestore listener: Listen to DB changes
  useEffect(() => {
    if (!user) return;

    console.log('👂 Setting up real-time Firestore listener for content changes...');
    
    let unsubscribe: (() => void) | null = null;
    
    // Import Firestore and set up listener
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { collection, onSnapshot } = firestore;
      // Listen to the correct subcollection path
      const contentCollection = collection(db, 'users', user.uid, 'generated_content');
      
      unsubscribe = onSnapshot(contentCollection, (snapshot) => {
        console.log('📡 Firestore change detected! Reloading content...');
        console.log('📊 Snapshot has pending writes:', snapshot.metadata.hasPendingWrites);
        console.log('📊 Snapshot document changes:', snapshot.docChanges().length);
        loadContents();
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
      });
      
      console.log('✅ Firestore listener successfully set up');
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 Cleaning up Firestore listener');
        unsubscribe();
      }
    };
  }, [user]);

  const loadContents = async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await contentService.getContentRecords(1000);
      
      // Check for stuck jobs and retry them
      const stuckJobs = records.filter(r => {
        if (r.status !== 'generating') return false;
        
        // Check if job has been generating for more than 5 minutes
        const now = new Date();
        const createdAt = r.timestamp instanceof Date ? r.timestamp : r.timestamp.toDate();
        const minutesElapsed = (now.getTime() - createdAt.getTime()) / 1000 / 60;
        
        return minutesElapsed > 5; // Stuck if generating for more than 5 minutes
      });
      
      if (stuckJobs.length > 0) {
        console.log(`⚠️ Found ${stuckJobs.length} stuck jobs, marking as failed...`);
        
        // Mark stuck jobs as failed
        for (const job of stuckJobs) {
          await contentService.updateContentRecord(job.id!, {
            status: 'failed',
            error_message: 'Generation timed out. Please try again.'
          });
        }
        
        // Reload to get updated records
        const updatedRecords = await contentService.getContentRecords(1000);
        setContents(updatedRecords);
      } else {
        setContents(records);
      }
      
      console.log(`✅ Loaded ${records.length} content records`);
    } catch (err) {
      console.error('Error loading contents:', err);
      setError('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const filteredContents = contents.filter(content => {
    const matchesSearch = 
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.content_type_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.transcription_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || content.content_category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(contents.map(c => c.content_category)));

  const deleteContent = async (contentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      await contentService.deleteContentRecord(contentId);
      setContents(prev => prev.filter(c => c.id !== contentId));
    } catch (err) {
      console.error('Error deleting content:', err);
      alert('Failed to delete content');
    }
  };

  const retryGeneration = async (content: ContentRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      console.log('🔄 Retrying content generation for:', content.id);
      
      // Delete the failed record
      await contentService.deleteContentRecord(content.id!);
      
      // Navigate back to content repurposing to regenerate
      router.push('/content-repurposing');
    } catch (err) {
      console.error('Error retrying content:', err);
      alert('Failed to retry content generation');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (err) {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your content...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Content</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              All your repurposed content in one place
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Content</div>
                  <div className="text-2xl font-bold text-gray-900">{contents.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Type className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Words</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {contents.reduce((sum, c) => sum + (c.word_count || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Hash className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Categories</div>
                  <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">This Month</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {contents.filter(c => {
                      const date = c.timestamp instanceof Date ? c.timestamp : c.timestamp.toDate();
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
            <div className="p-3 sm:p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          {filteredContents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCategory ? 'No content found' : 'No content yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory 
                  ? 'Try adjusting your search or filters'
                  : 'Start creating content from your transcriptions'}
              </p>
              {!searchQuery && !selectedCategory && (
                <button
                  onClick={() => router.push('/content-repurposing')}
                  className="inline-flex items-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Create Content
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredContents.map(content => (
                <div
                  key={content.id}
                  onClick={() => content.status === 'completed' && router.push(`/content/${content.id}`)}
                  className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${content.status === 'completed' ? 'cursor-pointer' : 'cursor-default'} group ${content.status === 'generating' ? 'border-purple-300 bg-purple-50' : ''}`}
                >
                  <div className="p-6">
                    {/* Category Badge & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(content.content_category)}`}>
                        {getCategoryIcon(content.content_category)}
                        <span>{content.content_type_name}</span>
                      </span>
                      
                      {/* Status Indicator */}
                      {content.status === 'generating' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating...</span>
                        </span>
                      )}
                      {content.status === 'completed' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      )}
                      {content.status === 'failed' && (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className={`text-lg font-semibold text-gray-900 mb-2 line-clamp-2 ${content.status === 'completed' ? 'group-hover:text-purple-600' : ''} transition-colors`}>
                      {content.title}
                    </h3>

                    {/* Transcription Source */}
                    <p className="text-sm text-gray-500 mb-4">
                      From: {content.transcription_name}
                    </p>

                    {/* Generating Progress */}
                    {content.status === 'generating' && (
                      <div className="mb-4 p-3 bg-purple-100 border border-purple-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-purple-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI is creating your content...</span>
                        </div>
                        <div className="mt-2 w-full bg-purple-200 rounded-full h-1">
                          <div className="bg-purple-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {content.status === 'failed' && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-red-700">
                          <AlertCircle className="w-4 h-4" />
                          <span>{content.error_message || 'Generation failed'}</span>
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    {content.status === 'completed' && (
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                        <div className="flex items-center space-x-1">
                          <Type className="w-3 h-3" />
                          <span>{content.word_count || 0} words</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(content.timestamp)}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {content.status === 'completed' && (
                      <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => router.push(`/content/${content.id}`)}
                          className="flex-1 inline-flex items-center justify-center space-x-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/content/${content.id}`);
                          }}
                          className="flex-1 inline-flex items-center justify-center space-x-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => deleteContent(content.id!, e)}
                          className="flex-1 inline-flex items-center justify-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}

                    {/* Generating State Actions */}
                    {content.status === 'generating' && (
                      <div className="flex items-center justify-center pt-4 border-t border-purple-100">
                        <span className="text-sm text-purple-600 font-medium">Please wait...</span>
                      </div>
                    )}

                    {/* Failed State Actions */}
                    {content.status === 'failed' && (
                      <div className="flex items-center space-x-2 pt-4 border-t border-red-100">
                        <button
                          onClick={(e) => retryGeneration(content, e)}
                          className="flex-1 inline-flex items-center justify-center space-x-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>Retry</span>
                        </button>
                        <button
                          onClick={(e) => deleteContent(content.id!, e)}
                          className="flex-1 inline-flex items-center justify-center space-x-1 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
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

