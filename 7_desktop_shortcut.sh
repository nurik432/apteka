#!/usr/bin/env bash
# Значок «Аптека» на рабочем столе и в меню приложений (Linux; аналог 7_desktop_shortcut.bat)
set -euo pipefail
ROOT="$(dirname "$(readlink -f "$0")")"

echo "Создание значка «Аптека»..."

# Папка рабочего стола может называться по-русски; без настроенной папки xdg-user-dir возвращает $HOME
DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
if [ -z "$DESKTOP_DIR" ] || [ "$DESKTOP_DIR" = "$HOME" ] || [ ! -d "$DESKTOP_DIR" ]; then
  DESKTOP_DIR="$HOME/Desktop"
fi
MENU_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"

chmod +x "$ROOT/2_start_apteka.sh"
mkdir -p "$DESKTOP_DIR" "$MENU_DIR"

# 2_start_apteka.sh поднимает сервер (если он ещё не работает) и открывает программу в браузере
cat >"$MENU_DIR/apteka.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Аптека
Comment=Учёт и продажи аптеки
Exec="$ROOT/2_start_apteka.sh"
Icon=$ROOT/frontend/public/icon-512.png
Terminal=false
Categories=Office;
EOF

cp "$MENU_DIR/apteka.desktop" "$DESKTOP_DIR/apteka.desktop"
chmod +x "$DESKTOP_DIR/apteka.desktop"
# Без отметки «доверенный» файловый менеджер спросит подтверждение при каждом запуске
gio set "$DESKTOP_DIR/apteka.desktop" metadata::trust true 2>/dev/null || true

echo
echo "===================================================="
echo "Готово! Значок «Аптека» появился на рабочем столе"
echo "и в меню приложений."
echo "Значок на рабочем столе: $DESKTOP_DIR/apteka.desktop"
echo "===================================================="
if [ -t 0 ]; then read -rp "Нажмите Enter для выхода..." _; fi
