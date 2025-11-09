// Firebase Storage service for uploading audio files
// Based on FIREBASE_PIPELINE_GUIDE.txt

import { auth } from "../config/firebase";
import { databaseService } from "./databaseService";
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export interface FirebaseUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  filename?: string;
  userId?: string;
  recordId?: string;
}

class FirebaseService {
  // Firebase configuration from your guide
  private readonly bucketName = 'aitts-d4c6d.firebasestorage.app';
  private readonly uploadPath = 'transcription_uploads';

  /**
   * Get current authenticated user
   */
  private getCurrentUser() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload files');
    }
    return user;
  }

  /**
   * Get current authenticated user ID
   */
  private getCurrentUserId(): string | undefined {
    const user = auth.currentUser;
    return user?.uid;
  }

  /**
   * Upload audio file to Firebase Storage only (no database record)
   * Used when we want to wait for transcription to complete before saving to database
   */
  async uploadAudioFileToStorageOnly(file: File, onProgress?: (progress: number) => void, userIdOverride?: string): Promise<{ success: boolean; url?: string; filename?: string; userId?: string; error?: string }> {
    try {
      console.log('📤 Uploading audio file to Firebase Storage only...');
      
      // Validate file
      const validation = this.validateAudioFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Get current user
      const userId = userIdOverride || this.getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name}`;
      const fullPath = `${this.uploadPath}/${userId}/stt/${filename}`;

      console.log('📁 Upload path:', fullPath);
      console.log('📁 Filename:', filename);

      // Create storage reference
      const storageRef = ref(storage, fullPath);

      // Upload file with promise wrapper
      console.log('📤 Starting upload...');
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Wait for upload to complete using promise
      const snapshot = await new Promise<any>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`📊 Upload progress: ${progress.toFixed(1)}%`);
            // Call progress callback if provided
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            console.error('❌ Upload error:', error);
            reject(error);
          },
          () => {
            console.log('✅ Upload completed successfully');
            resolve(uploadTask.snapshot);
          }
        );
      });
      
      console.log('✅ Upload completed, bytes transferred:', snapshot.bytesTransferred);

      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('🔗 Download URL:', downloadUrl);

      return { 
        success: true, 
        url: downloadUrl, 
        filename, 
        userId 
      };
    } catch (error) {
      console.error('❌ Firebase Storage upload failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown upload error' 
      };
    }
  }

  /**
   * Upload audio file to Firebase Storage and create initial database record
   */
  async uploadAudioFile(file: File): Promise<FirebaseUploadResult> {
    try {
      // Check authentication
      const user = this.getCurrentUser();
      const userId = user.uid;
      
      console.log('🚀 Starting Firebase upload...', {
        name: file.name,
        size: this.formatFileSize(file.size),
        type: file.type,
        userId
      });

      // Generate unique filename with timestamp and user ID
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
      const randomId = Math.random().toString(36).substring(2, 10);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'wav';
      const filename = `user_${userId}_${timestamp}_${randomId}.${extension}`;
      const fullPath = `${this.uploadPath}/${userId}/stt/${filename}`;

      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Firebase Storage REST API upload
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o?name=${encodeURIComponent(fullPath)}`;
      
      console.log('📤 Uploading to Firebase Storage...', {
        filename,
        uploadUrl,
        size: this.formatFileSize(file.size),
        userId
      });

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type || 'audio/wav'
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Firebase upload failed:', errorText);
        throw new Error(`Firebase upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Firebase upload successful:', uploadResult);

      // Generate public download URL
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodeURIComponent(fullPath)}?alt=media`;
      
      console.log('🔗 Generated download URL:', downloadUrl);

      // Create initial STT record in database
      console.log('📝 Creating STT record in database...');
      const recordId = await databaseService.createSTTRecord({
        user_id: userId,
        audio_id: filename,
        name: filename, // Use filename as default name
        audio_file_url: downloadUrl,
        transcript: '', // Will be updated after transcription
        duration: 0, // Will be updated after processing
        language: 'en', // Default, can be updated
        status: 'processing'
      });

      console.log('✅ STT record created in database with ID:', recordId);
      console.log('📊 Record details:', {
        filename,
        downloadUrl,
        recordId,
        userId
      });

      // Verify file is accessible (as per your guide, this can take time for large files)
      const isAccessible = await this.verifyFileAccess(downloadUrl);
      
      if (!isAccessible) {
        console.warn('⚠️ File uploaded but not immediately accessible. This is normal for large files.');
        // Don't fail - the file should become accessible soon
      }

      return {
        success: true,
        url: downloadUrl,
        filename,
        userId,
        recordId
      };

    } catch (error) {
      console.error('❌ Firebase upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload transcription text file to Firebase Storage
   */
  async uploadTranscriptionText(text: string, originalFilename: string): Promise<FirebaseUploadResult> {
    try {
      // Check authentication
      const user = this.getCurrentUser();
      const userId = user.uid;
      
      // Create text file content
      const textContent = `Transcription for: ${originalFilename}\n\n${text}`;
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      
      // Generate filename for text file
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
      const randomId = Math.random().toString(36).substring(2, 10);
      const baseName = originalFilename.split('.').slice(0, -1).join('.');
      const filename = `user_${userId}_${baseName}_transcript_${timestamp}_${randomId}.txt`;
      const fullPath = `${this.uploadPath}/${userId}/transcripts/${filename}`;

      console.log('📝 Uploading transcription text...', {
        filename,
        userId,
        textLength: text.length
      });

      // Firebase Storage REST API upload
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o?name=${encodeURIComponent(fullPath)}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: textBlob,
        headers: {
          'Content-Type': 'text/plain'
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Transcription text upload failed:', errorText);
        throw new Error(`Transcription text upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ Transcription text upload successful:', uploadResult);

      // Generate public download URL
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodeURIComponent(fullPath)}?alt=media`;
      
      return {
        success: true,
        url: downloadUrl,
        filename,
        userId
      };

    } catch (error) {
      console.error('❌ Transcription text upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload TTS generated audio file
   */
  async uploadTTSAudio(audioBlob: Blob, inputText: string, voice: string): Promise<FirebaseUploadResult> {
    try {
      // Check authentication
      const user = this.getCurrentUser();
      const userId = user.uid;
      
      // Generate filename for TTS audio
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
      const randomId = Math.random().toString(36).substring(2, 10);
      const filename = `user_${userId}_tts_${voice}_${timestamp}_${randomId}.wav`;
      const fullPath = `${this.uploadPath}/${userId}/tts/${filename}`;

      console.log('🔊 Uploading TTS audio...', {
        filename,
        userId,
        voice,
        inputTextLength: inputText.length
      });

      // Firebase Storage REST API upload
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o?name=${encodeURIComponent(fullPath)}`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: audioBlob,
        headers: {
          'Content-Type': 'audio/wav'
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ TTS audio upload failed:', errorText);
        throw new Error(`TTS audio upload failed: ${uploadResponse.status} ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ TTS audio upload successful:', uploadResult);

      // Generate public download URL
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o/${encodeURIComponent(fullPath)}?alt=media`;
      
      // Create TTS record in database
      const recordId = await databaseService.createTTSRecord({
        user_id: userId,
        tts_id: filename,
        name: `TTS - ${voice}`, // Default name based on voice
        input_text: inputText,
        audio_url: downloadUrl,
        voice,
        language: 'en', // Default, can be updated
        status: 'completed'
      });

      console.log('📝 Created TTS record in database:', recordId);

      return {
        success: true,
        url: downloadUrl,
        filename,
        userId,
        recordId
      };

    } catch (error) {
      console.error('❌ TTS audio upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Update STT record with transcription results
   */
  async updateSTTRecord(recordId: string, transcript: string, duration: number, confidence?: number): Promise<void> {
    try {
      await databaseService.updateSTTRecord(recordId, {
        transcript,
        duration,
        confidence,
        status: 'completed'
      });
      console.log('✅ STT record updated with transcription results');
    } catch (error) {
      console.error('❌ Error updating STT record:', error);
      throw error;
    }
  }

  /**
   * Get user's uploaded files
   */
  async getUserFiles(): Promise<string[]> {
    try {
      const user = this.getCurrentUser();
      const userId = user.uid;
      
      // List files in user's directory
      const listUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucketName}/o?prefix=${this.uploadPath}/${userId}/&delimiter=/`;
      
      const response = await fetch(listUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.status}`);
      }
      
      const result = await response.json();
      return result.items?.map((item: any) => item.name) || [];
      
    } catch (error) {
      console.error('❌ Error listing user files:', error);
      return [];
    }
  }

  /**
   * Verify that the uploaded file is accessible via the download URL
   * As per your guide, large files can take 10+ minutes to propagate
   */
  private async verifyFileAccess(url: string, maxRetries: number = 3): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔍 Verifying file access (attempt ${i + 1}/${maxRetries})...`);
        
        const response = await fetch(url, { method: 'HEAD' });
        
        if (response.ok) {
          console.log('✅ File is accessible');
          return true;
        } else {
          console.log(`⏳ File not yet accessible (${response.status}), retrying...`);
        }
      } catch (error) {
        console.log(`⏳ Access check failed (attempt ${i + 1}), retrying...`);
      }

      // Wait 2 seconds between retries
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.warn('⚠️ Could not verify file access, but proceeding anyway');
    return false;
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get supported audio and video formats
   */
  getSupportedFormats(): string[] {
    return ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'mp4', 'mov', 'avi', 'mkv'];
  }

  /**
   * Validate audio or video file for Firebase upload
   */
  validateAudioFile(file: File): { valid: boolean; error?: string } {
    const supportedFormats = this.getSupportedFormats();
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !supportedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `Unsupported file format. Supported audio/video formats: ${supportedFormats.join(', ')}`
      };
    }

    // No size limit for Firebase uploads (as per your guide)
    if (file.size > 1024 * 1024 * 1024) { // 1GB sanity check
      return {
        valid: false,
        error: 'File size exceeds reasonable limits (1GB). Please check your file.'
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
export default firebaseService;