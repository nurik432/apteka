import { Delete } from 'lucide-react';

/** Клавиши: цифры, '.', 'C' (очистить), 'BS' (стереть) */
export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'C' | 'BS';

interface NumpadProps {
  keys: NumpadKey[];
  onKey: (key: NumpadKey) => void;
  /** calculator — калькулятор и поштучная продажа, payment — оплата и свободная позиция */
  variant: 'calculator' | 'payment';
}

const keyLabels: Partial<Record<NumpadKey, string>> = { BS: 'Стереть', C: 'Очистить' };

export default function Numpad({ keys, onKey, variant }: NumpadProps) {
  const isCalc = variant === 'calculator';

  return (
    <div className={isCalc ? 'pos-calculator-grid' : 'pos-payment-numpad'}>
      {keys.map(key => {
        const accent = isCalc ? (key === 'C' ? ' pos-calculator-key--clear' : '') : (key === 'BS' ? ' pos-numpad-key--muted' : '');
        return (
          <button
            key={key}
            type="button"
            className={(isCalc ? 'pos-calculator-key' : 'pos-numpad-key') + accent}
            aria-label={keyLabels[key]}
            // mousedown + preventDefault: фокус остаётся в поле ввода модалки
            onMouseDown={e => {
              e.preventDefault();
              onKey(key);
            }}
          >
            {key === 'BS' ? <Delete className="w-5 h-5" /> : key}
          </button>
        );
      })}
    </div>
  );
}
