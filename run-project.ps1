# PowerShell script to run both frontend and backend
Write-Host "🚀 Starting Polaris Data Whisperer..." -ForegroundColor Cyan

# Get the directory where this script is located
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Navigate to project directory
Set-Location $ScriptDir

Write-Host "📂 Current directory: $(Get-Location)" -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found! Make sure you're in the project directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Found package.json" -ForegroundColor Green

# Kill any existing Node processes
Write-Host "🛑 Stopping any existing servers..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Start backend server
Write-Host "🔧 Starting backend server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run server" -WorkingDirectory $ScriptDir

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "🎨 Starting frontend server..." -ForegroundColor Cyan
Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -WorkingDirectory $ScriptDir

Write-Host "" 
Write-Host "🌐 Servers should be starting..." -ForegroundColor Green
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "   Frontend: http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "⏳ Waiting for servers to start..." -ForegroundColor Yellow

# Wait and check if servers are responding
Start-Sleep -Seconds 5

Write-Host "✅ Project should now be running!" -ForegroundColor Green
Write-Host "   Open your browser to: http://localhost:8080/analyze" -ForegroundColor Cyan

Read-Host "Press Enter to close this window"
