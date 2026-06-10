import React from 'react';
import { Plus, Minus, Trash2, ShoppingCart, Pill } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { CartItem } from '../types';

interface ReceiptTableProps {
  cart: CartItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onDoubleClickItem: (item: CartItem) => void;
  onIncreaseQty: (id: string) => void;
  onDecreaseQty: (id: string) => void;
  onRemoveItem: (id: string) => void;
  refocusBarcode: () => void;
}

function ReceiptTable({
  cart,
  selectedItemId,
  onSelectItem,
  onDoubleClickItem,
  onIncreaseQty,
  onDecreaseQty,
  onRemoveItem,
  refocusBarcode,
}: ReceiptTableProps) {
  if (cart.length === 0) {
    return (
      <div className="pos-receipt-empty">
        <ShoppingCart className="w-16 h-16 pos-receipt-empty-icon" />
        <p>Чек пуст</p>
        <p className="pos-receipt-empty-hint">Сканируйте штрихкод или выберите товар</p>
      </div>
    );
  }

  return (
    <div className="pos-receipt-table-wrapper">
      {/* Заголовок таблицы */}
      <div className="pos-receipt-header">
        <span className="pos-receipt-col-num">#</span>
        <span className="pos-receipt-col-name">Наименование</span>
        <span className="pos-receipt-col-qty">Кол-во</span>
        <span className="pos-receipt-col-price">Цена</span>
        <span className="pos-receipt-col-discount">Скидка</span>
        <span className="pos-receipt-col-total">Сумма</span>
        <span className="pos-receipt-col-actions"></span>
      </div>

      {/* Строки товаров */}
      <div className="pos-receipt-body">
        {cart.map((item, index) => {
          const itemTotal = item.price * item.quantity - item.discount;
          const isSelected = selectedItemId === item.id;
          const isTabletSale = item.piecesPerPack > 0;
          const isCustom = item.isCustom;

          return (
            <div
              key={item.id}
              className={`pos-receipt-row ${isSelected ? 'pos-receipt-row--selected' : ''}`}
              onClick={() => onSelectItem(item.id)}
              onDoubleClick={() => onDoubleClickItem(item)}
            >
              <span className="pos-receipt-col-num">{index + 1}</span>
              <span className="pos-receipt-col-name">
                <span className="pos-receipt-item-name">
                  {isTabletSale && <Pill className="w-3.5 h-3.5 pos-receipt-tablet-icon" />}
                  {item.name}
                </span>
                <span className="pos-receipt-item-unit">
                  {isCustom
                    ? 'произв.'
                    : isTabletSale
                      ? `${item.quantity} шт из ${item.piecesPerPack}`
                      : item.unit || 'шт'}
                </span>
              </span>
              <span className="pos-receipt-col-qty">
                {isCustom ? (
                  <span className="pos-receipt-qty-value">1</span>
                ) : isTabletSale ? (
                  <span className="pos-receipt-qty-value">{item.quantity}</span>
                ) : (
                  <div className="pos-receipt-qty-controls">
                    <button
                      className="pos-receipt-qty-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDecreaseQty(item.id);
                        refocusBarcode();
                      }}
                      title="Уменьшить"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="pos-receipt-qty-value">{item.quantity}</span>
                    <button
                      className="pos-receipt-qty-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onIncreaseQty(item.id);
                        refocusBarcode();
                      }}
                      title="Увеличить"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </span>
              <span className="pos-receipt-col-price">{formatCurrency(item.price)}</span>
              <span className="pos-receipt-col-discount">
                {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
              </span>
              <span className="pos-receipt-col-total pos-receipt-item-total">
                {formatCurrency(itemTotal)}
              </span>
              <span className="pos-receipt-col-actions">
                <button
                  className="pos-receipt-delete-btn"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveItem(item.id);
                    refocusBarcode();
                  }}
                  title="Удалить (Delete)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(ReceiptTable);
