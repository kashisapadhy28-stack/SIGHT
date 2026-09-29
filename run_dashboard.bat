@echo off
title SIGHT — Intelligent Mining Safety & Autonomous Haulage Dashboard
echo =========================================================================
echo  SIGHT AMR PERCEPTION DASHBOARD
echo  NMDC Bailadila Iron Ore Sector • Monsoon & Dense Fog Navigation
echo =========================================================================
echo.
echo [1/2] Starting Local HTTP Server on Port 8080...
start "" python -m http.server 8080

echo [2/2] Opening SIGHT Dashboard in Default Browser...
timeout /t 2 >nul
start http://localhost:8080/index.html

echo.
echo SIGHT Dashboard is live at: http://localhost:8080
echo Keep this terminal window open while evaluating.
echo =========================================================================
pause
