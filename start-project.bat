@echo off
echo Starting Polaris Data Whisperer...
echo.

echo Starting FastAPI Backend...
start "Backend" cmd /k "cd /d %~dp0 && python app.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting React Frontend...
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ==========================================
echo     PROJECT STARTED!
echo ==========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173 (or 8080, 8081)
echo.
echo Both services are running in separate windows.
echo Close those windows to stop the services.
echo.
echo This launcher will close in 3 seconds...
timeout /t 3 /nobreak > nul
