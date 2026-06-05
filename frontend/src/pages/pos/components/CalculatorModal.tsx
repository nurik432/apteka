import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, Check } from 'lucide-react';
import type { CartItem } from '../types';

interface CalculatorModalProps {
  item: CartItem;
  onConfirm: (itemId: string, newQty: number) => void;
  onClose: () => void;
}

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
        alert(`Недостаточно товара на складе. Доступно: ${item.stock}`);
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

  const buttons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'C', '0', '.',
  ];

  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pos-calculator-modal animate-scaleIn">
        {/* Header */}
        <div className="pos-calculator-header">
          <div>
            <h3 className="pos-calculator-title">{item.name}</h3>
            <p className="pos-calculator-subtitle">Укажите количество</p>
          </div>
          <button className="pos-modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display */}
        <div className="pos-calculator-display">
          {input || '0'}
        </div>

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
              {btn}
            </button>
          ))}
        </div>

        {/* Backspace */}
        <button
          className="pos-calculator-backspace"
          onMouseDown={(e) => {
            e.preventDefault();
            handleKey('BS');
          }}
        >
          <Delete className="w-5 h-5" />
          Удалить
        </button>

        {/* Action buttons */}
        <div className="pos-calculator-actions">
          <button className="pos-btn pos-btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="pos-btn pos-btn--primary" onClick={handleConfirm}>
            <Check className="w-5 h-5" />
            Подтвердить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default React.memo(CalculatorModal);
