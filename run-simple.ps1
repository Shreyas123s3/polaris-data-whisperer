# Simple script to run Polaris Data Whisperer
Write-Host "Starting Polaris Data Whisperer..." -ForegroundColor Green
Write-Host ""

# Check if Python dependencies are installed
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
try {
    python -c "import fastapi, pandas, uvicorn" 2>$null
    Write-Host "Python dependencies OK" -ForegroundColor Green
} catch {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Check if Node.js dependencies are installed
Write-Host "Checking Node.js dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "Node.js dependencies OK" -ForegroundColor Green
}

Write-Host ""

# Start backend
Write-Host "Starting FastAPI Backend..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python app.py
}

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting React Frontend..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     APPLICATION IS STARTING!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep running and monitor jobs
try {
    while ($true) {
        if ($backendJob.State -eq "Failed") {
            Write-Host "Backend failed!" -ForegroundColor Red
            break
        }
        if ($frontendJob.State -eq "Failed") {
            Write-Host "Frontend failed!" -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host "Stopping services..." -ForegroundColor Yellow
} finally {
    if ($backendJob) {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
    }
    if ($frontendJob) {
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
    }
    Write-Host "Services stopped. Goodbye!" -ForegroundColor Green
}
