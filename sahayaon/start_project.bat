@echo off
echo Starting Sahayaon Project...
echo.

REM Start backend server in new terminal
echo Starting backend server...
start "Backend Server" cmd /k "cd /d %~dp0ticketing_tool_backend && node server.js"

REM Wait a moment for the backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in new terminal
echo Starting frontend...
start "Frontend Server" cmd /k "cd /d %~dp0it_ticketing_frontend && npm start"

echo.
echo Both servers are starting in separate terminals...
echo Backend: http://localhost:3000 (or the port specified in your backend config)
echo Frontend: http://localhost:3001 (or the port specified in your frontend config)
echo.
echo Press any key to exit this launcher...
pause > nul
