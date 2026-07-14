@echo off
title Sincronizar Usuarios - Sistema de Reclamos
color 0A

echo =======================================================
echo SINCRONIZADOR DE USUARIOS A SUPABASE
echo =======================================================
echo.
echo Este script sube los usuarios del archivo usuarios.json
echo a la base de datos en la nube (Supabase).
echo.

cd /d "%~dp0"
python sincronizar_usuarios.py
