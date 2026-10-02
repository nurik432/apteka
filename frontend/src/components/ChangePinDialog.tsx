import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import PinPad from '@/components/PinPad';

type Step = 'current' | 'new' | 'confirm';

const stepTitles: Record<Step, string> = {
  current: 'Введите текущий PIN',
  new: 'Введите новый PIN',
  confirm: 'Повторите новый PIN',
};

export default function ChangePinDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('current');
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const fail = (message: string, backTo: Step) => {
    setError(message);
    setShakeKey(k => k + 1);
    setPin('');
    setStep(backTo);
  };

  const handleComplete = async (value: string) => {
    setError('');
    if (step === 'current') {
      setCurrentPin(value);
      setPin('');
      setStep('new');
      return;
    }
    if (step === 'new') {
      if (value === currentPin) return fail('Новый PIN совпадает с текущим', 'new');
      setNewPin(value);
      setPin('');
      setStep('confirm');
      return;
    }
    if (value !== newPin) return fail('PIN-коды не совпадают. Введите новый PIN ещё раз', 'new');

    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: currentPin, newPassword: newPin });
      toast.success('PIN успешно изменён');
      onClose();
    } catch (err: any) {
      fail(err.response?.data?.error || 'Не удалось изменить PIN', 'current');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setPin('');
    setError('');
    if (step === 'confirm') setStep('new');
    else if (step === 'new') setStep('current');
    else onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fadeIn"
      data-pos-modal
      onMouseDown={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-pin-title"
        className="w-full max-w-sm rounded-2xl p-6 animate-scaleIn shadow-xl"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="change-pin-title" className="text-lg font-bold">Смена PIN-кода</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-center text-muted-foreground mb-4">
          Шаг {step === 'current' ? 1 : step === 'new' ? 2 : 3} из 3 · {stepTitles[step]}
        </p>

        <PinPad
          value={pin}
          onChange={value => { setPin(value); if (error) setError(''); }}
          onComplete={handleComplete}
          onBack={goBack}
          disabled={loading}
          error={!!error}
          shakeKey={shakeKey}
        />

        <div className="min-h-[44px] mt-4 flex items-center justify-center" aria-live="assertive">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : error ? (
            <div className="w-full px-4 py-3 rounded-xl text-sm text-center bg-destructive-soft text-destructive">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
