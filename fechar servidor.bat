@echo off
title Fechar servidor
echo Procurando o servidor na porta 5173...

set "found="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
  echo Encerrando processo (PID %%a)...
  taskkill /F /PID %%a >nul 2>&1
  set "found=1"
)

if not defined found (
  echo Nenhum servidor estava rodando na porta 5173.
) else (
  echo Servidor encerrado com sucesso.
)

echo.
timeout /t 3 >nul
