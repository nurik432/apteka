import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, Check, Pill } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '../types';

interface TabletQtyModalProps {
  product: Product;
  onConfirm: (product: Product, tabletCount: number) => void;
  onClose: () => void;
}

function TabletQtyModal({ product, onConfirm, onClose }: TabletQtyModalProps) {
  const [input, setInput] = useState('');

  const piecesPerPack = product.piecesPerPack || 1;
  const pricePerTablet = product.sellingPrice / piecesPerPack;
  const purchasePricePerTablet = product.purchasePrice / piecesPerPack;
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
        alert(`Недостаточно таблеток на складе. Доступно: ${maxTablets}`);
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

  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'C', '0', 'BS',
  ];

  // Quick presets for common tablet counts
  const presets = [1, 5, 10, 20, 30].filter((p) => p <= maxTablets);

  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pos-tablet-modal animate-scaleIn">
        {/* Header */}
        <div className="pos-tablet-header">
          <div>
            <h3 className="pos-tablet-title">{product.name}</h3>
            <p className="pos-tablet-subtitle">Продажа поштучно</p>
          </div>
          <button className="pos-modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info cards */}
        <div className="pos-tablet-info">
          <div className="pos-tablet-info-card">
            <Pill className="w-4 h-4" />
            <div>
              <span className="pos-tablet-info-label">В упаковке</span>
              <span className="pos-tablet-info-value">{piecesPerPack} шт</span>
            </div>
          </div>
          <div className="pos-tablet-info-card">
            <span className="pos-tablet-info-icon-text">₸</span>
            <div>
              <span className="pos-tablet-info-label">Цена за 1 шт</span>
              <span className="pos-tablet-info-value">{formatCurrency(pricePerTablet)}</span>
            </div>
          </div>
          <div className="pos-tablet-info-card">
            <span className="pos-tablet-info-icon-text">📦</span>
            <div>
              <span className="pos-tablet-info-label">Остаток</span>
              <span className="pos-tablet-info-value">{packsAvailable} уп. ({maxTablets} шт)</span>
            </div>
          </div>
        </div>

        {/* Display */}
        <div className="pos-tablet-display">
          <span className="pos-tablet-display-qty">{input || '0'}</span>
          <span className="pos-tablet-display-unit">шт</span>
        </div>

        {/* Calculated total */}
        <div className="pos-tablet-total">
          <span>Сумма:</span>
          <span className="pos-tablet-total-value">{formatCurrency(totalPrice)}</span>
        </div>

        {/* Quick presets */}
        {presets.length > 0 && (
          <div className="pos-tablet-presets">
            {presets.map((count) => (
              <button
                key={count}
                className="pos-tablet-preset-btn"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(String(count));
                }}
              >
                {count} шт
              </button>
            ))}
            {maxTablets >= piecesPerPack && (
              <button
                className="pos-tablet-preset-btn pos-tablet-preset-btn--pack"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setInput(String(piecesPerPack));
                }}
              >
                Вся уп. ({piecesPerPack})
              </button>
            )}
          </div>
        )}

        {/* Numpad */}
        <div className="pos-calculator-grid">
          {buttons.map((btn) => (
            <button
              key={btn}
              className={`pos-calculator-key ${btn === 'C' ? 'pos-calculator-key--clear' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleKey(btn);
              }}
            >
              {btn === 'BS' ? <Delete className="w-5 h-5" /> : btn}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="pos-calculator-actions">
          <button className="pos-btn pos-btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            className="pos-btn pos-btn--primary"
            onClick={handleConfirm}
            disabled={tabletCount <= 0}
          >
            <Check className="w-5 h-5" />
            Добавить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default React.memo(TabletQtyModal);
