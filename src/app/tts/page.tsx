'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import TTSGenerator from '@/components/TTSGenerator';
import ProtectedRoute from '@/components/ProtectedRoute';
import { voiceCloningService } from '@/services/voiceCloningService';
import { ttsDatabaseService, TTSRecord } from '@/services/ttsDatabaseService';
import { useAuth } from '@/context/AuthContext';
import { 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Settings, 
  Upload,
  Copy,
  RotateCcw,
  Sliders,
  FileText,
  Clock,
  Mic,
  User,
  Crown,
  RefreshCw
} from 'lucide-react';

export default function TTSPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [generations, setGenerations] = useState<TTSRecord[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  
  useEffect(() => {
    const voiceParam = searchParams.get('voice');
    if (voiceParam) {
      setSelectedVoice(voiceParam);
    }
  }, [searchParams]);

  // Ensure voices are loaded on every page load
  useEffect(() => {
    voiceCloningService.ensureVoicesLoaded();
  }, []);

  // Load TTS generations from database
  useEffect(() => {
    if (user) {
      loadTTSGenerations();
    }
  }, [user]);

  const loadTTSGenerations = async () => {
    if (!user) return;
    
    try {
      setLoadingGenerations(true);
      const records = await ttsDatabaseService.getTTSRecords(user.uid, 10);
      setGenerations(records);
    } catch (error) {
      console.error('Failed to load TTS generations:', error);
    } finally {
      setLoadingGenerations(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const downloadTTSAudio = (generation: TTSRecord) => {
    // Download from Firebase URL
    const a = document.createElement('a');
    a.href = generation.audio_url;
    a.download = `${generation.name}.${generation.content_type.split('/')[1] || 'wav'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerationComplete = (result: any) => {
    // Reload generations from database to get the new record
    loadTTSGenerations();
    
    // Refresh the home screen RecentTTS component if it exists
    if (typeof window !== 'undefined' && (window as any).refreshRecentTTS) {
      (window as any).refreshRecentTTS();
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Text to Speech</h1>
                <p className="text-gray-600">Convert your text into natural-sounding speech using Higgs Audio V2 AI voices</p>
                {selectedVoice && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">
                        Voice pre-selected: <span className="font-semibold">{selectedVoice}</span>
                        {selectedVoice.startsWith('cloned_') && (
                          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            Custom Cloned Voice
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Manual Refresh Button */}
              <button
                onClick={() => {
                  voiceCloningService.refreshVoiceList();
                  // Force a page reload to show updated voices
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Voices</span>
              </button>
            </div>
          </div>

          {/* TTS Generator Component */}
          <TTSGenerator 
            onGenerationComplete={handleGenerationComplete} 
            defaultVoice={selectedVoice}
          />

          {/* Recent Generations */}
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Generations</h2>
              <button className="text-orange-500 hover:text-orange-600 font-medium">
                View all
              </button>
            </div>
            
            {loadingGenerations ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading generations...</p>
              </div>
            ) : generations.length === 0 ? (
              <div className="text-center py-8">
                <Volume2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No TTS generations yet</p>
                <p className="text-sm text-gray-500">Generate some speech to see them here</p>
              </div>
            ) : (
            <div className="space-y-3">
              {generations.map((generation) => (
                <div key={generation.id} className="flex items-center space-x-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                      <div className="font-medium text-gray-900">{generation.name}</div>
                      <div className="text-sm text-gray-500">{generation.voice_name} • {formatDuration(generation.duration)}</div>
                  </div>
                    <div className="text-sm text-gray-500">{formatDate(generation.timestamp)}</div>
                  <div className="flex items-center space-x-2">
                                            {generation.audio_url && (
                        <button
                          onClick={() => {
                            const audio = new Audio(generation.audio_url);
                            audio.play();
                          }}
                          className="p-1 rounded hover:bg-gray-100"
                          title="Play audio"
                        >
                      <Play className="w-4 h-4 text-gray-500" />
                    </button>
                      )}
                      <button 
                        onClick={() => downloadTTSAudio(generation)}
                        className="p-1 rounded hover:bg-gray-100"
                        title="Download audio"
                      >
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
