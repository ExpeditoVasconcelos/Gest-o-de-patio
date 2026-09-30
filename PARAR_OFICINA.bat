@echo off
title JB Cunha - Desligar Sistema
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo         JB CUNHA - DESLIGAR CENTRAL DE OPERACOES
echo ================================================================
echo.
echo  Encerrando os processos do servidor na porta 3000...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($conns) { $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Write-Host '  [OK] Servidor desligado com sucesso!' -ForegroundColor Green } else { Write-Host '  [INFO] O servidor ja estava desligado.' -ForegroundColor Yellow }"

echo.
echo ================================================================
echo  Concluido! O ambiente foi desligado.
echo ================================================================
echo.
timeout /t 3 >nul 2>&1
