@echo off
REM ============================================================
REM PortCast — Start All Services (Windows)
REM ============================================================
REM This script starts all 3 services in separate terminal windows:
REM   1. Python ML FastAPI Service  (port 8000)
REM   2. Node.js Express Backend    (port 5000)
REM   3. React Vite Frontend        (port 5500)
REM ============================================================

echo.
echo  ========================================
echo   PortCast - Starting All Services
echo  ========================================
echo.

REM --- 1. Start ML Service (Python FastAPI) ---
echo [1/3] Starting ML Service (Python FastAPI on port 8000)...
start "PortCast ML Service" cmd /k "cd /d %~dp0ml && pip install -r requirements.txt && python service.py"

REM Give ML service a moment to start
timeout /t 3 /nobreak > nul

REM --- 2. Start Node.js Backend ---
echo [2/3] Starting Node.js Backend (Express on port 5000)...
start "PortCast Backend" cmd /k "cd /d %~dp0server && npm install && npm run dev"

REM Give backend a moment to start
timeout /t 2 /nobreak > nul

REM --- 3. Start React Frontend ---
echo [3/3] Starting React Frontend (Vite on port 5500)...
start "PortCast Frontend" cmd /k "cd /d %~dp0client && npm install && npm run dev"

echo.
echo  ========================================
echo   All services starting!
echo  ========================================
echo.
echo   ML Service:   http://127.0.0.1:8000/api/ml/health
echo   Backend API:  http://localhost:5000/api/health
echo   Frontend:     http://localhost:5500
echo.
echo   ML Status:    http://localhost:5000/api/ml-status
echo  ========================================
echo.
pause
