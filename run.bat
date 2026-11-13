@echo off
cd /d "%~dp0"
start /b cmd /c "timeout /t 3 >nul & start http://localhost:5000"
.venv\Scripts\python.exe app.py
pause
