# Redis Setup for Real-time Updates

## Development Setup

### Option 1: Local Redis (Recommended for Development)

1. **Install Redis locally:**
   ```bash
   # Windows (using Chocolatey)
   choco install redis-64

   # Or download from: https://github.com/microsoftarchive/redis/releases
   ```

2. **Start Redis server:**
   ```bash
   redis-server
   ```

3. **Add to .env.local:**
   ```
   REDIS_URL=redis://localhost:6379
   NEXT_PUBLIC_WS_URL=http://localhost:3000
   ```

### Option 2: Redis Cloud (Free Tier)

1. **Sign up at:** https://redis.com/try-free/
2. **Create a free database**
3. **Add to .env.local:**
   ```
   REDIS_URL=redis://username:password@host:port
   NEXT_PUBLIC_WS_URL=http://localhost:3000
   ```

### Option 3: Docker Redis

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

## Production Setup

### Vercel + Redis Cloud
- Use Redis Cloud for production
- Set environment variables in Vercel dashboard
- WebSocket server needs to run on a separate service (Fly.io, Render, etc.)

### Alternative: Server-Sent Events Only
If you don't want to set up Redis, the system will fallback to Server-Sent Events (SSE) which work without additional infrastructure.

## Testing

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **Check Redis connection:**
   - Look for "✅ Redis connected for WebSocket pub/sub" in console
   - If you see "❌ Redis connection failed", check your Redis setup

3. **Test real-time updates:**
   - Upload a file for transcription
   - Watch the dashboard update in real-time
   - No more 30-second polling!

## Troubleshooting

### Redis Connection Failed
- Make sure Redis is running: `redis-cli ping` should return "PONG"
- Check your REDIS_URL in .env.local
- For Windows, make sure Redis service is started

### WebSocket Connection Failed
- The system will automatically fallback to Server-Sent Events
- Check browser console for connection errors
- SSE works without additional setup

### No Real-time Updates
- Check browser console for WebSocket/SSE connection status
- Verify Redis is running and accessible
- Check network tab for connection errors
