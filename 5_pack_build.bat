@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Собирает программу на этом компьютере и упаковывает готовую сборку в apteka-build.tar.gz.
:: Архив переносят на слабый компьютер с Linux: там 1_install_and_build.sh возьмёт сборку из него
:: и не будет собирать сам.

if not exist "backend\node_modules" goto :nodeps
if not exist "frontend\node_modules" goto :nodeps

echo Компиляция Backend...
cd backend
call npm run build
if errorlevel 1 goto :fail

echo Сборка Frontend...
cd ..\frontend
call npm run build
if errorlevel 1 goto :fail

echo Копирование Frontend в Backend...
rmdir /S /Q "..\backend\public" 2>nul
xcopy /E /I /Y /Q dist "..\backend\public" >nul
cd ..

:: Версия кода, из которой собран архив: скрипт на Linux сверит её со своей
set HASH=unknown
for /f %%i in ('git rev-parse HEAD 2^>nul') do set HASH=%%i
> "backend\build-info.txt" echo %HASH%

echo Упаковка...
if exist "apteka-build.tar.gz" del "apteka-build.tar.gz"
tar -czf "apteka-build.tar.gz" -C backend dist public build-info.txt
if errorlevel 1 goto :fail
del "backend\build-info.txt"

echo.
echo ====================================================
echo Готово! Архив: %~dp0apteka-build.tar.gz
echo Скопируйте его в папку проекта на компьютере с Linux
echo и запустите там: bash 1_install_and_build.sh
echo ====================================================
pause
exit /b 0

:nodeps
echo.
echo ====================================================
echo ОШИБКА: зависимости не установлены.
echo Сначала запустите 1_install_and_build.bat
echo ====================================================
pause
exit /b 1

:fail
echo.
echo ====================================================
echo ОШИБКА: сборка не удалась, архив не создан.
echo ====================================================
pause
exit /b 1
