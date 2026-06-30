@echo off
title Jogadas de Basquete - Servidor
cd /d "%~dp0"

echo ===============================================
echo   Jogadas de Basquete 3D - iniciando servidor
echo ===============================================
echo.

if not exist "node_modules" (
  echo Primeira vez: instalando dependencias...
  call npm install
  echo.
)

echo Servidor em: http://localhost:5173/
echo (Para celular, use a URL "Network" que aparecer abaixo.)
echo Feche esta janela ou rode "fechar servidor.bat" para parar.
echo.

call npm run dev -- --open

echo.
echo O servidor foi encerrado.
pause
