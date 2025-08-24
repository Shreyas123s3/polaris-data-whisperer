# Polaris Data Whisperer - Complete Application Launcher
# This script runs both the Python FastAPI backend and React frontend

param(
    [switch]$InstallDeps,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"
$White = "White"

# Function to write colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = $White
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    }
    catch {
        return $false
    }
}

# Function to wait for a service to be ready
function Wait-ForService {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )
    $startTime = Get-Date
    while ((Get-Date) -lt $startTime.AddSeconds($TimeoutSeconds)) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                return $true
            }
        }
        catch {
            Start-Sleep -Seconds 1
        }
    }
    return $false
}

# Clear screen and show header
Clear-Host
Write-ColorOutput "╔══════════════════════════════════════════════════════════════╗" $Cyan
Write-ColorOutput "║                POLARIS DATA WHISPERER                        ║" $Cyan
Write-ColorOutput "║              LLM-Based Data Analysis App                     ║" $Cyan
Write-ColorOutput "╚══════════════════════════════════════════════════════════════╝" $Cyan
Write-Host ""

# Check prerequisites
Write-ColorOutput "🔍 Checking prerequisites..." $Yellow

# Check Python
if (-not (Test-Command "python")) {
    Write-ColorOutput "❌ Python is not installed or not in PATH" $Red
    Write-ColorOutput "   Please install Python 3.8+ from https://python.org" $Red
    exit 1
}

$pythonVersion = python --version 2>&1
Write-ColorOutput "✅ Python found: $pythonVersion" $Green

# Check Node.js
if (-not (Test-Command "node")) {
    Write-ColorOutput "❌ Node.js is not installed or not in PATH" $Red
    Write-ColorOutput "   Please install Node.js from https://nodejs.org" $Red
    exit 1
}

$nodeVersion = node --version
Write-ColorOutput "✅ Node.js found: $nodeVersion" $Green

# Check npm
if (-not (Test-Command "npm")) {
    Write-ColorOutput "❌ npm is not installed or not in PATH" $Red
    exit 1
}

$npmVersion = npm --version
Write-ColorOutput "✅ npm found: v$npmVersion" $Green

Write-Host ""

# Install dependencies if requested
if ($InstallDeps) {
    Write-ColorOutput "📦 Installing dependencies..." $Yellow
    
    # Install Python dependencies
    Write-ColorOutput "   Installing Python dependencies..." $Cyan
    try {
        pip install -r requirements.txt
        Write-ColorOutput "   ✅ Python dependencies installed" $Green
    }
    catch {
        Write-ColorOutput "   ❌ Failed to install Python dependencies" $Red
        Write-ColorOutput "   Error: $($_.Exception.Message)" $Red
        exit 1
    }
    
    # Install Node.js dependencies
    Write-ColorOutput "   Installing Node.js dependencies..." $Cyan
    try {
        npm install
        Write-ColorOutput "   ✅ Node.js dependencies installed" $Green
    }
    catch {
        Write-ColorOutput "   ❌ Failed to install Node.js dependencies" $Red
        Write-ColorOutput "   Error: $($_.Exception.Message)" $Red
        exit 1
    }
    
    Write-Host ""
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-ColorOutput "⚠️  Node.js dependencies not found. Run with -InstallDeps flag" $Yellow
    Write-ColorOutput "   Example: .\run-complete-app.ps1 -InstallDeps" $Cyan
    Write-Host ""
}

# Check if Python packages are available
try {
    python -c "import fastapi, pandas, uvicorn" 2>$null
    Write-ColorOutput "✅ Python dependencies are available" $Green
}
catch {
    Write-ColorOutput "⚠️  Python dependencies not found. Run with -InstallDeps flag" $Yellow
    Write-ColorOutput "   Example: .\run-complete-app.ps1 -InstallDeps" $Cyan
    Write-Host ""
}

Write-Host ""

# Check if ports are available
$backendPort = 8000
$frontendPort = 5173

if (Test-Port $backendPort) {
    Write-ColorOutput "⚠️  Port $backendPort is already in use (backend)" $Yellow
}

if (Test-Port $frontendPort) {
    Write-ColorOutput "⚠️  Port $frontendPort is already in use (frontend)" $Yellow
}

Write-Host ""

# Function to start backend
function Start-Backend {
    Write-ColorOutput "🚀 Starting FastAPI Backend..." $Green
    Write-ColorOutput "   Backend will be available at: http://localhost:$backendPort" $Cyan
    Write-ColorOutput "   API Documentation: http://localhost:$backendPort/docs" $Cyan
    Write-Host ""
    
    # Start backend in background
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        python app.py
    }
    
    # Wait for backend to start
    Write-ColorOutput "   Waiting for backend to start..." $Yellow
    if (Wait-ForService "http://localhost:$backendPort/docs") {
        Write-ColorOutput "   ✅ Backend is running!" $Green
        return $backendJob
    } else {
        Write-ColorOutput "   ❌ Backend failed to start" $Red
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        return $null
    }
}

# Function to start frontend
function Start-Frontend {
    Write-ColorOutput "🌐 Starting React Frontend..." $Green
    Write-ColorOutput "   Frontend will be available at: http://localhost:$frontendPort" $Cyan
    Write-Host ""
    
    # Start frontend in background
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run dev
    }
    
    # Wait for frontend to start
    Write-ColorOutput "   Waiting for frontend to start..." $Yellow
    Start-Sleep -Seconds 5  # Give frontend time to start
    
    if (Test-Port $frontendPort) {
        Write-ColorOutput "   ✅ Frontend is running!" $Green
        return $frontendJob
    } else {
        Write-ColorOutput "   ❌ Frontend failed to start" $Red
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
        return $null
    }
}

# Main execution logic
$backendJob = $null
$frontendJob = $null

try {
    if ($BackendOnly) {
        Write-ColorOutput "🎯 Starting Backend Only..." $Yellow
        $backendJob = Start-Backend
        if (-not $backendJob) { exit 1 }
    }
    elseif ($FrontendOnly) {
        Write-ColorOutput "🎯 Starting Frontend Only..." $Yellow
        $frontendJob = Start-Frontend
        if (-not $frontendJob) { exit 1 }
    }
    else {
        Write-ColorOutput "🎯 Starting Complete Application..." $Yellow
        Write-Host ""
        
        # Start backend first
        $backendJob = Start-Backend
        if (-not $backendJob) { exit 1 }
        
        Write-Host ""
        
        # Start frontend
        $frontendJob = Start-Frontend
        if (-not $frontendJob) { 
            Stop-Job $backendJob -ErrorAction SilentlyContinue
            Remove-Job $backendJob -ErrorAction SilentlyContinue
            exit 1 
        }
    }
    
    Write-Host ""
    Write-ColorOutput "╔══════════════════════════════════════════════════════════════╗" $Green
    Write-ColorOutput "║                    APPLICATION RUNNING!                      ║" $Green
    Write-ColorOutput "╚══════════════════════════════════════════════════════════════╝" $Green
    Write-Host ""
    
    if ($backendJob) {
        Write-ColorOutput "🔗 Backend:  http://localhost:$backendPort" $Cyan
        Write-ColorOutput "📚 API Docs: http://localhost:$backendPort/docs" $Cyan
    }
    
    if ($frontendJob) {
        Write-ColorOutput "🌐 Frontend: http://localhost:$frontendPort" $Cyan
    }
    
    Write-Host ""
    Write-ColorOutput "💡 How to use:" $Yellow
    Write-ColorOutput "   1. Open your browser and go to the frontend URL" $White
    Write-ColorOutput "   2. Upload a CSV file" $White
    Write-ColorOutput "   3. Ask questions about your data in natural language" $White
    Write-ColorOutput "   4. View AI-generated insights and SQL queries" $White
    Write-Host ""
    Write-ColorOutput "⏹️  Press Ctrl+C to stop all services" $Yellow
    Write-Host ""
    
    # Keep the script running and monitor jobs
    while ($true) {
        if ($backendJob -and $backendJob.State -eq "Failed") {
            Write-ColorOutput "❌ Backend job failed" $Red
            break
        }
        if ($frontendJob -and $frontendJob.State -eq "Failed") {
            Write-ColorOutput "❌ Frontend job failed" $Red
            break
        }
        Start-Sleep -Seconds 5
    }
}
catch {
    Write-ColorOutput "❌ An error occurred: $($_.Exception.Message)" $Red
}
finally {
    Write-Host ""
    Write-ColorOutput "🛑 Stopping services..." $Yellow
    
    if ($backendJob) {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        Write-ColorOutput "   ✅ Backend stopped" $Green
    }
    
    if ($frontendJob) {
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
        Write-ColorOutput "   ✅ Frontend stopped" $Green
    }
    
    Write-Host ""
    Write-ColorOutput "👋 Application stopped. Goodbye!" $Green
}
