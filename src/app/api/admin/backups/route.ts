/**
 * Backup Management API
 * 
 * GET /api/admin/backups - List all backups
 * POST /api/admin/backups - Create a new backup
 * GET /api/admin/backups/[id] - Get backup details
 * POST /api/admin/backups/[id]/restore - Restore from backup
 * POST /api/admin/backups/cleanup - Clean up old backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backupService';
import { getUserEmailFromRequest } from '@/utils/auth';

const ADMIN_EMAILS_LIST = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [
  '703deuce@gmail.com'
];

// List backups or create new one
export async function GET(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromRequest(request);
    
    if (!userEmail || !ADMIN_EMAILS_LIST.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const statsOnly = url.searchParams.get('stats') === 'true';

    if (statsOnly) {
      const stats = await backupService.getBackupStats();
      return NextResponse.json({ success: true, ...stats });
    }

    const limit = parseInt(url.searchParams.get('limit') || '20');
    const backups = await backupService.listBackups(limit);
    
    return NextResponse.json({
      success: true,
      backups
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list backups',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userEmail = getUserEmailFromRequest(request);
    
    if (!userEmail || !ADMIN_EMAILS_LIST.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, backupId, options } = body;

    switch (action) {
      case 'create':
        const backup = await backupService.createFullBackup();
        return NextResponse.json({
          success: true,
          backup
        });

      case 'restore':
        if (!backupId) {
          return NextResponse.json(
            { error: 'backupId required for restore' },
            { status: 400 }
          );
        }

        const restoreResult = await backupService.restoreFromBackup(backupId, options || {});
        return NextResponse.json({
          success: restoreResult.errors.length === 0,
          ...restoreResult
        });

      case 'cleanup':
        const keepRecent = body.keepRecent || 10;
        const deleted = await backupService.cleanupOldBackups(keepRecent);
        return NextResponse.json({
          success: true,
          deleted
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, restore, or cleanup' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling backup request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process backup request',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

