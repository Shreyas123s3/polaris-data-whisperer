# Start Polaris Data Whisperer Services
Write-Host "Starting Polaris Data Whisperer..." -ForegroundColor Green

# Function to start backend
function Start-Backend {
    Write-Host "Starting FastAPI Backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python app.py" -WindowStyle Normal
}

# Function to start frontend
function Start-Frontend {
    Write-Host "Starting React Frontend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal
}

# Start backend
Start-Backend

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Start frontend
Start-Frontend

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "     SERVICES STARTED!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both services are running in separate PowerShell windows." -ForegroundColor Yellow
Write-Host "Close those windows to stop the services." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this launcher..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

