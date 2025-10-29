/**
 * Backup Detail API
 * 
 * GET /api/admin/backups/[id] - Get backup details
 * DELETE /api/admin/backups/[id] - Delete backup (mark as deleted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backupService';
import { getUserEmailFromRequest } from '@/utils/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

const ADMIN_EMAILS_LIST = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [
  '703deuce@gmail.com'
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userEmail = getUserEmailFromRequest(request);
    
    if (!userEmail || !ADMIN_EMAILS_LIST.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const backup = await backupService.getBackup(params.id);
    
    if (!backup) {
      return NextResponse.json(
        { error: 'Backup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      backup
    });
  } catch (error) {
    console.error('Error fetching backup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch backup',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userEmail = getUserEmailFromRequest(request);
    
    if (!userEmail || !ADMIN_EMAILS_LIST.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Mark as deleted (soft delete)
    await setDoc(doc(db, 'system_backups', params.id), {
      deleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: userEmail
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Backup marked as deleted'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete backup',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

