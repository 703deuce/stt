'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { Sparkles, User, Calendar, FileText, AlertCircle } from 'lucide-react';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

function ViewContentContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const contentId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    if (userId && contentId) {
      loadContent();
    }
  }, [userId, contentId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // Fetch content record
      const contentRef = doc(db, 'users', userId!, 'generated_content', contentId!);
      const contentDoc = await getDoc(contentRef);
      
      if (!contentDoc.exists()) {
        setError('Content not found');
        setLoading(false);
        return;
      }
      
      const data = contentDoc.data();
      setContent({
        id: contentDoc.id,
        ...data
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load content:', err);
      setError('Failed to load content');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading content...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !content) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800">{error || 'Content not found'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-purple-800">
            🔐 Admin View - Read-Only Access
          </p>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">{content.title}</h1>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              User ID: {userId}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(content.timestamp?.toDate?.() || content.timestamp).toLocaleString()}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              {content.content_type_name}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              content.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : content.status === 'generating'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {content.status}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Word Count</p>
            <p className="text-2xl font-bold text-gray-900">{content.word_count?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Category</p>
            <p className="text-lg font-semibold text-gray-900">{content.content_category || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Source Transcription</p>
            <p className="text-sm font-medium text-gray-900 truncate" title={content.transcription_name}>
              {content.transcription_name || 'N/A'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Generated Content
          </h2>
          <div className="prose max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>,
                h2: ({ children }) => <h2 className="text-2xl font-bold mb-3 mt-5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xl font-bold mb-2 mt-4">{children}</h3>,
                p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-700">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {content.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ViewContentPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    }>
      <ViewContentContent />
    </Suspense>
  );
}

