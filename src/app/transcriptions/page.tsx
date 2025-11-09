'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import TranscriptionUpload from '@/components/TranscriptionUpload';
import RecentTranscriptions from '@/components/RecentTranscriptions';
import { Mic, Upload, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { STTRecord } from '@/services/databaseService';

export default function TranscriptionsPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'recent'>('upload');
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTranscriptions, setPendingTranscriptions] = useState<STTRecord[]>([]);
  const [userInitiatedJob, setUserInitiatedJob] = useState(false);

  const handleTranscriptionEvent = (event: { status: string; jobId?: string; record?: STTRecord }) => {
    if (event.status === 'processing' || event.status === 'started') {
      setUserInitiatedJob(true);
    }

    if (event.status === 'completed' && event.jobId) {
      setPendingTranscriptions(prev => {
        const updated = prev.filter(item => item.id !== event.jobId);
        if (updated.length === 0) {
          setUserInitiatedJob(false);
        }
        return updated;
      });
      if (userInitiatedJob) {
        setActiveTab('recent');
        setRefreshKey(prev => prev + 1);
      }
      return;
    }

    if (event.status === 'started') {
      setActiveTab('recent');
      setRefreshKey(prev => prev + 1);
    }

    if (event.record) {
      setPendingTranscriptions(prev => {
        const filtered = prev.filter(item => item.id !== event.record!.id);
        return [event.record!, ...filtered];
      });
    }

    if (event.status === 'processing' && event.record) {
      setActiveTab('recent');
      setRefreshKey(prev => prev + 1);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
            <p className="text-gray-600">You need to be signed in to access transcriptions.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Create New Transcription</h1>
              <p className="text-sm sm:text-base text-gray-600">Upload audio or video files for AI-powered transcription</p>
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="mb-6" id="transcription-tabs">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span className="whitespace-nowrap">New Transcription</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span className="whitespace-nowrap">Recent (5)</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <h3 className="font-medium text-green-900">Any File Size</h3>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">Speaker Diarization</h3>
                    <p className="text-sm text-blue-700">Who spoke when analysis</p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-medium text-purple-900">Timestamps</h3>
                    <p className="text-sm text-purple-700">Precise segment timing</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Component */}
            <div id="transcription-upload-area">
              <TranscriptionUpload onTranscriptionComplete={handleTranscriptionEvent} />
            </div>
          </div>
        )}

        {activeTab === 'recent' && (
          <div>
            <RecentTranscriptions key={refreshKey} pendingTranscriptions={pendingTranscriptions} />
          </div>
        )}
      </div>
    </Layout>
  );
}
