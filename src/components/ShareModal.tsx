'use client';

import React, { useState } from 'react';
import { X, Share2, Copy, CheckCircle, ExternalLink, Lock, Unlock } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcriptionId: string;
  transcriptionName: string;
  isPublic: boolean;
  onTogglePublic: (isPublic: boolean) => Promise<void>;
}

export default function ShareModal({
  isOpen,
  onClose,
  transcriptionId,
  transcriptionName,
  isPublic,
  onTogglePublic,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isTogglingPublic, setIsTogglingPublic] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/shared/${transcriptionId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTogglePublic = async () => {
    setIsTogglingPublic(true);
    try {
      await onTogglePublic(!isPublic);
    } catch (error) {
      console.error('Failed to toggle public status:', error);
      alert('Failed to update sharing settings. Please try again.');
    } finally {
      setIsTogglingPublic(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Share Transcript</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transcript Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transcript</label>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-900 font-medium truncate">{transcriptionName}</p>
            </div>
          </div>

          {/* Public/Private Toggle */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {isPublic ? (
                  <Unlock className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {isPublic ? 'Public Link Active' : 'Private Transcript'}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {isPublic
                      ? 'Anyone with the link can view this transcript, even without an account.'
                      : 'Only you can view this transcript. Enable sharing to create a public link.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleTogglePublic}
                disabled={isTogglingPublic}
                className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  isPublic ? 'bg-purple-600' : 'bg-gray-200'
                } ${isTogglingPublic ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Share Link */}
          {isPublic && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Share this link with anyone to let them view your transcript
              </p>
            </div>
          )}

          {/* Features Info */}
          {isPublic && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">What viewers can do:</h4>
              <ul className="space-y-1 text-xs text-blue-800">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>View the full transcript with speaker labels and timestamps</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>Listen to the audio (if available)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>Download the transcript in various formats</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                  <span>See a banner encouraging them to sign up for their own transcriptions</span>
                </li>
              </ul>
            </div>
          )}

          {/* Open Link Button */}
          {isPublic && (
            <div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Preview Public View</span>
              </a>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

