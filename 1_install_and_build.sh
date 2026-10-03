#!/usr/bin/env bash
# Установка зависимостей, обновление базы и сборка (Linux; аналог 1_install_and_build.bat)
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"

pause() { if [ -t 0 ]; then read -rp "Нажмите Enter для выхода..." _; fi; }
fail() {
  echo
  echo "===================================================="
  echo "ОШИБКА: $1"
  echo "===================================================="
  pause
  exit 1
}

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  fail "не найден Node.js или npm. Установите их: sudo apt install nodejs npm"
fi
# Prisma 6 требует Node.js 18.18 или новее
if ! node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 18 || (a === 18 && b >= 18) ? 0 : 1)'; then
  fail "нужен Node.js 18.18 или новее, установлен $(node -v)"
fi

echo "Установка зависимостей Backend..."
cd backend
npm install

echo "Обновление схемы базы данных..."
NEW_DB=1
if [ -f ../database/apteka.db ]; then
  NEW_DB=0
  # Копия базы перед изменением схемы
  STAMP=$(date +%Y-%m-%d-%H%M)
  mkdir -p ../database/backups
  cp ../database/apteka.db "../database/backups/apteka-before-update-$STAMP.db"
  echo "Резервная копия базы: database/backups/apteka-before-update-$STAMP.db"
fi

# db push сам пересобирает Prisma Client. Без --accept-data-loss: если обновление требует
# удалить данные, Prisma спросит подтверждение (в неинтерактивном запуске — остановится).
if ! npx prisma db push; then
  fail "схема базы данных не обновлена, данные не тронуты.
Если сервер аптеки запущен — остановите его и запустите этот файл снова.
Копия базы до обновления лежит в database/backups"
fi

if [ "$NEW_DB" = 1 ]; then
  echo "Новая база: создание администратора (PIN 1234) и категорий..."
  npx tsx prisma/seed.ts
fi

echo "Компиляция Backend..."
npm run build

echo
echo "Установка зависимостей Frontend..."
cd ../frontend
npm install
echo "Сборка Frontend..."
npm run build

echo
echo "Копирование Frontend в Backend..."
rm -rf ../backend/public
cp -r dist ../backend/public

cd ..
chmod +x ./*.sh

echo
echo "===================================================="
echo "Готово! Все зависимости установлены и проект собран."
echo "Теперь можно запускать ./2_start_apteka.sh"
echo "===================================================="
pause
