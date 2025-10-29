'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { voiceTransferService, VoiceTransferResult, VoiceTransferFirebaseResult } from '../services/voiceTransferService';
import { 
  Upload, 
  Play, 
  Pause, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Volume2,
  FileAudio,
  ArrowRight,
  Clock,
  Info
} from 'lucide-react';

export default function VoiceTransferInterface() {
  const { user } = useAuth();
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [inputAudioBase64, setInputAudioBase64] = useState<string>('');
  const [targetAudioBase64, setTargetAudioBase64] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceTransferResult | VoiceTransferFirebaseResult | Record<string, unknown> | null>(null);
  const [isChunked, setIsChunked] = useState(false);
  const [chunks, setChunks] = useState<Record<string, unknown>[]>([]);
  const [progress, setProgress] = useState(0);
  const [inputAudioUrl, setInputAudioUrl] = useState<string | null>(null);
  const [targetAudioUrl, setTargetAudioUrl] = useState<string | null>(null);
  const [outputAudioUrl, setOutputAudioUrl] = useState<string | null>(null);
  const [isPlayingInput, setIsPlayingInput] = useState(false);
  const [isPlayingTarget, setIsPlayingTarget] = useState(false);
  const [isPlayingOutput, setIsPlayingOutput] = useState(false);
  const [inputAudioElement, setInputAudioElement] = useState<HTMLAudioElement | null>(null);
  const [targetAudioElement, setTargetAudioElement] = useState<HTMLAudioElement | null>(null);
  const [outputAudioElement, setOutputAudioElement] = useState<HTMLAudioElement | null>(null);
  const [useSmartSplitting, setUseSmartSplitting] = useState(true);

  const inputFileRef = useRef<HTMLInputElement>(null);
  const targetFileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File, type: 'input' | 'target') => {
    try {
      // Validate file
      if (!file.type.startsWith('audio/')) {
        throw new Error('Please select an audio file');
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size must be less than 50MB');
      }

      // Convert to base64 (for legacy compatibility)
      const base64 = await fileToBase64(file);
      
      if (type === 'input') {
        setInputFile(file);
        setInputAudioBase64(base64);
        setInputAudioUrl(URL.createObjectURL(file));
      } else {
        setTargetFile(file);
        setTargetAudioBase64(base64);
        setTargetAudioUrl(URL.createObjectURL(file));
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleTransfer = async () => {
    if (!user) {
      setError('Please log in to use voice transfer');
      return;
    }

    if (!inputFile || !targetFile) {
      setError('Please select both input and target audio files');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatus('Validating audio files...');

      // Validate input files
      const validation = voiceTransferService.validateFileInput(inputFile, targetFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check if input file is long enough to need chunking (over 90 seconds)
      const audio = new Audio();
      audio.src = URL.createObjectURL(inputFile);
      
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve, { once: true });
      });
      
      const duration = audio.duration;
      URL.revokeObjectURL(audio.src);
      
      if (duration > 90) { // Over 90 seconds - use Python chunking
        setIsChunked(true);
        setStatus('Long audio detected - using Python chunking for memory efficiency...');
        
        // For long audio, we need to split into chunks and process each one
        setStatus('Long audio detected - splitting into chunks for processing...');
        
        // Implement chunking workflow using existing Python scripts and Firebase service
        setStatus('Splitting audio into chunks...');
        
        try {
          // Step 1: Split audio into chunks using Python script
          const chunks = await splitAudioIntoChunks(inputFile);
          setChunks(chunks);
          setStatus(`Split into ${chunks.length} chunks - processing each chunk...`);
          
          // Step 2: Process each chunk through existing voice transfer service
          const processedChunks = [];
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            setStatus(`Processing chunk ${i + 1}/${chunks.length}...`);
            
            // Create a File object from the chunk file path
            // We need to fetch the chunk file and create a File object
            const chunkResponse = await fetch(`/api/get-chunk-file?path=${encodeURIComponent(chunk.file_path)}`);
            if (!chunkResponse.ok) {
              throw new Error(`Failed to get chunk file ${i + 1}`);
            }
            
            const chunkBlob = await chunkResponse.blob();
            const chunkFile = new File([chunkBlob], `chunk_${i + 1}.wav`, { type: 'audio/wav' });
            
            // Process chunk through existing Firebase service
            const chunkResult = await voiceTransferService.transferVoiceWithFirebase(
              chunkFile,
              targetFile,
              `chunk_${i + 1}`,
              (status, jobId) => {
                setStatus(`Chunk ${i + 1}: ${status}`);
              }
            );
            
            if (chunkResult.download_url) {
              chunk.status = 'completed';
              chunk.download_url = chunkResult.download_url;
              processedChunks.push(chunk);
            } else {
              throw new Error(`Chunk ${i + 1} failed to process`);
            }
          }
          
          // Step 3: Stitch processed chunks back together
          setStatus('Stitching processed chunks together...');
          const finalResult = await stitchChunksTogether(processedChunks);
          
          console.log('🔍 Final stitching result:', finalResult);
          
          if (!finalResult.download_url) {
            throw new Error('Stitching completed but no download URL returned');
          }
          
          // Set the final result
          setResult({
            success: true,
            duration: finalResult.duration,
            download_url: finalResult.download_url,
            chunks: processedChunks
          });
          
          // Create audio URL for playback
          const outputUrl = voiceTransferService.createAudioURLFromFirebase(finalResult.download_url);
          setOutputAudioUrl(outputUrl);
          
          setStatus('Chunked voice transfer completed successfully!');
          
        } catch (error) {
          throw new Error(`Chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        // Regular processing for short files
        setIsChunked(false);
        setStatus('Starting voice transfer with Firebase Storage...');
        
        const result = await voiceTransferService.transferVoiceWithFirebase(
          inputFile,
          targetFile,
        inputFile?.name || 'Voice Transfer',
        (status, jobId) => {
          setStatus(`Job ${jobId}: ${status}`);
        }
      );

      setResult(result);
      
        // Create audio URL for playback (handle both Firebase and base64 results)
        let outputUrl: string;
        if ('download_url' in result && result.download_url) {
          // Firebase Storage result
          outputUrl = voiceTransferService.createAudioURLFromFirebase(result.download_url);
        } else if ('audio' in result && result.audio) {
          // Legacy base64 result
          outputUrl = voiceTransferService.createAudioURL(result.audio);
        } else {
          throw new Error('No audio output received');
        }
        
      setOutputAudioUrl(outputUrl);
      setStatus('Voice transfer completed successfully!');
      }
    } catch (err) {
      console.error('Voice transfer failed:', err);
      setError(err instanceof Error ? err.message : 'Voice transfer failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (type: 'input' | 'target' | 'output') => {
    let audioElement: HTMLAudioElement | null = null;
    let url: string | null = null;

    switch (type) {
      case 'input':
        audioElement = inputAudioElement;
        url = inputAudioUrl;
        break;
      case 'target':
        audioElement = targetAudioElement;
        url = targetAudioUrl;
        break;
      case 'output':
        audioElement = outputAudioElement;
        url = outputAudioUrl;
        break;
    }

    if (!url) return;

    // Stop all other audio
    [inputAudioElement, targetAudioElement, outputAudioElement].forEach(audio => {
      if (audio && audio !== audioElement) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    // Create new audio element if needed
    if (!audioElement) {
      audioElement = new Audio(url);
      audioElement.onended = () => {
        switch (type) {
          case 'input': setIsPlayingInput(false); break;
          case 'target': setIsPlayingTarget(false); break;
          case 'output': setIsPlayingOutput(false); break;
        }
      };
      audioElement.onpause = () => {
        switch (type) {
          case 'input': setIsPlayingInput(false); break;
          case 'target': setIsPlayingTarget(false); break;
          case 'output': setIsPlayingOutput(false); break;
        }
      };
      audioElement.onplay = () => {
        switch (type) {
          case 'input': setIsPlayingInput(true); break;
          case 'target': setIsPlayingTarget(true); break;
          case 'output': setIsPlayingOutput(true); break;
        }
      };

      switch (type) {
        case 'input': setInputAudioElement(audioElement); break;
        case 'target': setTargetAudioElement(audioElement); break;
        case 'output': setOutputAudioElement(audioElement); break;
      }
    }

    if (audioElement.paused) {
      audioElement.play();
    } else {
      audioElement.pause();
    }
  };

  const downloadResult = () => {
    if (!result) return;
    
    const filename = `voice_transfer_${Date.now()}.wav`;
    
    // Handle chunked results
    if (isChunked && 'audio' in result && typeof result.audio === 'string') {
      // Complete chunked result - download the base64 audio
      const audioBlob = new Blob([Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))], { type: 'audio/wav' });
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if ('download_url' in result && typeof result.download_url === 'string') {
      // Firebase Storage result - download from URL
      voiceTransferService.downloadAudioFromURL(result.download_url, filename);
    } else if ('audio' in result && typeof result.audio === 'string') {
      // Legacy base64 result
    voiceTransferService.downloadAudio(result.audio, filename);
    }
  };

  // Helper function to split audio into chunks using Python script
  const splitAudioIntoChunks = async (inputFile: File): Promise<any[]> => {
    try {
      // Get audio duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(inputFile);
      
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve, { once: true });
      });
      
      const totalDuration = audio.duration;
      URL.revokeObjectURL(audio.src);
      
      // Call the actual Python chunking script
      const formData = new FormData();
      formData.append('inputFile', inputFile);
      formData.append('duration', totalDuration.toString());
      formData.append('useSmartSplitting', useSmartSplitting.toString());
      
      const response = await fetch('/api/split-audio', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to split audio');
      }
      
      const result = await response.json();
      return result.chunks;
    } catch (error) {
      throw new Error(`Failed to split audio: ${error}`);
    }
  };

  // Helper function to stitch processed chunks together
  const stitchChunksTogether = async (processedChunks: any[]): Promise<any> => {
    try {
      // Call the actual Python stitching script
      const response = await fetch('/api/stitch-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chunks: processedChunks.map(chunk => ({
            id: chunk.id,
            download_url: chunk.download_url,
            duration: chunk.duration
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to stitch audio chunks');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to stitch chunks: ${error}`);
    }
  };

  const resetForm = () => {
    setInputFile(null);
    setTargetFile(null);
    setInputAudioBase64('');
    setTargetAudioBase64('');
    setResult(null);
    setError(null);
    setStatus('');
    setInputAudioUrl(null);
    setTargetAudioUrl(null);
    setOutputAudioUrl(null);
    setIsChunked(false);
    setChunks([]);
    setProgress(0);
    setUseSmartSplitting(true);
    
    // Clean up audio elements
    [inputAudioElement, targetAudioElement, outputAudioElement].forEach(audio => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    });
    setInputAudioElement(null);
    setTargetAudioElement(null);
    setOutputAudioElement(null);
    
    setIsPlayingInput(false);
    setIsPlayingTarget(false);
    setIsPlayingOutput(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Transfer</h1>
        <p className="text-gray-600">
          Transfer voice characteristics from one audio file to another using AI
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="space-y-1">
              <li>• Upload an input audio file (the voice you want to change)</li>
              <li>• Upload a target audio file (the voice you want to sound like)</li>
              <li>• AI will transfer the voice characteristics from target to input</li>
              <li>• Short files (under 90 sec): Regular processing (30-90 seconds)</li>
              <li>• Long files (over 90 sec): Intelligent chunking with seamless stitching</li>
            </ul>
            
            {/* Smart Splitting Toggle */}
            <div className="mt-3 pt-3 border-t border-blue-300">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSmartSplitting}
                    onChange={(e) => setUseSmartSplitting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium">Smart Splitting (Recommended)</span>
                </label>
              </div>
              <p className="text-xs text-blue-600 mt-1 ml-6">
                {useSmartSplitting 
                  ? "Splits at silence boundaries to avoid cutting words mid-speech"
                  : "Uses fixed-time splitting (may cut words in the middle)"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Audio */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Input Audio</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            {inputFile ? (
              <div className="space-y-3">
                <FileAudio className="w-12 h-12 text-green-600 mx-auto" />
                <div>
                  <p className="font-medium text-gray-900">{inputFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(inputFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => playAudio('input')}
                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    title="Play audio"
                  >
                    {isPlayingInput ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setInputFile(null);
                      setInputAudioBase64('');
                      setInputAudioUrl(null);
                    }}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload input audio</p>
                <p className="text-sm text-gray-500">WAV, MP3, M4A, FLAC, OGG (max 50MB)</p>
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'input');
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => inputFileRef.current?.click()}
                  className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Select File
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Target Audio */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Target Audio</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            {targetFile ? (
              <div className="space-y-3">
                <FileAudio className="w-12 h-12 text-purple-600 mx-auto" />
                <div>
                  <p className="font-medium text-gray-900">{targetFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(targetFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => playAudio('target')}
                    className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                    title="Play audio"
                  >
                    {isPlayingTarget ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setTargetFile(null);
                      setTargetAudioBase64('');
                      setTargetAudioUrl(null);
                    }}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload target audio</p>
                <p className="text-sm text-gray-500">WAV, MP3, M4A, FLAC, OGG (max 50MB)</p>
                <input
                  ref={targetFileRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'target');
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => targetFileRef.current?.click()}
                  className="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Select File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Button */}
      <div className="text-center">
        <button
          onClick={handleTransfer}
          disabled={!inputFile || !targetFile || isProcessing}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <ArrowRight className="w-5 h-5" />
              <span>Transfer Voice</span>
            </>
          )}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800">{status}</span>
          </div>
        </div>
      )}

      {/* Chunk Progress for Long Audio */}
      {isChunked && chunks.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-3">Complete Workflow Progress</h3>
          
          {/* Overall Progress Bar */}
          <div className="w-full bg-purple-200 rounded-full h-3 mb-4">
            <div 
              className="bg-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-purple-600 mb-3">
            {progress.toFixed(1)}% Complete
          </div>
          
          {/* Individual Chunk Status */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {chunks.map((chunk, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  chunk.status === 'completed' ? 'bg-green-500' :
                  chunk.status === 'processing' ? 'bg-purple-500' :
                  chunk.status === 'failed' ? 'bg-red-500' :
                  'bg-gray-300'
                }`}></div>
                <span className="text-sm text-purple-700">
                  {typeof chunk.id === 'string' ? chunk.id.replace('chunk_', 'Chunk ') : `Chunk ${index + 1}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">
              {isChunked ? 'Python Chunking Complete!' : 'Voice Transfer Complete!'}
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Result Info */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{typeof result.duration === 'number' ? result.duration.toFixed(2) : '0.00'}s</span>
              </div>
              {!isChunked && 'sample_rate' in result && (
                <>
              <div className="flex justify-between">
                <span className="text-gray-600">Sample Rate:</span>
                <span className="font-medium">{typeof result.sample_rate === 'number' ? result.sample_rate : 0} Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">{typeof result.format === 'string' ? result.format.toUpperCase() : 'WAV'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processing Time:</span>
                <span className="font-medium">{typeof result.processing_time === 'string' ? result.processing_time : 'Unknown'}</span>
              </div>
                </>
              )}
              {isChunked && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Chunks Processed:</span>
                  <span className="font-medium">{chunks.length}</span>
              </div>
              )}
            </div>

            {/* Result Audio */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {isChunked ? 'Chunked Audio Ready' : 'Transferred Audio'}
              </h4>
              <div className="flex items-center space-x-3">
                                {!isChunked ? (
                  <>
                <button
                  onClick={() => playAudio('output')}
                  className="p-3 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                  title="Play transferred audio"
                >
                  {isPlayingOutput ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={downloadResult}
                  className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Download transferred audio"
                >
                  <Download className="w-5 h-5" />
                </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => playAudio('output')}
                      className="p-3 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      title="Play final stitched audio"
                    >
                      {isPlayingOutput ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={downloadResult}
                      className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Download final stitched audio"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </>
                )}
                <span className="text-sm text-gray-500">
                  {typeof result.duration === 'number' ? result.duration.toFixed(2) : '0.00'}s • {isChunked ? 'Ready for Processing' : ('format' in result && typeof result.format === 'string' ? result.format.toUpperCase() : 'WAV')}
                </span>
              </div>
            </div>
          </div>

          {/* Chunk Summary for Long Audio */}
          {isChunked && chunks.length > 0 && (
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-800 mb-3">Chunking Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chunks.map((chunk, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <div className="font-medium">Chunk {index + 1}</div>
                      <div className="text-sm text-gray-600">
                        {typeof chunk.start_time === 'number' ? chunk.start_time.toFixed(1) : '0.0'}s - {typeof chunk.end_time === 'number' ? chunk.end_time.toFixed(1) : '0.0'}s
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      chunk.status === 'completed' ? 'bg-green-100 text-green-800' :
                      chunk.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                                              {typeof chunk.status === 'string' ? chunk.status : 'ready'}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Next Steps Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Next Steps:</strong> Audio has been successfully chunked using Python + ffmpeg. 
                  Each chunk is now ready to be processed through the voice transfer API individually, 
                  then stitched back together with seamless crossfading.
                </p>
              </div>
            </div>
          )}

          {/* Reset Button */}
          <div className="mt-6 text-center">
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Start New Transfer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
