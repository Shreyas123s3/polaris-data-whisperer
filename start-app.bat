@echo off
echo Starting Polaris Data Whisperer...
echo.

echo Starting FastAPI Backend...
start "Backend" cmd /k "python app.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo Starting React Frontend...
start "Frontend" cmd /k "npm run dev"

echo.
echo ==========================================
echo     APPLICATION IS STARTING!
echo ==========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
echo Both services are running in separate windows.
echo Close the windows to stop the services.
echo.
pause

