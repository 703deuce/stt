'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import VoiceCloningInterface from '@/components/VoiceCloningInterface';
import { ClonedVoice } from '@/services/voiceCloningService';
import { voiceCloningService } from '@/services/voiceCloningService';
import { 
  Mic, 
  Volume2, 
  Users, 
  Zap,
  Shield,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function VoiceClonePage() {
  const [recentlyClonedVoice, setRecentlyClonedVoice] = useState<ClonedVoice | null>(null);

  const handleVoiceCloned = (voice: ClonedVoice) => {
    setRecentlyClonedVoice(voice);
    // Clear the recently cloned voice after 5 seconds
    setTimeout(() => setRecentlyClonedVoice(null), 5000);
  };

  useEffect(() => {
    voiceCloningService.ensureVoicesLoaded();
  }, []);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Voice Cloning</h1>
              <p className="text-gray-600">
                Create custom AI voices from your audio samples. Upload WAV files directly to Firebase Storage
                and clone your voice for personalized TTS generation. Audio files are automatically transcribed 
                using local Whisper AI and saved alongside your voice files.
              </p>
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

        {/* Recently Cloned Voice Banner */}
        {recentlyClonedVoice && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-green-800 font-medium">
                    Voice "{recentlyClonedVoice.name}" cloned successfully!
                  </p>
                  <p className="text-green-700 text-sm">
                    You can now use this voice in the TTS generator. The file has been uploaded to Firebase Storage.
                  </p>
                </div>
              </div>
              
              {/* Generate with Voice Button */}
              <a
                href={`/tts?voice=${encodeURIComponent(recentlyClonedVoice.id)}`}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Generate with Voice</span>
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Cloning Interface */}
          <div className="lg:col-span-2">
            <VoiceCloningInterface onVoiceCloned={handleVoiceCloned} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* How It Works */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">How It Works</h3>
                  <p className="text-sm text-gray-600">Simple 3-step process</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Upload WAV File</p>
                    <p className="text-xs text-gray-600">Select a high-quality WAV file under 50MB</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Firebase Storage</p>
                    <p className="text-xs text-gray-600">File is securely uploaded to Firebase Storage in the cloud</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Ready to Use</p>
                    <p className="text-xs text-gray-600">Use your cloned voice in TTS generation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Cloning Tips */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Best Practices</h3>
                  <p className="text-sm text-gray-600">For optimal results</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Use high-quality WAV files (16-bit, 44.1kHz)</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Record in a quiet environment</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Include varied speech patterns</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Keep files under 50MB</span>
                </div>
              </div>
            </div>

            {/* Firebase Storage Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Firebase Storage</h3>
                  <p className="text-sm text-blue-700">Active & secure</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Direct WAV file uploads</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>No base64 conversion needed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Automatic file management</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>Secure download URLs</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/tts'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Go to TTS Generator</span>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/voice-gallery'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Browse Voice Gallery</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
