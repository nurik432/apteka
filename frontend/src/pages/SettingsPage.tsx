import { useState } from 'react';
import api from '@/lib/api';
import { notifyError } from '@/lib/utils';
import { Database, Download, KeyRound, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
  const [backupLoading, setBackupLoading] = useState(false);

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const res = await api.get('/export/backup', { responseType: 'blob' });
      const fileName = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] || '')?.[1] || 'apteka-backup.db';
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyError(err, 'Не удалось создать резервную копию');
    }
    setBackupLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Настройки</h1>
        <p className="text-muted-foreground text-sm mt-1">Параметры системы</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Резервное копирование</h2>
              <p className="text-xs text-muted-foreground">Создание резервной копии базы данных</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Скачайте копию базы данных и храните её на флешке или в облаке.
            Для восстановления замените файл <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">database/apteka.db</code> скачанной
            копией (переименовав её в <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">apteka.db</code>) и перезапустите программу.
          </p>

          <button onClick={handleBackup} disabled={backupLoading} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50" style={{ border: '1px solid var(--color-border)' }}>
            <Download className="w-4 h-4" />
            {backupLoading ? 'Создание копии...' : 'Скачать резервную копию'}
          </button>
        </div>

        {/* System Info */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">О системе</h2>
              <p className="text-xs text-muted-foreground">Информация о приложении</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted-foreground">Название</span>
              <span className="font-medium">Аптека — Система управления</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted-foreground">Версия</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-muted-foreground">База данных</span>
              <span className="font-medium">SQLite</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Режим</span>
              <span className="font-medium">Локальный</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Сменить свой PIN-код: нажмите на своё имя в правом верхнем углу.
          </p>
        </div>
      </div>
    </div>
  );
}
