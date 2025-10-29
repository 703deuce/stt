'use client';

import { useEffect, useState } from 'react';
import { trialService, TrialStatus } from '../services/trialService';
import { Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TrialStatusBanner() {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      // Check if user is subscribed first
      const checkResult = await trialService.checkCanTranscribe(0);
      setIsSubscribed(checkResult.isSubscribed || false);
      
      // Get trial status
      const trialStatus = await trialService.getTrialStatus();
      setStatus(trialStatus);
    } catch (error) {
      console.error('Error loading trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if loading
  if (loading) return null;

  // Don't show if user is subscribed
  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-900">
              ✨ Unlimited Access Active
            </p>
            <p className="text-sm text-green-700">
              You have unlimited transcription. Transcribe as much as you need!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no trial status
  if (!status || !status.isActive) return null;

  const percentUsed = ((status.minutesUsed / status.minutesTotal) * 100);
  const isLow = status.minutesRemaining < 30;
  const isVeryLow = status.minutesRemaining < 10;

  return (
    <div className={`rounded-lg p-4 mb-6 border-2 ${
      isVeryLow 
        ? 'bg-red-50 border-red-300' 
        : isLow 
        ? 'bg-purple-50 border-purple-300' 
        : 'bg-teal-50 border-teal-300'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            isVeryLow 
              ? 'bg-red-100' 
              : isLow 
              ? 'bg-purple-100' 
              : 'bg-teal-100'
          }`}>
            {isVeryLow || isLow ? (
              <AlertTriangle className={`w-5 h-5 ${isVeryLow ? 'text-red-600' : 'text-purple-600'}`} />
            ) : (
              <Zap className="w-5 h-5 text-teal-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              Free Trial: {Math.ceil(status.minutesRemaining)} minutes remaining
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'} left
              </span>
              <span>
                {Math.ceil(status.minutesUsed)} / {status.minutesTotal} minutes used
              </span>
            </div>
          </div>
        </div>
        
        {(isLow || isVeryLow) && (
          <a 
            href="/dashboard#upgrade" 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isVeryLow
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gradient-to-r from-purple-600 to-teal-500 text-white hover:from-purple-700 hover:to-teal-600'
            }`}
          >
            Upgrade Now
          </a>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            isVeryLow 
              ? 'bg-gradient-to-r from-red-500 to-red-600' 
              : isLow 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
              : 'bg-gradient-to-r from-teal-500 to-teal-600'
          }`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      {/* Warning Messages */}
      {isVeryLow && (
        <div className="mt-3 text-sm text-red-700 font-medium">
          ⚠️ Less than 10 minutes remaining! Upgrade now to continue transcribing.
        </div>
      )}
      {isLow && !isVeryLow && (
        <div className="mt-3 text-sm text-purple-700">
          Running low on trial minutes. Upgrade to get unlimited transcription!
        </div>
      )}
    </div>
  );
}

