import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { useHotkeys } from './hooks/useHotkeys';
import BarcodeInput from './components/BarcodeInput';
import CategoryPanel from './components/CategoryPanel';
import ReceiptTable from './components/ReceiptTable';
import ProductGrid from './components/ProductGrid';
import QuickActions from './components/QuickActions';
import CalculatorModal from './components/CalculatorModal';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import type { CartItem, Product, HeldReceipt } from './types';

export default function POSPage() {
  // ─── State ─────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [totalDiscount, setTotalDiscount] = useState(0);

  // Product browsing
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [calculatorItem, setCalculatorItem] = useState<CartItem | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Held receipts
  const [heldReceipts, setHeldReceipts] = useState<HeldReceipt[]>([]);

  // Refs
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── Barcode scanner auto-focus ────────────────────────────
  const hasModal = showPayment || showReceipt || !!calculatorItem || showDiscountModal;
  const { refocusBarcode } = useBarcodeScanner(barcodeRef, { disabled: hasModal });

  // ─── Derived values ────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(0, subtotal - itemDiscounts - totalDiscount);

  // ─── Load products by category or search ───────────────────
  const loadProducts = useCallback(async (categoryId: number | null, search: string) => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (categoryId) params.set('categoryId', String(categoryId));
      if (search) params.set('search', search);
      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data.data);
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadProducts(null, '');
  }, [loadProducts]);

  // Category change
  useEffect(() => {
    loadProducts(selectedCategoryId, searchQuery);
  }, [selectedCategoryId, loadProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search with debounce
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        loadProducts(selectedCategoryId, query);
      }, 300);
    },
    [selectedCategoryId, loadProducts]
  );

  // ─── Cart operations ──────────────────────────────────────
  const addToCart = useCallback((product: Product) => {
    const cartItemId = `product-${product.id}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('Недостаточно товара на складе');
          return prev;
        }
        return prev.map((item) =>
          item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: cartItemId,
          productId: product.id,
          name: product.name,
          price: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          quantity: 1,
          stock: product.stock,
          discount: 0,
          unit: product.unit || 'шт',
        },
      ];
    });
    setSelectedItemId(cartItemId);
  }, []);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        const res = await api.get(`/products/barcode/${barcode}`);
        addToCart(res.data);
      } catch {
        alert(`Товар со штрихкодом «${barcode}» не найден`);
      }
      refocusBarcode();
    },
    [addToCart, refocusBarcode]
  );

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === id);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.id !== id);
      }
      if (newQty > item.stock && item.stock !== 999999) {
        alert(`Недостаточно товара на складе. Доступно: ${item.stock}`);
        return prev;
      }
      return prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i));
    });
  }, []);

  const setItemQuantity = useCallback((id: string, qty: number) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  }, []);

  const removeFromCart = useCallback(
    (id: string) => {
      setCart((prev) => prev.filter((item) => item.id !== id));
      if (selectedItemId === id) setSelectedItemId(null);
    },
    [selectedItemId]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedItemId(null);
    setTotalDiscount(0);
  }, []);

  // ─── Hold / Restore receipt ────────────────────────────────
  const holdReceipt = useCallback(() => {
    if (cart.length === 0) return;
    const held: HeldReceipt = {
      id: Date.now().toString(),
      items: [...cart],
      totalDiscount,
      createdAt: new Date(),
      label: `Чек от ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
    };
    setHeldReceipts((prev) => [...prev, held]);
    clearCart();
  }, [cart, totalDiscount, clearCart]);

  // ─── Payment ──────────────────────────────────────────────
  const handlePayment = useCallback(
    async (cashAmount: number, cardAmount: number) => {
      if (cart.length === 0) return;
      setLoading(true);
      try {
        const res = await api.post('/sales', {
          items: cart.map((item) => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount,
          })),
          discount: totalDiscount,
          paymentType: 'mixed',
          cashAmount,
          cardAmount,
        });
        setLastSale(res.data);
        setShowPayment(false);
        setShowReceipt(true);
        clearCart();
      } catch (error: any) {
        alert(error.response?.data?.error || 'Ошибка при создании продажи');
      } finally {
        setLoading(false);
      }
    },
    [cart, totalDiscount, clearCart]
  );

  const handleReceiptClose = useCallback(() => {
    setShowReceipt(false);
    setLastSale(null);
    refocusBarcode();
  }, [refocusBarcode]);

  // ─── Hotkeys ──────────────────────────────────────────────
  useHotkeys({
    onPayment: () => {
      if (cart.length > 0) setShowPayment(true);
    },
    onClearCart: () => {
      if (cart.length > 0 && confirm('Очистить чек?')) clearCart();
    },
    onSearchFocus: () => searchRef.current?.focus(),
    onDeleteItem: () => {
      if (selectedItemId) removeFromCart(selectedItemId);
    },
    onIncreaseQty: () => {
      if (selectedItemId) updateQuantity(selectedItemId, 1);
    },
    onDecreaseQty: () => {
      if (selectedItemId) updateQuantity(selectedItemId, -1);
    },
    disabled: hasModal,
  });

  // ─── Discount modal (simple prompt for now) ───────────────
  const handleDiscountClick = useCallback(() => {
    const val = prompt('Скидка на чек (смн.):', String(totalDiscount));
    if (val !== null) {
      setTotalDiscount(parseFloat(val) || 0);
    }
  }, [totalDiscount]);

  // ─── Return (placeholder) ─────────────────────────────────
  const handleReturn = useCallback(() => {
    alert('Функция возврата: используйте раздел "История продаж" для оформления возврата.');
  }, []);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="pos-layout">
      {/* Left Panel — Categories */}
      <CategoryPanel
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        refocusBarcode={refocusBarcode}
        searchRef={searchRef}
      />

      {/* Center — Main area */}
      <div className="pos-center">
        {/* Barcode input */}
        <BarcodeInput
          ref={barcodeRef}
          onScan={handleBarcodeScan}
          refocusBarcode={refocusBarcode}
        />

        {/* Receipt table */}
        <div className="pos-receipt-area">
          <ReceiptTable
            cart={cart}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onDoubleClickItem={(item) => setCalculatorItem(item)}
            onIncreaseQty={(id) => updateQuantity(id, 1)}
            onDecreaseQty={(id) => updateQuantity(id, -1)}
            onRemoveItem={removeFromCart}
            refocusBarcode={refocusBarcode}
          />
        </div>

        {/* Footer — totals & payment */}
        <div className="pos-center-footer">
          <div className="pos-totals">
            <div className="pos-totals-row">
              <span>Подитог</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {(itemDiscounts + totalDiscount) > 0 && (
              <div className="pos-totals-row pos-totals-row--discount">
                <span>Скидка</span>
                <span>-{formatCurrency(itemDiscounts + totalDiscount)}</span>
              </div>
            )}
            <div className="pos-totals-row pos-totals-row--grand">
              <span>ИТОГО</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            className="pos-btn pos-btn--pay pos-btn--pay-main"
            disabled={cart.length === 0}
            onMouseDown={(e) => {
              e.preventDefault();
              setShowPayment(true);
            }}
            id="pos-pay-btn"
          >
            <CreditCard className="w-6 h-6" />
            <span>Оплата</span>
            <kbd>F2</kbd>
          </button>
        </div>

        {/* Bottom — Product grid */}
        <div className="pos-bottom-panel">
          <ProductGrid
            products={products}
            loading={productsLoading}
            onAddProduct={addToCart}
            refocusBarcode={refocusBarcode}
          />
        </div>
      </div>

      {/* Right Panel — Quick Actions */}
      <QuickActions
        onClearCart={() => { if (cart.length > 0 && confirm('Очистить чек?')) clearCart(); }}
        onReturn={handleReturn}
        onDiscount={handleDiscountClick}
        onHoldReceipt={holdReceipt}
        cartLength={cart.length}
        heldReceiptsCount={heldReceipts.length}
        refocusBarcode={refocusBarcode}
      />

      {/* ─── Modals ──────────────────────────────────────── */}
      {calculatorItem && (
        <CalculatorModal
          item={calculatorItem}
          onConfirm={(id, qty) => {
            setItemQuantity(id, qty);
            setCalculatorItem(null);
            refocusBarcode();
          }}
          onClose={() => {
            setCalculatorItem(null);
            refocusBarcode();
          }}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={total}
          onConfirm={handlePayment}
          onClose={() => {
            setShowPayment(false);
            refocusBarcode();
          }}
          loading={loading}
        />
      )}

      {showReceipt && lastSale && (
        <ReceiptModal sale={lastSale} onClose={handleReceiptClose} />
      )}
    </div>
  );
}
