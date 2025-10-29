'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { FileText, User, Calendar, Clock, AlertCircle } from 'lucide-react';
import { db, storage } from '@/config/firebase';
import { doc, getDoc, collection } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

function ViewTranscriptionContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const transcriptionId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transcription, setTranscription] = useState<any>(null);
  const [fullTranscript, setFullTranscript] = useState('');

  useEffect(() => {
    if (userId && transcriptionId) {
      loadTranscription();
    }
  }, [userId, transcriptionId]);

  const loadTranscription = async () => {
    try {
      setLoading(true);
      
      // Fetch transcription record
      const transcriptionRef = doc(db, 'users', userId!, 'stt', transcriptionId!);
      const transcriptionDoc = await getDoc(transcriptionRef);
      
      if (!transcriptionDoc.exists()) {
        setError('Transcription not found');
        setLoading(false);
        return;
      }
      
      const data = transcriptionDoc.data();
      setTranscription({
        id: transcriptionDoc.id,
        ...data
      });
      
      // Fetch full transcript from Storage if available
      if (data.transcription_data_url) {
        try {
          const response = await fetch(data.transcription_data_url);
          const fullData = await response.json();
          setFullTranscript(fullData.transcript || data.transcript || '');
        } catch (err) {
          console.warn('Could not load full transcript, using preview:', err);
          setFullTranscript(data.transcript || '');
        }
      } else {
        setFullTranscript(data.transcript || '');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load transcription:', err);
      setError('Failed to load transcription');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading transcription...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !transcription) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800">{error || 'Transcription not found'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Header */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-purple-800">
            🔐 Admin View - Read-Only Access
          </p>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{transcription.name}</h1>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              User ID: {userId}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(transcription.timestamp?.toDate?.() || transcription.timestamp).toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {Math.round(transcription.duration / 60)} minutes
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              transcription.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : transcription.status === 'processing'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {transcription.status}
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Word Count</p>
            <p className="text-2xl font-bold text-gray-900">{transcription.metadata?.word_count?.toLocaleString() || 'N/A'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Speakers</p>
            <p className="text-2xl font-bold text-gray-900">{transcription.metadata?.speaker_count || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Language</p>
            <p className="text-2xl font-bold text-gray-900">{transcription.language?.toUpperCase() || 'N/A'}</p>
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Full Transcript</h2>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {fullTranscript}
            </div>
          </div>
        </div>

        {/* Diarized Transcript (if available) */}
        {transcription.diarized_transcript && transcription.diarized_transcript.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Speaker Diarization</h2>
            <div className="space-y-3">
              {transcription.diarized_transcript.map((segment: any, index: number) => (
                <div key={index} className="flex gap-3">
                  <span className="font-medium text-blue-600 min-w-[100px]">
                    {segment.speaker}:
                  </span>
                  <span className="text-gray-800">{segment.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function ViewTranscriptionPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    }>
      <ViewTranscriptionContent />
    </Suspense>
  );
}

