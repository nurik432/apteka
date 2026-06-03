import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Download, FileText, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const [period, setPeriod] = useState('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [period]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      
      const res = await api.get(`/reports/sales?${params}`);
      setReportData(res.data);
    } catch { }
    setLoading(false);
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const res = await api.get(`/export/sales?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'sales-report.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Ошибка при экспорте'); }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get(`/export/report-pdf?period=${period}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `report-${period}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Ошибка при экспорте PDF'); }
  };

  const summary = reportData?.summary;
  const inputStyle = { background: 'var(--color-muted)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Отчёты</h1>
          <p className="text-muted-foreground text-sm mt-1">Финансовые отчёты по продажам</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted transition-colors" style={{ border: '1px solid var(--color-border)' }}>
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted transition-colors" style={{ border: '1px solid var(--color-border)' }}>
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--color-muted)' }}>
          {[
            { key: 'day', label: 'День' },
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
            { key: 'year', label: 'Год' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setDateFrom(''); setDateTo(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p.key && !dateFrom ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 px-3 rounded-lg text-sm" style={inputStyle} />
          <span className="text-muted-foreground">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 px-3 rounded-lg text-sm" style={inputStyle} />
          {dateFrom && dateTo && (
            <button onClick={loadReport} className="px-4 h-10 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600">
              Показать
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Выручка', value: formatCurrency(summary.totalRevenue), color: 'from-indigo-500 to-indigo-600' },
            { label: 'Наличными', value: formatCurrency(summary.totalCash), color: 'from-emerald-500 to-emerald-600' },
            { label: 'Картой', value: formatCurrency(summary.totalCard), color: 'from-blue-500 to-blue-600' },
            { label: 'Прибыль', value: formatCurrency(summary.totalProfit), color: 'from-green-500 to-green-600' },
            { label: 'Чеков', value: String(summary.totalChecks), color: 'from-purple-500 to-purple-600' },
            { label: 'Средний чек', value: formatCurrency(summary.averageCheck), color: 'from-indigo-400 to-indigo-500' },
          ].map((card, i) => (
            <div key={i} className="rounded-2xl p-4 card-hover" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sales Table */}
      {reportData && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">№</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Дата</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Кассир</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Товары</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Сумма</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Скидка</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Итого</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Загрузка...</td></tr>
                ) : reportData.sales?.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Нет продаж за выбранный период</td></tr>
                ) : (
                  reportData.sales?.map((sale: any) => (
                    <tr key={sale.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">#{sale.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(sale.createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{sale.user?.fullName}</td>
                      <td className="px-4 py-3 text-muted-foreground min-w-[200px] whitespace-normal break-words">
                        {sale.items?.map((i: any) => i.product?.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">{sale.discount > 0 ? formatCurrency(sale.discount) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(sale.finalAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
