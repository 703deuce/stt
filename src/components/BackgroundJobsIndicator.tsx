'use client';

import React, { useState } from 'react';
import { useBackgroundProcessing } from '@/hooks/useBackgroundProcessing';
import { Clock, CheckCircle, AlertCircle, Upload, Mic } from 'lucide-react';

export default function BackgroundJobsIndicator() {
  const { getActiveJobs, getCompletedJobs, getFailedJobs } = useBackgroundProcessing();
  const [isExpanded, setIsExpanded] = useState(false);

  const activeJobs = getActiveJobs();
  const completedJobs = getCompletedJobs();
  const failedJobs = getFailedJobs();

  const totalJobs = activeJobs.length + completedJobs.length + failedJobs.length;

  if (totalJobs === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'processing':
        return <Mic className="w-4 h-4 text-purple-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Transcribing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processing':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 hover:shadow-xl transition-all duration-200 flex items-center space-x-3"
        >
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">
              {activeJobs.length > 0 ? `${activeJobs.length} Processing` : `${completedJobs.length} Completed`}
            </span>
          </div>
          {activeJobs.length > 0 && (
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          )}
        </button>
      )}

      {/* Expanded State */}
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Background Jobs</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Jobs List */}
          <div className="p-4 space-y-3">
            {/* Active Jobs */}
            {activeJobs.map((job) => (
              <div key={job.id} className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(job.status)}
                    <span className="font-medium text-sm">{job.fileName}</span>
                  </div>
                  <span className="text-xs font-medium">{job.progress}%</span>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {getStatusText(job.status)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-current h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}

            {/* Completed Jobs */}
            {completedJobs.slice(0, 3).map((job) => (
              <div key={job.id} className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(job.status)}
                    <span className="font-medium text-sm">{job.fileName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {job.endTime ? new Date(job.endTime).toLocaleTimeString() : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {getStatusText(job.status)}
                </div>
              </div>
            ))}

            {/* Failed Jobs */}
            {failedJobs.slice(0, 2).map((job) => (
              <div key={job.id} className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(job.status)}
                    <span className="font-medium text-sm">{job.fileName}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {job.error || 'Processing failed'}
                </div>
              </div>
            ))}

            {/* Show More */}
            {(completedJobs.length > 3 || failedJobs.length > 2) && (
              <div className="text-center pt-2">
                <button
                  onClick={() => window.location.href = '/all-transcriptions'}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  View all transcriptions →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
