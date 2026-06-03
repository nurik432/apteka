import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316'];

export default function AnalyticsPage() {
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockByCategory, setStockByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dayRes, monthRes, topRes, stockRes] = await Promise.all([
        api.get('/analytics/sales-by-day'),
        api.get('/analytics/sales-by-month'),
        api.get('/analytics/top-products'),
        api.get('/analytics/stock-by-category'),
      ]);
      setSalesByDay(dayRes.data);
      setSalesByMonth(monthRes.data);
      setTopProducts(topRes.data);
      setStockByCategory(stockRes.data);
    } catch { }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div>;
  }

  const chartTooltipStyle = {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Аналитика</h1>
        <p className="text-muted-foreground text-sm mt-1">Детальный анализ показателей</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day - Area */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-base font-semibold mb-4">Продажи по дням (30 дней)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="areaRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => v.split('-').slice(1).join('.')} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name === 'revenue' ? 'Выручка' : 'Прибыль']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#areaRevenue)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#areaProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Month - Bar */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-base font-semibold mb-4">Продажи по месяцам (12 месяцев)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [formatCurrency(v), name === 'revenue' ? 'Выручка' : 'Прибыль']} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend - Line */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-base font-semibold mb-4">Динамика прибыли</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickFormatter={(v) => v.split('-').slice(1).join('.')} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Прибыль']} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock by Category - Pie */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-base font-semibold mb-4">Остатки по категориям</h3>
          {stockByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stockByCategory} dataKey="totalItems" nameKey="name" cx="50%" cy="50%" outerRadius={100} strokeWidth={2} stroke="var(--color-card)">
                    {stockByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [`${v} ед.`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <h3 className="text-base font-semibold mb-4">Топ-10 продаваемых товаров (за месяц)</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Нет данных о продажах</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Товар</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Продано</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2 whitespace-nowrap"><span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold">{i+1}</span></td>
                    <td className="px-4 py-2 font-medium min-w-[200px] whitespace-normal break-words">{p.name}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{p.quantity} {p.unit || 'ед.'}</td>
                    <td className="px-4 py-2 text-right font-semibold text-primary whitespace-nowrap">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
