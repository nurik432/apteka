import { useEffect } from 'react';
import { ArrowLeft, Delete } from 'lucide-react';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (pin: string) => void;
  onBack?: () => void;
  disabled?: boolean;
  error?: boolean;
  /** Меняется при каждой ошибке, чтобы повторно проиграть встряску */
  shakeKey?: number;
  length?: number;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function PinPad({
  value,
  onChange,
  onComplete,
  onBack,
  disabled = false,
  error = false,
  shakeKey = 0,
  length = 4,
}: PinPadProps) {
  const addDigit = (digit: string) => {
    if (disabled || value.length >= length) return;
    const next = value + digit;
    onChange(next);
    if (next.length === length) onComplete(next);
  };

  const removeDigit = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  // Ввод с физической клавиатуры
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        removeDigit();
      } else if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const keyClass =
    'h-16 rounded-2xl text-2xl font-semibold flex items-center justify-center transition-all duration-150 ' +
    'hover:bg-muted active:scale-95 disabled:opacity-40 disabled:pointer-events-none select-none';
  const keyStyle = { border: '1px solid var(--color-border)', background: 'var(--color-card)' };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Индикатор введённых цифр */}
      <div key={shakeKey} className={`flex gap-4 ${shakeKey ? 'animate-shake' : ''}`} aria-hidden="true">
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < value.length
                ? error
                  ? 'bg-destructive scale-110'
                  : 'bg-gradient-to-br from-indigo-500 to-purple-600 scale-110'
                : 'border-2 border-muted-foreground/50'
            }`}
          />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        Введено цифр: {value.length} из {length}
      </span>

      {/* Клавиатура */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {DIGITS.map(digit => (
          <button key={digit} type="button" className={keyClass} style={keyStyle} disabled={disabled} onClick={() => addDigit(digit)}>
            {digit}
          </button>
        ))}

        {onBack ? (
          <button
            type="button"
            className={`${keyClass} text-muted-foreground`}
            style={keyStyle}
            disabled={disabled}
            onClick={onBack}
            aria-label="Назад к выбору сотрудника"
            title="Назад (Esc)"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <span />
        )}

        <button type="button" className={keyClass} style={keyStyle} disabled={disabled} onClick={() => addDigit('0')}>
          0
        </button>

        <button
          type="button"
          className={`${keyClass} text-muted-foreground`}
          style={keyStyle}
          disabled={disabled || value.length === 0}
          onClick={removeDigit}
          aria-label="Стереть цифру"
          title="Стереть (Backspace)"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
