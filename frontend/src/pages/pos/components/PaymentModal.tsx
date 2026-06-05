import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Banknote, CreditCard, Delete } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PaymentModalProps {
  total: number;
  onConfirm: (cashAmount: number, cardAmount: number) => void;
  onClose: () => void;
  loading: boolean;
}

function PaymentModal({ total, onConfirm, onClose, loading }: PaymentModalProps) {
  const [cashAmount, setCashAmount] = useState(String(total));
  const [cardAmount, setCardAmount] = useState('0');
  const [activeField, setActiveField] = useState<'cash' | 'card'>('cash');

  const cash = parseFloat(cashAmount) || 0;
  const card = parseFloat(cardAmount) || 0;
  const totalPaid = cash + card;
  const change = totalPaid - total;
  const canPay = totalPaid >= total - 0.01;

  const handleCashChange = useCallback(
    (val: string) => {
      setCashAmount(val);
      const c = parseFloat(val) || 0;
      const remaining = Math.max(0, total - c);
      setCardAmount(remaining > 0 ? String(remaining) : '0');
    },
    [total]
  );

  const handleCardChange = useCallback(
    (val: string) => {
      setCardAmount(val);
      const c = parseFloat(val) || 0;
      const remaining = Math.max(0, total - c);
      setCashAmount(remaining > 0 ? String(remaining) : '0');
    },
    [total]
  );

  const handleNumpad = useCallback(
    (char: string) => {
      const isCash = activeField === 'cash';
      const currentVal = isCash ? cashAmount : cardAmount;
      let newVal = currentVal;

      // If clicking first number on default value, replace
      if (isCash && parseFloat(currentVal) === total && char !== '.') {
        newVal = char;
      } else if (char === '.') {
        if (currentVal.includes('.')) return;
        newVal = currentVal + '.';
      } else {
        if (newVal === '0') newVal = char;
        else newVal += char;
      }

      // Max 2 decimal places
      if (newVal.includes('.') && newVal.split('.')[1]?.length > 2) return;

      if (isCash) handleCashChange(newVal);
      else handleCardChange(newVal);
    },
    [activeField, cashAmount, cardAmount, total, handleCashChange, handleCardChange]
  );

  const handleBackspace = useCallback(() => {
    const isCash = activeField === 'cash';
    let val = (isCash ? cashAmount : cardAmount).slice(0, -1);
    if (!val) val = '0';
    if (isCash) handleCashChange(val);
    else handleCardChange(val);
  }, [activeField, cashAmount, cardAmount, handleCashChange, handleCardChange]);

  const handleClear = useCallback(() => {
    if (activeField === 'cash') handleCashChange('0');
    else handleCardChange('0');
  }, [activeField, handleCashChange, handleCardChange]);

  // Quick cash presets
  const presets = [
    total,
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= total).slice(0, 4);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && canPay && !loading) {
        onConfirm(cash, card);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        handleNumpad(e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, canPay, loading, cash, card, onConfirm, handleBackspace, handleNumpad]);

  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pos-payment-modal animate-scaleIn">
        {/* Header */}
        <div className="pos-payment-header">
          <h2 className="pos-payment-title">Оплата</h2>
          <button className="pos-modal-close-btn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total */}
        <div className="pos-payment-total">
          <span className="pos-payment-total-label">К оплате</span>
          <span className="pos-payment-total-value">{formatCurrency(total)}</span>
        </div>

        {/* Payment fields */}
        <div className="pos-payment-fields">
          {/* Cash */}
          <div
            className={`pos-payment-field ${activeField === 'cash' ? 'pos-payment-field--active' : ''}`}
            onClick={() => setActiveField('cash')}
          >
            <div className="pos-payment-field-icon pos-payment-field-icon--cash">
              <Banknote className="w-5 h-5" />
            </div>
            <div className="pos-payment-field-info">
              <span className="pos-payment-field-label">Наличные</span>
              <span className="pos-payment-field-value">{cashAmount} смн.</span>
            </div>
          </div>

          {/* Card */}
          <div
            className={`pos-payment-field ${activeField === 'card' ? 'pos-payment-field--active' : ''}`}
            onClick={() => setActiveField('card')}
          >
            <div className="pos-payment-field-icon pos-payment-field-icon--card">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="pos-payment-field-info">
              <span className="pos-payment-field-label">Карта</span>
              <span className="pos-payment-field-value">{cardAmount} смн.</span>
            </div>
          </div>
        </div>

        {/* Quick cash presets */}
        {activeField === 'cash' && presets.length > 1 && (
          <div className="pos-payment-presets">
            {presets.map((preset) => (
              <button
                key={preset}
                className="pos-payment-preset-btn"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCashChange(String(preset));
                }}
              >
                {formatCurrency(preset)}
              </button>
            ))}
          </div>
        )}

        {/* Change */}
        {change > 0.01 && (
          <div className="pos-payment-change">
            <span>Сдача</span>
            <span className="pos-payment-change-value">{formatCurrency(change)}</span>
          </div>
        )}

        {/* Numpad */}
        <div className="pos-payment-numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pos-numpad-key"
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumpad(String(num));
              }}
            >
              {num}
            </button>
          ))}
          <button
            className="pos-numpad-key"
            onMouseDown={(e) => {
              e.preventDefault();
              handleNumpad('.');
            }}
          >
            .
          </button>
          <button
            className="pos-numpad-key"
            onMouseDown={(e) => {
              e.preventDefault();
              handleNumpad('0');
            }}
          >
            0
          </button>
          <button
            className="pos-numpad-key pos-numpad-key--muted"
            onMouseDown={(e) => {
              e.preventDefault();
              handleBackspace();
            }}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Pay button */}
        <button
          className="pos-btn pos-btn--pay"
          disabled={!canPay || loading}
          onClick={() => onConfirm(cash, card)}
        >
          {loading ? 'Обработка...' : 'Оплатить'}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default React.memo(PaymentModal);
