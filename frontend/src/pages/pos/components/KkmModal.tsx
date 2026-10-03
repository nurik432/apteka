import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PosDialog from './PosDialog';
import { SalesTab, ShiftTab } from '@/pages/KkmPage';

interface KkmModalProps {
  onClose: () => void;
}

/** ККМ прямо на кассе: печать чеков последних продаж и управление сменой */
export default function KkmModal({ onClose }: KkmModalProps) {
  const [tab, setTab] = useState<'sales' | 'shift'>('sales');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <PosDialog
      title="ККМ"
      subtitle="Печать чеков продаж на фискальном принтере"
      width={960}
      onClose={onClose}
      headerRight={
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Закрыть">
          <X className="w-5 h-5" />
        </button>
      }
      footer={
        <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
          Закрыть <kbd>Esc</kbd>
        </button>
      }
    >
      <div className="seg w-fit">
        <button type="button" onClick={() => setTab('sales')} aria-pressed={tab === 'sales'}>Продажи</button>
        <button type="button" onClick={() => setTab('shift')} aria-pressed={tab === 'shift'}>Смена</button>
      </div>

      {tab === 'sales' ? <SalesTab /> : <ShiftTab />}
    </PosDialog>
  );
}
