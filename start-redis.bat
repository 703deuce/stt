@echo off
echo Starting Redis for real-time updates...
echo.

REM Try to start Redis using different methods

echo Method 1: Starting Redis with Docker...
docker run -d -p 6379:6379 --name redis redis:alpine
if %errorlevel% equ 0 (
    echo ✅ Redis started successfully with Docker!
    echo Redis is running on localhost:6379
    goto :end
)

echo Method 2: Starting Redis with Chocolatey (if installed)...
redis-server
if %errorlevel% equ 0 (
    echo ✅ Redis started successfully with Chocolatey!
    goto :end
)

echo Method 3: Starting Redis with Windows Service (if installed)...
net start redis
if %errorlevel% equ 0 (
    echo ✅ Redis started successfully as Windows Service!
    goto :end
)

echo ❌ Could not start Redis automatically.
echo.
echo Please try one of these options:
echo 1. Start Docker Desktop and run: docker run -d -p 6379:6379 --name redis redis:alpine
echo 2. Install Redis manually from: https://github.com/microsoftarchive/redis/releases
echo 3. Use Redis Cloud (free): https://redis.com/try-free/
echo.
echo The app will work without Redis but will fallback to Server-Sent Events.

:end
pause
