import { useEffect, useCallback } from 'react';

interface HotkeyActions {
  onPayment: () => void;       // F2
  onClearCart: () => void;      // F3
  onSearchFocus: () => void;   // F4
  onDeleteItem: () => void;    // Delete
  onIncreaseQty: () => void;   // + (numpad)
  onDecreaseQty: () => void;   // - (numpad)
  disabled?: boolean;
}

/**
 * Хук для горячих клавиш кассы.
 * Привязывает глобальные обработчики F2/F3/F4/Delete/+/-/Esc.
 */
export function useHotkeys({
  onPayment,
  onClearCart,
  onSearchFocus,
  onDeleteItem,
  onIncreaseQty,
  onDecreaseQty,
  disabled,
}: HotkeyActions) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Не перехватываем, если открыт модальный диалог и это не Esc
      const modal = document.querySelector('[data-pos-modal]');
      if (modal && e.key !== 'Escape') return;

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          onPayment();
          break;
        case 'F3':
          e.preventDefault();
          onClearCart();
          break;
        case 'F4':
          e.preventDefault();
          onSearchFocus();
          break;
        case 'Delete':
          // Только если фокус не в input
          if (
            document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA'
          ) {
            e.preventDefault();
            onDeleteItem();
          }
          break;
        case '+':
          if (
            document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA'
          ) {
            e.preventDefault();
            onIncreaseQty();
          }
          break;
        case '-':
          if (
            document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA'
          ) {
            e.preventDefault();
            onDecreaseQty();
          }
          break;
      }
    },
    [disabled, onPayment, onClearCart, onSearchFocus, onDeleteItem, onIncreaseQty, onDecreaseQty]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
