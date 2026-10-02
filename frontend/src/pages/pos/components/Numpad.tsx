import { Delete } from 'lucide-react';

/** Клавиши: цифры, '.', 'C' (очистить), 'BS' (стереть) */
export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'C' | 'BS';

interface NumpadProps {
  keys: NumpadKey[];
  onKey: (key: NumpadKey) => void;
}

const keyLabels: Partial<Record<NumpadKey, string>> = { BS: 'Стереть', C: 'Очистить' };

export default function Numpad({ keys, onKey }: NumpadProps) {
  return (
    <div className="pos-pad">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          className={`pos-pad-key ${key === 'BS' || key === 'C' ? 'pos-pad-key--muted' : ''}`}
          aria-label={keyLabels[key]}
          // mousedown + preventDefault: фокус остаётся в поле ввода модалки
          onMouseDown={e => {
            e.preventDefault();
            onKey(key);
          }}
        >
          {key === 'BS' ? <Delete className="w-5 h-5" /> : key}
        </button>
      ))}
    </div>
  );
}
