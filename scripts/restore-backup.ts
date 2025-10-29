/**
 * Restore Backup Script
 * 
 * Run: npm run restore -- <backup-id> [--dry-run]
 * 
 * Restores data from a backup
 * WARNING: This will overwrite existing data!
 */

import { backupService } from '../src/services/backupService';

async function main() {
  const args = process.argv.slice(2);
  const backupId = args[0];
  const dryRun = args.includes('--dry-run');

  if (!backupId) {
    console.error('❌ Usage: npm run restore -- <backup-id> [--dry-run]');
    console.error('   Example: npm run restore -- backup_1234567890');
    console.error('   Add --dry-run to see what would be restored without making changes');
    process.exit(1);
  }

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be modified\n');
  } else {
    console.log('⚠️  WARNING: This will overwrite existing data!');
    console.log('   Press Ctrl+C to cancel (wait 5 seconds...)\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log(`🔄 Restoring from backup: ${backupId}\n`);

  try {
    const result = await backupService.restoreFromBackup(backupId, {
      restoreUsers: true,
      restoreSTT: true,
      restoreTTS: true,
      restoreSystem: false,
      dryRun
    });

    console.log('\n✅ Restore completed!');
    console.log(`   Users: ${result.restored.users}`);
    console.log(`   STT Records: ${result.restored.stt}`);
    console.log(`   TTS Records: ${result.restored.tts}`);
    console.log(`   System Records: ${result.restored.system}`);
    
    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors (${result.errors.length}):`);
      result.errors.slice(0, 10).forEach(err => {
        console.log(`   - ${err}`);
      });
      if (result.errors.length > 10) {
        console.log(`   ... and ${result.errors.length - 10} more`);
      }
    }
  } catch (error) {
    console.error('\n❌ Restore failed:', error);
    process.exit(1);
  }
}

main();

