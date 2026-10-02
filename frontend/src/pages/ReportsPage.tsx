import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatCurrency, formatDateTime, notifyError } from '@/lib/utils';
import { Download, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';

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
    } catch (err) { notifyError(err, 'Не удалось загрузить отчёт'); }
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
    } catch { toast.error('Ошибка при экспорте'); }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get(`/export/report-pdf?period=${period}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `report-${period}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Ошибка при экспорте PDF'); }
  };

  const summary = reportData?.summary;
  const inputStyle = { background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border-strong)' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight">Отчёты</h1>
          <p className="text-muted-foreground text-[13px]">Финансовые отчёты по продажам</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium hover:bg-muted transition-colors bg-card" style={{ border: '1px solid var(--color-border-strong)' }}>
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium hover:bg-muted transition-colors bg-card" style={{ border: '1px solid var(--color-border-strong)' }}>
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
                period === p.key && !dateFrom ? 'bg-primary hover:bg-primary-hover text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
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
            <button onClick={loadReport} className="px-4 h-10 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover">
              Показать
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Выручка', value: formatCurrency(summary.totalRevenue) },
            { label: 'Наличными', value: formatCurrency(summary.totalCash) },
            { label: 'Картой', value: formatCurrency(summary.totalCard) },
            { label: 'Прибыль', value: formatCurrency(summary.totalProfit) },
            { label: 'Чеков', value: String(summary.totalChecks) },
            { label: 'Средний чек', value: formatCurrency(summary.averageCheck) },
          ].map((card, i) => (
            <div key={i} className="rounded-xl p-4 card-hover" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className="text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sales Table */}
      {reportData && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
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
                  <tr><td colSpan={7} className="px-4 py-5"><div className="space-y-3"><div className="skeleton w-2/3" /><div className="skeleton w-full" /><div className="skeleton w-4/5" /></div></td></tr>
                ) : reportData.sales?.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><b>Нет продаж за выбранный период</b><p>Выберите другой период или даты.</p></div></td></tr>
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
