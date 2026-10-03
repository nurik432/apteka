#!/usr/bin/env bash
# Установка зависимостей, обновление базы и сборка (Linux; аналог 1_install_and_build.bat)
set -euo pipefail
ROOT="$(dirname "$(readlink -f "$0")")"
cd "$ROOT"

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

# Режим без сборки: если рядом лежит apteka-build.tar.gz (его делает 5_pack_build.bat на другом
# компьютере), готовая сборка берётся из архива. Нужен слабым машинам, где сборка не проходит.
ARCHIVE="apteka-build.tar.gz"
PREBUILT=0
if [ -f "$ARCHIVE" ]; then
  PREBUILT=1
  echo "Найден архив готовой сборки $ARCHIVE — сборка на этом компьютере пропускается."

  # Архив должен быть собран из той же версии кода, иначе сервер не совпадёт со схемой базы.
  # Разные коммиты допустимы, если между ними не менялись backend/ и frontend/ (правки скриптов, документации).
  BUILT_FROM=$(tar -xzOf "$ARCHIVE" build-info.txt 2>/dev/null | tr -d '\r\n ' || true)
  HERE=$(git rev-parse HEAD 2>/dev/null || true)
  if [ -n "$BUILT_FROM" ] && [ "$BUILT_FROM" != unknown ] && [ -n "$HERE" ] && [ "$BUILT_FROM" != "$HERE" ]; then
    if ! git cat-file -e "$BUILT_FROM^{commit}" 2>/dev/null || ! git diff --quiet "$BUILT_FROM" HEAD -- backend frontend; then
      fail "архив собран из другой версии программы.
Версия в архиве:   ${BUILT_FROM:0:7}
Версия на этом ПК: ${HERE:0:7}
Обновите обе стороны (git pull) и соберите архив заново, либо удалите $ARCHIVE."
    fi
  fi
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

if [ "$PREBUILT" = 1 ]; then
  echo "Распаковка готовой сборки..."
  rm -rf dist public
  tar -xzf "../$ARCHIVE"
  rm -f build-info.txt
  if [ ! -f dist/index.js ] || [ ! -f public/index.html ]; then
    fail "в архиве $ARCHIVE нет готовой сборки. Создайте его заново через 5_pack_build.bat"
  fi
else
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
fi

cd "$ROOT"
chmod +x ./*.sh

echo
echo "===================================================="
echo "Готово! Все зависимости установлены и проект собран."
echo "Теперь можно запускать ./2_start_apteka.sh"
echo "===================================================="
pause
