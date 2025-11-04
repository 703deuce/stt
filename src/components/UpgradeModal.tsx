'use client';

import { X } from 'lucide-react';
import CheckoutButton from './CheckoutButton';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export default function UpgradeModal({ isOpen, onClose, reason }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Upgrade to Continue
              </h2>
              <p className="text-gray-600">
                {reason || 'Your free trial has ended. Choose a plan to continue transcribing unlimited audio!'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-4">
            {/* Transcription-Only Plan */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Transcription Only</h3>
                  <p className="text-sm text-gray-600 mt-1">For professionals who just need transcripts</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">$17.99</span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited transcription minutes
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Speaker diarization
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  SRT/VTT subtitles
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  25 languages
                </li>
                <li className="flex items-center text-sm text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  No content generation
                </li>
              </ul>
              <CheckoutButton plan="transcription-only">
                Choose Transcription Only
              </CheckoutButton>
            </div>

            {/* Creator Plan - MOST POPULAR */}
            <div className="border-2 border-purple-500 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-teal-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                MOST POPULAR
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Creator Plan</h3>
                  <p className="text-sm text-gray-600 mt-1">For podcasters, YouTubers & marketers</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-purple-600">$34.99</span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>Unlimited</strong> transcription
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>Unlimited</strong> content repurposing
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  30+ content types (blog, social, marketing)
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copywriting frameworks (AIDA, BAB, PAS)
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Custom creative instructions
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  All transcription features (speaker diarization, timestamps)
                </li>
              </ul>
              <CheckoutButton plan="creator">
                Start Creator Plan
              </CheckoutButton>
            </div>
          </div>


          {/* Footer */}
          <div className="mt-6 text-center">
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

