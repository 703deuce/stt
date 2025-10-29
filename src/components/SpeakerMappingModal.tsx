'use client';

import React, { useState, useEffect } from 'react';
import { useSpeakerMapping } from '../context/SpeakerMappingContext';
import { X, Save, RotateCcw } from 'lucide-react';

interface SpeakerMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: string[]; // Array of speaker IDs like ["Speaker_00", "Speaker_01"]
  transcriptionId: string;
  updateSpeakerMapping: (transcriptionId: string, speakerId: string, newName: string) => Promise<void>;
  resetSpeakerMappings: (transcriptionId: string, speakers: string[]) => Promise<void>;
  isLoading: boolean;
}

export default function SpeakerMappingModal({ 
  isOpen, 
  onClose, 
  speakers, 
  transcriptionId, 
  updateSpeakerMapping, 
  resetSpeakerMappings, 
  isLoading 
}: SpeakerMappingModalProps) {
  const { speakerMappings, getSpeakerDisplayName } = useSpeakerMapping();
  const [localMappings, setLocalMappings] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  // Initialize local mappings when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialMappings: { [key: string]: string } = {};
      speakers.forEach(speakerId => {
        initialMappings[speakerId] = getSpeakerDisplayName(transcriptionId, speakerId);
      });
      setLocalMappings(initialMappings);
    }
  }, [isOpen, speakers, getSpeakerDisplayName, transcriptionId]);

  const handleNameChange = (speakerId: string, newName: string) => {
    setLocalMappings(prev => ({
      ...prev,
      [speakerId]: newName
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update all mappings
      for (const [speakerId, newName] of Object.entries(localMappings)) {
        await updateSpeakerMapping(transcriptionId, speakerId, newName);
      }
      onClose();
    } catch (error) {
      console.error('Error saving speaker mappings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await resetSpeakerMappings(transcriptionId, speakers);
      const resetMappings: { [key: string]: string } = {};
      speakers.forEach((speakerId, index) => {
        resetMappings[speakerId] = `Speaker ${index + 1}`;
      });
      setLocalMappings(resetMappings);
    } catch (error) {
      console.error('Error resetting speaker mappings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rename Speakers</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {speakers.map(speakerId => (
            <div key={speakerId} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 font-medium">
                {speakerId}:
              </div>
              <input
                type="text"
                value={localMappings[speakerId] || speakerId}
                onChange={(e) => handleNameChange(speakerId, e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter speaker name"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={saving || isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{saving ? 'Resetting...' : 'Reset All'}</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> These names are specific to this transcription only. 
            Each transcription has its own speaker names that you can customize independently.
          </p>
        </div>
      </div>
    </div>
  );
}
