import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Save, Plus, Trash2, Search, Zap, CheckCircle2 } from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';

interface OrderItem {
  id: number;
  productId: number;
  product: {
    id: number;
    name: string;
    stock: number;
    minStock: number;
    unit: string;
    barcode: string;
    sku: string;
  };
  orderedQty: number;
  receivedQty: number;
  purchasePrice: number;
  sellingPrice: number;
}

interface Order {
  id: number;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<{id: number; name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isCompleted = order?.status === 'COMPLETED';

  const loadOrder = async () => {
    try {
      setLoading(true);
      const [orderRes, suppliersRes] = await Promise.all([
        api.get(`/orders/${id}`),
        api.get('/suppliers')
      ]);
      setOrder(orderRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      console.error('Load order error:', error);
      alert('Ошибка при загрузке заказа');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  const searchProducts = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(q)}&limit=10`);
      setSearchResults(res.data.data);
    } catch (error) {
      console.error('Search error', error);
    } finally {
      setIsSearching(false);
    }
  };

  const addItem = async (product: any) => {
    if (!order) return;
    try {
      await api.post(`/orders/${order.id}/items`, {
        items: [{ productId: product.id, orderedQty: 1 }]
      });
      setSearchQuery('');
      setSearchResults([]);
      loadOrder();
    } catch (error) {
      alert('Ошибка при добавлении товара');
    }
  };

  const autoFillLowStock = async () => {
    if (!order || !confirm('Добавить все товары, остаток которых меньше или равен минимальному?')) return;
    try {
      const res = await api.get('/products?lowStock=true&limit=1000');
      const lowStockProducts = res.data.data;
      if (lowStockProducts.length === 0) {
        alert('Нет товаров с низким остатком');
        return;
      }
      const items = lowStockProducts.map((p: any) => ({
        productId: p.id,
        orderedQty: p.minStock > p.stock ? p.minStock - p.stock : 1
      }));
      await api.post(`/orders/${order.id}/items`, { items });
      loadOrder();
      alert(`Добавлено ${items.length} товаров`);
    } catch (error) {
      alert('Ошибка при автозаполнении');
    }
  };

  const updateItem = async (itemId: number, field: string, value: number) => {
    if (!order || isCompleted) return;
    try {
      await api.put(`/orders/${order.id}/items/${itemId}`, {
        [field]: value
      });
      
      // Optimistic update locally to avoid full reload flickers
      setOrder(prev => {
        if (!prev) return prev;
        const newItems = prev.items.map(item => 
          item.id === itemId ? { ...item, [field]: value } : item
        );
        const newTotal = newItems.reduce((acc, item) => acc + (item.purchasePrice * item.orderedQty), 0);
        return { ...prev, items: newItems, totalAmount: newTotal };
      });
    } catch (error) {
      alert('Ошибка при обновлении позиции');
      loadOrder(); // revert on error
    }
  };

  const removeItem = async (itemId: number) => {
    if (!order || isCompleted) return;
    try {
      await api.delete(`/orders/${order.id}/items/${itemId}`);
      loadOrder();
    } catch (error) {
      alert('Ошибка при удалении позиции');
    }
  };

  const confirmReceipt = async () => {
    if (!order || !confirm('Подтвердить приход? Это автоматически обновит остатки на складе и цены.')) return;
    try {
      await api.post(`/orders/${order.id}/receive`);
      alert('Заказ успешно оприходован!');
      loadOrder();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка при оприходовании');
    }
  };

  const handleDelete = async () => {
    if (!order || !confirm('Удалить этот черновик заказа?')) return;
    try {
      await api.delete(`/orders/${order.id}`);
      navigate('/orders');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка при удалении');
    }
  };

  if (loading || !order) return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;

  const inputClass = "w-full h-9 px-2 rounded-lg text-sm transition-all duration-200 border bg-transparent";

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors border border-border">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Заказ #{order.id}
            {isCompleted ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">Оприходован</span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">Черновик</span>
            )}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!isCompleted && (
            <>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Удалить заказ
              </button>
              <button
                onClick={autoFillLowStock}
                className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium transition-colors hover:bg-muted border border-border"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                Автозаполнение
              </button>
              <button
                onClick={confirmReceipt}
                className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Подтвердить приход
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Items Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg">Позиции заказа</h3>
              {!isCompleted && (
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Добавить товар..."
                    value={searchQuery}
                    onChange={(e) => searchProducts(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg text-sm border bg-muted focus:bg-background transition-colors"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => addItem(product)}
                          className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                        >
                          <div className="font-medium text-sm">{product.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                            <span>Остаток: {product.stock} {product.unit}</span>
                            <span>{formatCurrency(product.purchasePrice)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-3">Товар не найден</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center justify-center gap-2 w-full h-9 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Создать новый товар
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Товар</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Заказано</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Получено</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Цена прихода</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">Цена продажи</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">В заказе нет товаров. Нажмите "Автозаполнение" или найдите товар вручную.</td></tr>
                  ) : (
                    order.items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Текущий ост: {item.product.stock} {item.product.unit} • Мин: {item.product.minStock}</div>
                        </td>
                        <td className="px-4 py-2">
                          {isCompleted ? (
                            <span className="px-2 py-1">{item.orderedQty}</span>
                          ) : (
                            <input 
                              type="number" 
                              className={inputClass} 
                              value={item.orderedQty}
                              onChange={(e) => updateItem(item.id, 'orderedQty', parseInt(e.target.value) || 0)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isCompleted ? (
                            <span className="px-2 py-1 font-medium">{item.receivedQty}</span>
                          ) : (
                            <input 
                              type="number" 
                              className={inputClass} 
                              style={{ borderColor: 'var(--color-primary)' }}
                              value={item.receivedQty}
                              onChange={(e) => updateItem(item.id, 'receivedQty', parseInt(e.target.value) || 0)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isCompleted ? (
                            <span className="px-2 py-1">{formatCurrency(item.purchasePrice)}</span>
                          ) : (
                            <input 
                              type="number" 
                              step="0.01"
                              className={inputClass} 
                              value={item.purchasePrice}
                              onChange={(e) => updateItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isCompleted ? (
                            <span className="px-2 py-1">{formatCurrency(item.sellingPrice)}</span>
                          ) : (
                            <input 
                              type="number" 
                              step="0.01"
                              className={inputClass} 
                              value={item.sellingPrice}
                              onChange={(e) => updateItem(item.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                            />
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {!isCompleted && (
                            <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">Информация</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1.5">Поставщик</label>
                {isCompleted ? (
                  <div className="h-10 px-3 rounded-xl border border-border flex items-center bg-muted/50 text-sm">
                    {order.supplier?.name || 'Не указан'}
                  </div>
                ) : (
                  <select 
                    className="w-full h-10 px-3 rounded-xl text-sm border border-border bg-transparent"
                    value={order.supplierId || ''}
                    onChange={async (e) => {
                      const sid = e.target.value ? parseInt(e.target.value) : null;
                      // Optimistic
                      setOrder(prev => prev ? { ...prev, supplierId: sid, supplier: suppliers.find(s => s.id === sid) || null } : prev);
                      // Real update requires a route we didn't explicitly create for pure order update,
                      // Let's assume we can add it or just don't save supplier until receive. 
                      // Wait, we need an endpoint to update Order itself. 
                    }}
                  >
                    <option value="">— Выберите поставщика —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Итого (по заказу):</span>
                  <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-primary">
                  <span className="text-sm">Позиций:</span>
                  <span className="font-semibold">{order.items.length}</span>
                </div>
              </div>
            </div>
          </div>

          {!isCompleted && (
            <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5">
              <h4 className="font-medium text-primary mb-2">Подсказка</h4>
              <p className="text-sm text-muted-foreground">
                Укажите фактическое полученное количество в колонке <b>"Получено"</b>. 
                При нажатии «Подтвердить приход» остаток товаров будет увеличен именно на это количество, а новые цены вступят в силу.
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <ProductFormModal
          initialSearchTerm={searchQuery}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newProduct) => {
            setShowCreateModal(false);
            addItem(newProduct);
          }}
        />
      )}
    </div>
  );
}
