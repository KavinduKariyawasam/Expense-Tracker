@echo off
echo Starting Frontend Server...
cd /d "%~dp0"

REM Navigate to frontend directory
if exist "frontend" (
    echo Found frontend directory
    cd frontend
) else (
    echo Error: Frontend directory not found
    echo Please ensure the 'frontend' directory exists
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the frontend development server
echo Starting development server on http://localhost:3000
npm start

pause