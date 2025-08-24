@echo off
echo Starting Polaris Data Whisperer...
echo.

echo Starting FastAPI Backend in a new window...
start "Backend - FastAPI" cmd /k "cd /d %~dp0 && python app.py"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting React Frontend in a new window...
start "Frontend - React" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ==========================================
echo     APPLICATION STARTED!
echo ==========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
echo Both services are running in separate windows.
echo Close those windows to stop the services.
echo.
echo This window will close in 5 seconds...
timeout /t 5 /nobreak > nul
