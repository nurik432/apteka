import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '../types';
import Numpad, { type NumpadKey } from './Numpad';
import PosDialog from './PosDialog';

interface TabletQtyModalProps {
  product: Product;
  onConfirm: (product: Product, tabletCount: number) => void;
  onClose: () => void;
}

const KEYS: NumpadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'BS'];

function TabletQtyModal({ product, onConfirm, onClose }: TabletQtyModalProps) {
  const [input, setInput] = useState('');

  const piecesPerPack = product.piecesPerPack || 1;
  const pricePerTablet = product.sellingPrice / piecesPerPack;
  const tabletCount = parseInt(input) || 0;
  const totalPrice = pricePerTablet * tabletCount;
  // stock хранится в пачках, доступно таблеток = пачки * штук_в_пачке
  const maxTablets = product.stock * piecesPerPack;
  const packsAvailable = product.stock;

  const handleKey = useCallback(
    (char: string) => {
      setInput((prev) => {
        if (char === 'C') return '';
        if (char === 'BS') return prev.length > 1 ? prev.slice(0, -1) : '';
        if (prev === '' || prev === '0') {
          return char;
        }
        if (prev.length >= 6) return prev;
        return prev + char;
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (tabletCount > 0) {
      if (tabletCount > maxTablets) {
        toast.error(`Недостаточно таблеток на складе. Доступно: ${maxTablets}`);
        return;
      }
      onConfirm(product, tabletCount);
    }
  }, [tabletCount, maxTablets, product, onConfirm]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirm();
      } else if (e.key === 'Backspace') {
        handleKey('BS');
      } else if (/^[0-9]$/.test(e.key)) {
        handleKey(e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKey, handleConfirm, onClose]);

  // Quick presets for common tablet counts
  const presets = [1, 5, 10, 20, 30].filter((p) => p <= maxTablets);

  return (
    <PosDialog
      title="Продажа поштучно"
      subtitle={product.name}
      width={420}
      className="pos-tablet-modal"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>Отмена</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={tabletCount <= 0}>
            Добавить
          </button>
        </>
      }
    >
      <div className="pos-infocards">
        <div className="pos-infocard">В упаковке<b>{piecesPerPack} шт</b></div>
        <div className="pos-infocard">Цена за 1 шт<b>{formatCurrency(pricePerTablet)}</b></div>
        <div className="pos-infocard">Остаток<b>{packsAvailable} уп. ({maxTablets} шт)</b></div>
      </div>

      <div className="pos-display">
        {input || '0'}
        <small>шт · {formatCurrency(totalPrice)}</small>
      </div>

      {presets.length > 0 && (
        <div className="pos-chips">
          {presets.map((count) => (
            <button
              key={count}
              type="button"
              className={`pos-chip num ${tabletCount === count ? 'pos-chip--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setInput(String(count));
              }}
            >
              {count} шт
            </button>
          ))}
          {maxTablets >= piecesPerPack && !presets.includes(piecesPerPack) && (
            <button
              type="button"
              className={`pos-chip ${tabletCount === piecesPerPack ? 'pos-chip--active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setInput(String(piecesPerPack));
              }}
            >
              Вся упаковка ({piecesPerPack})
            </button>
          )}
        </div>
      )}

      <Numpad keys={KEYS} onKey={handleKey} />
    </PosDialog>
  );
}

export default React.memo(TabletQtyModal);
