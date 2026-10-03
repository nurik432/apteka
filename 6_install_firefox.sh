#!/usr/bin/env bash
# Замена snap-версии Firefox на обычную из репозитория Mozilla (Ubuntu/Lubuntu).
# Обычная версия заметно быстрее запускается на слабом компьютере с жёстким диском.
set -euo pipefail

pause() { if [ -t 0 ]; then read -rp "Нажмите Enter для выхода..." _; fi; }
fail() {
  echo
  echo "===================================================="
  echo "ОШИБКА: $1"
  echo "===================================================="
  pause
  exit 1
}

KEY=/etc/apt/keyrings/packages.mozilla.org.asc

command -v apt-get >/dev/null || fail "скрипт рассчитан на Ubuntu/Lubuntu (нужен apt)"

if apt-cache policy firefox 2>/dev/null | grep -q packages.mozilla.org \
  && dpkg-query -W -f='${Version}' firefox 2>/dev/null | grep -qv snap; then
  echo "Firefox из репозитория Mozilla уже установлен: $(dpkg-query -W -f='${Version}' firefox)"
  pause
  exit 0
fi

echo "Firefox будет заменён на версию из репозитория Mozilla."
echo "Закладки и настройки нынешней snap-версии Firefox будут удалены."
if [ -t 0 ]; then
  read -rp "Продолжить? [д/Н] " ANSWER
  case "$ANSWER" in
    д|Д|y|Y|да|Да|yes) ;;
    *) echo "Отменено."; exit 0 ;;
  esac
fi

sudo -v || fail "нужны права администратора (sudo)"

if command -v snap >/dev/null && snap list firefox >/dev/null 2>&1; then
  echo "Удаление snap-версии Firefox..."
  sudo snap remove firefox
fi

echo "Подключение репозитория Mozilla..."
command -v wget >/dev/null || sudo apt-get install -y wget
sudo install -d -m 0755 /etc/apt/keyrings
wget -q https://packages.mozilla.org/apt/repo-signing-key.gpg -O- | sudo tee "$KEY" >/dev/null
[ -s "$KEY" ] || fail "не удалось скачать ключ репозитория Mozilla. Проверьте интернет"

echo "deb [signed-by=$KEY] https://packages.mozilla.org/apt mozilla main" \
  | sudo tee /etc/apt/sources.list.d/mozilla.list >/dev/null

# Берём Firefox у Mozilla и не даём системе вернуть пакет-заглушку, который ставит snap
sudo tee /etc/apt/preferences.d/mozilla >/dev/null <<'EOF'
Package: *
Pin: origin packages.mozilla.org
Pin-Priority: 1000

Package: firefox*
Pin: release o=Ubuntu
Pin-Priority: -1
EOF

echo "Установка Firefox..."
sudo apt-get update
sudo apt-get remove -y firefox || true
sudo apt-get install -y --allow-downgrades firefox firefox-l10n-ru

VERSION=$(dpkg-query -W -f='${Version}' firefox 2>/dev/null || true)
if [ -z "$VERSION" ] || echo "$VERSION" | grep -q snap; then
  fail "Firefox из репозитория Mozilla не установился (версия: ${VERSION:-нет})"
fi

# Программа аптеки открывается в браузере по умолчанию
xdg-settings set default-web-browser firefox.desktop 2>/dev/null || true

echo
echo "===================================================="
echo "Готово! Установлен Firefox $VERSION"
echo "===================================================="
pause
