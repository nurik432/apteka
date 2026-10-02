import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { HeldReceipt } from '../types';

interface HeldReceiptsModalProps {
  receipts: HeldReceipt[];
  onRestore: (receipt: HeldReceipt) => void;
  onClose: () => void;
}

const receiptTotal = (r: HeldReceipt) =>
  Math.max(0, r.items.reduce((sum, i) => sum + i.price * i.quantity - i.discount, 0) - r.totalDiscount);

const positions = (n: number) => {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} позиция`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} позиции`;
  return `${n} позиций`;
};

/** Список отложенных чеков: клик возвращает чек в работу */
export default function HeldReceiptsModal({ receipts, onRestore, onClose }: HeldReceiptsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="held-title"
        className="w-full max-w-[520px] rounded-2xl bg-card border overflow-hidden animate-scaleIn"
        style={{ boxShadow: 'var(--shadow-pop)' }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <div className="flex-1">
            <h3 id="held-title" className="text-[17px] font-bold">Отложенные чеки</h3>
            <p className="text-[13px] text-muted-foreground">Нажмите на чек, чтобы вернуть его в работу</p>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {receipts.map(receipt => (
            <button key={receipt.id} type="button" className="pos-held-row" onClick={() => onRestore(receipt)}>
              <span className="min-w-0">
                <b>{receipt.label}</b>
                <small>{receipt.items.map(i => i.name).join(', ')}</small>
              </span>
              <span className="text-[13px] text-muted-foreground">{positions(receipt.items.length)}</span>
              <b>{formatCurrency(receiptTotal(receipt))}</b>
            </button>
          ))}
        </div>

        <div className="flex justify-end px-5 py-3.5 border-t">
          <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
            Закрыть <kbd>Esc</kbd>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
