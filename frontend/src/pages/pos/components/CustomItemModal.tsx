import React, { useState, useEffect, useCallback } from 'react';
import Numpad, { type NumpadKey } from './Numpad';
import PosDialog from './PosDialog';

interface CustomItemModalProps {
  onConfirm: (name: string, amount: number) => void;
  onClose: () => void;
}

const KEYS: NumpadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BS'];

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

  return (
    <PosDialog
      title="Разный товар"
      subtitle="Позиция, которой нет в базе"
      width={380}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onClose}>Отмена</button>
          <button type="button" className="btn btn-primary btn-lg" onClick={handleConfirm} disabled={amount <= 0}>
            Добавить
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="pos-custom-name" className="text-[13px] font-medium">Название (необязательно)</label>
        <input
          id="pos-custom-name"
          type="text"
          className="h-10 px-3 rounded-lg text-sm bg-card border border-border-strong"
          placeholder="Например, пакет"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setActiveField('name')}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">Сумма</span>
        <button
          type="button"
          className={`pos-display ${activeField === 'amount' ? 'pos-display--active' : ''}`}
          onClick={() => setActiveField('amount')}
        >
          {amountInput || '0'}
          <small>смн.</small>
        </button>
      </div>

      <Numpad
        keys={KEYS}
        onKey={(btn) => {
          setActiveField('amount');
          handleNumpad(btn);
        }}
      />
    </PosDialog>
  );
}

export default React.memo(CustomItemModal);
