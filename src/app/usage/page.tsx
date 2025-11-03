'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, TrendingUp, Clock, FileText, Sparkles } from 'lucide-react';
import { trialService } from '@/services/trialService';
import { contentLimitService } from '@/services/contentLimitService';
import { databaseService } from '@/services/databaseService';

export default function UsagePage() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [wordLimitStatus, setWordLimitStatus] = useState<any>(null);
  const [transcriptionStats, setTranscriptionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const [trial, wordLimits, transcriptions] = await Promise.all([
        trialService.getTrialStatus().catch(() => null),
        contentLimitService.getWordLimitStatus().catch(() => null),
        databaseService.getSTTRecords(user!.uid, 1000).catch(() => [])
      ]);

      setTrialStatus(trial);
      setWordLimitStatus(wordLimits);
      
      // Calculate transcription stats
      if (transcriptions) {
        const completed = transcriptions.filter((t: any) => t.status === 'completed').length;
        const totalDuration = transcriptions.reduce((sum: number, t: any) => sum + (t.duration || 0), 0);
        setTranscriptionStats({
          total: transcriptions.length,
          completed,
          totalDuration
        });
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Usage & Statistics</h1>
              <p className="text-sm sm:text-base text-gray-600">Track your transcription and content usage</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading usage statistics...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Transcription Minutes */}
                  {trialStatus && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {trialStatus.minutesUsed || 0}
                      </div>
                      <div className="text-sm text-gray-500">
                        of {trialStatus.totalMinutes || 0} minutes used
                      </div>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${trialStatus.totalMinutes 
                              ? Math.min((trialStatus.minutesUsed / trialStatus.totalMinutes) * 100, 100) 
                              : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Content Words */}
                  {wordLimitStatus && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {wordLimitStatus.wordsUsed || 0}
                      </div>
                      <div className="text-sm text-gray-500">
                        of {wordLimitStatus.monthlyLimit || 0} words used
                      </div>
                      <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${wordLimitStatus.monthlyLimit 
                              ? Math.min((wordLimitStatus.wordsUsed / wordLimitStatus.monthlyLimit) * 100, 100) 
                              : 0}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Transcriptions */}
                  {transcriptionStats && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-5 h-5 text-green-500" />
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {transcriptionStats.completed || 0}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transcriptionStats.total || 0} total transcriptions
                      </div>
                    </div>
                  )}

                  {/* Total Duration */}
                  {transcriptionStats && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="w-5 h-5 text-orange-500" />
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatDuration(transcriptionStats.totalDuration || 0)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total audio transcribed
                      </div>
                    </div>
                  )}
                </div>

                {/* Detailed Usage */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4 sm:p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Usage Overview</h2>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {trialStatus && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">Transcription Minutes</div>
                            <div className="text-sm text-gray-500">Used for audio transcription</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {trialStatus.minutesUsed || 0} / {trialStatus.totalMinutes || 0}
                            </div>
                            <div className="text-sm text-gray-500">minutes</div>
                          </div>
                        </div>
                      )}

                      {wordLimitStatus && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">Content Words</div>
                            <div className="text-sm text-gray-500">Used for content repurposing</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {wordLimitStatus.wordsUsed || 0} / {wordLimitStatus.monthlyLimit || 0}
                            </div>
                            <div className="text-sm text-gray-500">words this month</div>
                          </div>
                        </div>
                      )}

                      {transcriptionStats && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900">Total Transcriptions</div>
                            <div className="text-sm text-gray-500">All time transcription count</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">{transcriptionStats.total || 0}</div>
                            <div className="text-sm text-gray-500">transcriptions</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

