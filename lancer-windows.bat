@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Curling
echo Preparation de Curling (la premiere fois, cela peut prendre une minute)...
call npm install --omit=dev --no-fund --no-audit
if errorlevel 1 (
  echo.
  echo Probleme : Node.js n'est pas installe. Installez-le depuis https://nodejs.org (version LTS), puis recommencez.
  pause
  exit /b
)
start "" http://localhost:3000
call npm start
pause
