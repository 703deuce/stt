import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface SpeakerMapping {
  [speakerId: string]: string; // e.g., "Speaker_00" -> "Speaker 1"
}

class SpeakerMappingService {
  private collection = 'stt_records'; // This will be overridden per user
  
  // Force module reload by adding a version comment
  // Version: 2.0 - Fixed collection path issue

  /**
   * Get speaker mappings for a specific transcription
   */
  async getSpeakerMappings(transcriptionId: string, userId?: string): Promise<SpeakerMapping> {
    try {
      const collectionPath = userId ? `users/${userId}/stt` : this.collection;
      const docRef = doc(db, collectionPath, transcriptionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.speaker_mappings || {};
      }
      
      return {};
    } catch (error) {
      console.error('❌ Error getting speaker mappings:', error);
      return {};
    }
  }

  /**
   * Update speaker mapping for a specific transcription
   */
  async updateSpeakerMapping(
    transcriptionId: string, 
    speakerId: string, 
    newName: string,
    userId?: string
  ): Promise<void> {
    try {
      const collectionPath = userId ? `users/${userId}/stt` : this.collection;
      const docRef = doc(db, collectionPath, transcriptionId);
      
      // Get current mappings
      const currentMappings = await this.getSpeakerMappings(transcriptionId, userId);
      
      // Update the specific speaker mapping
      const updatedMappings = {
        ...currentMappings,
        [speakerId]: newName
      };
      
      // Save to database
      await updateDoc(docRef, {
        speaker_mappings: updatedMappings
      });
      
      console.log(`📝 Updated speaker mapping for ${transcriptionId}: ${speakerId} -> ${newName}`);
    } catch (error) {
      console.error('❌ Error updating speaker mapping:', error);
      throw error;
    }
  }

  /**
   * Initialize default speaker mappings for a transcription
   * This should be called when a transcription is first created
   */
  async initializeDefaultMappings(transcriptionId: string, speakers: string[], userId?: string): Promise<SpeakerMapping> {
    try {
      const defaultMappings: SpeakerMapping = {};
      
      // Create default mappings: Speaker_00 -> Speaker 1, Speaker_01 -> Speaker 2, etc.
      speakers.forEach((speakerId, index) => {
        defaultMappings[speakerId] = `Speaker ${index + 1}`;
      });
      
      const collectionPath = userId ? `users/${userId}/stt` : this.collection;
      console.log(`🔧 Debug: Using collection path: ${collectionPath} for transcriptionId: ${transcriptionId}`);
      
      // Double-check we're not using the old collection
      if (collectionPath === 'stt_records') {
        console.warn('⚠️ WARNING: Using old stt_records collection! This should be users/{userId}/stt');
      }
      
      const docRef = doc(db, collectionPath, transcriptionId);
      await updateDoc(docRef, {
        speaker_mappings: defaultMappings
      });
      
      console.log(`🎯 Initialized default speaker mappings for ${transcriptionId}:`, defaultMappings);
      return defaultMappings;
    } catch (error) {
      console.error('❌ Error initializing default speaker mappings:', error);
      throw error;
    }
  }

  /**
   * Get display name for a speaker in a specific transcription
   */
  async getSpeakerDisplayName(transcriptionId: string, speakerId: string, userId?: string): Promise<string> {
    try {
      const mappings = await this.getSpeakerMappings(transcriptionId, userId);
      return mappings[speakerId] || speakerId;
    } catch (error) {
      console.error('❌ Error getting speaker display name:', error);
      return speakerId;
    }
  }

  /**
   * Reset all speaker mappings for a transcription to defaults
   */
  async resetSpeakerMappings(transcriptionId: string, speakers: string[], userId?: string): Promise<void> {
    try {
      await this.initializeDefaultMappings(transcriptionId, speakers, userId);
      console.log(`🔄 Reset speaker mappings for ${transcriptionId}`);
    } catch (error) {
      console.error('❌ Error resetting speaker mappings:', error);
      throw error;
    }
  }
}

export const speakerMappingService = new SpeakerMappingService();
