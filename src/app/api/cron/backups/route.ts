/**
 * Cron Endpoint for Automated Backups
 * 
 * Set up in Vercel Cron or similar service
 * Schedule: Daily at 2 AM (or your preferred time)
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backupService';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Also check for Vercel's cron header
    const cronHeader = request.headers.get('x-vercel-cron');
    if (!cronHeader) {
      console.warn('⚠️  Unauthorized backup cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    console.log('🔄 Automated backup started...');
    const backup = await backupService.createFullBackup();
    
    return NextResponse.json({
      success: true,
      message: 'Backup completed successfully',
      backup: {
        id: backup.id,
        size: backup.size,
        records: backup.recordCounts.total,
        createdAt: backup.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Automated backup failed:', error);
    return NextResponse.json(
      { 
        error: 'Backup failed',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

