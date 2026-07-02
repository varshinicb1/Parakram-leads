@echo off
title JALEBI VPS — Setup
cd /d "%~dp0"

:: Check admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo.
echo  Starting JALEBI VPS setup...
echo.

:: Launch the PowerShell setup
powershell -ExecutionPolicy Bypass -File "%~dp0setup-vps.ps1"

echo.
echo Setup finished. Press any key to exit.
pause >nul
exit /b
