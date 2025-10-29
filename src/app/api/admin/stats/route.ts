import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || ['703deuce@gmail.com'];

async function isAdmin(userEmail: string | null): Promise<boolean> {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    // Get user email from request headers (set by client)
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail || !(await isAdmin(userEmail))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    let startDate: Date | null = null;
    const now = new Date();
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = null;
    }

    // Fetch all users - using collectionGroup for nested structure
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUsers = 0;
    let trialUsers = 0;
    let paidUsers = 0;
    let activeUsers = 0;
    let totalTranscripts = 0;
    let totalHoursProcessed = 0;
    let errorCount = 0;

    // Iterate through all users
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      totalUsers++;
      
      const status = userData.subscriptionStatus || 'trial';
      const lastActive = userData.last_active?.toDate();
      
      if (status === 'trial') trialUsers++;
      if (status === 'active' || status === 'paid') paidUsers++;
      if (lastActive && (now.getTime() - lastActive.getTime()) < 7 * 24 * 60 * 60 * 1000) {
        activeUsers++;
      }

      // Fetch transcripts for this user
      const sttRef = collection(db, 'users', userId, 'stt');
      let sttQuery = query(sttRef, orderBy('timestamp', 'desc'));
      if (startDate) {
        sttQuery = query(sttRef, where('timestamp', '>=', Timestamp.fromDate(startDate)), orderBy('timestamp', 'desc'));
      }
      const sttSnapshot = await getDocs(sttQuery);
      
      totalTranscripts += sttSnapshot.size;

      sttSnapshot.forEach((doc) => {
        const data = doc.data();
        const duration = data.duration || 0;
        const status = data.status || 'completed';
        
        totalHoursProcessed += duration / 3600; // Convert seconds to hours
        if (status === 'error' || status === 'failed') errorCount++;
      });
    }

    const errorRate = totalTranscripts > 0 ? (errorCount / totalTranscripts) * 100 : 0;

    // Calculate revenue (placeholder - you'll need to integrate with your payment system)
    // This would typically come from Stripe webhooks or payment records
    const totalRevenue = paidUsers * 17.99; // Rough estimate
    const monthlyRevenue = paidUsers * 17.99; // This month

    // Calculate conversion rate
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

    const stats = {
      totalUsers,
      activeUsers,
      totalTranscripts,
      totalRevenue,
      monthlyRevenue,
      trialUsers,
      paidUsers,
      totalHoursProcessed: Math.round(totalHoursProcessed * 10) / 10,
      errorRate: Math.round(errorRate * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

