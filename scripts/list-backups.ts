/**
 * List Backups Script
 * 
 * Run: npm run list-backups
 */

import { backupService } from '../src/services/backupService';

async function main() {
  console.log('📋 Backups\n');

  try {
    const backups = await backupService.listBackups(20);
    const stats = await backupService.getBackupStats();

    if (backups.length === 0) {
      console.log('   No backups found');
      return;
    }

    console.log(`Total Backups: ${stats.total}`);
    console.log(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    if (stats.newest) {
      console.log(`Newest: ${stats.newest.toISOString()}`);
    }
    if (stats.oldest) {
      console.log(`Oldest: ${stats.oldest.toISOString()}`);
    }
    console.log('\nRecent Backups:');
    console.log('─'.repeat(80));

    backups.forEach((backup, index) => {
      const date = backup.createdAt instanceof Date
        ? backup.createdAt
        : (backup.createdAt as any).toDate();
      
      const statusIcon = 
        backup.status === 'completed' ? '✅' :
        backup.status === 'in_progress' ? '🔄' :
        backup.status === 'failed' ? '❌' : '⏳';

      console.log(`\n${index + 1}. ${statusIcon} ${backup.id}`);
      console.log(`   Created: ${date.toISOString()}`);
      console.log(`   Type: ${backup.type}`);
      console.log(`   Size: ${(backup.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Records: ${backup.recordCounts.total} (${backup.recordCounts.users} users, ${backup.recordCounts.stt} STT, ${backup.recordCounts.tts} TTS)`);
      
      if (backup.error) {
        console.log(`   Error: ${backup.error}`);
      }
    });

    console.log('\n');
  } catch (error) {
    console.error('❌ Error listing backups:', error);
    process.exit(1);
  }
}

main();

