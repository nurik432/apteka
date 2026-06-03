import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function ExpiryPage() {
  const [data, setData] = useState<{ expired: any[]; critical: any[]; warning: any[] }>({ expired: [], critical: [], warning: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/products/expiring');
      setData(res.data);
    } catch { }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const sections = [
    { title: 'Просроченные', icon: AlertCircle, items: data.expired, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
    { title: 'Критично (< 30 дней)', icon: AlertTriangle, items: data.critical, color: 'text-red-400', bgColor: 'bg-red-400/10', borderColor: 'border-red-400/20' },
    { title: 'Внимание (< 90 дней)', icon: Clock, items: data.warning, color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Контроль сроков годности</h1>
        <p className="text-muted-foreground text-sm mt-1">Мониторинг сроков годности препаратов</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map((section, i) => (
          <div key={i} className={`rounded-2xl p-5 card-hover ${section.bgColor} border ${section.borderColor}`}>
            <div className="flex items-center gap-3">
              <section.icon className={`w-8 h-8 ${section.color}`} />
              <div>
                <p className={`text-2xl font-bold ${section.color}`}>{section.items.length}</p>
                <p className="text-sm text-muted-foreground">{section.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lists */}
      {sections.map((section, i) => (
        section.items.length > 0 && (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <section.icon className={`w-5 h-5 ${section.color}`} />
              <h3 className="font-semibold">{section.title} ({section.items.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Наименование</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Категория</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Срок годности</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Остаток</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((product: any) => (
                  <tr key={product.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="px-4 py-2 font-medium min-w-[200px] whitespace-normal break-words">{product.name}</td>
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">{product.category?.name || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                        i === 0 ? 'status-red' : i === 1 ? 'status-red' : 'status-yellow'
                      }`}>
                        {formatDate(product.expiryDate)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{product.stock} {product.unit || 'шт'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ))}

      {data.expired.length === 0 && data.critical.length === 0 && data.warning.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-emerald-500/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Все товары в пределах срока годности</p>
        </div>
      )}
    </div>
  );
}
