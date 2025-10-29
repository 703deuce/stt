/**
 * Migration API Endpoint
 * 
 * POST /api/admin/migrations/run - Run pending migrations
 * GET /api/admin/migrations/status - Get migration status
 * 
 * Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { migrationService } from '@/services/migrationService';
import { getUserEmailFromRequest } from '@/utils/auth';

// Fallback admin check using same pattern as other admin routes
const ADMIN_EMAILS_LIST = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [
  '703deuce@gmail.com'
];

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const userEmail = getUserEmailFromRequest(request);
    
    if (!userEmail || !ADMIN_EMAILS_LIST.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const status = await migrationService.getStatus();
    
    return NextResponse.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Error fetching migration status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch migration status',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const userEmail = getUserEmailFromRequest(request);
    
    if (!userEmail || !ADMIN_EMAILS_LIST.includes(userEmail.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { force = false } = body;

    const result = await migrationService.runPendingMigrations(force);

    return NextResponse.json({
      success: result.failed === 0,
      ...result
    });
  } catch (error) {
    console.error('Error running migrations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run migrations',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

