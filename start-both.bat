@echo off
echo ========================================
echo    EXPENSE TRACKER - FULL SETUP
echo ========================================
echo.

cd /d "%~dp0"

echo Starting both Backend and Frontend...
echo.
echo This will open two new command windows:
echo 1. Backend (FastAPI) - http://127.0.0.1:8000
echo 2. Frontend (React PWA) - http://localhost:3000
echo.
echo Press any key to continue...
pause

echo Starting Backend...
start "Expense Tracker Backend" cmd /k "start-backend.bat"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "Expense Tracker Frontend" cmd /k "start-frontend.bat"

echo.
echo Both servers are starting in separate windows.
echo Close those windows or press Ctrl+C in them to stop the servers.
echo.
pause
