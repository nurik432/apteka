import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReceiptModalProps {
  sale: any;
  onClose: () => void;
}

function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  // Keyboard Esc / Enter to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="pos-modal-overlay"
      data-pos-modal
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pos-receipt-modal animate-scaleIn">
        {/* Success icon */}
        <div className="pos-receipt-success-icon">
          <Check className="w-10 h-10" />
        </div>

        <h2 className="pos-receipt-modal-title">Продажа оформлена!</h2>
        <p className="pos-receipt-modal-subtitle">Чек #{sale.id}</p>

        {/* Items */}
        <div className="pos-receipt-modal-items">
          {sale.items?.map((item: any) => (
            <div key={item.id} className="pos-receipt-modal-item">
              <span className="pos-receipt-modal-item-name">
                {item.customName || item.product?.name}
              </span>
              <span className="pos-receipt-modal-item-detail">
                {item.quantity} {item.product?.unit || 'шт'} × {formatCurrency(item.price)}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pos-receipt-modal-total">
          <span>Итого</span>
          <span className="pos-receipt-modal-total-value">
            {formatCurrency(sale.finalAmount)}
          </span>
        </div>

        {/* Payment info */}
        <div className="pos-receipt-modal-payment">
          <span>Оплата</span>
          <span>
            {sale.paymentType === 'cash'
              ? 'Наличные'
              : sale.paymentType === 'card'
                ? 'Карта'
                : `Смеш. (${formatCurrency(sale.cashAmount)} нал / ${formatCurrency(sale.cardAmount)} карта)`}
          </span>
        </div>

        {/* Close button */}
        <button className="pos-btn pos-btn--primary pos-receipt-modal-close" onClick={onClose}>
          Готово
        </button>
      </div>
    </div>,
    document.body
  );
}

export default React.memo(ReceiptModal);
