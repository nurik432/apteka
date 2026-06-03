import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начало заполнения базы данных...');

  // Создание администратора
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Администратор',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`✅ Создан администратор: ${admin.username}`);

  // Создание категорий лекарств
  const categories = [
    'Обезболивающие',
    'Антибиотики',
    'Витамины',
    'Противовирусные',
    'Антигистаминные',
    'Сердечно-сосудистые',
    'Желудочно-кишечные',
    'Дерматологические',
    'Офтальмологические',
    'Гормональные',
    'Противогрибковые',
    'Седативные',
    'БАДы',
    'Медицинские изделия',
    'Гигиена',
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Создано ${categories.length} категорий`);

  console.log('🎉 База данных успешно заполнена!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
