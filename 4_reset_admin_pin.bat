@echo off
chcp 65001 >nul
cd /d "%~dp0\backend"

echo Сброс PIN-кода администратора (логин admin).
echo Также снимает блокировку после неверных попыток.
echo.
set /p NEWPIN="Введите новый PIN из 4 цифр: "

call npm run reset-pin -- admin %NEWPIN%

echo.
pause
