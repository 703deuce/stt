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
                    <span className="text-3xl font-bold text-purple-600">$24.99</span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>Everything in Transcription Only</strong>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>20,000 words</strong> content generation/month
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
              </ul>
              <CheckoutButton plan="creator">
                Start Creator Plan
              </CheckoutButton>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Pro Plan</h3>
                  <p className="text-sm text-gray-600 mt-1">For creative teams & agencies</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-purple-600">$49.99</span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>Everything in Creator</strong>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>100,000 words</strong> content generation/month
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Batch transcription uploads
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Extended storage
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Priority support
                </li>
              </ul>
              <CheckoutButton plan="pro">
                Start Pro Plan
              </CheckoutButton>
            </div>

            {/* Studio Plan */}
            <div className="border-2 border-teal-500 rounded-lg p-6 bg-gradient-to-br from-teal-50 to-purple-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                BEST VALUE
              </div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Studio Plan</h3>
                  <p className="text-sm text-gray-600 mt-1">For agencies & large content teams</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-teal-600">$89.99</span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>Everything in Pro</strong>
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-teal-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <strong>400,000 words</strong> content generation/month
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-teal-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited file storage
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-teal-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Advanced export options
                </li>
                <li className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-teal-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Dedicated support
                </li>
              </ul>
              <CheckoutButton plan="studio">
                Start Studio Plan
              </CheckoutButton>
            </div>
          </div>

          {/* Word Boosts Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">One-Time Word Boosts</h3>
              <p className="text-sm text-gray-600">Need extra content generation this month? Add a boost anytime.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quick Boost */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">Quick Boost</h4>
                    <p className="text-xs text-gray-500 mt-1">5,000 words</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">$6.99</div>
                    <div className="text-xs text-gray-500">$0.0014/word</div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">Light creators finishing out the month or testing more formats</p>
                <CheckoutButton plan="boost-5k">
                  Buy Quick Boost
                </CheckoutButton>
              </div>

              {/* Standard Boost */}
              <div className="border-2 border-purple-400 rounded-lg p-4 bg-purple-50 relative">
                <div className="absolute top-0 right-0 bg-purple-500 text-white px-2 py-0.5 text-xs font-bold rounded-bl-lg rounded-tr-lg">
                  POPULAR
                </div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">Standard Boost</h4>
                    <p className="text-xs text-gray-500 mt-1">10,000 words</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">$11.99</div>
                    <div className="text-xs text-gray-500">$0.0012/word</div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">Regular creators needing a little extra without upgrading fully</p>
                <CheckoutButton plan="boost-10k">
                  Buy Standard Boost
                </CheckoutButton>
              </div>

              {/* Pro Boost */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">Pro Boost</h4>
                    <p className="text-xs text-gray-500 mt-1">50,000 words</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">$29.99</div>
                    <div className="text-xs text-gray-500">$0.0010/word</div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-4">Heavy users running batch repurposing or multiple projects</p>
                <CheckoutButton plan="boost-50k">
                  Buy Pro Boost
                </CheckoutButton>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Boosts are added to your account immediately and never expire.
            </p>
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

