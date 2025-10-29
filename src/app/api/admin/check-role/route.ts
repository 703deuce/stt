import { NextRequest, NextResponse } from 'next/server';

// Admin user emails - configured via environment variables
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [
  '703deuce@gmail.com',
];

export async function GET(request: NextRequest) {
  try {
    // Get user email from request headers (set by client)
    const userEmail = request.headers.get('x-user-email');
    
    if (!userEmail) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase());

    return NextResponse.json({ 
      isAdmin,
      email: userEmail 
    });
  } catch (error) {
    console.error('Error checking admin role:', error);
    return NextResponse.json(
      { error: 'Failed to check admin role', isAdmin: false },
      { status: 500 }
    );
  }
}

