/**
 * Check Migration Status Script
 * 
 * Run: npm run migrate:status
 */

import { migrationService } from '../src/services/migrationService';

async function main() {
  console.log('📊 Migration Status\n');
  
  try {
    const status = await migrationService.getStatus();
    
    console.log(`Total Migrations: ${status.total}`);
    console.log(`✅ Completed: ${status.executed}`);
    console.log(`⏳ Pending: ${status.pending}`);
    console.log(`❌ Failed: ${status.failed}\n`);
    
    if (status.migrations.length > 0) {
      console.log('Migration Details:');
      console.log('─'.repeat(60));
      
      status.migrations.forEach(m => {
        const statusIcon = 
          m.status === 'completed' ? '✅' :
          m.status === 'failed' ? '❌' : '⏳';
        
        console.log(`${statusIcon} ${m.version}`);
        console.log(`   Description: ${m.description}`);
        
        if (m.executedAt) {
          console.log(`   Executed: ${m.executedAt.toISOString()}`);
        }
        
        if (m.recordsProcessed !== undefined) {
          console.log(`   Records Processed: ${m.recordsProcessed}`);
        }
        
        console.log('');
      });
    }
    
    if (status.pending > 0) {
      console.log('\n⚠️  You have pending migrations. Run: npm run migrate');
    } else if (status.failed > 0) {
      console.log('\n❌ Some migrations failed. Check Firestore system_migrations collection for details.');
    } else {
      console.log('\n✅ All migrations are up to date!');
    }
  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    process.exit(1);
  }
}

main();

