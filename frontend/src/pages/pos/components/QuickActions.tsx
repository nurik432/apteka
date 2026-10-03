import React from 'react';
import { Trash2, RotateCcw, Percent, PauseCircle, Plus, Search, ListRestart, Printer } from 'lucide-react';

interface QuickActionsProps {
  onSearch: () => void;
  onClearCart: () => void;
  onReturn: () => void;
  onDiscount: () => void;
  onHoldReceipt: () => void;
  onShowHeld: () => void;
  onCustomItem: () => void;
  onKkm: () => void;
  cartLength: number;
  heldReceiptsCount: number;
  refocusBarcode: () => void;
}

function QuickActions({
  onSearch,
  onClearCart,
  onReturn,
  onDiscount,
  onHoldReceipt,
  onShowHeld,
  onCustomItem,
  onKkm,
  cartLength,
  heldReceiptsCount,
  refocusBarcode,
}: QuickActionsProps) {
  const actions = [
    { icon: Search, label: 'Поиск товара', hotkey: 'F4', onClick: onSearch, disabled: false, keepFocus: true },
    { icon: Plus, label: 'Разный товар', onClick: onCustomItem, disabled: false, keepFocus: true },
    { icon: Percent, label: 'Скидка', onClick: onDiscount, disabled: cartLength === 0 },
    { icon: PauseCircle, label: 'Отложить чек', onClick: onHoldReceipt, disabled: cartLength === 0 },
    {
      icon: ListRestart,
      label: 'Отложенные',
      onClick: onShowHeld,
      disabled: heldReceiptsCount === 0,
      badge: heldReceiptsCount > 0 ? heldReceiptsCount : undefined,
      keepFocus: true,
    },
    { icon: Printer, label: 'ККМ', onClick: onKkm, disabled: false, keepFocus: true },
    { icon: RotateCcw, label: 'Возврат', onClick: onReturn, disabled: false },
    { icon: Trash2, label: 'Очистить чек', hotkey: 'F3', onClick: onClearCart, disabled: cartLength === 0, danger: true },
  ];

  return (
    <div className="pos-quick-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          className={`pos-action-btn ${action.danger ? 'pos-action-btn--danger' : ''}`}
          disabled={action.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            action.onClick();
            // действия, открывающие своё окно, сами управляют фокусом
            if (!action.keepFocus) refocusBarcode();
          }}
        >
          <action.icon className="w-[18px] h-[18px]" />
          <span className="pos-action-btn-label">{action.label}</span>
          {action.hotkey && <kbd>{action.hotkey}</kbd>}
          {action.badge && <span className="pos-action-btn-badge">{action.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export default React.memo(QuickActions);
