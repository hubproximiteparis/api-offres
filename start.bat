@echo off
taskkill /F /IM node.exe >nul 2>&1
echo Lancement de l'API correcte...
node C:\api-offres\index.js
pause
