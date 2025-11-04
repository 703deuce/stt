'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databaseService } from '../services/databaseService';
import { ttsDatabaseService } from '../services/ttsDatabaseService';
import { STTRecord } from '../services/databaseService';
import { TTSRecord } from '../services/ttsDatabaseService';
import { Timestamp } from 'firebase/firestore';
import { 
  FileText, 
  Volume2, 
  Clock, 
  TrendingUp
} from 'lucide-react';

export default function UserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_transcriptions: 0,
    total_tts_generations: 0,
    total_audio_duration: 0,
    recent_activity: [] as (STTRecord | TTSRecord)[]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserStats();
    } else {
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both STT and TTS records separately
      const [sttRecords, ttsRecords] = await Promise.all([
        databaseService.getSTTRecords(1000),
        ttsDatabaseService.getTTSRecords(user!.uid, 1000)
      ]);

      // Calculate stats manually
      const totalTranscriptions = sttRecords.filter(r => r.status === 'completed').length;
      const totalTTSGenerations = ttsRecords.filter(r => r.status === 'completed').length;
      const totalAudioDuration = sttRecords.reduce((sum, r) => sum + (r.duration || 0), 0);

      // Get recent activity (last 10 records from both types)
      const allRecords = [...sttRecords, ...ttsRecords]
        .sort((a, b) => {
          // Handle different timestamp formats
          let aTime: number;
          if (a.timestamp instanceof Date) {
            aTime = a.timestamp.getTime();
          } else if (a.timestamp instanceof Timestamp) {
            aTime = a.timestamp.toDate().getTime();
          } else if (typeof a.timestamp === 'string') {
            aTime = new Date(a.timestamp).getTime();
          } else if (typeof a.timestamp === 'number') {
            aTime = a.timestamp;
          } else {
            aTime = 0; // Fallback to epoch
          }
          
          let bTime: number;
          if (b.timestamp instanceof Date) {
            bTime = b.timestamp.getTime();
          } else if (b.timestamp instanceof Timestamp) {
            bTime = b.timestamp.toDate().getTime();
          } else if (typeof b.timestamp === 'string') {
            bTime = new Date(b.timestamp).getTime();
          } else if (typeof b.timestamp === 'number') {
            bTime = b.timestamp;
          } else {
            bTime = 0; // Fallback to epoch
          }
          
          return bTime - aTime;
        })
        .slice(0, 10);

      const userStats = {
        total_transcriptions: totalTranscriptions,
        total_tts_generations: totalTTSGenerations,
        total_audio_duration: totalAudioDuration,
        recent_activity: allRecords
      };

      setStats(userStats);
    } catch (err) {
      console.error('❌ Error loading user stats:', err);
      
      let errorMessage = 'Failed to load user statistics';
      if (err instanceof Error) {
        if (err.message.includes('Network connectivity issue')) {
          errorMessage = 'Network connectivity issue. Please check your internet connection.';
        } else if (err.message.includes('Could not reach Cloud Firestore backend')) {
          errorMessage = 'Firestore backend is not responding. This may be a temporary issue.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadUserStats();
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Failed to load statistics</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={handleRetry}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          <button
            onClick={handleRetry}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Transcriptions - Hidden but code preserved for TTS components */}
        {/* <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Transcriptions</p>
              <p className="text-3xl font-bold text-blue-900">{stats.total_transcriptions}</p>
            </div>
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-600">
            Audio files converted to text
          </div>
        </div> */}

        {/* Total Audio Duration */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 mb-1">Audio Processed</p>
              <p className="text-3xl font-bold text-purple-900">{formatDuration(stats.total_audio_duration)}</p>
            </div>
            <div className="w-12 h-12 bg-purple-200 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-purple-600">
            Total audio duration processed
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700 mb-1">Recent Activity</p>
              <p className="text-3xl font-bold text-teal-900">{stats.recent_activity.length}</p>
            </div>
            <div className="w-12 h-12 bg-teal-200 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-teal-700" />
            </div>
          </div>
          <div className="mt-3 text-xs text-teal-600">
            Recent operations performed
          </div>
        </div>
      </div>
    </div>
  );
}
