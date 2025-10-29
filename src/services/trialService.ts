import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface TrialStatus {
  isActive: boolean;
  minutesRemaining: number;
  daysRemaining: number;
  hasEnded: boolean;
  minutesUsed: number;
  minutesTotal: number;
  startDate: Date | null;
  endDate: Date | null;
}

export interface CanTranscribeResult {
  canTranscribe: boolean;
  reason?: string;
  isSubscribed?: boolean;
  trialStatus?: TrialStatus;
}

export class TrialService {
  /**
   * Get the current trial status for the logged-in user
   */
  async getTrialStatus(): Promise<TrialStatus | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log('User document does not exist');
        return null;
      }

      const userData = userDoc.data();

      // If user has active subscription, no trial needed
      if (userData?.subscriptionStatus === 'active') {
        return null;
      }

      if (!userData?.trial) {
        console.log('No trial data found for user');
        return null;
      }

      const trial = userData.trial;
      const now = new Date();
      
      // Parse dates
      const startDate = trial.startDate?.toDate?.() || null;
      const endDate = trial.endDate?.toDate?.() || null;
      
      // Calculate days remaining
      let daysRemaining = 0;
      if (endDate) {
        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      // Calculate minutes remaining
      const minutesUsed = trial.minutesUsed || 0;
      const minutesTotal = trial.minutesTotal || 90;
      const minutesRemaining = Math.max(0, minutesTotal - minutesUsed);
      
      // Determine if trial is active
      const hasEnded = trial.hasEnded || daysRemaining === 0 || minutesRemaining === 0;
      const isActive = !hasEnded && trial.isActive !== false;

      return {
        isActive,
        minutesRemaining,
        daysRemaining,
        hasEnded,
        minutesUsed,
        minutesTotal,
        startDate,
        endDate,
      };
    } catch (error) {
      console.error('Error getting trial status:', error);
      return null;
    }
  }

  /**
   * Check if user can transcribe based on subscription or trial status
   */
  async checkCanTranscribe(estimatedMinutes: number = 0): Promise<CanTranscribeResult> {
    const user = auth.currentUser;
    
    if (!user) {
      return { 
        canTranscribe: false, 
        reason: 'You must be logged in to transcribe.' 
      };
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        return { 
          canTranscribe: false, 
          reason: 'User account not found.' 
        };
      }

      const userData = userDoc.data();

      // Check if user has active subscription
      if (userData?.subscriptionStatus === 'active') {
        return { 
          canTranscribe: true,
          isSubscribed: true
        };
      }

      // Check trial status
      const trialStatus = await this.getTrialStatus();
      
      if (!trialStatus) {
        return { 
          canTranscribe: false, 
          reason: 'No active trial or subscription found. Please upgrade to continue.' 
        };
      }

      if (!trialStatus.isActive || trialStatus.hasEnded) {
        return { 
          canTranscribe: false, 
          reason: 'Your free trial has ended. Upgrade to unlimited transcription!',
          trialStatus
        };
      }

      // Check if estimated duration exceeds remaining minutes
      if (estimatedMinutes > 0 && estimatedMinutes > trialStatus.minutesRemaining) {
        return { 
          canTranscribe: false, 
          reason: `This file requires approximately ${Math.ceil(estimatedMinutes)} minutes, but you only have ${Math.ceil(trialStatus.minutesRemaining)} minutes remaining in your trial.`,
          trialStatus
        };
      }

      return { 
        canTranscribe: true,
        trialStatus
      };
    } catch (error) {
      console.error('Error checking transcription eligibility:', error);
      return { 
        canTranscribe: false, 
        reason: 'Error checking account status. Please try again.' 
      };
    }
  }

  /**
   * Deduct minutes from user's trial after transcription completes
   */
  async deductMinutes(actualMinutes: number): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    return this.deductMinutesForUser(user.uid, actualMinutes);
  }

  /**
   * Deduct minutes from a specific user's trial (server-side version)
   */
  async deductMinutesForUser(userId: string, actualMinutes: number): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error('User document not found for userId:', userId);
        return;
      }

      const userData = userDoc.data();

      // Only deduct if user is on trial (not if they have active subscription)
      if (userData?.subscriptionStatus === 'active') {
        console.log('User has active subscription, not deducting trial minutes');
        return;
      }

      if (!userData?.trial) {
        console.warn('No trial data found, cannot deduct minutes for userId:', userId);
        return;
      }

      // Deduct minutes
      await updateDoc(userRef, {
        'trial.minutesUsed': increment(actualMinutes),
        updatedAt: serverTimestamp(),
      });

      console.log(`✅ Deducted ${actualMinutes} minutes from trial for user ${userId}`);

      // Check if trial should end
      const updatedDoc = await getDoc(userRef);
      const trial = updatedDoc.data()?.trial;

      if (trial && trial.minutesUsed >= trial.minutesTotal) {
        // Mark trial as ended
        await updateDoc(userRef, {
          'trial.hasEnded': true,
          'trial.isActive': false,
          updatedAt: serverTimestamp(),
        });
        console.log('⚠️ Trial has ended (minutes exhausted) for user:', userId);
      }
    } catch (error) {
      console.error('Error deducting trial minutes for user:', userId, error);
    }
  }

  /**
   * Get audio duration from file (in minutes)
   */
  async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        window.URL.revokeObjectURL(audio.src);
        const durationMinutes = audio.duration / 60;
        resolve(durationMinutes);
      };
      
      audio.onerror = () => {
        // If we can't determine duration, estimate based on file size
        // Rough estimate: 1MB per minute for compressed audio
        const estimatedMinutes = file.size / (1024 * 1024);
        resolve(estimatedMinutes);
      };
      
      audio.src = window.URL.createObjectURL(file);
    });
  }
}

// Export singleton instance
export const trialService = new TrialService();

