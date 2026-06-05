import { useEffect, useCallback, RefObject } from 'react';

/**
 * Хук для управления фокусом штрихкод-сканера.
 * 
 * - При загрузке автоматически ставит фокус на поле штрихкода
 * - Перехватывает символьные нажатия клавиш и перенаправляет в поле
 * - Предоставляет refocusBarcode() для вызова после действий с UI
 */
export function useBarcodeScanner(
  barcodeRef: RefObject<HTMLInputElement | null>,
  options?: {
    /** Заблокировать автоперехват фокуса (например, когда открыто модальное окно) */
    disabled?: boolean;
  }
) {
  const disabled = options?.disabled ?? false;

  const refocusBarcode = useCallback(() => {
    if (disabled) return;
    // requestAnimationFrame гарантирует, что фокус установится после обработки события
    requestAnimationFrame(() => {
      barcodeRef.current?.focus();
    });
  }, [barcodeRef, disabled]);

  // Автофокус при монтировании
  useEffect(() => {
    if (!disabled) {
      barcodeRef.current?.focus();
    }
  }, [barcodeRef, disabled]);

  // Глобальный перехват: если пользователь нажимает символьную клавишу
  // и фокус не в поле ввода — перенаправляем в штрихкод
  useEffect(() => {
    if (disabled) return;

    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      
      // Если нажата буква или цифра, и мы не в input — фокус на штрихкод
      if (!isInput && /^[a-zA-Z0-9]$/.test(e.key)) {
        barcodeRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [barcodeRef, disabled]);

  return { refocusBarcode };
}
