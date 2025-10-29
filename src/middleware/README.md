# Security Middleware Usage Guide

## Quick Start

### 1. Securing API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ValidationUtils, addSecurityHeaders, secureErrorResponse } from '@/middleware/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate inputs
    if (!ValidationUtils.validateAudioUrl(body.audio_url)) {
      return secureErrorResponse({ message: 'Invalid URL' }, 400);
    }
    
    // Your API logic here...
    
    // Add security headers to response
    const response = NextResponse.json({ success: true });
    return addSecurityHeaders(response);
    
  } catch (error) {
    // Secure error handling
    return secureErrorResponse(error, 500);
  }
}
```

### 2. Client-Side Secure Requests

```typescript
import { secureApiRequest } from '@/utils/secureFetch';

// Make a secure API request with rate limiting
async function transcribeAudio(audioUrl: string) {
  const response = await secureApiRequest(
    '/api/transcribe-complete',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: audioUrl })
    },
    'transcription' // Rate limit key
  );
  
  if (!response.ok) {
    throw new Error('Transcription failed');
  }
  
  return response.json();
}
```

## Validation Utils

### Sanitize Filename
```typescript
import { ValidationUtils } from '@/middleware/security';

try {
  const safe = ValidationUtils.sanitizeFilename(userInput);
} catch (error) {
  // Invalid filename
}
```

### Validate URL
```typescript
if (ValidationUtils.validateAudioUrl(url)) {
  // URL is safe
}
```

### Validate Settings
```typescript
if (ValidationUtils.validateSettings(settings)) {
  // Settings are valid
}
```

### Sanitize Text (XSS Prevention)
```typescript
const safe = ValidationUtils.sanitizeText(userInput);
```

### Validate File Size
```typescript
if (ValidationUtils.validateFileSize(file.size, 500)) {
  // File size OK (max 500MB)
}
```

## Rate Limiting

### Server-Side
```typescript
import { rateLimit } from '@/middleware/security';

if (!rateLimit(userId, 'transcription')) {
  return secureErrorResponse({ message: 'Rate limit exceeded' }, 429);
}
```

### Client-Side
```typescript
import { rateLimiter } from '@/utils/secureFetch';

if (!rateLimiter.canMakeRequest('upload')) {
  throw new Error('Too many uploads. Please wait.');
}
```

## Security Headers

Automatically added to all responses when using `addSecurityHeaders()`:

- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **X-XSS-Protection**: Enable browser XSS protection
- **Content-Security-Policy**: Prevent XSS attacks
- **Referrer-Policy**: Control referrer information
- **Permissions-Policy**: Disable unnecessary features

## Error Handling

```typescript
// ❌ BAD - Exposes sensitive data
catch (error) {
  return NextResponse.json({ error: error.stack }, { status: 500 });
}

// ✅ GOOD - Secure error handling
catch (error) {
  return secureErrorResponse(error, 500);
}
```

## Best Practices

1. **Always validate inputs** before processing
2. **Use environment variables** for secrets
3. **Add security headers** to all API responses
4. **Use secure error responses** to avoid data leakage
5. **Implement rate limiting** on sensitive endpoints
6. **Sanitize user input** before displaying
7. **Log security events** for monitoring

## Common Patterns

### API Route Template
```typescript
import { NextRequest } from 'next/server';
import { 
  ValidationUtils, 
  addSecurityHeaders, 
  secureErrorResponse 
} from '@/middleware/security';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate
    const body = await request.json();
    if (!ValidationUtils.validateAudioUrl(body.url)) {
      return secureErrorResponse({ message: 'Invalid URL' }, 400);
    }
    
    // 2. Process request
    const result = await processRequest(body);
    
    // 3. Return secure response
    const response = NextResponse.json(result);
    return addSecurityHeaders(response);
    
  } catch (error) {
    return secureErrorResponse(error, 500);
  }
}
```

### Client Request Template
```typescript
import { secureApiRequest } from '@/utils/secureFetch';

async function makeRequest(data: any) {
  try {
    const response = await secureApiRequest(
      '/api/endpoint',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      },
      'endpoint' // Rate limit key
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

## Troubleshooting

### Rate Limiting Issues
```typescript
// Reset rate limit for testing
import { rateLimiter } from '@/utils/secureFetch';
rateLimiter.reset('transcription');
```

### CORS Issues
- Ensure Firebase Storage URLs are whitelisted
- Check Content-Security-Policy headers
- Verify request origins

### Validation Errors
- Check file extensions match allowed list
- Verify URLs use HTTPS
- Ensure numeric values are in valid ranges

## Security Checklist

Before deploying:
- [ ] All API routes use `secureErrorResponse()`
- [ ] All responses have security headers
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] API keys in environment variables
- [ ] Firebase Security Rules applied
- [ ] MFA enabled for admins

