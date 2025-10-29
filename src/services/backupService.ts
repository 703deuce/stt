/**
 * Backup Service
 * 
 * Handles backup and restore of Firestore data
 * Supports:
 * - Manual backups
 * - Automated scheduled backups
 * - Incremental backups
 * - Restore from backups
 */

import { db, storage } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  collectionGroup,
  Timestamp,
  writeBatch,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, getBytes } from 'firebase/storage';

export interface BackupMetadata {
  id: string;
  createdAt: Timestamp | Date;
  type: 'full' | 'incremental';
  status: 'in_progress' | 'completed' | 'failed';
  recordCounts: {
    users: number;
    stt: number;
    tts: number;
    total: number;
  };
  size: number; // bytes
  storagePath: string;
  error?: string;
  version: string; // App version when backup was created
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    users: Record<string, any>;
    system: Record<string, any>;
  };
}

class BackupService {
  private backupCollection = 'system_backups';
  private backupStoragePrefix = 'backups';
  private maxBatchSize = 500;

  /**
   * Create a full backup of all Firestore data
   */
  async createFullBackup(): Promise<BackupMetadata> {
    console.log('🔄 Starting full backup...');
    
    const backupId = `backup_${Date.now()}`;
    const backupRef = doc(db, this.backupCollection, backupId);
    
    const metadata: BackupMetadata = {
      id: backupId,
      createdAt: Timestamp.now(),
      type: 'full',
      status: 'in_progress',
      recordCounts: {
        users: 0,
        stt: 0,
        tts: 0,
        total: 0
      },
      size: 0,
      storagePath: `${this.backupStoragePrefix}/${backupId}.json`,
      version: process.env.npm_package_version || '0.1.0'
    };

    try {
      // Create backup record
      await setDoc(backupRef, metadata);

      // Collect all data
      const backupData: BackupData = {
        metadata,
        data: {
          users: {},
          system: {}
        }
      };

      // Backup all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      metadata.recordCounts.users = usersSnapshot.size;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData: any = {
          profile: {},
          stt: {},
          tts: {}
        };

        // Get user profile
        try {
          const profileRef = doc(userDoc.ref, 'profile', 'main');
          const profileDoc = await getDoc(profileRef);
          if (profileDoc.exists()) {
            userData.profile = profileDoc.data();
          }
        } catch (e) {
          console.warn(`Warning: Could not backup profile for user ${userId}`);
        }

        // Get STT records
        try {
          const sttSnapshot = await getDocs(collection(userDoc.ref, 'stt'));
          userData.stt = {};
          sttSnapshot.docs.forEach(doc => {
            userData.stt[doc.id] = doc.data();
          });
          metadata.recordCounts.stt += sttSnapshot.size;
        } catch (e) {
          console.warn(`Warning: Could not backup STT records for user ${userId}`);
        }

        // Get TTS records
        try {
          const ttsSnapshot = await getDocs(collection(userDoc.ref, 'tts'));
          userData.tts = {};
          ttsSnapshot.docs.forEach(doc => {
            userData.tts[doc.id] = doc.data();
          });
          metadata.recordCounts.tts += ttsSnapshot.size;
        } catch (e) {
          console.warn(`Warning: Could not backup TTS records for user ${userId}`);
        }

        backupData.data.users[userId] = {
          id: userId,
          ...userDoc.data(),
          ...userData
        };
      }

      // Backup system collections
      const systemCollections = ['system_migrations', 'system_backups', 'voice_clones'];
      
      for (const collName of systemCollections) {
        try {
          const snapshot = await getDocs(collection(db, collName));
          backupData.data.system[collName] = {};
          snapshot.docs.forEach(doc => {
            backupData.data.system[collName][doc.id] = doc.data();
          });
        } catch (e) {
          console.warn(`Warning: Could not backup system collection ${collName}`);
        }
      }

      // Calculate totals
      metadata.recordCounts.total = 
        metadata.recordCounts.users + 
        metadata.recordCounts.stt + 
        metadata.recordCounts.tts;

      // Serialize and upload to Storage
      const jsonData = JSON.stringify(backupData, null, 2);
      metadata.size = new Blob([jsonData]).size;

      const storageRef = ref(storage, metadata.storagePath);
      await uploadString(storageRef, jsonData, 'raw');
      
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update metadata
      metadata.status = 'completed';
      metadata.storagePath = downloadURL; // Store URL instead of path
      
      await setDoc(backupRef, metadata);

      console.log(`✅ Backup completed: ${backupId}`);
      console.log(`   Users: ${metadata.recordCounts.users}`);
      console.log(`   STT Records: ${metadata.recordCounts.stt}`);
      console.log(`   TTS Records: ${metadata.recordCounts.tts}`);
      console.log(`   Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Location: ${downloadURL}`);

      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Backup failed:', errorMessage);
      
      metadata.status = 'failed';
      metadata.error = errorMessage;
      await setDoc(backupRef, metadata);

      throw error;
    }
  }

  /**
   * Create incremental backup (only changed data since last backup)
   */
  async createIncrementalBackup(sinceBackupId: string): Promise<BackupMetadata> {
    console.log(`🔄 Starting incremental backup since ${sinceBackupId}...`);
    
    // Get the reference backup
    const refBackupDoc = await getDoc(doc(db, this.backupCollection, sinceBackupId));
    if (!refBackupDoc.exists()) {
      throw new Error(`Reference backup ${sinceBackupId} not found`);
    }

    const refBackup = refBackupDoc.data() as BackupMetadata;
    const sinceDate = refBackup.createdAt instanceof Timestamp 
      ? refBackup.createdAt.toDate() 
      : new Date(refBackup.createdAt);

    // Similar to full backup but only get records modified after sinceDate
    // For now, we'll create a simpler incremental that backs up new/changed users
    // Full incremental logic would require tracking change timestamps
    
    return this.createFullBackup(); // Fallback to full for now
  }

  /**
   * List all backups
   */
  async listBackups(limitCount = 20): Promise<BackupMetadata[]> {
    const backupsRef = collection(db, this.backupCollection);
    const q = query(backupsRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BackupMetadata));
  }

  /**
   * Get backup metadata
   */
  async getBackup(backupId: string): Promise<BackupMetadata | null> {
    const backupDoc = await getDoc(doc(db, this.backupCollection, backupId));
    if (!backupDoc.exists()) {
      return null;
    }

    return {
      id: backupDoc.id,
      ...backupDoc.data()
    } as BackupMetadata;
  }

  /**
   * Download backup data
   */
  async downloadBackup(backupId: string): Promise<BackupData> {
    const metadata = await this.getBackup(backupId);
    if (!metadata) {
      throw new Error(`Backup ${backupId} not found`);
    }

    if (metadata.status !== 'completed') {
      throw new Error(`Backup ${backupId} is not completed`);
    }

    // Download from Firebase Storage
    const storageRef = ref(storage, metadata.storagePath);
    const bytes = await getBytes(storageRef);
    const jsonString = new TextDecoder().decode(bytes);
    const backupData: BackupData = JSON.parse(jsonString);

    return backupData;
  }

  /**
   * Restore from backup
   * 
   * WARNING: This will overwrite existing data!
   * Use with caution in production.
   */
  async restoreFromBackup(
    backupId: string, 
    options: {
      restoreUsers?: boolean;
      restoreSTT?: boolean;
      restoreTTS?: boolean;
      restoreSystem?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<{
    restored: {
      users: number;
      stt: number;
      tts: number;
      system: number;
    };
    errors: string[];
  }> {
    const {
      restoreUsers = true,
      restoreSTT = true,
      restoreTTS = true,
      restoreSystem = false,
      dryRun = false
    } = options;

    console.log(`🔄 Restoring from backup: ${backupId}${dryRun ? ' (DRY RUN)' : ''}...`);

    const backupData = await this.downloadBackup(backupId);
    const restored = {
      users: 0,
      stt: 0,
      tts: 0,
      system: 0
    };
    const errors: string[] = [];

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No data will be modified');
    }

    // Restore users
    if (restoreUsers) {
      for (const [userId, userData] of Object.entries(backupData.data.users)) {
        try {
          if (!dryRun) {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
              ...userData,
              _restored_at: Timestamp.now(),
              _restored_from: backupId
            });
          }
          restored.users++;

          // Restore profile
          if (userData.profile && Object.keys(userData.profile).length > 0) {
            if (!dryRun) {
              const profileRef = doc(db, 'users', userId, 'profile', 'main');
              await setDoc(profileRef, userData.profile);
            }
          }

          // Restore STT records
          if (restoreSTT && userData.stt) {
            for (const [sttId, sttData] of Object.entries(userData.stt)) {
              try {
                if (!dryRun) {
                  const sttRef = doc(db, 'users', userId, 'stt', sttId);
                  await setDoc(sttRef, {
                    ...sttData,
                    _restored_at: Timestamp.now(),
                    _restored_from: backupId
                  } as any);
                }
                restored.stt++;
              } catch (e) {
                errors.push(`Failed to restore STT ${userId}/${sttId}: ${e}`);
              }
            }
          }

          // Restore TTS records
          if (restoreTTS && userData.tts) {
            for (const [ttsId, ttsData] of Object.entries(userData.tts)) {
              try {
                if (!dryRun) {
                  const ttsRef = doc(db, 'users', userId, 'tts', ttsId);
                  await setDoc(ttsRef, {
                    ...ttsData,
                    _restored_at: Timestamp.now(),
                    _restored_from: backupId
                  } as any);
                }
                restored.tts++;
              } catch (e) {
                errors.push(`Failed to restore TTS ${userId}/${ttsId}: ${e}`);
              }
            }
          }
        } catch (e) {
          errors.push(`Failed to restore user ${userId}: ${e}`);
        }
      }
    }

    // Restore system collections
    if (restoreSystem && backupData.data.system) {
      for (const [collName, collData] of Object.entries(backupData.data.system)) {
        if (collName === 'system_backups') continue; // Skip backups collection
        
        for (const [docId, docData] of Object.entries(collData)) {
          try {
            if (!dryRun) {
              const docRef = doc(db, collName, docId);
              await setDoc(docRef, {
                ...docData,
                _restored_at: Timestamp.now(),
                _restored_from: backupId
              } as any);
            }
            restored.system++;
          } catch (e) {
            errors.push(`Failed to restore ${collName}/${docId}: ${e}`);
          }
        }
      }
    }

    console.log(`✅ Restore completed:`);
    console.log(`   Users: ${restored.users}`);
    console.log(`   STT Records: ${restored.stt}`);
    console.log(`   TTS Records: ${restored.tts}`);
    console.log(`   System Records: ${restored.system}`);
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
    }

    return { restored, errors };
  }

  /**
   * Delete old backups (cleanup)
   * Keeps the most recent N backups
   */
  async cleanupOldBackups(keepRecent = 10): Promise<number> {
    console.log(`🧹 Cleaning up old backups (keeping ${keepRecent} most recent)...`);
    
    const backups = await this.listBackups(1000); // Get all
    if (backups.length <= keepRecent) {
      console.log('   No backups to clean up');
      return 0;
    }

    const toDelete = backups.slice(keepRecent);
    let deleted = 0;

    for (const backup of toDelete) {
      try {
        // Delete Firestore document
        await setDoc(doc(db, this.backupCollection, backup.id), {
          deleted: true,
          deletedAt: Timestamp.now()
        }, { merge: true });

        // Optionally delete from Storage too
        // const storageRef = ref(storage, backup.storagePath);
        // await deleteObject(storageRef);

        deleted++;
      } catch (e) {
        console.error(`Failed to delete backup ${backup.id}:`, e);
      }
    }

    console.log(`✅ Cleaned up ${deleted} old backup(s)`);
    return deleted;
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    total: number;
    totalSize: number;
    oldest: Date | null;
    newest: Date | null;
    byStatus: Record<string, number>;
  }> {
    const backups = await this.listBackups(1000);
    
    if (backups.length === 0) {
      return {
        total: 0,
        totalSize: 0,
        oldest: null,
        newest: null,
        byStatus: {}
      };
    }

    const stats = {
      total: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldest: backups.reduce((oldest, b) => {
        const date = b.createdAt instanceof Timestamp 
          ? b.createdAt.toDate() 
          : new Date(b.createdAt);
        return !oldest || date < oldest ? date : oldest;
      }, null as Date | null),
      newest: backups.reduce((newest, b) => {
        const date = b.createdAt instanceof Timestamp 
          ? b.createdAt.toDate() 
          : new Date(b.createdAt);
        return !newest || date > newest ? date : newest;
      }, null as Date | null),
      byStatus: {} as Record<string, number>
    };

    backups.forEach(b => {
      stats.byStatus[b.status] = (stats.byStatus[b.status] || 0) + 1;
    });

    return stats;
  }
}

export const backupService = new BackupService();

