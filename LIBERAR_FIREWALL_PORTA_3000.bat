@echo off
setlocal EnableDelayedExpansion
title Liberar Conexoes no Firewall do Windows - Central JB Cunha

:: 1. Auto-elevacao automatica para Administrador caso nao esteja elevado
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Solicitando permissao de Administrador do Windows...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo.
echo ================================================================
echo   CENTRAL JB CUNHA - LIBERACAO DE REDE E FIREWALL
echo ================================================================
echo.
echo Aplicando permissoes no Firewall do Windows...
echo.

:: 2. Remover regras antigas / conflitantes de Node.js que bloqueavam rede Particular
netsh advfirewall firewall delete rule name="Central JB Cunha Port 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="Central JB Cunha Port 80" >nul 2>&1
netsh advfirewall firewall delete rule name="Central JB Cunha Node Runtime" >nul 2>&1
netsh advfirewall firewall delete rule name="Central JB Cunha Ping ICMPv4" >nul 2>&1
netsh advfirewall firewall delete rule name="Node.js JavaScript Runtime" >nul 2>&1

:: 3. Liberar o executavel do Node.js em TODOS os perfis (Dominio, Particular e Publico)
netsh advfirewall firewall add rule name="Central JB Cunha Node Runtime" dir=in action=allow program="%ProgramFiles%\nodejs\node.exe" profile=any >nul 2>&1

:: 4. Liberar Porta TCP 3000 em todos os perfis
netsh advfirewall firewall add rule name="Central JB Cunha Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1

:: 5. Liberar Porta TCP 80 em todos os perfis (permite celulares abrirem direto sem :3000)
netsh advfirewall firewall add rule name="Central JB Cunha Port 80" dir=in action=allow protocol=TCP localport=80 profile=any >nul 2>&1

:: 6. Liberar Ping (ICMPv4) para testes de conectividade
netsh advfirewall firewall add rule name="Central JB Cunha Ping ICMPv4" dir=in action=allow protocol=icmpv4:8,any profile=any >nul 2>&1

echo.
echo ================================================================
echo   [SUCESSO] Firewall configurado e liberado com sucesso!
echo ================================================================
echo.
echo Agora qualquer celular conectado na mesma rede Wi-Fi pode acessar:
echo.
echo   Opcao 1 (Mais facil - Porta 80):
echo   http://192.168.1.33/mobile
echo.
echo   Opcao 2 (Porta 3000):
echo   http://192.168.1.33:3000/mobile
echo.
echo   Painel Desktop / Modo TV:
echo   http://192.168.1.33
echo.
echo ================================================================
echo.
echo IMPORTANTE NO CELULAR:
echo   - Certifique-se de digitar "http://" e NAO "https://"
echo   - Desative os Dados Moveis (4G/5G) temporariamente para garantir
echo     que o celular use a conexao Wi-Fi
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
