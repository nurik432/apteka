import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatDateTime, notifyError } from '@/lib/utils';
import { Download, KeyRound, Save } from 'lucide-react';
import { toast } from 'sonner';

const inputClass = 'w-full h-10 px-3 mt-1 rounded-lg text-sm';
const inputStyle = { background: 'var(--color-card)', color: 'var(--color-foreground)', border: '1px solid var(--color-border-strong)' };

export default function SettingsPage() {
  const [backupLoading, setBackupLoading] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [staff, setStaff] = useState<number | null>(null);
  const [kkm, setKkm] = useState({ host: '', port: '8002', vatPercent: '7' });
  const [kkmSaving, setKkmSaving] = useState(false);

  const loadInfo = async () => {
    try {
      const [backupRes, usersRes, kkmRes] = await Promise.all([
        api.get('/export/backup-info'),
        api.get('/users'),
        api.get('/kkm/settings'),
      ]);
      setKkm({ host: kkmRes.data.host, port: String(kkmRes.data.port), vatPercent: String(kkmRes.data.vatPercent) });
      setLastBackupAt(backupRes.data.lastBackupAt);
      setStaff(usersRes.data.filter((u: { active: boolean }) => u.active).length);
    } catch (err) {
      notifyError(err, 'Не удалось загрузить настройки');
    }
  };

  useEffect(() => { loadInfo(); }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.get('/export/backup', { responseType: 'blob' });
      const fileName = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '')?.[1] || 'apteka-backup.db';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setLastBackupAt(new Date().toISOString());
    } catch (err) {
      notifyError(err, 'Не удалось создать резервную копию');
    }
    setBackupLoading(false);
  };

  const handleKkmSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setKkmSaving(true);
    try {
      const res = await api.put('/kkm/settings', {
        host: kkm.host,
        port: Number(kkm.port),
        vatPercent: Number(kkm.vatPercent.replace(',', '.')),
      });
      setKkm({ host: res.data.host, port: String(res.data.port), vatPercent: String(res.data.vatPercent) });
      toast.success('Настройки ККМ сохранены');
    } catch (err) {
      notifyError(err, 'Не удалось сохранить настройки ККМ');
    }
    setKkmSaving(false);
  };

  const rows: [string, string][] = [
    ['Версия', '1.0.0'],
    ['База данных', 'SQLite, локально'],
    ['Активных сотрудников', staff === null ? '…' : String(staff)],
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold leading-tight">Настройки</h1>
        <p className="text-muted-foreground text-[13px]">Параметры системы</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <div className="rounded-xl bg-card border p-[18px] flex flex-col gap-2.5">
          <h2 className="text-base font-bold">Резервная копия</h2>
          <p className="text-sm text-muted-foreground">
            Скачайте копию базы и храните её на флешке или в облаке. Копию можно делать во время работы.
            Для восстановления переименуйте файл в <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs">apteka.db</code>,
            замените им <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs">database/apteka.db</code> и перезапустите программу.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <button type="button" onClick={handleBackup} disabled={backupLoading} className="btn btn-primary">
              <Download className="w-4 h-4" />
              {backupLoading ? 'Создание копии…' : 'Скачать копию'}
            </button>
            <span className="text-[13px] text-muted-foreground num">
              {lastBackupAt ? `Последняя: ${formatDateTime(lastBackupAt)}` : 'Копию ещё не скачивали'}
            </span>
          </div>
        </div>

        <div className="rounded-xl bg-card border p-[18px]">
          <h2 className="text-base font-bold mb-2">О системе</h2>
          <dl className="text-sm">
            {rows.map(([label, value], i) => (
              <div key={label} className={`flex justify-between gap-4 py-2 ${i > 0 ? 'border-t' : ''}`}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium num">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            Сменить свой PIN-код: нажмите на своё имя в правом верхнем углу.
          </p>
        </div>

        <form onSubmit={handleKkmSave} className="rounded-xl bg-card border p-[18px] flex flex-col gap-2.5">
          <h2 className="text-base font-bold">ККМ</h2>
          <p className="text-sm text-muted-foreground">
            Адрес фискального принтера в локальной сети. Чеки отправляются на него из раздела «ККМ».
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label htmlFor="kkm-host" className="text-sm font-medium">IP-адрес</label>
              <input
                id="kkm-host"
                type="text"
                placeholder="192.168.0.200"
                value={kkm.host}
                onChange={e => setKkm({ ...kkm, host: e.target.value })}
                className={`${inputClass} num`}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="kkm-port" className="text-sm font-medium">Порт</label>
              <input
                id="kkm-port"
                type="text"
                inputMode="numeric"
                required
                value={kkm.port}
                onChange={e => setKkm({ ...kkm, port: e.target.value })}
                className={`${inputClass} num`}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="kkm-vat" className="text-sm font-medium">НДС, %</label>
              <input
                id="kkm-vat"
                type="text"
                inputMode="decimal"
                required
                value={kkm.vatPercent}
                onChange={e => setKkm({ ...kkm, vatPercent: e.target.value })}
                className={`${inputClass} num`}
                style={inputStyle}
              />
            </div>
          </div>
          <div className="mt-1">
            <button type="submit" disabled={kkmSaving} className="btn btn-primary">
              <Save className="w-4 h-4" />
              {kkmSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
