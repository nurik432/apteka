import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import multer from 'multer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';

const router = Router();
const uploadImport = multer({ dest: path.join(__dirname, '../../uploads/temp') });

// POST /api/import/products — импорт товаров из XLSX
router.post('/products', authMiddleware, uploadImport.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Загрузите файл' });
      return;
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    let products: any[] = [];

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet) {
        res.status(400).json({ error: 'Файл не содержит данных' });
        return;
      }

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').toLowerCase().trim();
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const product: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            product[header] = cell.value;
          }
        });

        if (product['наименование'] || product['name']) {
          products.push({
            name: product['наименование'] || product['name'] || '',
            manufacturer: product['производитель'] || product['manufacturer'] || null,
            country: product['страна'] || product['country'] || null,
            form: product['форма'] || product['form'] || null,
            dosage: product['дозировка'] || product['dosage'] || null,
            barcode: product['штрихкод'] || product['barcode'] ? String(product['штрихкод'] || product['barcode']) : null,
            sku: product['артикул'] || product['sku'] ? String(product['артикул'] || product['sku']) : null,
            purchasePrice: parseFloat(product['закупочная цена'] || product['purchasePrice'] || product['purchase_price']) || 0,
            sellingPrice: parseFloat(product['цена продажи'] || product['sellingPrice'] || product['selling_price']) || 0,
            stock: parseInt(product['остаток'] || product['stock']) || 0,
            minStock: parseInt(product['мин. остаток'] || product['minStock'] || product['min_stock']) || 0,
          });
        }
      });
    } else if (ext === '.csv') {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const lines = csvContent.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const product: any = {};
        headers.forEach((header, idx) => {
          product[header] = values[idx] || '';
        });

        if (product['наименование'] || product['name']) {
          products.push({
            name: product['наименование'] || product['name'] || '',
            manufacturer: product['производитель'] || product['manufacturer'] || null,
            barcode: product['штрихкод'] || product['barcode'] || null,
            purchasePrice: parseFloat(product['закупочная цена'] || product['purchaseprice']) || 0,
            sellingPrice: parseFloat(product['цена продажи'] || product['sellingprice']) || 0,
            stock: parseInt(product['остаток'] || product['stock']) || 0,
          });
        }
      }
    } else {
      res.status(400).json({ error: 'Поддерживаемые форматы: XLSX, CSV' });
      return;
    }

    // Cleanup temp file
    fs.unlinkSync(filePath);

    // Импортируем товары
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        await prisma.product.create({ data: product });
        imported++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          skipped++;
        } else {
          errors.push(`${product.name}: ${error.message}`);
        }
      }
    }

    res.json({
      message: 'Импорт завершён',
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Ошибка при импорте' });
  }
});

// GET /api/export/products — экспорт товаров в XLSX
router.get('/products', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, manufacturer: true },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Товары');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'Наименование', key: 'name', width: 30 },
      { header: 'Категория', key: 'category', width: 20 },
      { header: 'Производитель', key: 'manufacturer', width: 20 },
      { header: 'Страна', key: 'country', width: 15 },
      { header: 'Форма', key: 'form', width: 15 },
      { header: 'Дозировка', key: 'dosage', width: 12 },
      { header: 'Штрихкод', key: 'barcode', width: 15 },
      { header: 'Артикул', key: 'sku', width: 12 },
      { header: 'Закупочная цена', key: 'purchasePrice', width: 15 },
      { header: 'Цена продажи', key: 'sellingPrice', width: 15 },
      { header: 'Остаток', key: 'stock', width: 10 },
      { header: 'Мин. остаток', key: 'minStock', width: 12 },
      { header: 'Срок годности', key: 'expiryDate', width: 15 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    for (const product of products) {
      worksheet.addRow({
        id: product.id,
        name: product.name,
        category: product.category?.name || '',
        manufacturer: product.manufacturer?.name || '',
        country: product.country || '',
        form: product.form || '',
        dosage: product.dosage || '',
        barcode: product.barcode || '',
        sku: product.sku || '',
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        stock: product.stock,
        minStock: product.minStock,
        expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({ error: 'Ошибка при экспорте' });
  }
});

// GET /api/export/sales — экспорт продаж в XLSX
router.get('/sales', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true } } } },
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Продажи');

    worksheet.columns = [
      { header: '№ Чека', key: 'id', width: 10 },
      { header: 'Дата', key: 'date', width: 20 },
      { header: 'Кассир', key: 'cashier', width: 20 },
      { header: 'Сумма', key: 'totalAmount', width: 15 },
      { header: 'Скидка', key: 'discount', width: 12 },
      { header: 'Итого', key: 'finalAmount', width: 15 },
      { header: 'Оплата', key: 'paymentType', width: 12 },
      { header: 'Товары', key: 'items', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    for (const sale of sales) {
      worksheet.addRow({
        id: sale.id,
        date: sale.createdAt.toLocaleString('ru-RU'),
        cashier: sale.user.fullName,
        totalAmount: sale.totalAmount,
        discount: sale.discount,
        finalAmount: sale.finalAmount,
        paymentType: sale.paymentType === 'cash' ? 'Наличные' : 'Карта',
        items: sale.items.map(i => `${i.customName || i.product?.name || 'Неизвестный товар'} x${i.quantity}`).join(', '),
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export sales error:', error);
    res.status(500).json({ error: 'Ошибка при экспорте' });
  }
});

// GET /api/export/report-pdf — экспорт отчёта в PDF
router.get('/report-pdf', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'month';
    let startDate = new Date();
    
    switch (period) {
      case 'day': startDate.setHours(0, 0, 0, 0); break;
      case 'week': startDate.setDate(startDate.getDate() - 7); break;
      case 'month': startDate.setMonth(startDate.getMonth() - 1); break;
    }

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
      include: { items: true },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalCost = sales.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, item) => itemSum + (item.purchasePrice * item.quantity), 0), 0
    );
    const totalProfit = totalRevenue - totalCost;

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${period}.pdf`);

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('Отчёт по продажам', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Период: ${period === 'day' ? 'День' : period === 'week' ? 'Неделя' : 'Месяц'}`);
    doc.text(`Дата формирования: ${new Date().toLocaleString('ru-RU')}`);
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Сводка', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Количество чеков: ${sales.length}`);
    doc.text(`Выручка: ${totalRevenue.toFixed(2)} ₸`);
    doc.text(`Себестоимость: ${totalCost.toFixed(2)} ₸`);
    doc.text(`Прибыль: ${totalProfit.toFixed(2)} ₸`);
    doc.text(`Средний чек: ${sales.length > 0 ? (totalRevenue / sales.length).toFixed(2) : 0} ₸`);

    doc.end();
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ error: 'Ошибка при экспорте PDF' });
  }
});

export default router;

