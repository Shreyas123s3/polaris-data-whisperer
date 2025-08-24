@echo off
echo.
echo 🚀 Starting Polaris Data Whisperer...
echo.

cd /d "%~dp0"

echo 📂 Current directory: %CD%

if not exist "package.json" (
    echo ❌ Error: package.json not found! Make sure you're in the project directory.
    pause
    exit /b 1
)

echo ✅ Found package.json

echo.
echo 🛑 Stopping any existing servers...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo 🔧 Starting backend server...
start "Backend Server" cmd /c "npm run server"

timeout /t 3 /nobreak >nul

echo.
echo 🎨 Starting frontend server...
start "Frontend Server" cmd /c "npm run dev"

echo.
echo 🌐 Servers are starting...
echo    Backend:  http://localhost:3001
echo    Frontend: http://localhost:8080
echo.
echo ⏳ Waiting for servers to start...

timeout /t 5 /nobreak >nul

echo.
echo ✅ Project should now be running!
echo    Open your browser to: http://localhost:8080/analyze
echo.
pause
