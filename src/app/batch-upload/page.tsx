'use client';

import React from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import BatchTranscriptionUpload from '@/components/BatchTranscriptionUpload';

export default function BatchUploadPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Batch Transcription</h1>
            <p className="text-gray-600">
              Upload multiple audio/video files and transcribe them all at once. 
              Perfect for processing multiple recordings, podcasts, or interviews.
            </p>
          </div>

          {/* Batch Upload Component */}
          <BatchTranscriptionUpload />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
