@echo off
setlocal

cd /d "%~dp0"

echo ===============================================
echo   deep.tech - Iniciador (Frontend / Nube)
echo ===============================================
echo.

where bun >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Bun no esta instalado o no esta en el PATH.
    echo Instala Bun desde: https://bun.sh
    pause
    exit /b 1
)

if not exist ".env.local" (
    echo [ERROR] No existe .env.local
    echo Crea uno copiando .env.example y llena las credenciales de Supabase.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Instalando dependencias con bun install...
    call bun install
    if errorlevel 1 (
        echo [ERROR] Fallo bun install.
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Arrancando Vite contra Supabase en la nube...
echo        Frontend: http://localhost:5173
echo.
echo Presiona Ctrl+C para detener.
echo.

call bun run dev:frontend
set EXITCODE=%ERRORLEVEL%
echo.
echo ===============================================
echo   Vite termino (exit code: %EXITCODE%)
echo ===============================================
pause

endlocal
