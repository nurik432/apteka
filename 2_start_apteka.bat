@echo off
chcp 65001 >nul
cd /d "%~dp0\backend"

:: Сервер уже работает (автозапуск или второй щелчок по ярлыку) — просто открываем программу
curl -s -o NUL --max-time 2 http://localhost:3001/api/health
if not errorlevel 1 (
  start "" "http://localhost:3001"
  exit /b 0
)

echo Запуск сервера Аптеки...
echo Подождите пару секунд, сайт откроется в браузере.

:: Запускаем браузер с задержкой, чтобы сервер успел подняться
start "" "http://localhost:3001"

:: Запускаем сам сервер
node dist/index.js
pause
