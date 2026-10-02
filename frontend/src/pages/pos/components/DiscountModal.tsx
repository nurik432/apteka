import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import Numpad, { type NumpadKey } from './Numpad';
import PosDialog from './PosDialog';

interface DiscountModalProps {
  /** Сумма чека до скидки на чек */
  subtotal: number;
  current: number;
  onConfirm: (discount: number) => void;
  onClose: () => void;
}

const KEYS: NumpadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BS'];
const PERCENTS = [5, 10, 15];

/** Скидка на весь чек в сомони; быстрые кнопки считают процент от суммы */
export default function DiscountModal({ subtotal, current, onConfirm, onClose }: DiscountModalProps) {
  const [input, setInput] = useState(current > 0 ? String(current) : '');
  const discount = parseFloat(input) || 0;
  const tooBig = discount > subtotal;

  const handleKey = useCallback((char: string) => {
    setInput((prev) => {
      if (char === 'BS') return prev.slice(0, -1);
      if (char === '.' && prev.includes('.')) return prev;
      if (prev === '' || prev === '0') return char === '.' ? '0.' : char;
      if (prev.includes('.') && prev.split('.')[1]?.length >= 2) return prev;
      if (prev.length >= 8) return prev;
      return prev + char;
    });
  }, []);

  const confirm = useCallback(() => {
    if (!tooBig) onConfirm(discount);
  }, [tooBig, discount, onConfirm]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter') { e.preventDefault(); confirm(); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleKey('BS'); }
      else if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); handleKey(e.key); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, confirm, handleKey]);

  return (
    <PosDialog
      title="Скидка на чек"
      subtitle={`Сумма чека: ${formatCurrency(subtotal)}`}
      width={380}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>Отмена</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={confirm} disabled={tooBig}>Применить</button>
        </>
      }
    >
      <div className="pos-display">
        {input || '0'}
        <small>смн.</small>
      </div>
      <p className={`text-[13px] num ${tooBig ? 'text-destructive' : 'text-muted-foreground'}`}>
        {tooBig ? 'Скидка больше суммы чека' : `К оплате после скидки: ${formatCurrency(Math.max(0, subtotal - discount))}`}
      </p>
      <div className="pos-chips">
        {PERCENTS.map((p) => (
          <button
            key={p}
            type="button"
            className="pos-chip num"
            onMouseDown={(e) => { e.preventDefault(); setInput(String(Math.round(subtotal * p) / 100)); }}
          >
            {p} %
          </button>
        ))}
        <button type="button" className="pos-chip" onMouseDown={(e) => { e.preventDefault(); setInput(''); }}>
          Без скидки
        </button>
      </div>
      <Numpad keys={KEYS} onKey={handleKey} />
    </PosDialog>
  );
}
