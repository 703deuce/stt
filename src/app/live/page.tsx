'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Mic, MicOff, Square, Play, Pause, Download, Settings, AlertCircle, CheckCircle } from 'lucide-react';

export default function LiveTranscriptionPage() {
  const { user, loading } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Settings
  const [settings, setSettings] = useState({
    language: 'en',
    speakerDiarization: true,
    realTimeProcessing: true,
    autoSave: true
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Monitor audio levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      intervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
      }, 100);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        // Process the audio blob for transcription
        processAudioBlob(blob);
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timeIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timeIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      }
      setIsPaused(!isPaused);
    }
  };

  const processAudioBlob = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      // Here you would integrate with your transcription service
      // For now, we'll simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTranscript(prev => prev + '\n[Transcription would appear here...]');
    } catch (error) {
      console.error('Error processing audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadTranscript = () => {
    const element = document.createElement('a');
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `live-transcript-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            <p className="text-gray-600">You need to be signed in to use live transcription.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Live Transcription</h1>
                <p className="text-gray-600">Real-time speech-to-text conversion</p>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recording Controls */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recording Controls</h3>
              
              {/* Audio Level Indicator */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Audio Level</span>
                  <span className="text-sm text-gray-600">{Math.round(audioLevel)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-150 ${
                      audioLevel > 70 ? 'bg-red-500' : audioLevel > 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(audioLevel, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Recording Time */}
              <div className="text-center mb-6">
                <div className="text-3xl font-mono font-bold text-gray-900">
                  {formatTime(recordingTime)}
                </div>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  {isRecording && (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-red-600 font-medium">
                        {isPaused ? 'PAUSED' : 'RECORDING'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center space-x-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                    <span>Start Recording</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={pauseRecording}
                      className="flex items-center space-x-2 bg-yellow-600 text-white px-4 py-3 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={stopRecording}
                      className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Settings */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.speakerDiarization}
                      onChange={(e) => setSettings(prev => ({ ...prev, speakerDiarization: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Speaker Diarization</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.realTimeProcessing}
                      onChange={(e) => setSettings(prev => ({ ...prev, realTimeProcessing: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Real-time Processing</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoSave}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoSave: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Auto-save</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Display */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Live Transcript</h3>
                {transcript && (
                  <button
                    onClick={downloadTranscript}
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                )}
              </div>

              <div className="min-h-96 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
                {isProcessing && (
                  <div className="flex items-center space-x-2 text-blue-600 mb-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Processing audio...</span>
                  </div>
                )}
                
                {transcript ? (
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {transcript}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mt-20">
                    <Mic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start recording to see live transcription</p>
                    <p className="text-sm mt-2">Your speech will appear here in real-time</p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  {isRecording ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-gray-600">
                    {isRecording ? 'Recording active' : 'Ready to record'}
                  </span>
                </div>
                <div className="text-gray-500">
                  {transcript.length} characters
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
