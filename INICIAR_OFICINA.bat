@echo off
title JB Cunha - Central de Operacoes
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo         JB CUNHA - CENTRAL DE OPERACOES E OFICINA v3.1
echo ================================================================
echo.
echo  [1/2] Verificando se o servidor ja esta ativo...

:: Verifica se a porta 3000 ja esta em uso
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
if %ERRORLEVEL% EQU 1 (
    echo  [AVISO] O servidor ja esta rodando na porta 3000!
    echo  Abrindo o navegador...
    start "" "http://localhost:3000"
    echo.
    echo  Pressione qualquer tecla para fechar esta janela.
    pause >nul
    exit /b 0
)

:: Garante que o diretorio do Node.js esteja no PATH da sessao atual
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles(x86)%\nodejs" set "PATH=%ProgramFiles(x86)%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"

:: Verifica se o Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERRO] O Node.js nao foi encontrado no sistema!
    echo  Por favor, instale o Node.js em https://nodejs.org/ e tente novamente.
    echo.
    pause
    exit /b 1
)

echo  [2/2] Iniciando o servidor Node.js...
echo.
echo  - Painel da Oficina: http://localhost:3000
echo  - Modo TV:          http://localhost:3000/#tv
echo.
:: Descobrir IP da rede local Wi-Fi para exibir o link do App Mobile
for /f "tokens=2 delims=:" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' } | Select-Object -First 1).IPAddressToString" 2^>nul') do set LAN_IP=%%a
if not defined LAN_IP set LAN_IP=192.168.x.x
echo  ----------------------------------------------------------------
echo  APP MOBILE (Tecnicos na mesma rede Wi-Fi):
echo  - http://%LAN_IP%:3000/mobile
echo  ----------------------------------------------------------------
echo.

echo  Mantenha esta janela aberta enquanto estiver utilizando o sistema.
echo  Para desligar, feche esta janela ou use o arquivo PARAR_OFICINA.bat
echo ================================================================
echo.

:: Abre o navegador automaticamente quando o servidor estiver pronto na porta 3000
start "" powershell -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command "$n=0; while($n -lt 30){ try { $c=New-Object System.Net.Sockets.TcpClient('127.0.0.1',3000); $c.Close(); Start-Process 'http://localhost:3000'; break } catch { Start-Sleep -Milliseconds 400; $n++ } }"

:: Inicia o servidor Node.js
node api-gateway/server.js

echo.
echo O servidor foi encerrado.
pause
