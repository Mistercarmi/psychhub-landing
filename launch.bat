@echo off
setlocal enabledelayedexpansion
title PsychHub
cd /d "%~dp0"

echo ====================================
echo   PsychHub - demarrage
echo ====================================
echo.

REM ---- [1/4] Dependances : reinstalle si package.json plus recent que node_modules ----
set NEED_INSTALL=0
if not exist "node_modules" set NEED_INSTALL=1
if not exist "node_modules\.package-lock.json" set NEED_INSTALL=1

if !NEED_INSTALL!==0 (
    for /f %%i in ('powershell -NoProfile -Command "(Get-Item package.json).LastWriteTimeUtc.Ticks"') do set PKG_TIME=%%i
    for /f %%i in ('powershell -NoProfile -Command "(Get-Item node_modules\.package-lock.json).LastWriteTimeUtc.Ticks"') do set MOD_TIME=%%i
    if !PKG_TIME! GTR !MOD_TIME! set NEED_INSTALL=1
)

if !NEED_INSTALL!==1 (
    echo [1/4] Installation des dependances ^(package.json modifie^)...
    call npm install
    if errorlevel 1 goto :error
) else (
    echo [1/4] Dependances OK.
)

REM ---- [2/4] Prisma client + migrations ----
echo [2/4] Mise a jour Prisma...
call npx prisma generate
if errorlevel 1 goto :error
call npx prisma migrate deploy
if errorlevel 1 goto :error

REM ---- [3/4] Build : rebuild si schema/src plus recent que .next ----
set NEED_BUILD=0
if not exist ".next\BUILD_ID" set NEED_BUILD=1

if !NEED_BUILD!==0 (
    for /f %%i in ('powershell -NoProfile -Command "(Get-Item .next\BUILD_ID).LastWriteTimeUtc.Ticks"') do set BUILD_TIME=%%i
    for /f %%i in ('powershell -NoProfile -Command "(Get-ChildItem src,prisma\schema.prisma,package.json,next.config.mjs,tailwind.config.ts,tsconfig.json -Recurse -File -ErrorAction SilentlyContinue ^| Sort-Object LastWriteTimeUtc -Descending ^| Select-Object -First 1).LastWriteTimeUtc.Ticks"') do set SRC_TIME=%%i
    if !SRC_TIME! GTR !BUILD_TIME! set NEED_BUILD=1
)

if !NEED_BUILD!==1 (
    echo [3/4] Build de l'application ^(source modifiee^)...
    if exist ".next" rmdir /s /q .next
    call npm run build
    if errorlevel 1 goto :error
) else (
    echo [3/4] Build a jour.
)

REM ---- [4/4] Demarrage ----
echo [4/4] Lancement du serveur sur http://localhost:3000
echo.
echo Fermez cette fenetre pour arreter l'application.
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"
call npm run start
goto :end

:error
echo.
echo ====================================
echo   ERREUR pendant le demarrage
echo ====================================
pause
exit /b 1

:end
pause
endlocal
