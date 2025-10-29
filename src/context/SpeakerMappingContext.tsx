'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { speakerMappingService } from '../services/speakerMappingService';

interface SpeakerMapping {
  [speakerId: string]: string; // e.g., "Speaker_00" -> "Speaker 1"
}

interface SpeakerMappingContextType {
  speakerMappings: SpeakerMapping;
  updateSpeakerMapping: (transcriptionId: string, speakerId: string, newName: string) => Promise<void>;
  getSpeakerDisplayName: (transcriptionId: string, speakerId: string) => string;
  resetSpeakerMappings: (transcriptionId: string, speakers: string[]) => Promise<void>;
  loadSpeakerMappings: (transcriptionId: string) => Promise<void>;
  isLoading: boolean;
}

const SpeakerMappingContext = createContext<SpeakerMappingContextType | undefined>(undefined);

export function SpeakerMappingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [speakerMappings, setSpeakerMappings] = useState<SpeakerMapping>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadSpeakerMappings = async (transcriptionId: string) => {
    if (!transcriptionId) return;
    
    setIsLoading(true);
    try {
      const mappings = await speakerMappingService.getSpeakerMappings(transcriptionId);
      setSpeakerMappings(mappings);
    } catch (error) {
      console.error('Error loading speaker mappings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSpeakerMapping = async (transcriptionId: string, speakerId: string, newName: string) => {
    try {
      await speakerMappingService.updateSpeakerMapping(transcriptionId, speakerId, newName);
      setSpeakerMappings(prev => ({
        ...prev,
        [speakerId]: newName
      }));
    } catch (error) {
      console.error('Error updating speaker mapping:', error);
      throw error;
    }
  };

  const getSpeakerDisplayName = (transcriptionId: string, speakerId: string): string => {
    return speakerMappings[speakerId] || speakerId;
  };

  const resetSpeakerMappings = async (transcriptionId: string, speakers: string[]) => {
    try {
      await speakerMappingService.resetSpeakerMappings(transcriptionId, speakers);
      const defaultMappings: SpeakerMapping = {};
      speakers.forEach((speakerId, index) => {
        defaultMappings[speakerId] = `Speaker ${index + 1}`;
      });
      setSpeakerMappings(defaultMappings);
    } catch (error) {
      console.error('Error resetting speaker mappings:', error);
      throw error;
    }
  };

  return (
    <SpeakerMappingContext.Provider value={{
      speakerMappings,
      updateSpeakerMapping,
      getSpeakerDisplayName,
      resetSpeakerMappings,
      loadSpeakerMappings,
      isLoading
    }}>
      {children}
    </SpeakerMappingContext.Provider>
  );
}

export function useSpeakerMapping() {
  const context = useContext(SpeakerMappingContext);
  if (context === undefined) {
    throw new Error('useSpeakerMapping must be used within a SpeakerMappingProvider');
  }
  return context;
}
