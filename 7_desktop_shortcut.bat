@echo off
chcp 65001 >nul
echo Создание ярлыка «Аптека» на рабочем столе...

:: Ярлык запускает 2_start_apteka.bat в свёрнутом окне: тот поднимает сервер (если он ещё не работает)
:: и открывает программу в браузере.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop = [Environment]::GetFolderPath('Desktop'); $s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Аптека.lnk')); $s.TargetPath = '%~dp02_start_apteka.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0frontend\public\apteka.ico'; $s.WindowStyle = 7; $s.Description = 'Аптека'; $s.Save()"
if errorlevel 1 goto :fail

echo.
echo ====================================================
echo Готово! На рабочем столе появился ярлык «Аптека».
echo ====================================================
pause
exit /b 0

:fail
echo.
echo ====================================================
echo ОШИБКА: не удалось создать ярлык.
echo ====================================================
pause
exit /b 1
