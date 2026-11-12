@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo   WiFi Pulse Pro - Local Connection Diagnostics
echo ================================================
echo.
echo Keep this window open to monitor your network.
echo Stop with Ctrl+C to save the ISP report.
echo.
where py >nul 2>nul
if %errorlevel%==0 (
    py -3 wifi_pulse_agent.py --interval 5 --output wifi-pulse-pro
) else (
    where python >nul 2>nul
    if errorlevel 1 (
        echo Python 3.10 or later is required.
        echo Install Python from python.org and try again.
        pause
        exit /b 1
    )
    python wifi_pulse_agent.py --interval 5 --output wifi-pulse-pro
)
echo.
echo Reports are saved in the desktop-agent folder.
pause
