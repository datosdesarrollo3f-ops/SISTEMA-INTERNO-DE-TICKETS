@echo off
title Iniciar Sistema de Reclamos
echo =======================================================
echo 🏛️ Iniciando Sistema de Reclamos en Servidor Local...
echo =======================================================
echo.
cd /d "C:\Users\Enzo\sistema_reclamos_build"
start "" "http://localhost:5173"
npm run dev
