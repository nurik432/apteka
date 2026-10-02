import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '../types';
import Numpad, { type NumpadKey } from './Numpad';
import PosDialog from './PosDialog';

interface CalculatorModalProps {
  item: CartItem;
  onConfirm: (itemId: string, newQty: number) => void;
  onClose: () => void;
}

const KEYS: NumpadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BS'];

function CalculatorModal({ item, onConfirm, onClose }: CalculatorModalProps) {
  const [input, setInput] = useState(String(item.quantity));

  const handleKey = useCallback(
    (char: string) => {
      setInput((prev) => {
        if (char === 'C') return '';
        if (char === 'BS') return prev.length > 1 ? prev.slice(0, -1) : '';
        if (char === '.' && prev.includes('.')) return prev;
        if (prev === '' || prev === '0') {
          if (char === '.') return '0.';
          return char;
        }
        if (prev.length >= 6) return prev;
        return prev + char;
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    const val = parseFloat(input) || 0;
    if (val > 0) {
      if (val > item.stock && item.stock !== 999999) {
        toast.error(`Недостаточно товара на складе. Доступно: ${item.stock}`);
        return;
      }
      onConfirm(item.id, val);
    }
    onClose();
  }, [input, item, onConfirm, onClose]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Backspace') {
        handleKey('BS');
      } else if (/^[0-9.]$/.test(e.key)) {
        handleKey(e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey, handleConfirm, onClose]);

  const qty = parseFloat(input) || 0;
  const hasStockLimit = item.stock !== 999999;

  return (
    <PosDialog
      title="Количество"
      subtitle={item.name}
      width={360}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>Отмена</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleConfirm}>Готово</button>
        </>
      }
    >
      <div className="pos-display pos-calculator-display">{input || '0'}</div>
      <div className="flex justify-between text-[13px] text-muted-foreground num">
        <span>{hasStockLimit ? `В наличии: ${item.stock}` : 'Без ограничения по остатку'}</span>
        <span>Сумма: {formatCurrency(qty * item.price)}</span>
      </div>
      <Numpad keys={KEYS} onKey={handleKey} />
    </PosDialog>
  );
}

export default React.memo(CalculatorModal);
