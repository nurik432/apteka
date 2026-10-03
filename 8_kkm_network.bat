@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: Настраивает раздачу интернета с Wi-Fi на кабель, к которому подключена ККМ, и ставит задачу,
:: которая восстанавливает её после каждого входа в систему. Подробности — в 8_kkm_network.ps1.

net session >nul 2>&1
if errorlevel 1 (
  echo Нужны права администратора. Перезапускаю с запросом прав...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

echo Настройка сети для ККМ...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp08_kkm_network.ps1" -Install
if errorlevel 1 goto :fail

echo.
echo ====================================================
echo Готово. Раздача включена, задача на вход в систему
echo создана. Журнал: database\ics.log
echo.
echo Осталось перезапустить ККМ питанием, чтобы она
echo получила адрес.
echo ====================================================
pause
exit /b 0

:fail
echo.
echo ====================================================
echo ОШИБКА: настроить не удалось. Смотрите сообщения выше
echo и журнал database\ics.log
echo ====================================================
pause
exit /b 1
