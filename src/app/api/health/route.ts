import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

/**
 * Health Check Endpoint
 * Used by uptime monitoring services (UptimeRobot, BetterUptime, etc.)
 * 
 * Checks:
 * - API responsiveness
 * - Database connectivity
 * - Firebase availability
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test database connectivity
    const testQuery = query(collection(db, 'users'), limit(1));
    await getDocs(testQuery);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        api: 'operational',
        database: 'operational',
        firebase: 'operational'
      },
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 200 });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        api: 'operational',
        database: 'degraded',
        firebase: 'degraded'
      }
    }, { status: 503 });
  }
}

