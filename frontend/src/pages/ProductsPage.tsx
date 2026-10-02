import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate, getExpiryStatus, getExpiryBadgeClass, getExpiryLabel, notifyError } from '@/lib/utils';
import {
  Plus, Search, Download, Upload, Edit2, Trash2, X,
  ChevronLeft, ChevronRight, Filter, Package,
} from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
  category?: { id: number; name: string };
  categoryId?: number;
  manufacturer?: { id: number; name: string };
  manufacturerId?: number;
  country?: string;
  form?: string;
  dosage?: string;
  barcode?: string;
  sku?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  expiryDate?: string;
  receivedDate?: string;
  image?: string;
  unit?: string;
}

interface Category {
  id: number;
  name: string;
}

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<{id: number; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'lowStock' | 'expiring'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(stockFilter === 'lowStock' && { lowStock: 'true' }),
        ...(stockFilter === 'expiring' && { expiring: 'true' }),
      });

      const res = await api.get(`/products?${params}`);
      setProducts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch (error) {
      notifyError(error, 'Не удалось загрузить товары');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, stockFilter, sortBy, sortOrder]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const loadManufacturers = async () => {
    try {
      const res = await api.get('/manufacturers');
      setManufacturers(res.data);
    } catch (error) {
      console.error('Load manufacturers error:', error);
    }
  };

  useEffect(() => {
    loadCategories();
    loadManufacturers();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormSuccess = (savedProduct: any) => {
    setShowForm(false);
    loadProducts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить товар?')) return;
    try {
      await api.delete(`/products/${id}`);
      loadProducts();
    } catch (error: any) {
      notifyError(error, 'Ошибка при удалении');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/export/products', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Ошибка при экспорте');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/import/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Импорт завершён: ${res.data.imported} добавлено, ${res.data.skipped} пропущено`);
      loadProducts();
    } catch (error: any) {
      notifyError(error, 'Ошибка при импорте');
    }
    e.target.value = '';
  };

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm transition-all duration-200";
  const inputStyle = {
    background: 'var(--color-card)',
    color: 'var(--color-foreground)',
    border: '1px solid var(--color-border-strong)',
  };
  const hasFilters = !!search || !!categoryFilter || stockFilter !== 'all';
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-tight">Товары</h1>
          <p className="text-muted-foreground text-[13px] num">
            {hasFilters ? `Найдено: ${total}` : `Наименований: ${total}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn btn-secondary cursor-pointer">
            <Upload className="w-4 h-4" />
            Импорт
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="btn btn-secondary">
            <Download className="w-4 h-4" />
            Экспорт
          </button>
          <button onClick={openCreateForm} className="btn btn-primary" id="add-product-btn">
            <Plus className="w-4 h-4" />
            Добавить товар
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по названию, штрихкоду, артикулу..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full h-9 pl-10 pr-4 rounded-lg text-sm"
            style={inputStyle}
            id="product-search"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 rounded-lg text-sm min-w-[180px]"
          style={inputStyle}
        >
          <option value="">Все категории</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <div className="seg self-start">
          {([['all', 'Все'], ['lowStock', 'Мало на складе'], ['expiring', 'Истекает срок']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={stockFilter === key}
              onClick={() => { setStockFilter(key); setPage(1); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                {[
                  { key: 'name', label: 'Наименование' },
                  { key: 'category', label: 'Категория' },
                  { key: 'sellingPrice', label: 'Цена' },
                  { key: 'stock', label: 'Остаток' },
                  { key: 'expiryDate', label: 'Срок годности' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none whitespace-nowrap"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-4"><div className="skeleton" style={{ width: `${50 + (i % 3) * 15}%` }} /></td>
                    <td className="px-4 py-4"><div className="skeleton w-24" /></td>
                    <td className="px-4 py-4"><div className="skeleton w-16" /></td>
                    <td className="px-4 py-4"><div className="skeleton w-14" /></td>
                    <td className="px-4 py-4"><div className="skeleton w-20" /></td>
                    <td className="px-4 py-4" />
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Package />
                      {hasFilters ? (
                        <>
                          <b>Ничего не найдено</b>
                          <p>Измените запрос или сбросьте фильтры.</p>
                          <button
                            type="button"
                            className="btn btn-secondary mt-1"
                            onClick={() => { setSearch(''); setCategoryFilter(''); setStockFilter('all'); setPage(1); }}
                          >
                            Сбросить фильтры
                          </button>
                        </>
                      ) : (
                        <>
                          <b>Товаров пока нет</b>
                          <p>Добавьте первый товар или загрузите список из Excel кнопкой «Импорт».</p>
                          <button type="button" className="btn btn-primary mt-1" onClick={openCreateForm}>
                            <Plus className="w-4 h-4" />
                            Добавить товар
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map(product => {
                  const expiryStatus = getExpiryStatus(product.expiryDate || null);
                  const isLowStock = product.stock <= product.minStock && product.minStock > 0;
                  return (
                    <tr
                      key={product.id}
                      className="table-row-hover"
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                    >
                      <td className="px-4 py-3 min-w-[200px]">
                        <div>
                          <p className="font-medium whitespace-normal break-words">{product.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {product.category?.name}
                            {product.category && product.manufacturer?.name && ' • '}
                            {product.manufacturer?.name && `${product.manufacturer.name}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{product.category?.name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-medium">{formatCurrency(product.sellingPrice)}</p>
                          <p className="text-xs text-muted-foreground">Закуп: {formatCurrency(product.purchasePrice)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${
                          isLowStock ? 'status-red' : 'status-green'
                        }`}>
                          {product.stock} {product.unit || 'шт'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {product.expiryDate ? (
                          <span className={`badge ${getExpiryBadgeClass(expiryStatus)}`}>
                            {formatDate(product.expiryDate)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(product)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive-soft transition-all"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-muted-foreground num" style={{ borderTop: '1px solid var(--color-border)' }}>
            <span className="mr-auto">Показано {firstShown}–{lastShown} из {total}</span>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn btn-secondary h-8">
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn btn-secondary h-8">
              Вперёд
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
