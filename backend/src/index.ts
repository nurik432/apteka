import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import manufacturerRoutes from './routes/manufacturers';
import productRoutes from './routes/products';
import warehouseRoutes from './routes/warehouse';
import salesRoutes from './routes/sales';
import supplierRoutes from './routes/suppliers';
import reportRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import importExportRoutes from './routes/import-export';
import ordersRoutes from './routes/orders';


const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const tempDir = path.join(uploadsDir, 'temp');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importExportRoutes);
app.use('/api/export', importExportRoutes);
app.use('/api/orders', ordersRoutes);


// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Serve frontend if public directory exists
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(publicDir, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🏥 Сервер аптеки запущен на http://localhost:${PORT}`);
  console.log(`📋 API доступен по адресу http://localhost:${PORT}/api`);
});

export default app;
