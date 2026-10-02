import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDateTime, notifyError } from '@/lib/utils';
import { PackagePlus, PackageMinus, Undo2, History, ChevronLeft, ChevronRight, Search, Plus, X } from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';
import { toast } from 'sonner';

interface Product { id: number; name: string; stock: number; }
interface Supplier { id: number; name: string; }

const typeLabels: Record<string, string> = {
  RECEIPT: 'Приход',
  WRITE_OFF: 'Списание',
  RETURN: 'Возврат',
  SALE: 'Продажа',
  INVENTORY: 'Инвентаризация',
};

const typeColors: Record<string, string> = {
  RECEIPT: 'status-green',
  WRITE_OFF: 'status-red',
  RETURN: 'status-yellow',
  SALE: 'status-red',
  INVENTORY: 'status-yellow',
};

export default function WarehousePage() {
  const [tab, setTab] = useState<'receipt' | 'writeoff' | 'return' | 'history'>('receipt');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  interface ReceiptItem {
    id: string;
    productId: string;
    productName: string;
    quantity: string;
    price: string;
    sellingPrice: string;
  }
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [form, setForm] = useState({ productId: '', quantity: '', price: '', sellingPrice: '', supplierId: '', reason: '' });

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, []);

  const loadProducts = async () => {
    const res = await api.get('/products?limit=1000');
    setProducts(res.data.data);
  };

  const loadSuppliers = async () => {
    const res = await api.get('/suppliers');
    setSuppliers(res.data);
  };

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/warehouse/movements?page=${page}&limit=20`);
      setMovements(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
    } catch (err) { notifyError(err, 'Не удалось загрузить историю движения'); }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    if (tab === 'history') loadMovements();
  }, [tab, loadMovements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'receipt') {
      if (receiptItems.length === 0) {
        toast.error('Добавьте товары для прихода');
        return;
      }
      try {
        await api.post('/warehouse/receipt', {
          supplierId: form.supplierId,
          reason: form.reason,
          items: receiptItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            sellingPrice: i.sellingPrice
          }))
        });
        toast.success('Приход успешно оформлен');
        setReceiptItems([]);
        setForm({ ...form, supplierId: '', reason: '' });
        loadProducts();
      } catch (error: any) {
        notifyError(error, 'Ошибка');
      }
      return;
    }

    const endpoint = tab === 'writeoff' ? '/warehouse/write-off' : '/warehouse/return';
    try {
      await api.post(endpoint, form);
      toast.success('Операция выполнена');
      setForm({ productId: '', quantity: '', price: '', sellingPrice: '', supplierId: '', reason: '' });
      loadProducts();
    } catch (error: any) {
      notifyError(error, 'Ошибка');
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!searchTerm) return;
      const term = searchTerm.toLowerCase();
      const found = products.find(p => 
        (p as any).barcode === searchTerm || 
        p.name.toLowerCase() === term || 
        (p as any).sku === searchTerm
      );
      
      if (found) {
        if (tab === 'receipt') {
          const existing = receiptItems.find(i => i.productId === String(found.id));
          if (existing) {
            setReceiptItems(prev => prev.map(i => i.id === existing.id ? { ...i, quantity: String(parseInt(i.quantity) + 1) } : i));
          } else {
            setReceiptItems(prev => [...prev, {
              id: Date.now().toString(),
              productId: String(found.id),
              productName: found.name,
              quantity: '1',
              price: String((found as any).purchasePrice || ''),
              sellingPrice: String((found as any).sellingPrice || '')
            }]);
          }
        } else {
          setForm({ ...form, productId: String(found.id) });
        }
        setSearchTerm('');
      } else {
        setShowCreateModal(true);
      }
    }
  };

  const tabs = [
    { key: 'receipt' as const, label: 'Приход', icon: PackagePlus },
    { key: 'writeoff' as const, label: 'Списание', icon: PackageMinus },
    { key: 'return' as const, label: 'Возврат', icon: Undo2 },
    { key: 'history' as const, label: 'История', icon: History },
  ];

  const receiptUnits = receiptItems.reduce((sum, i) => sum + (parseFloat(String(i.quantity)) || 0), 0);
  const receiptTotal = receiptItems.reduce((sum, i) => sum + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.price)) || 0), 0);

  const inputClass = "w-full h-10 px-3 rounded-lg text-sm";
  const inputStyle = { background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border-strong)' };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold leading-tight">Склад</h1>
        <p className="text-muted-foreground text-[13px]">Управление движением товаров</p>
      </div>

      {/* Tabs */}
      <div className="seg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className="flex items-center gap-2"
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Forms */}
      {tab !== 'history' && (
        <div className={`rounded-xl p-6 ${tab === 'receipt' ? 'max-w-full lg:max-w-4xl' : 'max-w-lg'}`} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold mb-4">
            {tab === 'receipt' ? 'Приход товара (Накладная)' : tab === 'writeoff' ? 'Списание товара' : 'Возврат товара'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 mb-2 rounded-xl border border-primary/20 bg-primary/5">
              <label className="text-sm font-medium flex items-center gap-2 mb-2 text-primary">
                <Search className="w-4 h-4" /> Сканер / Поиск товара
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  style={{...inputStyle, borderColor: 'var(--color-primary)'}}
                  placeholder="Штрихкод или точное название (Enter)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shrink-0"
                  title="Создать новый товар"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Отсканируйте штрихкод или введите название и нажмите Enter. Если товара нет, будет предложено его создать.
              </p>
            </div>

            {tab === 'receipt' ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted text-muted-foreground text-left">
                        <th className="px-4 py-3 font-medium">Товар</th>
                        <th className="px-4 py-3 font-medium w-24">Количество</th>
                        <th className="px-4 py-3 font-medium w-32">Цена закупки</th>
                        <th className="px-4 py-3 font-medium w-32">Цена продажи</th>
                        <th className="px-4 py-3 font-medium w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptItems.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Добавьте товары для прихода</td></tr>
                      ) : (
                        receiptItems.map(item => (
                          <tr key={item.id} className="border-t border-border">
                            <td className="px-4 py-2 font-medium">{item.productName}</td>
                            <td className="px-4 py-2">
                              <input type="number" min="1" className={`${inputClass} w-full`} style={inputStyle} value={item.quantity} onChange={e => setReceiptItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: e.target.value } : i))} required />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" step="0.01" min="0" className={`${inputClass} w-full`} style={inputStyle} value={item.price} onChange={e => setReceiptItems(prev => prev.map(i => i.id === item.id ? { ...i, price: e.target.value } : i))} />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" step="0.01" min="0" className={`${inputClass} w-full`} style={inputStyle} value={item.sellingPrice} onChange={e => setReceiptItems(prev => prev.map(i => i.id === item.id ? { ...i, sellingPrice: e.target.value } : i))} />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button type="button" onClick={() => setReceiptItems(prev => prev.filter(i => i.id !== item.id))} className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive-soft" aria-label="Убрать строку">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Поставщик</label>
                    <select className={inputClass} style={inputStyle} value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
                      <option value="">— Не указан —</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Причина / комментарий</label>
                    <input className={inputClass} style={inputStyle} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground num">Позиций: {receiptItems.length} · единиц: {receiptUnits}</span>
                  <span className="ml-auto text-[13px] text-muted-foreground">Итого по накладной</span>
                  <b className="text-[22px] num">{formatCurrency(receiptTotal)}</b>
                  <button type="submit" disabled={receiptItems.length === 0} className="btn btn-primary btn-lg">
                    Оформить приход
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Или выберите товар из списка *</label>
                  <select className={inputClass} style={inputStyle} value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} required>
                    <option value="">— Выберите товар —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (остаток: {p.stock})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Количество *</label>
                  <input type="number" min="1" className={inputClass} style={inputStyle} value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Причина / комментарий</label>
                  <input className={inputClass} style={inputStyle} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
                </div>
                <button type="submit" className="px-6 h-10 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover transition-colors">
                  Выполнить
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Тип</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Товар</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Количество</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Поставщик</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Причина</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-5"><div className="space-y-3"><div className="skeleton w-2/3" /><div className="skeleton w-full" /><div className="skeleton w-4/5" /></div></td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><b>Движений пока нет</b><p>Здесь появятся приходы, списания, возвраты и продажи.</p></div></td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${typeColors[m.type] || ''}`}>
                        {typeLabels[m.type] || m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium min-w-[150px] whitespace-normal break-words">{m.product?.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.quantity}</td>
                    <td className="px-4 py-3 text-muted-foreground min-w-[120px] whitespace-normal break-words">{m.supplier?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground min-w-[150px] whitespace-normal break-words">{m.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
              <p className="text-sm text-muted-foreground">Страница {page} из {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <ProductFormModal
          initialSearchTerm={searchTerm}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newProduct) => {
            setShowCreateModal(false);
            setSearchTerm('');
            setProducts(prev => [...prev, newProduct]);
            
            if (tab === 'receipt') {
              setReceiptItems(prev => [...prev, {
                id: Date.now().toString(),
                productId: String(newProduct.id),
                productName: newProduct.name,
                quantity: '1',
                price: String((newProduct as any).purchasePrice || ''),
                sellingPrice: String((newProduct as any).sellingPrice || '')
              }]);
            } else {
              setForm(prev => ({ ...prev, productId: String(newProduct.id) }));
            }
          }}
        />
      )}
    </div>
  );
}

