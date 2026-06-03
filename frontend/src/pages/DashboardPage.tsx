import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp, DollarSign, ShoppingCart, Package,
  AlertTriangle, BarChart3, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface DashboardData {
  todayRevenue: number;
  todayProfit: number;
  todayChecks: number;
  monthRevenue: number;
  monthProfit: number;
  monthChecks: number;
  totalProducts: number;
  lowStockCount: number;
  expiredCount: number;
}

const CHART_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockByCategory, setStockByCategory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, dayRes, monthRes, topRes, stockRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/sales-by-day'),
        api.get('/analytics/sales-by-month'),
        api.get('/analytics/top-products'),
        api.get('/analytics/stock-by-category'),
      ]);
      setData(dashRes.data);
      setSalesByDay(dayRes.data);
      setSalesByMonth(monthRes.data);
      setTopProducts(topRes.data);
      setStockByCategory(stockRes.data);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Продажи сегодня',
      value: formatCurrency(data?.todayRevenue || 0),
      icon: DollarSign,
      color: 'from-indigo-500 to-indigo-600',
      shadowColor: 'shadow-indigo-500/20',
    },
    {
      title: 'Прибыль сегодня',
      value: formatCurrency(data?.todayProfit || 0),
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      shadowColor: 'shadow-emerald-500/20',
    },
    {
      title: 'Чеков сегодня',
      value: String(data?.todayChecks || 0),
      icon: ShoppingCart,
      color: 'from-purple-500 to-purple-600',
      shadowColor: 'shadow-purple-500/20',
    },
    {
      title: 'Продажи за месяц',
      value: formatCurrency(data?.monthRevenue || 0),
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/20',
    },
    {
      title: 'Товаров на складе',
      value: String(data?.totalProducts || 0),
      icon: Package,
      color: 'from-amber-500 to-amber-600',
      shadowColor: 'shadow-amber-500/20',
    },
    {
      title: 'Внимание',
      value: `${data?.lowStockCount || 0} мало / ${data?.expiredCount || 0} просрочено`,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      shadowColor: 'shadow-red-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Обзор деятельности аптеки</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`rounded-2xl p-5 card-hover cursor-default animate-fadeIn`}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              animationDelay: `${i * 50}ms`,
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.shadowColor}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Day */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-base font-semibold mb-4">Продажи по дням</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={(v) => v.split('-').slice(1).join('.')}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                  labelFormatter={(label) => `Дата: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Month */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-base font-semibold mb-4">Продажи по месяцам</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-base font-semibold mb-4">Топ-10 товаров (за месяц)</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Нет данных о продажах</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground"> {product.quantity} {product.unit || 'ед.'}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary shrink-0">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock by Category */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <h3 className="text-base font-semibold mb-4">Остатки по категориям</h3>
          {stockByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Нет данных</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockByCategory}
                    dataKey="totalItems"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    strokeWidth={2}
                    stroke="var(--color-card)"
                  >
                    {stockByCategory.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [`${value} ед.`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
