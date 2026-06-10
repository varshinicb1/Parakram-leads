@echo off
cd /d "%~dp0backend"
python import_leads.py %*
