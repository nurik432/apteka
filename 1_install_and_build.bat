@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Установка зависимостей Backend...
cd backend
call npm install
echo Обновление схемы базы данных...

:: Копия базы перед изменением схемы (отметка времени берётся вне блока if, иначе %STAMP% будет пустой)
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd-HHmm"') do set STAMP=%%i
if exist "..\database\apteka.db" (
  if not exist "..\database\backups" mkdir "..\database\backups"
  copy /Y "..\database\apteka.db" "..\database\backups\apteka-before-update-%STAMP%.db" >nul
  echo Резервная копия базы: database\backups\apteka-before-update-%STAMP%.db
)

:: db push сам пересобирает Prisma Client после успешного обновления; при отмене клиент остаётся
:: согласованным со старой базой. Без --accept-data-loss: если обновление требует удалить данные,
:: Prisma спросит подтверждение (в неинтерактивном запуске — остановится).
call npx prisma db push
if errorlevel 1 (
  echo.
  echo ====================================================
  echo ОШИБКА: схема базы данных не обновлена, данные не тронуты.
  echo Если сервер аптеки запущен — закройте его и запустите этот файл снова.
  echo Копия базы до обновления лежит в database\backups
  echo ====================================================
  pause
  exit /b 1
)
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
