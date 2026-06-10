import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Delete, Check, ShoppingBag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CustomItemModalProps {
  onConfirm: (name: string, amount: number) => void;
  onClose: () => void;
}

function CustomItemModal({ onConfirm, onClose }: CustomItemModalProps) {
  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [activeField, setActiveField] = useState<'name' | 'amount'>('amount');

  const amount = parseFloat(amountInput) || 0;

  const handleNumpad = useCallback(
    (char: string) => {
      if (activeField !== 'amount') return;
      setAmountInput((prev) => {
        if (char === 'C') return '';
        if (char === 'BS') return prev.length > 1 ? prev.slice(0, -1) : '';
        if (char === '.' && prev.includes('.')) return prev;
        if (prev === '' || prev === '0') {
          if (char === '.') return '0.';
          return char;
        }
        // Max 2 decimal places
        if (prev.includes('.') && prev.split('.')[1]?.length >= 2) return prev;
        if (prev.length >= 10) return prev;
        return prev + char;
      });
    },
    [activeField]
  );

  const handleConfirm = useCallback(() => {
    if (amount > 0) {
      const itemName = name.trim() || 'Разный товар';
      onConfirm(itemName, amount);
    }
  }, [amount, name, onConfirm]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && amount > 0) {
        e.preventDefault();
        handleConfirm();
      } else if (activeField === 'amount') {
        if (e.key === 'Backspace') {
          e.preventDefault();
          handleNumpad('BS');
        } else if (/^[0-9.]$/.test(e.key)) {
          e.preventDefault();
          handleNumpad(e.key);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNumpad, handleConfirm, onClose, activeField, amount]);

  const numpadButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'BS',
  ];

  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pos-custom-item-modal animate-scaleIn">
        {/* Header */}
        <div className="pos-custom-item-header">
          <div className="pos-custom-item-header-icon">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h3 className="pos-custom-item-title">Разный товар</h3>
            <p className="pos-custom-item-subtitle">Добавить произвольную позицию</p>
          </div>
          <button className="pos-modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Name field */}
        <div className="pos-custom-item-field">
          <label className="pos-custom-item-label">Название (необязательно)</label>
          <input
            type="text"
            className="pos-custom-item-input"
            placeholder="Разный товар"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setActiveField('name')}
            autoFocus={false}
          />
        </div>

        {/* Amount display */}
        <div
          className={`pos-custom-item-amount ${activeField === 'amount' ? 'pos-custom-item-amount--active' : ''}`}
          onClick={() => setActiveField('amount')}
        >
          <span className="pos-custom-item-amount-label">Сумма</span>
          <span className="pos-custom-item-amount-value">
            {amountInput ? formatCurrency(amount) : '0 смн.'}
          </span>
        </div>

        {/* Numpad */}
        <div className="pos-payment-numpad">
          {numpadButtons.map((btn) => (
            <button
              key={btn}
              className={`pos-numpad-key ${btn === 'BS' ? 'pos-numpad-key--muted' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setActiveField('amount');
                handleNumpad(btn);
              }}
            >
              {btn === 'BS' ? <Delete className="w-5 h-5" /> : btn}
            </button>
          ))}
        </div>

        {/* Clear button */}
        <button
          className="pos-calculator-backspace"
          onMouseDown={(e) => {
            e.preventDefault();
            setAmountInput('');
          }}
        >
          Очистить
        </button>

        {/* Action buttons */}
        <div className="pos-calculator-actions">
          <button className="pos-btn pos-btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            className="pos-btn pos-btn--primary"
            onClick={handleConfirm}
            disabled={amount <= 0}
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

export default React.memo(CustomItemModal);
