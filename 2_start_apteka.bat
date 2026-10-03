@echo off
chcp 65001 >nul
cd /d "%~dp0\backend"

set "URL=http://localhost:3001"

:: Браузер на движке Chromium открывает программу отдельным окном (--app): без вкладок и адресной строки.
:: Путь с «(x86)» кладём в переменную заранее: скобки в его имени ломают разбор списка for.
set "PF86=%ProgramFiles(x86)%"
set "APPBROWSER="
for %%P in (
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do if not defined APPBROWSER if exist %%P set "APPBROWSER=%%~P"

:: Сервер уже работает (автозапуск или второй щелчок по ярлыку) — просто открываем программу
curl -s -o NUL --max-time 2 %URL%/api/health
if not errorlevel 1 (
  call :open
  exit /b 0
)

echo Запуск сервера Аптеки...
echo Подождите пару секунд, программа откроется в отдельном окне.

call :open

:: Запускаем сам сервер
node dist/index.js
pause
exit /b 0

:: Ждёт, пока сервер ответит, и открывает программу. Иначе окно успеет показать ошибку:
:: в режиме --app нет адресной строки, и перезагрузить страницу не так очевидно.
:open
if not defined APPBROWSER goto :opendefault
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 60;$i++){ try{ $c=New-Object Net.Sockets.TcpClient -ArgumentList '127.0.0.1',3001; $c.Close(); break } catch { Start-Sleep -Milliseconds 500 } }; Start-Process '%APPBROWSER%' -ArgumentList '--app=%URL%'"
exit /b 0

:opendefault
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 60;$i++){ try{ $c=New-Object Net.Sockets.TcpClient -ArgumentList '127.0.0.1',3001; $c.Close(); break } catch { Start-Sleep -Milliseconds 500 } }; Start-Process '%URL%'"
exit /b 0
