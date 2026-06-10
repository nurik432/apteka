import React from 'react';
import { Trash2, RotateCcw, Percent, PauseCircle, ShoppingBag } from 'lucide-react';

interface QuickActionsProps {
  onClearCart: () => void;
  onReturn: () => void;
  onDiscount: () => void;
  onHoldReceipt: () => void;
  onCustomItem: () => void;
  cartLength: number;
  heldReceiptsCount: number;
  refocusBarcode: () => void;
}

function QuickActions({
  onClearCart,
  onReturn,
  onDiscount,
  onHoldReceipt,
  onCustomItem,
  cartLength,
  heldReceiptsCount,
  refocusBarcode,
}: QuickActionsProps) {
  const actions = [
    {
      icon: ShoppingBag,
      label: 'Разный товар',
      hotkey: '',
      onClick: onCustomItem,
      disabled: false,
      variant: 'accent' as const,
    },
    {
      icon: Trash2,
      label: 'Очистить чек',
      hotkey: 'F3',
      onClick: onClearCart,
      disabled: cartLength === 0,
      variant: 'danger' as const,
    },
    {
      icon: RotateCcw,
      label: 'Возврат',
      hotkey: '',
      onClick: onReturn,
      disabled: false,
      variant: 'default' as const,
    },
    {
      icon: Percent,
      label: 'Скидка',
      hotkey: '',
      onClick: onDiscount,
      disabled: cartLength === 0,
      variant: 'default' as const,
    },
    {
      icon: PauseCircle,
      label: 'Отложить чек',
      hotkey: '',
      onClick: onHoldReceipt,
      disabled: cartLength === 0,
      badge: heldReceiptsCount > 0 ? heldReceiptsCount : undefined,
      variant: 'default' as const,
    },
  ];

  return (
    <div className="pos-right-panel">
      <div className="pos-right-panel-title">Быстрые действия</div>
      <div className="pos-quick-actions">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`pos-action-btn ${
              action.variant === 'danger' ? 'pos-action-btn--danger' : ''
            } ${
              action.variant === 'accent' ? 'pos-action-btn--accent' : ''
            }`}
            disabled={action.disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              action.onClick();
              refocusBarcode();
            }}
          >
            <action.icon className="w-5 h-5" />
            <span className="pos-action-btn-label">{action.label}</span>
            {action.hotkey && <kbd className="pos-action-btn-hotkey">{action.hotkey}</kbd>}
            {action.badge && <span className="pos-action-btn-badge">{action.badge}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(QuickActions);
