/**
 * Migration Service
 * 
 * This service handles database schema migrations safely without downtime.
 * All migrations are:
 * - Backward compatible
 * - Idempotent (safe to run multiple times)
 * - Non-destructive (never deletes user data)
 * - Tracked in Firestore to prevent duplicate runs
 */

import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

// Migration record stored in Firestore
interface MigrationRecord {
  id: string;
  version: string;
  description: string;
  executedAt: Timestamp | Date;
  executedBy?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  recordsProcessed?: number;
}

// Migration function type
type MigrationFunction = (batch?: ReturnType<typeof writeBatch>) => Promise<{
  recordsProcessed: number;
  error?: string;
}>;

// Migration definition
interface Migration {
  version: string;
  description: string;
  up: MigrationFunction;
  down?: MigrationFunction; // Optional rollback
}

// Version history of migrations
const migrations: Migration[] = [
  // Example migration - add your migrations here
  // {
  //   version: '001_initial_schema',
  //   description: 'Initialize user profiles with default settings',
  //   up: async (batch) => {
  //     // Implementation here
  //     return { recordsProcessed: 0 };
  //   }
  // },
];

class MigrationService {
  private migrationsCollection = 'system_migrations';
  private maxBatchSize = 500; // Firestore batch limit

  /**
   * Get all executed migrations
   */
  async getExecutedMigrations(): Promise<Set<string>> {
    try {
      const snapshot = await getDocs(collection(db, this.migrationsCollection));
      const executed = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data() as MigrationRecord;
        if (data.status === 'completed') {
          executed.add(data.version);
        }
      });
      return executed;
    } catch (error) {
      console.error('Error fetching executed migrations:', error);
      return new Set();
    }
  }

  /**
   * Record migration execution
   */
  private async recordMigration(
    version: string,
    description: string,
    status: MigrationRecord['status'],
    recordsProcessed = 0,
    error?: string
  ): Promise<void> {
    try {
      const migrationDoc = doc(db, this.migrationsCollection, version);
      await setDoc(migrationDoc, {
        version,
        description,
        status,
        executedAt: Timestamp.now(),
        recordsProcessed,
        error: error || null,
      });
    } catch (error) {
      console.error(`Error recording migration ${version}:`, error);
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(migration: Migration, force = false): Promise<{
    success: boolean;
    recordsProcessed: number;
    error?: string;
  }> {
    const executed = await this.getExecutedMigrations();
    
    // Skip if already executed (unless forced)
    if (executed.has(migration.version) && !force) {
      console.log(`⏭️  Migration ${migration.version} already executed, skipping`);
      return { success: true, recordsProcessed: 0 };
    }

    console.log(`🔄 Running migration: ${migration.version} - ${migration.description}`);
    
    try {
      // Mark as running
      await this.recordMigration(migration.version, migration.description, 'running');

      // Execute migration
      const result = await migration.up();
      
      // Mark as completed
      await this.recordMigration(
        migration.version,
        migration.description,
        'completed',
        result.recordsProcessed,
        result.error
      );

      if (result.error) {
        console.error(`⚠️  Migration ${migration.version} completed with warnings: ${result.error}`);
        return {
          success: true,
          recordsProcessed: result.recordsProcessed,
          error: result.error
        };
      }

      console.log(`✅ Migration ${migration.version} completed successfully (${result.recordsProcessed} records)`);
      return {
        success: true,
        recordsProcessed: result.recordsProcessed
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Migration ${migration.version} failed:`, errorMessage);
      
      // Mark as failed
      await this.recordMigration(
        migration.version,
        migration.description,
        'failed',
        0,
        errorMessage
      );

      return {
        success: false,
        recordsProcessed: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(force = false): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ version: string; success: boolean; recordsProcessed: number; error?: string }>;
  }> {
    console.log('🚀 Starting migration process...');
    
    const executed = await this.getExecutedMigrations();
    const pending = migrations.filter(m => !executed.has(m.version) || force);

    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    console.log(`📋 Found ${pending.length} pending migration(s)`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const migration of pending) {
      const result = await this.runMigration(migration, force);
      results.push({
        version: migration.version,
        success: result.success,
        recordsProcessed: result.recordsProcessed,
        error: result.error
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
        // Stop on first failure (unless you want to continue)
        console.error(`🛑 Migration failed, stopping migration process`);
        break;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Total: ${pending.length}`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);

    return {
      total: pending.length,
      successful,
      failed,
      results
    };
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    total: number;
    executed: number;
    pending: number;
    failed: number;
    migrations: Array<{
      version: string;
      description: string;
      status: 'pending' | 'completed' | 'failed';
      executedAt?: Date;
      recordsProcessed?: number;
    }>;
  }> {
    const executed = await this.getExecutedMigrations();
    const allMigrations = migrations.map(m => ({
      version: m.version,
      description: m.description,
      status: executed.has(m.version) ? 'completed' as const : 'pending' as const
    }));

    // Fetch execution details
    const snapshot = await getDocs(collection(db, this.migrationsCollection));
    const executionDetails = new Map<string, { executedAt?: Date; recordsProcessed?: number; status?: string }>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data() as MigrationRecord;
      executionDetails.set(data.version, {
        executedAt: data.executedAt instanceof Timestamp 
          ? data.executedAt.toDate() 
          : data.executedAt instanceof Date 
          ? data.executedAt 
          : undefined,
        recordsProcessed: data.recordsProcessed,
        status: data.status
      });
    });

    const migrationsWithDetails = allMigrations.map(m => ({
      ...m,
      ...executionDetails.get(m.version),
      status: (executionDetails.get(m.version)?.status || m.status) as 'pending' | 'completed' | 'failed'
    }));

    const pending = migrationsWithDetails.filter(m => m.status === 'pending').length;
    const completed = migrationsWithDetails.filter(m => m.status === 'completed').length;
    const failed = migrationsWithDetails.filter(m => m.status === 'failed').length;

    return {
      total: migrations.length,
      executed: completed,
      pending,
      failed,
      migrations: migrationsWithDetails
    };
  }

  /**
   * Helper: Process documents in batches to avoid memory issues
   */
  async processBatch<T>(
    items: T[],
    processor: (items: T[], batch: ReturnType<typeof writeBatch>) => Promise<void>,
    batchSize = this.maxBatchSize
  ): Promise<number> {
    let processed = 0;
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = items.slice(i, i + batchSize);
      await processor(chunk, batch);
      await batch.commit();
      processed += chunk.length;
      
      // Progress logging for large migrations
      if (items.length > batchSize * 2) {
        console.log(`   Processed ${processed}/${items.length} records...`);
      }
    }

    return processed;
  }
}

// Export singleton instance
export const migrationService = new MigrationService();

// Export types for use in migrations
export type { Migration, MigrationFunction, MigrationRecord };

