import React, { forwardRef } from 'react';
import { ScanBarcode } from 'lucide-react';

interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  refocusBarcode: () => void;
}

/**
 * Поле ввода штрихкода — постоянно в фокусе.
 * USB-сканеры штрихкодов работают как клавиатура (Keyboard Wedge):
 * они вводят символы и нажимают Enter.
 */
const BarcodeInput = forwardRef<HTMLInputElement, BarcodeInputProps>(
  ({ onScan }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const barcode = (e.target as HTMLInputElement).value.trim();
      if (!barcode) return;
      onScan(barcode);
      (e.target as HTMLInputElement).value = '';
    };

    return (
      <div className="pos-barcode-wrapper">
        <div className="pos-barcode-icon">
          <ScanBarcode className="w-5 h-5" />
        </div>
        <input
          ref={ref}
          type="text"
          placeholder="Сканируйте штрихкод или введите вручную..."
          onKeyDown={handleKeyDown}
          className="pos-barcode-input"
          id="pos-barcode"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="pos-barcode-hint">
          <kbd>Enter</kbd>
        </div>
      </div>
    );
  }
);

BarcodeInput.displayName = 'BarcodeInput';
export default React.memo(BarcodeInput);
