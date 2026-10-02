import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Сброс PIN и снятие блокировки: npm run reset-pin -- <логин> <PIN>
const prisma = new PrismaClient();

async function main() {
  const [username, pin] = process.argv.slice(2);

  if (!username || !pin || !/^\d{4}$/.test(pin)) {
    console.error('Использование: npm run reset-pin -- <логин> <PIN из 4 цифр>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`❌ Пользователь "${username}" не найден`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(pin, 10),
      failedLogins: 0,
      lockedUntil: null,
      active: true,
    },
  });

  console.log(`✅ PIN для "${username}" (${user.fullName}) изменён, блокировка снята`);
}

main()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
