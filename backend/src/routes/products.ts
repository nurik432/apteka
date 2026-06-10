import { Router, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import multer from 'multer';
import path from 'path';

const router = Router();

// Настройка загрузки изображений
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/products — список с поиском, фильтрацией, пагинацией
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const manufacturerId = req.query.manufacturerId ? parseInt(req.query.manufacturerId as string) : undefined;
    const form = req.query.form as string;
    const sortBy = (req.query.sortBy as string) || 'name';
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    const expiringOnly = req.query.expiring === 'true';
    const lowStockOnly = req.query.lowStock === 'true';

    const where: any = {
      name: { not: 'Свободная цена' }
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
        { sku: { contains: search } },
        { manufacturer: { contains: search } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (manufacturerId) where.manufacturerId = manufacturerId;
    if (form) where.form = form;

    if (expiringOnly) {
      const ninetyDays = new Date();
      ninetyDays.setDate(ninetyDays.getDate() + 90);
      where.expiryDate = { lte: ninetyDays };
    }

    if (lowStockOnly) {
      where.AND = [
        ...(where.AND || []),
        {
          stock: { lte: prisma.product.fields?.minStock || 0 }
        }
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, manufacturer: true },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Filter low stock in application code since Prisma SQLite doesn't support field comparison
    let filteredProducts = products;
    if (lowStockOnly) {
      filteredProducts = products.filter(p => p.stock <= p.minStock);
    }

    res.json({
      data: filteredProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/products/expiring — товары с истекающим сроком
router.get('/expiring', authMiddleware, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    const products = await prisma.product.findMany({
      where: {
        expiryDate: { not: null },
      },
      include: { category: true, manufacturer: true },
      orderBy: { expiryDate: 'asc' },
    });

    const expired = products.filter(p => p.expiryDate && p.expiryDate < now);
    const critical = products.filter(p => p.expiryDate && p.expiryDate >= now && p.expiryDate <= thirtyDays);
    const warning = products.filter(p => p.expiryDate && p.expiryDate > thirtyDays && p.expiryDate <= ninetyDays);

    res.json({ expired, critical, warning });
  } catch (error) {
    console.error('Get expiring products error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/products/barcode/:barcode — поиск по штрихкоду
router.get('/barcode/:barcode', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: (req.params.barcode as string) },
      include: { category: true, manufacturer: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Товар не найден' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/products/:id
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, manufacturer: true, movements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });

    if (!product) {
      res.status(404).json({ error: 'Товар не найден' });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/products
router.post('/', authMiddleware, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name, categoryId, manufacturerId, country, form, dosage,
      barcode, sku, purchasePrice, sellingPrice, stock,
      minStock, unit, expiryDate, receivedDate, piecesPerPack,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Введите наименование товара' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: name?.trim(),
        categoryId: categoryId ? parseInt(categoryId) : null,
        manufacturerId: manufacturerId ? parseInt(manufacturerId) : null,
        country: country?.trim() || null,
        form: form?.trim() || null,
        dosage: dosage?.trim() || null,
        barcode: barcode?.trim() || null,
        sku: sku?.trim() || null,
        purchasePrice: parseFloat(purchasePrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        stock: parseInt(stock) || 0,
        minStock: parseInt(minStock) || 0,
        unit: unit?.trim() || 'шт',
        piecesPerPack: parseInt(piecesPerPack) || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        image: req.file ? `/uploads/${req.file.filename}` : null,
      },
      include: { category: true, manufacturer: true },
    });

    res.status(201).json(product);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Товар с таким штрихкодом или артикулом уже существует' });
      return;
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    const {
      name, categoryId, manufacturerId, country, form, dosage,
      barcode, sku, purchasePrice, sellingPrice, stock,
      minStock, unit, expiryDate, receivedDate, piecesPerPack,
    } = req.body;

    const data: any = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Наименование товара не может быть пустым' });
        return;
      }
      data.name = name.trim();
    }
    if (categoryId !== undefined) data.categoryId = categoryId ? parseInt(categoryId) : null;
    if (manufacturerId !== undefined) data.manufacturerId = manufacturerId ? parseInt(manufacturerId) : null;
    if (country !== undefined) data.country = country?.trim() || null;
    if (form !== undefined) data.form = form?.trim() || null;
    if (dosage !== undefined) data.dosage = dosage?.trim() || null;
    if (barcode !== undefined) data.barcode = barcode?.trim() || null;
    if (sku !== undefined) data.sku = sku?.trim() || null;
    if (purchasePrice !== undefined) data.purchasePrice = parseFloat(purchasePrice) || 0;
    if (sellingPrice !== undefined) data.sellingPrice = parseFloat(sellingPrice) || 0;
    if (stock !== undefined) data.stock = parseInt(stock) || 0;
    if (minStock !== undefined) data.minStock = parseInt(minStock) || 0;
    if (unit !== undefined) data.unit = unit?.trim() || 'шт';
    if (piecesPerPack !== undefined) data.piecesPerPack = parseInt(piecesPerPack) || 0;
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (receivedDate !== undefined) data.receivedDate = receivedDate ? new Date(receivedDate) : null;
    if (req.file) data.image = `/uploads/${req.file.filename}`;

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true, manufacturer: true },
    });

    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Товар с таким штрихкодом или артикулом уже существует' });
      return;
    }
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Товар удалён' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

export default router;


