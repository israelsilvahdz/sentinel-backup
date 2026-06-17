@echo off
setlocal

cd /d "%~dp0"

echo Iniciando Sentinel en http://localhost:9002 ...
echo.

if not exist node_modules (
  echo No se encontro node_modules. Ejecuta primero: npm install
  pause
  exit /b 1
)

if not exist .env.local (
  echo No se encontro .env.local. Revisa la configuracion antes de continuar.
  pause
  exit /b 1
)

npm run dev
