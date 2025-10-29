/**
 * Secure Fetch Utility
 * Provides client-side security controls for API requests
 */

/**
 * Secure fetch wrapper with timeout and retry logic
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
  config: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<Response> {
  const {
    timeout = 300000, // 5 minutes default timeout
    retries = 0,
    retryDelay = 1000
  } = config;

  // ✅ SECURITY: Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }

  // ✅ SECURITY: Only allow relative URLs or HTTPS
  if (url.startsWith('http://') && !url.startsWith('http://localhost')) {
    throw new Error('HTTP requests not allowed, use HTTPS');
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchOptions: RequestInit = {
    ...options,
    signal: controller.signal,
    // ✅ SECURITY: Always include credentials for same-origin requests
    credentials: url.startsWith('/') ? 'same-origin' : options.credentials || 'omit'
  };

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Retry on server errors (5xx)
    if (response.status >= 500 && response.status < 600 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return secureFetch(url, options, { ...config, retries: retries - 1 });
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry on network errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return secureFetch(url, options, { ...config, retries: retries - 1 });
    }

    throw error;
  }
}

/**
 * Sanitize user input before sending to API
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

/**
 * Validate response data
 */
export function validateResponse(data: any, schema: {
  required?: string[];
  types?: Record<string, string>;
}): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        return false;
      }
    }
  }

  // Check types
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      if (field in data && typeof data[field] !== expectedType) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Rate limiting tracker (client-side)
 */
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, { max: number; window: number }> = new Map();

  setLimit(key: string, max: number, windowMs: number) {
    this.limits.set(key, { max, window: windowMs });
  }

  canMakeRequest(key: string): boolean {
    const limit = this.limits.get(key);
    if (!limit) return true;

    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < limit.window);

    if (validRequests.length >= limit.max) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  reset(key: string) {
    this.requests.delete(key);
  }
}

export const rateLimiter = new ClientRateLimiter();

// Set default client-side rate limits
rateLimiter.setLimit('transcription', 5, 60000); // 5 per minute
rateLimiter.setLimit('upload', 10, 60000); // 10 per minute

/**
 * Secure API request with all protections
 */
export async function secureApiRequest(
  url: string,
  options: RequestInit = {},
  rateLimitKey?: string
): Promise<Response> {
  // ✅ SECURITY: Check rate limit
  if (rateLimitKey && !rateLimiter.canMakeRequest(rateLimitKey)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // ✅ SECURITY: Sanitize request body
  if (options.body) {
    try {
      const body = JSON.parse(options.body as string);
      const sanitized = sanitizeInput(body);
      options.body = JSON.stringify(sanitized);
    } catch {
      // Not JSON, leave as is
    }
  }

  // ✅ SECURITY: Add security headers
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');
  
  // Make request with timeout and retry
  return secureFetch(url, { ...options, headers }, {
    timeout: 300000, // 5 minutes
    retries: 2,
    retryDelay: 2000
  });
}

