#!/usr/bin/env bash
# Сброс PIN-кода администратора (Linux; аналог 4_reset_admin_pin.bat)
cd "$(dirname "$(readlink -f "$0")")/backend" || exit 1

echo "Сброс PIN-кода администратора (логин admin)."
echo "Также снимает блокировку после неверных попыток."
echo
read -rp "Введите новый PIN из 4 цифр: " NEWPIN

npm run reset-pin -- admin "$NEWPIN"

echo
read -rp "Нажмите Enter для выхода..." _
