/**
 * Migration Runner Script
 * 
 * Run this script to execute pending migrations:
 * npm run migrate
 * 
 * Or in production:
 * node scripts/run-migrations.js
 */

import { migrationService } from '../src/services/migrationService';

async function main() {
  console.log('🚀 Starting migration process...\n');

  try {
    const result = await migrationService.runPendingMigrations(false);

    if (result.failed > 0) {
      console.error('\n❌ Some migrations failed!');
      process.exit(1);
    } else if (result.total === 0) {
      console.log('\n✅ No migrations to run');
    } else {
      console.log('\n✅ All migrations completed successfully!');
    }
  } catch (error) {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  }
}

main();

