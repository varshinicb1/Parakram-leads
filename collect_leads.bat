@echo off
cd /d "%~dp0backend"
python collect_leads.py %*
