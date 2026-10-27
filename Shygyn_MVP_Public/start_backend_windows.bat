@echo off
setlocal
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -m venv .venv
  if errorlevel 1 goto :error
)
call ".venv\Scripts\activate.bat"
python -m pip install -r requirements.txt
if errorlevel 1 goto :error
python manage.py migrate
if errorlevel 1 goto :error
python manage.py seed_demo
if errorlevel 1 goto :error
echo.
echo Shygyn backend: http://127.0.0.1:8000/api/health/
python manage.py runserver 127.0.0.1:8000
goto :end
:error
echo.
echo ERROR: Please read README.md and check Python / Internet connectivity.
pause
:end
