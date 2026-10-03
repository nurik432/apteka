import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Printer, Receipt } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDateTime, notifyError } from '@/lib/utils';
import { notifyKkm, type KkmResponse } from '@/pages/KkmPage';

interface ReceiptModalProps {
  sale: any;
  /** Сдача покупателю: считается на кассе, сервер её не хранит */
  change: number;
  onClose: () => void;
}

function ReceiptModal({ sale, change, onClose }: ReceiptModalProps) {
  // Keyboard Esc / Enter to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const paid = (sale.cashAmount || 0) + (sale.cardAmount || 0) + change;

  // Фискальный чек печатается выборочно — только по кнопке
  const [kkmState, setKkmState] = useState<'idle' | 'sending' | 'done'>('idle');

  const sendToKkm = async () => {
    setKkmState('sending');
    try {
      const res = await api.post<KkmResponse>(`/kkm/sales/${sale.id}/send`);
      notifyKkm(res.data);
      setKkmState(res.data.ok ? 'done' : 'idle');
    } catch (err) {
      notifyError(err, 'Не удалось отправить чек на ККМ');
      setKkmState('idle');
    }
  };

  return createPortal(
    <div
      className="pos-modal-overlay pos-print-root"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Продажа оформлена" className="pos-dialog animate-scaleIn" style={{ maxWidth: 420 }}>
        <div className="pos-dialog-body items-center text-center !pt-7">
          <div className="pos-done-icon no-print">
            <Check className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mt-1 pos-receipt-modal-title">Продажа оформлена</h2>
          <p className="text-muted-foreground num">Чек № {sale.id} · {formatDateTime(sale.createdAt || new Date())}</p>

          <div className="pos-receipt-lines">
            {sale.items?.map((item: any) => (
              <div key={item.id}>
                <span className="truncate">{item.customName || item.product?.name}</span>
                <span className="text-muted-foreground shrink-0">
                  {item.quantity} × {formatCurrency(item.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="pos-receipt-totals">
            <div>
              <span>Итого</span>
              <b>{formatCurrency(sale.finalAmount)}</b>
            </div>
            <div>
              <span>
                {sale.paymentType === 'cash' ? 'Наличные' : sale.paymentType === 'card' ? 'Карта' : 'Наличные и карта'}
              </span>
              <span>{formatCurrency(paid)}</span>
            </div>
            {change > 0.005 && (
              <div className="pos-receipt-change">
                <span>Сдача</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          <div className="w-full no-print">
            {kkmState === 'done' ? (
              <span className="badge status-green">Чек напечатан на ККМ</span>
            ) : (
              <button type="button" className="btn btn-secondary w-full" disabled={kkmState === 'sending'} onClick={sendToKkm}>
                <Receipt className="w-4 h-4" />
                {kkmState === 'sending' ? 'Печать на ККМ…' : 'Напечатать чек на ККМ'}
              </button>
            )}
          </div>
        </div>

        <div className="pos-dialog-foot no-print">
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => window.print()}>
            <Printer className="w-[18px] h-[18px]" />
            Печать
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onClose}>
            Новый чек <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default React.memo(ReceiptModal);
