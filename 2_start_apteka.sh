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

echo "Запуск сервера Аптеки..."
echo "Сайт откроется в браузере, как только сервер поднимется."

# Открываем браузер, когда сервер начнёт отвечать (ждём до минуты)
(
  for _ in $(seq 60); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; then
      xdg-open "http://localhost:$PORT" >/dev/null 2>&1
      break
    fi
    sleep 1
  done
) &

# Запускаем сам сервер
node dist/index.js
if [ -t 0 ]; then read -rp "Сервер остановлен. Нажмите Enter для выхода..." _; fi
