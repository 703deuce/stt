import { useState, useEffect, useCallback } from 'react';
import { databaseService, STTRecord, TTSRecord, UserProfile } from '../services/databaseService';
import { useAuth } from '../context/AuthContext';

export function useDatabase() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // STT Records
  const [sttRecords, setSttRecords] = useState<STTRecord[]>([]);
  const [ttsRecords, setTtsRecords] = useState<TTSRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Fetch STT records
  const fetchSTTRecords = useCallback(async (limit: number = 50) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const records = await databaseService.getSTTRecords(limit);
      setSttRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch STT records');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch TTS records
  const fetchTTSRecords = useCallback(async (limit: number = 50) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const records = await databaseService.getTTSRecords(limit);
      setTtsRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch TTS records');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const profile = await databaseService.getUserProfile();
      setUserProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create STT record
  const createSTTRecord = useCallback(async (data: Omit<STTRecord, 'id' | 'timestamp' | 'type'>) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      const recordId = await databaseService.createSTTRecord(data);
      // Refresh the list
      await fetchSTTRecords();
      return recordId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create STT record';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchSTTRecords]);

  // Create TTS record
  const createTTSRecord = useCallback(async (data: Omit<TTSRecord, 'id' | 'timestamp' | 'type'>) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      const recordId = await databaseService.createTTSRecord(data);
      // Refresh the list
      await fetchTTSRecords();
      return recordId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create TTS record';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchTTSRecords]);

  // Update STT record
  const updateSTTRecord = useCallback(async (recordId: string, updates: Partial<STTRecord>) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      await databaseService.updateSTTRecord(recordId, updates);
      // Refresh the list
      await fetchSTTRecords();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update STT record';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchSTTRecords]);

  // Update TTS record
  const updateTTSRecord = useCallback(async (recordId: string, updates: Partial<TTSRecord>) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      await databaseService.updateTTSRecord(recordId, updates);
      // Refresh the list
      await fetchTTSRecords();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update TTS record';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchTTSRecords]);

  // Delete STT record
  const deleteSTTRecord = useCallback(async (recordId: string) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      await databaseService.deleteSTTRecord(recordId);
      // Refresh the list
      await fetchSTTRecords();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete STT record';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchSTTRecords]);

  // Delete TTS record
  const deleteTTSRecord = useCallback(async (recordId: string) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      await databaseService.deleteTTSRecord(recordId);
      // Refresh the list
      await fetchTTSRecords();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete TTS record';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchTTSRecords]);

  // Search STT records
  const searchSTTRecords = useCallback(async (searchTerm: string, limit: number = 20) => {
    if (!user) return [];
    
    setError(null);
    
    try {
      const results = await databaseService.searchSTTRecords(searchTerm, limit);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search STT records';
      setError(errorMessage);
      return [];
    }
  }, [user]);

  // Get user stats
  const getUserStats = useCallback(async () => {
    if (!user) return null;
    
    setError(null);
    
    try {
      const stats = await databaseService.getUserStats();
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user stats';
      setError(errorMessage);
      return null;
    }
  }, [user]);

  // Update user profile
  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('User must be authenticated');
    
    setError(null);
    
    try {
      await databaseService.updateUserProfile(updates);
      // Refresh the profile
      await fetchUserProfile();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user profile';
      setError(errorMessage);
      throw err;
    }
  }, [user, fetchUserProfile]);

  // Load initial data when user changes
  useEffect(() => {
    if (user) {
      fetchSTTRecords();
      fetchTTSRecords();
      fetchUserProfile();
    } else {
      // Clear data when user signs out
      setSttRecords([]);
      setTtsRecords([]);
      setUserProfile(null);
    }
  }, [user, fetchSTTRecords, fetchTTSRecords, fetchUserProfile]);

  return {
    // State
    loading,
    error,
    sttRecords,
    ttsRecords,
    userProfile,
    
    // Actions
    clearError,
    fetchSTTRecords,
    fetchTTSRecords,
    fetchUserProfile,
    createSTTRecord,
    createTTSRecord,
    updateSTTRecord,
    updateTTSRecord,
    deleteSTTRecord,
    deleteTTSRecord,
    searchSTTRecords,
    getUserStats,
    updateUserProfile,
    
    // Utilities
    hasRecords: sttRecords.length > 0 || ttsRecords.length > 0,
    totalRecords: sttRecords.length + ttsRecords.length
  };
}
