/**
 * Security Middleware for API Routes
 * Implements essential security controls for the transcription app
 */

import { NextRequest, NextResponse } from 'next/server';

// Note: Firebase auth import removed - not needed for current implementation
// If you need authentication later, uncomment and implement:
// import { auth } from '@/lib/firebase';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiter configuration
 */
const RATE_LIMITS = {
  transcription: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  upload: { maxRequests: 20, windowMs: 60000 }, // 20 uploads per minute
  default: { maxRequests: 100, windowMs: 60000 } // 100 requests per minute
};

/**
 * Input validation utilities
 */
export const ValidationUtils = {
  /**
   * Validate and sanitize filename
   */
  sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      throw new Error('Invalid filename');
    }
    
    // Remove path traversal attempts
    const sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');
    
    // Check for dangerous extensions
    const ext = sanitized.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'ogg', 'flac'];
    
    if (!ext || !allowedExtensions.includes(ext)) {
      throw new Error('Invalid file extension');
    }
    
    // Limit filename length
    if (sanitized.length > 255) {
      throw new Error('Filename too long');
    }
    
    return sanitized;
  },

  /**
   * Validate audio URL
   */
  validateAudioUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }
    
    try {
      const parsedUrl = new URL(url);
      
      // Only allow HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return false;
      }
      
      // Only allow Firebase Storage URLs
      const allowedHosts = [
        'firebasestorage.googleapis.com',
        'storage.googleapis.com'
      ];
      
      return allowedHosts.some(host => parsedUrl.hostname.includes(host));
    } catch {
      return false;
    }
  },

  /**
   * Validate transcription settings
   */
  validateSettings(settings: any): boolean {
    if (!settings || typeof settings !== 'object') {
      return false;
    }
    
    // Validate boolean fields
    if (settings.use_diarization !== undefined && typeof settings.use_diarization !== 'boolean') {
      return false;
    }
    
    if (settings.include_timestamps !== undefined && typeof settings.include_timestamps !== 'boolean') {
      return false;
    }
    
    // Validate numeric fields
    if (settings.max_speakers !== undefined && settings.max_speakers !== null) {
      if (typeof settings.max_speakers !== 'number' || settings.max_speakers < 1 || settings.max_speakers > 20) {
        return false;
      }
    }
    
    if (settings.speaker_threshold !== undefined) {
      if (typeof settings.speaker_threshold !== 'number' || settings.speaker_threshold < 0 || settings.speaker_threshold > 1) {
        return false;
      }
    }
    
    return true;
  },

  /**
   * Sanitize text input (prevent XSS)
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Validate file size
   */
  validateFileSize(sizeInBytes: number, maxSizeMB: number = 500): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return sizeInBytes > 0 && sizeInBytes <= maxSizeBytes;
  }
};

/**
 * Rate limiting function
 */
export function rateLimit(identifier: string, limitType: keyof typeof RATE_LIMITS = 'default'): boolean {
  const now = Date.now();
  const limit = RATE_LIMITS[limitType];
  
  const key = `${identifier}_${limitType}`;
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs
    });
    return true;
  }
  
  if (record.count >= limit.maxRequests) {
    return false; // Rate limit exceeded
  }
  
  record.count++;
  return true;
}

/**
 * Authentication check
 * Note: Currently disabled - enable when Firebase Auth is fully integrated
 */
export async function requireAuth(request: NextRequest): Promise<{ userId: string } | null> {
  // TODO: Implement authentication when needed
  // For now, authentication is handled by Firebase on the client side
  
  console.warn('⚠️ requireAuth called but authentication is not implemented server-side yet');
  return null;
  
  /* Uncomment when ready to implement server-side auth:
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    
    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    return { userId: decodedToken.uid };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
  */
}

/**
 * Security headers middleware
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://firebasestorage.googleapis.com https://*.googleapis.com https://api.runpod.ai;"
  );
  
  // Permissions policy
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return response;
}

/**
 * Secure error response (no sensitive data leakage)
 */
export function secureErrorResponse(error: any, statusCode: number = 500): NextResponse {
  // Log the full error server-side
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Return sanitized error to client
  const clientError = {
    error: statusCode === 500 ? 'Internal server error' : error.message || 'An error occurred',
    code: statusCode
  };
  
  const response = NextResponse.json(clientError, { status: statusCode });
  return addSecurityHeaders(response);
}

/**
 * Request validation wrapper
 */
export async function validateRequest(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    rateLimitType?: keyof typeof RATE_LIMITS;
    validateBody?: (body: any) => boolean;
  } = {}
): Promise<{ valid: boolean; userId?: string; error?: NextResponse }> {
  try {
    // Check authentication if required
    if (options.requireAuth) {
      const authResult = await requireAuth(request);
      if (!authResult) {
        return {
          valid: false,
          error: secureErrorResponse({ message: 'Unauthorized' }, 401)
        };
      }
      
      // Rate limiting by user ID
      if (options.rateLimitType) {
        if (!rateLimit(authResult.userId, options.rateLimitType)) {
          return {
            valid: false,
            error: secureErrorResponse({ message: 'Rate limit exceeded' }, 429)
          };
        }
      }
      
      return { valid: true, userId: authResult.userId };
    }
    
    // Rate limiting by IP if no auth
    if (options.rateLimitType) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      if (!rateLimit(ip, options.rateLimitType)) {
        return {
          valid: false,
          error: secureErrorResponse({ message: 'Rate limit exceeded' }, 429)
        };
      }
    }
    
    // Validate request body if validator provided
    if (options.validateBody) {
      const body = await request.json();
      if (!options.validateBody(body)) {
        return {
          valid: false,
          error: secureErrorResponse({ message: 'Invalid request body' }, 400)
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: secureErrorResponse(error, 400)
    };
  }
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

