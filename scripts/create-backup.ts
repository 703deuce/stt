/**
 * Manual Backup Script
 * 
 * Run: npm run backup
 * 
 * Creates a full backup of all Firestore data
 */

import { backupService } from '../src/services/backupService';

async function main() {
  console.log('🔄 Creating backup...\n');

  try {
    const backup = await backupService.createFullBackup();
    
    console.log('\n✅ Backup created successfully!');
    console.log(`   Backup ID: ${backup.id}`);
    console.log(`   Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Records: ${backup.recordCounts.total}`);
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  }
}

main();

