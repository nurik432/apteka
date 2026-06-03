@echo off
chcp 65001 >nul
echo Установка зависимостей Backend...
cd backend
call npm install
echo Компиляция Backend...
call npm run build

echo.
echo Установка зависимостей Frontend...
cd ../frontend
call npm install
echo Сборка Frontend...
call npm run build

echo.
echo Копирование Frontend в Backend...
rmdir /S /Q "..\backend\public" 2>nul
xcopy /E /I /Y dist "..\backend\public"

cd ..
echo.
echo ====================================================
echo Готово! Все зависимости установлены и проект собран.
echo Теперь можно запускать 2_start_apteka.bat
echo ====================================================
pause
