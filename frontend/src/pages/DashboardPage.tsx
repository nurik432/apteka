import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/access';
import { formatCurrency, notifyError, getExpiryStatus, getExpiryBadgeClass, getExpiryLabel } from '@/lib/utils';
import { ShoppingCart, CheckCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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

interface AttentionItem {
  key: string;
  name: string;
  note: string;
  badgeClass: string;
  badge: string;
}

const MAX_ATTENTION = 6;

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '12px',
};
const axisTick = { fontSize: 11, fill: 'var(--color-muted-foreground)' };
const formatMonth = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', { month: '2-digit', year: 'numeric' });

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [stockByCategory, setStockByCategory] = useState<any[]>([]);
  const [attention, setAttention] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashRes, dayRes, monthRes, topRes, stockRes, expiryRes, lowRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/sales-by-day'),
        api.get('/analytics/sales-by-month'),
        api.get('/analytics/top-products'),
        api.get('/analytics/stock-by-category'),
        api.get('/products/expiring'),
        api.get('/products?lowStock=true&limit=20&sortBy=stock&sortOrder=asc'),
      ]);
      setData(dashRes.data);
      setSalesByDay(dayRes.data);
      setSalesByMonth(monthRes.data);
      setTopProducts(topRes.data);
      setStockByCategory(stockRes.data);

      // Сначала просроченные и истекающие, затем товары с низким остатком
      const expiring: AttentionItem[] = [...expiryRes.data.expired, ...expiryRes.data.critical, ...expiryRes.data.warning]
        .map((p: any) => {
          const status = getExpiryStatus(p.expiryDate);
          return {
            key: `exp-${p.id}`,
            name: p.name,
            note: `Срок до ${formatMonth(p.expiryDate)}`,
            badgeClass: getExpiryBadgeClass(status),
            badge: getExpiryLabel(status),
          };
        });
      const low: AttentionItem[] = lowRes.data.data
        .filter((p: any) => p.minStock > 0)
        .map((p: any) => ({
          key: `low-${p.id}`,
          name: p.name,
          note: p.stock <= 0 ? 'Нет в наличии' : `Осталось ${p.stock}, минимум ${p.minStock}`,
          badgeClass: p.stock <= 0 ? 'status-red' : 'status-yellow',
          badge: p.stock <= 0 ? 'Закончился' : 'Мало',
        }));
      setAttention([...expiring, ...low]);
    } catch (error) {
      console.error('Dashboard load error:', error);
      notifyError(error, 'Не удалось загрузить данные главной страницы');
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

  const avgCheck = data?.todayChecks ? data.todayRevenue / data.todayChecks : 0;
  // Сравнение со вчера: последняя точка графика — сегодня, предпоследняя — вчера
  const yesterday = salesByDay.length >= 2 ? salesByDay[salesByDay.length - 2].revenue : 0;
  const todayRevenue = data?.todayRevenue || 0;
  const vsYesterday = yesterday > 0 ? Math.round(((todayRevenue - yesterday) / yesterday) * 100) : null;
  const kpis: { label: string; value: string; note: string; tone?: string }[] = [
    {
      label: 'Продажи сегодня',
      value: formatCurrency(todayRevenue),
      note: vsYesterday === null ? 'Вчера продаж не было' : `${vsYesterday >= 0 ? '+' : '−'}${Math.abs(vsYesterday)} % ко вчера`,
      tone: vsYesterday === null ? undefined : vsYesterday >= 0 ? 'text-success' : 'text-destructive',
    },
    { label: 'Чеков сегодня', value: String(data?.todayChecks || 0), note: `Средний чек ${formatCurrency(avgCheck)}` },
    { label: 'Продажи за месяц', value: formatCurrency(data?.monthRevenue || 0), note: `Прибыль ${formatCurrency(data?.monthProfit || 0)}` },
    { label: 'Наименований', value: String(data?.totalProducts || 0), note: `Мало: ${data?.lowStockCount || 0} · просрочено: ${data?.expiredCount || 0}` },
  ];
  const maxStock = Math.max(1, ...stockByCategory.map(c => c.totalItems));
  const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-[22px] font-bold leading-tight">Главная</h1>
          <p className="text-muted-foreground text-[13px] first-letter:uppercase">{today}</p>
        </div>
        {canAccess(user?.role, 'pos') && (
          <Link to="/pos" className="btn btn-primary">
            <ShoppingCart className="w-4 h-4" />
            Открыть кассу
          </Link>
        )}
      </div>

      {/* Показатели */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-xl bg-card border px-4 py-3.5">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold num tracking-tight">{kpi.value}</p>
            <p className={`text-xs num ${kpi.tone || 'text-muted-foreground'}`}>{kpi.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3">
        {/* Продажи по дням */}
        <div className="rounded-xl bg-card border p-4">
          <h3 className="text-sm font-semibold mb-3">Продажи за 30 дней</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={axisTick} tickFormatter={(v) => v.split('-').reverse().slice(0, 2).join('.')} minTickGap={16} />
                <YAxis tick={axisTick} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--color-muted)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Выручка']}
                  labelFormatter={(label) => String(label).split('-').reverse().join('.')}
                />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Требует внимания */}
        <div className="rounded-xl bg-card border flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold">Требует внимания</h3>
            {attention.length > 0 && <span className="badge badge-neutral num">{attention.length}</span>}
          </div>
          {attention.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle className="w-8 h-8 text-success" />
              <p className="text-sm text-muted-foreground">Остатки и сроки годности в норме</p>
            </div>
          ) : (
            <>
              <ul>
                {attention.slice(0, MAX_ATTENTION).map(item => (
                  <li key={item.key} className="flex items-center gap-3 px-4 py-2 border-t">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground num">{item.note}</p>
                    </div>
                    <span className={`badge ${item.badgeClass}`}>{item.badge}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex gap-4 px-4 py-3 border-t text-[13px] font-medium">
                <Link to="/expiry" className="text-primary-text hover:underline">Сроки годности</Link>
                <Link to="/products" className="text-primary-text hover:underline">Все товары</Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Продажи по месяцам */}
        <div className="rounded-xl bg-card border p-4">
          <h3 className="text-sm font-semibold mb-3">Продажи по месяцам</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={axisTick} tickFormatter={(v) => v.split('-')[1]} />
                <YAxis tick={axisTick} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--color-muted)' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Выручка' : 'Прибыль']}
                />
                <Bar dataKey="revenue" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="profit" fill="var(--color-info)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />Выручка</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-info" />Прибыль</span>
          </p>
        </div>

        {/* Топ товаров */}
        <div className="rounded-xl bg-card border p-4">
          <h3 className="text-sm font-semibold mb-3">Топ-10 товаров за месяц</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Продаж за месяц пока нет</p>
          ) : (
            <ol className="space-y-2">
              {topProducts.map((product, i) => (
                <li key={product.productId} className="flex items-center gap-2.5 text-[13px]">
                  <span className="w-5 text-right text-muted-foreground num">{i + 1}.</span>
                  <span className="flex-1 min-w-0 truncate font-medium">{product.name}</span>
                  <span className="text-muted-foreground num">{product.quantity} ед.</span>
                  <span className="font-semibold num w-24 text-right">{formatCurrency(product.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Остатки по категориям */}
        <div className="rounded-xl bg-card border p-4">
          <h3 className="text-sm font-semibold mb-3">Остатки по категориям</h3>
          {stockByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">На складе пока нет товаров</p>
          ) : (
            <ul className="space-y-2.5">
              {stockByCategory.slice(0, 8).map(cat => (
                <li key={cat.name} className="text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">{cat.name}</span>
                    <span className="num text-muted-foreground shrink-0">{cat.totalItems} ед.</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(cat.totalItems / maxStock) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
