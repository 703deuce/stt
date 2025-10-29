'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Mic, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  User,
  FileAudio,
  Volume2,
  Settings,
  Info,
  FileText,
  RefreshCw
} from 'lucide-react';
import { voiceCloningService, ClonedVoice } from '@/services/voiceCloningService';
import { useAuth } from '@/context/AuthContext';

interface VoiceCloningInterfaceProps {
  onVoiceCloned?: (voice: ClonedVoice) => void;
}

export default function VoiceCloningInterface({ onVoiceCloned }: VoiceCloningInterfaceProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string>('');
  const [transcriptions, setTranscriptions] = useState<Record<string, string>>({});
  const [loadingTranscriptions, setLoadingTranscriptions] = useState<Record<string, boolean>>({});
  
  // New state for step-by-step progress
  const [currentStep, setCurrentStep] = useState<string>('');
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load existing cloned voices when user changes
    if (user) {
      loadClonedVoices().catch(console.error);
    } else {
      setClonedVoices([]);
    }
  }, [user]);

  const loadClonedVoices = async () => {
    try {
      console.log('🔄 Voice Cloning Interface: Loading cloned voices...');
      // Always fetch voices directly from Firebase Storage
      const voices = await voiceCloningService.getUserVoices();
      console.log('✅ Voice Cloning Interface: Loaded voices:', voices);
      setClonedVoices(voices);
    } catch (error) {
      console.error('❌ Voice Cloning Interface: Failed to load voices:', error);
      setError('Failed to load cloned voices');
    }
  };

  const loadTranscription = async (voiceId: string, firebasePath: string) => {
    if (transcriptions[voiceId]) return; // Already loaded
    
    setLoadingTranscriptions(prev => ({ ...prev, [voiceId]: true }));
    
    try {
      const transcription = await voiceCloningService.getVoiceTranscription(firebasePath);
      if (transcription) {
        setTranscriptions(prev => ({ ...prev, [voiceId]: transcription }));
      }
    } catch (error) {
      console.warn('Failed to load transcription:', error);
    } finally {
      setLoadingTranscriptions(prev => ({ ...prev, [voiceId]: false }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      // Auto-fill voice name from filename
      if (!voiceName) {
        const nameWithoutExt = file.name.replace(/\.wav$/i, '');
        setVoiceName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async () => {
    if (!user) {
      setError('You must be logged in to upload voice files.');
      return;
    }

    if (!selectedFile || !voiceName.trim()) {
      setError('Please select a file and enter a voice name.');
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);
    setUploadProgress(0);
    setStepProgress(0);
    setError(null);
    setSuccess(null);
    setCurrentStep('Starting voice cloning process...');

    try {
      // Step 1: Upload to Firebase
      console.log('🔄 Voice Cloning: Starting upload to Firebase...');
      setCurrentStep('📤 Uploading WAV file to Firebase Storage...');
      setStepProgress(25);
      
      const clonedVoice = await voiceCloningService.uploadVoice(
        selectedFile,
        voiceName.trim(),
        description.trim()
      );

      // Step 2: Transcription completed
      console.log('✅ Voice Cloning: Upload complete, transcription in progress...');
      setStepProgress(75);
      setCurrentStep('🎯 Transcribing audio with RunPod API...');
      
      // Step 3: Final completion
      console.log('✅ Voice Cloning: All steps completed successfully!');
      setStepProgress(100);
      setCurrentStep('✅ Voice cloning completed successfully!');

      // Add to local state
      setClonedVoices(prev => [clonedVoice, ...prev]);
      
      // Refresh the voice list to ensure consistency
      await voiceCloningService.refreshVoiceList();
      
      // Reset form
      setSelectedFile(null);
      setVoiceName('');
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setSuccess(`Voice "${clonedVoice.name}" cloned successfully!`);
      
      // Call callback if provided
      if (onVoiceCloned) {
        onVoiceCloned(clonedVoice);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
      setCurrentStep('❌ Voice cloning failed');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setUploadProgress(0);
      setStepProgress(0);
      // Clear step message after a delay
      setTimeout(() => setCurrentStep(''), 3000);
    }
  };

  const handlePlayPause = (voice: ClonedVoice) => {
    if (isPlaying === voice.id) {
      // Stop playing
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setIsPlaying(null);
      setAudioElement(null);
    } else {
      // Start playing
      if (audioElement) {
        audioElement.pause();
      }
      
      const audio = new Audio(voice.downloadURL);
      audio.onended = () => {
        setIsPlaying(null);
        setAudioElement(null);
      };
      
      setAudioElement(audio);
      setIsPlaying(voice.id);
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        setError('Failed to play audio preview');
      });
    }
  };

  const handleDeleteVoice = async (voice: ClonedVoice) => {
    if (confirm(`Are you sure you want to delete "${voice.name}"?`)) {
      try {
        await voiceCloningService.deleteVoice(voice);
        setClonedVoices(prev => prev.filter(v => v.id !== voice.id));
        setSuccess(`Voice "${voice.name}" deleted successfully!`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        setError(`Failed to delete voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  // Show login message if user is not authenticated
  if (!user) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">
            You must be logged in to upload and manage voice clones.
          </p>
          <a
            href="/auth"
            className="inline-flex items-center bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            <User className="w-5 h-5 mr-2" />
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mic className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Clone Your Voice</h3>
            <p className="text-sm text-gray-600">Upload a WAV file to create a custom AI voice</p>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice File (WAV format, max 50MB)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,audio/wav"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center space-y-3 w-full"
            >
              <Upload className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">
                  {selectedFile ? selectedFile.name : 'Click to select WAV file'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedFile ? `Size: ${formatFileSize(selectedFile.size)}` : 'WAV format only'}
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Voice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voice Name *
            </label>
            <input
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="e.g., My Custom Voice"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Professional business voice"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Step-by-Step Progress Display */}
        {(isProcessing || isUploading) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">Voice Cloning Progress:</div>
                
                {/* Current Step */}
                <div className="mb-3 p-2 bg-white rounded border">
                  <div className="text-xs font-medium text-blue-900 mb-1">Current Step:</div>
                  <div className="text-sm">{currentStep}</div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${stepProgress}%` }}
                  />
                </div>
                <div className="text-xs text-blue-600">{stepProgress}% complete</div>
                
                {/* Step Details */}
                <div className="mt-3 text-xs text-blue-700">
                  <div className="grid grid-cols-1 gap-1">
                    <div className={`flex items-center space-x-2 ${stepProgress >= 25 ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{stepProgress >= 25 ? '✅' : '⏳'}</span>
                      <span>Upload WAV file to Firebase</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${stepProgress >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{stepProgress >= 50 ? '✅' : '⏳'}</span>
                      <span>Transcribe audio with RunPod API</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${stepProgress >= 75 ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{stepProgress >= 75 ? '✅' : '⏳'}</span>
                      <span>Save transcription as .txt file</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${stepProgress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{stepProgress >= 100 ? '✅' : '⏳'}</span>
                      <span>Complete voice cloning</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Status Display */}
        {(isProcessing || isUploading) && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-green-800">
                <div className="font-medium mb-1">Current Status:</div>
                <div className="text-xs">
                  {stepProgress < 25 && "🔄 Preparing to upload..."}
                  {stepProgress >= 25 && stepProgress < 50 && "📤 Uploading WAV file to Firebase Storage..."}
                  {stepProgress >= 50 && stepProgress < 75 && "🎯 Transcribing audio with RunPod API..."}
                  {stepProgress >= 75 && stepProgress < 100 && "💾 Saving transcription as .txt file..."}
                  {stepProgress >= 100 && "✅ Voice cloning completed successfully!"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Progress (Legacy - keeping for now) */}
        {isUploading && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* RunPod API Info */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Mic className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">RunPod API Transcription:</p>
              <p className="text-xs mt-1">
                Audio files are automatically transcribed using your working RunPod API 
                and saved as .txt files alongside your voice files in Firebase Storage.
                Both files use the same name (e.g., "myvoice.wav" and "myvoice.txt").
              </p>
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !voiceName.trim() || isUploading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            !selectedFile || !voiceName.trim() || isUploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isUploading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing Voice...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Upload & Clone Voice</span>
            </div>
          )}
        </button>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Voice Cloning Tips:</p>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Use high-quality WAV files (16-bit, 44.1kHz recommended)</li>
                <li>• Record in a quiet environment with clear speech</li>
                <li>• Include various speech patterns and emotions</li>
                <li>• Keep files under 50MB for optimal processing</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">{success}</span>
          </div>
        </div>
      )}

      {/* Cloned Voices List */}
      {clonedVoices.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileAudio className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Your Cloned Voices</h3>
                <p className="text-sm text-gray-600">{clonedVoices.length} voice{clonedVoices.length !== 1 ? 's' : ''} available</p>
              </div>
            </div>
            <button
              onClick={loadClonedVoices}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 text-sm"
              title="Refresh voice list"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="space-y-4">
            {clonedVoices.map((voice) => (
              <div key={voice.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{voice.name}</h4>
                      <p className="text-sm text-gray-600">{voice.description || 'No description'}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>{formatFileSize(voice.fileSize)}</span>
                        <span>{formatDate(voice.uploadedAt)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          voice.status === 'ready' ? 'bg-green-100 text-green-800' :
                          voice.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {voice.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Transcription Section */}
                  <div className="mt-3">
                    <button
                      onClick={() => loadTranscription(voice.id, voice.firebasePath)}
                      className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      <span>View Transcription</span>
                    </button>
                    
                    {loadingTranscriptions[voice.id] && (
                      <div className="mt-2 text-sm text-gray-500">
                        Loading transcription...
                      </div>
                    )}
                    
                    {transcriptions[voice.id] && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-700 font-medium mb-1">Transcription:</div>
                        <div className="text-sm text-gray-600 italic">"{transcriptions[voice.id]}"</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePlayPause(voice)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title={isPlaying === voice.id ? 'Stop' : 'Play Preview'}
                    >
                      {isPlaying === voice.id ? (
                        <Pause className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Play className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    
                    {/* Generate with Voice Button */}
                    <a
                      href={`/tts?voice=${encodeURIComponent(voice.id)}`}
                      className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors"
                      title="Generate TTS with this voice"
                    >
                      <Volume2 className="w-4 h-4 text-orange-600" />
                    </a>
                    
                    <button
                      onClick={() => navigator.clipboard.writeText(voice.downloadURL)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Copy Download URL"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                    </button>
                    
                    <a
                      href={voice.downloadURL}
                      download={voice.originalFileName}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </a>
                    
                    <button
                      onClick={() => handleDeleteVoice(voice)}
                      className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete Voice"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {clonedVoices.length === 0 && !isUploading && (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Cloned Voices Yet</h3>
          <p className="text-gray-600 mb-6">
            Upload your first WAV file to create a custom AI voice clone
          </p>
        </div>
      )}
    </div>
  );
}
