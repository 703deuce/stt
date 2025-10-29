'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { contentService, ContentRecord } from '../services/contentService';
import { 
  FileText,
  Sparkles,
  Calendar,
  ArrowRight,
  Eye,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Share2,
  MessageSquare,
  Video,
  Book,
  Users,
  Lightbulb
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
    case 'Long-Form Written': return 'from-blue-100 to-blue-200';
    case 'Social Media': return 'from-pink-100 to-pink-200';
    case 'Marketing': return 'from-green-100 to-green-200';
    case 'Video & Multimedia': return 'from-red-100 to-red-200';
    case 'Knowledge': return 'from-purple-100 to-purple-200';
    case 'Community': return 'from-teal-100 to-teal-200';
    case 'Creative': return 'from-orange-100 to-orange-200';
    default: return 'from-gray-100 to-gray-200';
  }
};

export default function RecentContent() {
  const { user } = useAuth();
  const [recentContent, setRecentContent] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadRecentContent();
    }
  }, [user]);

  // Poll for updates if there are generating contents
  useEffect(() => {
    if (!user) return;

    const hasGenerating = recentContent.some(c => c.status === 'generating');
    if (!hasGenerating) return;

    const interval = setInterval(() => {
      console.log('🔄 Polling for content updates...');
      loadRecentContent();
    }, 3000);

    return () => clearInterval(interval);
  }, [user, recentContent]);

  const loadRecentContent = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📝 Loading recent content...');
      
      // Get the 5 most recent content items
      const records = await contentService.getContentRecords(5);
      console.log('✅ Recent content loaded:', records.length);
      setRecentContent(records);
    } catch (err) {
      console.error('❌ Error loading recent content:', err);
      setError('Failed to load recent content');
    } finally {
      setLoading(false);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'generating':
        return <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'generating':
        return 'Generating...';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>Recent Content</span>
        </h2>
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
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>Recent Content</span>
        </h2>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadRecentContent}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <span>Recent Content</span>
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">{recentContent.length} items</span>
          <a 
            href="/my-content" 
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </a>
        </div>
      </div>

      {recentContent.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
          <p className="text-gray-600 mb-4">Start repurposing your transcriptions into content</p>
          <a 
            href="/content-repurposing" 
            className="inline-flex items-center bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create Content
          </a>
        </div>
      ) : (
        <div className="space-y-0">
          {recentContent.map((content) => (
            <div 
              key={content.id} 
              className="flex items-center space-x-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group last:border-b-0"
            >
              {/* Content Type Icon */}
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 bg-gradient-to-br ${getCategoryColor(content.content_category)} rounded-lg flex items-center justify-center`}>
                  {getCategoryIcon(content.content_category)}
                </div>
              </div>

              {/* Content Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  <a 
                    href={content.status === 'completed' ? `/content/${content.id}` : '#'}
                    className={content.status === 'completed' ? 'hover:text-purple-600 transition-colors' : 'cursor-default'}
                  >
                    {content.title}
                  </a>
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {content.content_type_name} • From: {content.transcription_name}
                </p>
                <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                  {content.word_count && content.word_count > 0 && (
                    <span>{content.word_count.toLocaleString()} words</span>
                  )}
                  <span>{formatDate(content.timestamp)}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                {getStatusIcon(content.status)}
                <span className="text-xs font-medium text-gray-600">
                  {getStatusText(content.status)}
                </span>
              </div>

              {/* Action Icons */}
              {content.status === 'completed' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(content.content)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy content"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  
                  <a
                    href={`/content/${content.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View content"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

