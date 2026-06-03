import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ClipboardCheck, Save, AlertTriangle } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  stock: number;
  category?: { name: string };
}

interface InventoryItem {
  productId: number;
  name: string;
  category: string;
  systemStock: number;
  actualStock: number;
  diff: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await api.get('/products?limit=1000');
      const prods: Product[] = res.data.data;
      setProducts(prods);
      setItems(prods.map(p => ({
        productId: p.id,
        name: p.name,
        category: p.category?.name || '—',
        systemStock: p.stock,
        actualStock: p.stock,
        diff: 0,
      })));
    } catch { }
    setLoading(false);
  };

  const updateActualStock = (productId: number, value: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      return { ...item, actualStock: value, diff: value - item.systemStock };
    }));
  };

  const handleSave = async () => {
    const changedItems = items.filter(i => i.diff !== 0);
    if (changedItems.length === 0) {
      alert('Нет изменений');
      return;
    }

    if (!confirm(`Применить результаты инвентаризации? Изменения в ${changedItems.length} позициях.`)) return;

    setSaving(true);
    try {
      await api.post('/warehouse/inventory', {
        items: changedItems.map(i => ({
          productId: i.productId,
          actualStock: i.actualStock,
        })),
      });
      setCompleted(true);
      alert('Инвентаризация проведена успешно');
      loadProducts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка');
    }
    setSaving(false);
  };

  const changedCount = items.filter(i => i.diff !== 0).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Инвентаризация</h1>
          <p className="text-muted-foreground text-sm mt-1">Сверка фактических остатков</p>
        </div>
        <div className="flex items-center gap-3">
          {changedCount > 0 && (
            <span className="text-sm text-warning flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {changedCount} изменений
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || changedCount === 0}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Применить
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Товар</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Категория</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Учётный</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Фактический</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground whitespace-nowrap">Разница</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.productId} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3 font-medium min-w-[200px] whitespace-normal break-words">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.category}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">{item.systemStock}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={item.actualStock}
                      onChange={(e) => updateActualStock(item.productId, parseInt(e.target.value) || 0)}
                      className="w-20 h-8 px-2 rounded-lg text-sm text-center"
                      style={{
                        background: 'var(--color-muted)',
                        color: 'var(--color-foreground)',
                        border: '1px solid var(--color-border)',
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.diff !== 0 && (
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.diff > 0 ? 'status-green' : 'status-red'
                      }`}>
                        {item.diff > 0 ? '+' : ''}{item.diff}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
