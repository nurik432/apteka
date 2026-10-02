import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, notifyError } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DayStat {
  date: string;
  revenue: number;
  profit: number;
  checks: number;
}

interface TopProduct {
  productId: number | string;
  name: string;
  quantity: number;
  revenue: number;
}

// YYYY-MM-DD по местному времени — в таком формате работают <input type="date"> и API
const toDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const presets = [
  { label: '7 дней', range: () => [daysAgo(6), new Date()] },
  { label: '30 дней', range: () => [daysAgo(29), new Date()] },
  { label: '90 дней', range: () => [daysAgo(89), new Date()] },
  { label: 'Этот месяц', range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n]; } },
  { label: 'Этот год', range: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n]; } },
].map(p => ({ label: p.label, range: () => p.range().map(toDayKey) as [string, string] }));

// '2026-09-15' → '15.09', '2026-09' → '09.2026'
const formatDay = (key: string) =>
  key.length === 7 ? key.split('-').reverse().join('.') : key.split('-').reverse().slice(0, 2).join('.');

// На длинных периодах дневные столбики становятся тоньше пикселя — показываем по месяцам
const MAX_DAILY_POINTS = 92;

function groupByMonth(days: DayStat[]): DayStat[] {
  const months = new Map<string, DayStat>();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    const m = months.get(key) ?? { date: key, revenue: 0, profit: 0, checks: 0 };
    m.revenue += d.revenue;
    m.profit += d.profit;
    m.checks += d.checks;
    months.set(key, m);
  }
  return [...months.values()];
}

export default function AnalyticsPage() {
  const [[from, to], setRange] = useState<[string, string]>(presets[1].range());
  const [salesByDay, setSalesByDay] = useState<DayStat[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const today = toDayKey(new Date());
  const rangeError = from && to && from > to ? 'Дата «с» позже даты «по»' : '';

  useEffect(() => {
    if (!from || !to || rangeError) return;
    const load = async () => {
      setLoading(true);
      try {
        const params = `from=${from}&to=${to}`;
        const [dayRes, topRes] = await Promise.all([
          api.get<DayStat[]>(`/analytics/sales-by-day?${params}`),
          api.get<TopProduct[]>(`/analytics/top-products?${params}`),
        ]);
        setSalesByDay(dayRes.data);
        setTopProducts(topRes.data);
      } catch (err) { notifyError(err, 'Не удалось загрузить аналитику'); }
      setLoading(false);
    };
    load();
  }, [from, to, rangeError]);

  const totals = salesByDay.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, profit: acc.profit + d.profit, checks: acc.checks + d.checks }),
    { revenue: 0, profit: 0, checks: 0 }
  );
  const avgCheck = totals.checks ? totals.revenue / totals.checks : 0;
  const byMonth = salesByDay.length > MAX_DAILY_POINTS;
  const chartData = byMonth ? groupByMonth(salesByDay) : salesByDay;
  const unitLabel = byMonth ? 'по месяцам' : 'по дням';
  const activePreset = presets.find(p => { const [f, t] = p.range(); return f === from && t === to; })?.label;

  const chartTooltipStyle = {
    background: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    fontSize: '12px',
  };
  const cardStyle = { background: 'var(--color-card)', border: '1px solid var(--color-border)' };
  const inputStyle = { background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Аналитика</h1>
          <p className="text-muted-foreground text-sm mt-1">Показатели за выбранный период</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-muted)' }}>
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setRange(p.range())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activePreset === p.label ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label className="sr-only" htmlFor="analytics-from">С</label>
            <input id="analytics-from" type="date" value={from} max={to || today} onChange={e => setRange([e.target.value, to])} className="h-9 px-2 rounded-lg text-sm" style={inputStyle} />
            <span className="text-muted-foreground">—</span>
            <label className="sr-only" htmlFor="analytics-to">По</label>
            <input id="analytics-to" type="date" value={to} min={from} max={today} onChange={e => setRange([from, e.target.value])} className="h-9 px-2 rounded-lg text-sm" style={inputStyle} />
          </div>
        </div>
      </div>

      {rangeError && (
        <div className="px-4 py-3 rounded-xl text-sm bg-destructive/10 text-destructive border border-destructive/20">{rangeError}</div>
      )}

      {/* KPI */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {[
          { label: 'Выручка', value: formatCurrency(totals.revenue) },
          { label: 'Прибыль', value: formatCurrency(totals.profit) },
          { label: 'Чеков', value: String(totals.checks) },
          { label: 'Средний чек', value: formatCurrency(avgCheck) },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl p-5" style={cardStyle}>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity ${loading ? 'opacity-50' : ''}`}>
        {/* Revenue & profit by day */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <h3 className="text-base font-semibold mb-4">Выручка и прибыль {unitLabel}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
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
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickFormatter={formatDay} minTickGap={16} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDay} formatter={(v: number, name: string) => [formatCurrency(v), name === 'revenue' ? 'Выручка' : 'Прибыль']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#areaRevenue)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#areaProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Checks by day */}
        <div className="rounded-2xl p-6" style={cardStyle}>
          <h3 className="text-base font-semibold mb-4">Количество чеков {unitLabel}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickFormatter={formatDay} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatDay} formatter={(v: number) => [v, 'Чеков']} />
                <Bar dataKey="checks" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className={`rounded-2xl p-6 transition-opacity ${loading ? 'opacity-50' : ''}`} style={cardStyle}>
        <h3 className="text-base font-semibold mb-4">Топ-10 товаров за период</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Нет продаж за выбранный период</p>
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
                    <td className="px-4 py-2 text-right whitespace-nowrap">{p.quantity} ед.</td>
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
