'use client';

import React from 'react';
import { Upload, Mic, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ProgressNotificationProps {
  isVisible: boolean;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  onClose: () => void;
}

export default function ProgressNotification({
  isVisible,
  fileName,
  status,
  progress,
  error,
  onClose
}: ProgressNotificationProps) {
  if (!isVisible) return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Mic className="w-5 h-5 text-purple-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Upload className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'File uploading';
      case 'processing':
        return 'Transcribing audio...';
      case 'completed':
        return 'Transcription completed!';
      case 'failed':
        return 'Transcription failed';
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-50 border-blue-200';
      case 'processing':
        return 'bg-purple-50 border-purple-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-purple-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className={`rounded-lg border shadow-lg p-4 ${getStatusColor()} transition-all duration-300`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-gray-900 text-sm">
                {fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName}
              </div>
              <div className="text-xs text-gray-600">
                {getStatusText()}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {status === 'failed' && error && (
          <div className="text-xs text-red-700 bg-red-100 rounded p-2">
            {error}
          </div>
        )}

        {/* Success Message */}
        {status === 'completed' && (
          <div className="text-xs text-green-700 bg-green-100 rounded p-2">
            Your transcription is ready! Check the transcriptions page to view it.
          </div>
        )}
      </div>
    </div>
  );
}
