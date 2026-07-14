@echo off
title Actualizar Datos de Jira - Sistema de Reclamos
color 0A

echo =======================================================
echo ACTUALIZADOR DE DATOS DE JIRA
echo =======================================================
echo.
echo Este asistente automatiza el proceso de extraccion de tickets.
echo.

:: Verificar si Python está instalado
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Python en este equipo.
    echo Por favor, instale Python y marque la opcion "Add Python to PATH".
    echo.
    echo Presione una tecla para salir...
    pause > nul
    exit /b
)

echo =======================================================
echo PASO 1: CERRAR CHROME Y ABRIR EN MODO DEPURACION
echo =======================================================
echo.
echo [!] IMPORTANTE: Cierre todas las ventanas de Chrome abiertas
echo     antes de continuar para evitar conflictos de puerto.
echo.
set /p OPTION="Desea abrir Chrome en modo depuracion ahora? (S/N): "
if /i "%OPTION%"=="S" (
    echo.
    echo Abriendo Chrome en puerto 9222...
    start "" chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebug"
    echo.
    echo [i] Inicie sesion en Jira en la ventana de Chrome que se acaba de abrir.
    echo.
) else (
    echo.
    echo [i] Asegurese de tener Chrome abierto en el puerto 9222 antes de continuar.
    echo.
)

echo Presione una tecla cuando este listo para iniciar la extraccion...
pause > nul

echo.
echo =======================================================
echo PASO 2: VERIFICANDO DEPENDENCIAS DE PYTHON
echo =======================================================
echo.
python -c "import pandas, requests, selenium, openpyxl" 2>nul
if %errorlevel% neq 0 (
    echo [!] Faltan algunas librerias. Instalando pandas, requests, selenium, openpyxl...
    pip install pandas requests selenium openpyxl
) else (
    echo [OK] Todas las librerias necesarias estan instaladas.
)
echo.

echo =======================================================
echo PASO 3: EXTRRAYENDO TICKETS DE JIRA
echo =======================================================
echo.
cd /d "%~dp0"
python extraer_aprobaciones_jira.py
echo.
echo =======================================================
echo Proceso terminado.
echo =======================================================
echo.
echo Presione cualquier tecla para salir...
pause > nul
