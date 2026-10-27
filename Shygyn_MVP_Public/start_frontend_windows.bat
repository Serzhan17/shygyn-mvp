@echo off
setlocal
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 goto :error
)
echo.
echo Open Shygyn: http://127.0.0.1:5173
call npm run dev
goto :end
:error
echo.
echo ERROR: Please read README.md and check Node.js / Internet connectivity.
pause
:end
