#!/usr/bin/env bash
# Запуск сервера аптеки (Linux; аналог 2_start_apteka.bat)
ROOT="$(dirname "$(readlink -f "$0")")"
cd "$ROOT/backend" || exit 1

# При автозапуске терминала нет — вывод сервера пишем в журнал рядом с базой
if [ ! -t 1 ]; then
  mkdir -p "$ROOT/database"
  exec >>"$ROOT/database/server.log" 2>&1
fi

# Без public/ сервер запустится, но в браузере будет «Cannot GET /»
if [ ! -f dist/index.js ] || [ ! -f public/index.html ]; then
  echo "Проект не собран. Сначала запустите ./1_install_and_build.sh"
  if [ -t 0 ]; then read -rp "Нажмите Enter для выхода..." _; fi
  exit 1
fi

PORT="${PORT:-3001}"
export PORT

# Браузер на движке Chromium открывает программу отдельным окном (--app): без вкладок и адресной
# строки. Firefox такого режима не имеет, поэтому с ним открываем обычным способом.
open_app() {
  local browser
  for browser in google-chrome google-chrome-stable chromium chromium-browser brave-browser microsoft-edge; do
    if command -v "$browser" >/dev/null 2>&1; then
      "$browser" --app="http://localhost:$PORT" >/dev/null 2>&1 &
      return 0
    fi
  done
  xdg-open "http://localhost:$PORT" >/dev/null 2>&1
}

# Сервер уже работает (автозапуск или второй щелчок по ярлыку) — просто открываем программу
if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
  open_app
  exit 0
fi

echo "Запуск сервера Аптеки..."
echo "Программа откроется отдельным окном, как только сервер поднимется."

# Открываем окно, когда сервер начнёт отвечать (ждём до минуты)
(
  for _ in $(seq 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
      open_app
      break
    fi
    sleep 1
  done
) &

# Запускаем сам сервер
node dist/index.js
if [ -t 0 ]; then read -rp "Сервер остановлен. Нажмите Enter для выхода..." _; fi
