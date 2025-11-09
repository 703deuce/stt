'use client';

import React from 'react';
import { Upload, X } from 'lucide-react';

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

  const isUploading = status === 'uploading';

  if (!isUploading) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="rounded-lg border border-blue-200 bg-blue-50 shadow-lg p-4 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Upload className="w-5 h-5 text-blue-500 animate-pulse" />
            <div>
              <div className="font-medium text-gray-900 text-sm">
                {fileName.length > 30 ? `${fileName.substring(0, 30)}...` : fileName}
              </div>
              <div className="text-xs text-gray-600">Uploading file…</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-1 text-xs text-gray-500">Uploading {progress.toFixed(0)}%</div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-300 bg-blue-500"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
