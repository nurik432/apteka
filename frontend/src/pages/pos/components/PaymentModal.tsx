import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, CreditCard, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Numpad from './Numpad';
import PosDialog from './PosDialog';

interface PaymentModalProps {
  total: number;
  itemsCount: number;
  onConfirm: (cashAmount: number, cardAmount: number) => void;
  onClose: () => void;
  loading: boolean;
}

function PaymentModal({ total, itemsCount, onConfirm, onClose, loading }: PaymentModalProps) {
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

  // Быстрые суммы: ровно и ближайшие «круглые» купюры
  const presets = [total, ...[10, 50, 100, 500].map((step) => Math.ceil(total / step) * step)]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 4);

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

  return (
    <PosDialog
      title="Оплата"
      subtitle={`Позиций в чеке: ${itemsCount}`}
      width={760}
      onClose={onClose}
      headerRight={
        <div className="text-right">
          <span className="block text-xs text-muted-foreground">К оплате</span>
          <b className="pos-payment-total-value text-[28px] leading-tight num">{formatCurrency(total)}</b>
        </div>
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>
            Отмена <kbd>Esc</kbd>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg pos-dialog-main-action"
            disabled={!canPay || loading}
            onClick={() => onConfirm(cash, card)}
          >
            <Check className="w-5 h-5" />
            {loading ? 'Обработка…' : 'Оплатить'} <kbd>Enter</kbd>
          </button>
        </>
      }
    >
      <div className="pos-payment-grid">
        <div className="flex flex-col gap-2.5 min-w-0">
          <button
            type="button"
            className={`pos-payfield ${activeField === 'cash' ? 'pos-payfield--active' : ''}`}
            onClick={() => setActiveField('cash')}
          >
            <Banknote className="w-[22px] h-[22px]" />
            <span>Наличные</span>
            <b className="pos-payment-field-value">{cashAmount.replace(".", ",")} смн.</b>
          </button>
          <button
            type="button"
            className={`pos-payfield ${activeField === 'card' ? 'pos-payfield--active' : ''}`}
            onClick={() => setActiveField('card')}
          >
            <CreditCard className="w-[22px] h-[22px]" />
            <span>Карта</span>
            <b className="pos-payment-field-value">{cardAmount.replace(".", ",")} смн.</b>
          </button>

          {activeField === 'cash' && presets.length > 1 && (
            <div className="pos-chips">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`pos-chip num ${cash === preset ? 'pos-chip--active' : ''}`}
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

          <div className={`pos-change ${canPay ? '' : 'pos-change--short'}`}>
            <span>{canPay ? 'Сдача' : 'Не хватает'}</span>
            <b className="pos-payment-change-value">{formatCurrency(Math.abs(change) < 0.005 ? 0 : Math.abs(change))}</b>
          </div>
        </div>

        <Numpad
          keys={['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BS']}
          onKey={(key) => (key === 'BS' ? handleBackspace() : handleNumpad(key))}
        />
      </div>
    </PosDialog>
  );
}

export default React.memo(PaymentModal);
