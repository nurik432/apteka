@echo off
chcp 65001 >nul
echo Настройка автозапуска...

set "VBS_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\apteka_autorun.vbs"
set "BAT_PATH=%~dp02_start_apteka.bat"

echo Создание скрытого скрипта автозапуска...
echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.Run chr(34) ^& "%BAT_PATH%" ^& Chr(34), 0 >> "%VBS_PATH%"

echo.
echo ==========================================================
echo Автозапуск успешно настроен!
echo Теперь сервер аптеки будет запускаться сам 
echo (в фоновом режиме, без черных окон) при включении ноутбука.
echo Скрипт добавлен в: %VBS_PATH%
echo ==========================================================
pause
