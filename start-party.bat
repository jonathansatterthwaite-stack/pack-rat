@echo off
rem Double-click to host a Pack Rat party on your local network.
cd /d "%~dp0"
python server.py %*
pause
