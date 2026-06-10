import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import api from '@/lib/api';

interface Category {
  id: number;
  name: string;
}

interface Manufacturer {
  id: number;
  name: string;
}

interface ProductFormModalProps {
  product?: any | null; // null for new, object for edit
  initialSearchTerm?: string; // Pre-filled name or barcode
  onClose: () => void;
  onSuccess: (product: any) => void;
}

export default function ProductFormModal({ product, initialSearchTerm, onClose, onSuccess }: ProductFormModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);

  // Form state
  const [form, setForm] = useState({
    name: '', categoryId: '', manufacturerId: '', country: '',
    form: '', dosage: '', barcode: '', sku: '',
    purchasePrice: '', sellingPrice: '', stock: '',
    minStock: '', unit: 'шт', expiryDate: '', receivedDate: '',
    piecesPerPack: '',
  });

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [catsRes, mansRes] = await Promise.all([
          api.get('/categories'),
          api.get('/manufacturers')
        ]);
        setCategories(catsRes.data);
        setManufacturers(mansRes.data);
      } catch (error) {
        console.error('Load dependencies error:', error);
      }
    };
    loadDependencies();
  }, []);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        categoryId: String(product.categoryId || ''),
        manufacturerId: String(product.manufacturerId || ''),
        country: product.country || '',
        form: product.form || '',
        dosage: product.dosage || '',
        barcode: product.barcode || '',
        sku: product.sku || '',
        purchasePrice: String(product.purchasePrice || ''),
        sellingPrice: String(product.sellingPrice || ''),
        stock: String(product.stock || ''),
        minStock: String(product.minStock || ''),
        unit: product.unit || 'шт',
        expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
        receivedDate: product.receivedDate ? product.receivedDate.split('T')[0] : '',
        piecesPerPack: String(product.piecesPerPack || ''),
      });
    } else if (initialSearchTerm) {
      // If the search term is entirely digits, it's likely a barcode. Otherwise, a name.
      const isBarcode = /^\d+$/.test(initialSearchTerm);
      setForm(prev => ({
        ...prev,
        name: isBarcode ? '' : initialSearchTerm,
        barcode: isBarcode ? initialSearchTerm : '',
      }));
    }
  }, [product, initialSearchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: form.name,
        categoryId: form.categoryId || null,
        manufacturerId: form.manufacturerId || null,
        country: form.country || null,
        form: form.form || null,
        dosage: form.dosage || null,
        barcode: form.barcode || null,
        sku: form.sku || null,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        stock: parseInt(form.stock) || 0,
        minStock: parseInt(form.minStock) || 0,
        unit: form.unit,
        piecesPerPack: parseInt(form.piecesPerPack) || 0,
        expiryDate: form.expiryDate || null,
        receivedDate: form.receivedDate || null,
      };

      let res;
      if (product) {
        res = await api.put(`/products/${product.id}`, data);
      } else {
        res = await api.post('/products', data);
      }
      onSuccess(res.data);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка при сохранении товара');
    }
  };

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm transition-all duration-200 border border-border bg-muted text-foreground";

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div
        className="w-full max-w-2xl flex flex-col bg-card rounded-2xl animate-scaleIn shadow-xl overflow-hidden border border-border"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 shrink-0 border-b border-border">
          <h2 className="text-lg font-bold">{product ? 'Редактировать товар' : 'Новый товар'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 pt-2 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Наименование *</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium">Категория</label>
                <select className={inputClass} value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}>
                  <option value="">— Выберите —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Производитель</label>
                <select className={inputClass} value={form.manufacturerId} onChange={(e) => setForm({...form, manufacturerId: e.target.value})}>
                  <option value="">— Выберите —</option>
                  {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Страна</label>
                <input list="countries" className={inputClass} value={form.country} onChange={(e) => setForm({...form, country: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Форма выпуска</label>
                <input list="forms" className={inputClass} value={form.form} onChange={(e) => setForm({...form, form: e.target.value})} placeholder="таблетки..." />
              </div>
              <div>
                <label className="text-sm font-medium">Дозировка</label>
                <input className={inputClass} value={form.dosage} onChange={(e) => setForm({...form, dosage: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Штрихкод</label>
                <input className={inputClass} value={form.barcode} onChange={(e) => setForm({...form, barcode: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Артикул</label>
                <input className={inputClass} value={form.sku} onChange={(e) => setForm({...form, sku: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Закупочная цена</label>
                <input type="number" step="0.01" className={inputClass} value={form.purchasePrice} onChange={(e) => setForm({...form, purchasePrice: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Цена продажи</label>
                <input type="number" step="0.01" className={inputClass} value={form.sellingPrice} onChange={(e) => setForm({...form, sellingPrice: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Остаток</label>
                <input type="number" className={inputClass} value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Мин. остаток</label>
                <input type="number" className={inputClass} value={form.minStock} onChange={(e) => setForm({...form, minStock: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Единица измерения</label>
                <select className={inputClass} value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})}>
                  <option value="шт">шт</option>
                  <option value="коробка (кб)">коробка (кб)</option>
                  <option value="кв (камвалют)">кв (камвалют)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Кол-во в упаковке (для поштучной продажи)</label>
                <input type="number" min="0" className={inputClass} value={form.piecesPerPack} onChange={(e) => setForm({...form, piecesPerPack: e.target.value})} placeholder="0 = продажа целиком" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={onClose} className="px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted transition-colors border border-border">
                Отмена
              </button>
              <button type="submit" className="px-6 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all">
                {product ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
