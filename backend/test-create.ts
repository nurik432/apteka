import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const p1 = await prisma.product.create({
      data: {
        name: 'Test 1',
        barcode: null,
        sku: null
      }
    });
    console.log('p1:', p1.id);
    
    const p2 = await prisma.product.create({
      data: {
        name: 'Test 2',
        barcode: null,
        sku: null
      }
    });
    console.log('p2:', p2.id);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
