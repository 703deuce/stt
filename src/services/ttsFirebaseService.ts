import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export interface TTSFirebaseUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
}

class TTSFirebaseService {
  /**
   * Upload generated audio to Firebase Storage
   */
  async uploadTTSAudio(
    audioBlob: Blob, 
    userId: string, 
    originalFilename: string,
    contentType: string = 'audio/wav'
  ): Promise<TTSFirebaseUploadResult> {
    try {
      console.log('🔄 Uploading TTS audio to Firebase Storage...');
      console.log('📁 User ID:', userId);
      console.log('📁 Original filename:', originalFilename);
      console.log('📁 Content type:', contentType);
      console.log('📁 Blob size:', audioBlob.size, 'bytes');
      
      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = contentType.split('/')[1] || 'wav';
      const filename = `tts_${timestamp}_${originalFilename.replace(/\.[^/.]+$/, '')}.${fileExtension}`;
      
      // Create the storage path: users/{userId}/tts/{filename}
      const storagePath = `users/${userId}/tts/${filename}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📁 Storage path:', storagePath);
      console.log('📁 Final filename:', filename);
      
      // Upload the blob to Firebase Storage
      console.log('📤 Starting upload...');
      const uploadResult = await uploadBytes(storageRef, audioBlob, {
        contentType: contentType
      });
      
      console.log('✅ Upload successful!');
      console.log('📊 Blob size uploaded:', audioBlob.size, 'bytes');
      
      // Get the download URL
      console.log('🔗 Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('🔗 Download URL:', downloadURL);
      
      return {
        success: true,
        url: downloadURL,
        filename: filename
      };
      
    } catch (error) {
      console.error('❌ TTS audio upload failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Upload audio from base64 data
   */
  async uploadTTSAudioFromBase64(
    base64Data: string, 
    userId: string, 
    originalFilename: string,
    contentType: string = 'audio/wav'
  ): Promise<TTSFirebaseUploadResult> {
    try {
      console.log('🔄 Converting base64 to blob for TTS upload...');
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: contentType });
      
      console.log('✅ Base64 converted to blob, size:', audioBlob.size, 'bytes');
      
      // Upload the blob
      return await this.uploadTTSAudio(audioBlob, userId, originalFilename, contentType);
      
    } catch (error) {
      console.error('❌ Failed to convert base64 to blob:', error);
      
      let errorMessage = 'Failed to convert audio data';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete TTS audio from Firebase Storage
   */
  async deleteTTSAudio(filename: string, userId: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting TTS audio from Firebase Storage...');
      console.log('📁 Filename:', filename);
      console.log('📁 User ID:', userId);
      
      // Create the storage path
      const storagePath = `users/${userId}/tts/${filename}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📁 Storage path:', storagePath);
      
      // Delete the file
      await deleteObject(storageRef);
      
      console.log('✅ TTS audio deleted successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to delete TTS audio:', error);
      return false;
    }
  }

  /**
   * Get TTS audio URL from filename
   */
  async getTTSAudioURL(filename: string, userId: string): Promise<string | null> {
    try {
      console.log('🔗 Getting TTS audio URL...');
      console.log('📁 Filename:', filename);
      console.log('📁 User ID:', userId);
      
      // Create the storage path
      const storagePath = `users/${userId}/tts/${filename}`;
      const storageRef = ref(storage, storagePath);
      
      console.log('📁 Storage path:', storagePath);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('🔗 Download URL:', downloadURL);
      
      return downloadURL;
      
    } catch (error) {
      console.error('❌ Failed to get TTS audio URL:', error);
      return null;
    }
  }

  /**
   * Validate audio file for TTS upload
   */
  validateTTSAudio(audioBlob: Blob): { valid: boolean; error?: string } {
    try {
      // Check if it's a valid audio blob
      if (!audioBlob || audioBlob.size === 0) {
        return { valid: false, error: 'Audio data is empty or invalid' };
      }
      
      // Check file size (max 50MB for TTS audio)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (audioBlob.size > maxSize) {
        return { 
          valid: false, 
          error: `Audio file too large. Maximum size is ${maxSize / (1024 * 1024)}MB` 
        };
      }
      
      // Check if it's an audio file
      if (!audioBlob.type.startsWith('audio/')) {
        return { valid: false, error: 'File is not an audio file' };
      }
      
      return { valid: true };
      
    } catch (error) {
      return { 
        valid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Generate a unique filename for TTS audio
   */
  generateTTSFilename(originalName: string, contentType: string = 'audio/wav'): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExtension = contentType.split('/')[1] || 'wav';
    
    // Clean the original name (remove special characters, limit length)
    const cleanName = originalName
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
    
    return `tts_${timestamp}_${randomId}_${cleanName}.${fileExtension}`;
  }
}

// Export singleton instance
export const ttsFirebaseService = new TTSFirebaseService();
export default ttsFirebaseService;
