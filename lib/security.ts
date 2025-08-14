import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitEntry {
  count: number;
  timestamp: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // requests per minute

export function rateLimit(req: NextApiRequest, res: NextApiResponse): boolean {
  const clientIp = getClientIP(req);
  const now = Date.now();
  
  const entry = rateLimitStore.get(clientIp);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(clientIp, { count: 1, timestamp: now });
    return true;
  }
  
  if (entry.count >= MAX_REQUESTS) {
    res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - entry.timestamp)) / 1000)
    });
    return false;
  }
  
  entry.count++;
  return true;
}

export function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0]
    : req.socket.remoteAddress;
  return ip || 'unknown';
}

export function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
}

export function withSecurity<T = any>(
  handler: (req: NextApiRequest, res: NextApiResponse<T>) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse<T>) => {
    setSecurityHeaders(res);
    
    if (!rateLimit(req, res)) {
      return;
    }
    
    return handler(req, res);
  };
}