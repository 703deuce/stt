@echo off
echo Setting up Redis environment variables securely...
echo.

REM Set Redis URL as environment variable
setx REDIS_URL "redis://default:XTewfxsC49fYO5BKwUUmJ9I7j3FUOqja@redis-10181.c274.us-east-1-3.ec2.redns.redis-cloud.com:10181"
setx NEXT_PUBLIC_WS_URL "http://localhost:3000"

echo ✅ Environment variables set successfully!
echo.
echo Redis URL: Set securely
echo WebSocket URL: http://localhost:3000
echo.
echo You may need to restart your terminal/IDE for changes to take effect.
echo.
pause
