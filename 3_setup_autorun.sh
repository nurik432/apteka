#!/usr/bin/env bash
# Автозапуск сервера аптеки при входе в систему (Linux; аналог 3_setup_autorun.bat)
set -euo pipefail
ROOT="$(dirname "$(readlink -f "$0")")"

echo "Настройка автозапуска..."

AUTOSTART_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/autostart"
DESKTOP_FILE="$AUTOSTART_DIR/apteka.desktop"

chmod +x "$ROOT/2_start_apteka.sh"
mkdir -p "$AUTOSTART_DIR"

# Terminal=false: сервер стартует в фоне, без окна терминала
cat >"$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Аптека
Comment=Сервер аптеки
Exec="$ROOT/2_start_apteka.sh"
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

echo
echo "=========================================================="
echo "Автозапуск успешно настроен!"
echo "Теперь сервер аптеки будет запускаться сам"
echo "(в фоновом режиме, без окна терминала) при входе в систему."
echo "Файл автозапуска: $DESKTOP_FILE"
echo "Журнал сервера:   $ROOT/database/server.log"
echo "Чтобы отключить автозапуск, удалите файл автозапуска."
echo "=========================================================="
if [ -t 0 ]; then read -rp "Нажмите Enter для выхода..." _; fi
