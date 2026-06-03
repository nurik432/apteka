import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, ClipboardList, Trash2 } from 'lucide-react';

interface Order {
  id: number;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  status: string;
  totalAmount: number;
  createdAt: string;
  _count?: { items: number };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCreateDraft = async () => {
    try {
      const res = await api.post('/orders', {});
      navigate(`/orders/${res.data.id}`);
    } catch (error: any) {
      alert('Ошибка при создании заказа');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Удалить этот черновик заказа?')) return;
    try {
      await api.delete(`/orders/${id}`);
      loadOrders();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка при удалении');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">Черновик</span>;
      case 'COMPLETED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">Оприходован</span>;
      case 'CANCELLED': return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Отменен</span>;
      default: return <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toString().includes(search) || 
    (o.supplier?.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Заказы поставщикам
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Создание заказов и оприходование товаров</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateDraft}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            Создать заказ
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по номеру заказа или поставщику..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl text-sm transition-all duration-200"
            style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
          />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">№ Заказа</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Дата</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Поставщик</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Позиций</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Сумма</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Статус</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Загрузка...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Заказы не найдены</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="table-row-hover cursor-pointer"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td className="px-4 py-3 font-medium">#{order.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">{order.supplier?.name || 'Не выбран'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order._count?.items || 0}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {order.status !== 'COMPLETED' && (
                        <button
                          onClick={(e) => handleDelete(e, order.id)}
                          className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Удалить черновик"
                        >
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
  );
}
