@echo off
echo Starting Backend Server...
cd /d "%~dp0"

REM Check if conda is available
where conda >nul 2>&1
if errorlevel 1 (
    echo Error: Conda is not installed or not in PATH
    echo Please install Anaconda/Miniconda and add it to your PATH
    pause
    exit /b 1
)

REM Activate the ocr conda environment
echo Activating conda environment 'ocr'...
call conda activate ocr
if errorlevel 1 (
    echo Error: Failed to activate conda environment 'ocr'
    echo Please ensure the 'ocr' environment exists
    echo You can create it with: conda create -n ocr python
    pause
    exit /b 1
)

REM Check if requirements.txt exists and install dependencies
if exist "requirements.txt" (
    echo Installing Python dependencies in ocr environment...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo Warning: Some dependencies may have failed to install
    )
) else (
    echo Warning: requirements.txt not found, skipping dependency installation
)

REM Start the backend server
echo Starting Python backend server...
if exist "backend\main.py" (
    echo Starting FastAPI backend from backend directory...
    cd backend
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload
) else if exist "main.py" (
    echo Starting backend from root directory...
    uvicorn main:app --host 127.0.0.1 --port 8000 --reload
) else if exist "app.py" (
    echo Starting backend using app.py...
    uvicorn app:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo Error: No main Python file found
    echo Please ensure you have one of these files:
    echo - backend\main.py
    echo - main.py
    echo - app.py
    pause
    exit /b 1
)

pause