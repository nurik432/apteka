import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CreditCard } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, notifyError, getExpiryStatus, getExpiryBadgeClass, getExpiryLabel } from '@/lib/utils';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { useHotkeys } from './hooks/useHotkeys';
import BarcodeInput from './components/BarcodeInput';
import ReceiptTable from './components/ReceiptTable';
import ProductSearchPanel from './components/ProductSearchPanel';
import HeldReceiptsModal from './components/HeldReceiptsModal';
import KkmModal from './components/KkmModal';
import QuickActions from './components/QuickActions';
import CalculatorModal from './components/CalculatorModal';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import DiscountModal from './components/DiscountModal';
import TabletQtyModal from './components/TabletQtyModal';
import CustomItemModal from './components/CustomItemModal';
import type { CartItem, Product, HeldReceipt } from './types';
import { toast } from 'sonner';

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
  const [lastChange, setLastChange] = useState(0);
  const [calculatorItem, setCalculatorItem] = useState<CartItem | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tablet qty modal
  const [tabletProduct, setTabletProduct] = useState<Product | null>(null);

  // Custom item modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);

  // Held receipts
  const [heldReceipts, setHeldReceipts] = useState<HeldReceipt[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  // Product search panel (F4)
  const [showSearch, setShowSearch] = useState(false);

  // Окно ККМ: чеки последних продаж и смена
  const [showKkm, setShowKkm] = useState(false);

  // Refs
  const barcodeRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ─── Barcode scanner auto-focus ────────────────────────────
  // Панель поиска держит фокус в своём поле, поэтому на время её работы сканер и горячие клавиши отключены
  const hasModal = showPayment || showReceipt || !!calculatorItem || showDiscountModal || !!tabletProduct || showCustomItemModal || showHeld || showSearch || showKkm;
  const { refocusBarcode } = useBarcodeScanner(barcodeRef, { disabled: hasModal });

  // ─── Derived values ────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(0, subtotal - itemDiscounts - totalDiscount);
  const selectedItem = cart.find((item) => item.id === selectedItemId);

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
      notifyError(e, 'Не удалось загрузить товары');
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
    // If product has piecesPerPack, open tablet modal
    if ((product.piecesPerPack || 0) > 0) {
      setTabletProduct(product);
      return;
    }

    const cartItemId = `product-${product.id}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Недостаточно товара на складе');
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
          piecesPerPack: 0,
          expiryDate: product.expiryDate,
        },
      ];
    });
    setSelectedItemId(cartItemId);
  }, []);

  // ─── Add tablet item to cart ──────────────────────────────
  const addTabletToCart = useCallback((product: Product, tabletCount: number) => {
    const piecesPerPack = product.piecesPerPack || 1;
    const pricePerTablet = product.sellingPrice / piecesPerPack;
    const purchasePricePerTablet = product.purchasePrice / piecesPerPack;
    const cartItemId = `tablet-${product.id}-${Date.now()}`;

    setCart((prev) => [
      ...prev,
      {
        id: cartItemId,
        productId: product.id,
        name: product.name,
        price: pricePerTablet,
        purchasePrice: purchasePricePerTablet,
        quantity: tabletCount,
        stock: product.stock * piecesPerPack, // доступно таблеток
        discount: 0,
        unit: 'шт',
        piecesPerPack: piecesPerPack,
        expiryDate: product.expiryDate,
      },
    ]);
    setSelectedItemId(cartItemId);
    setTabletProduct(null);
    refocusBarcode();
  }, [refocusBarcode]);

  // ─── Add custom item to cart ──────────────────────────────
  const addCustomItem = useCallback((name: string, amount: number) => {
    const cartItemId = `custom-${Date.now()}`;

    setCart((prev) => [
      ...prev,
      {
        id: cartItemId,
        productId: null,
        name,
        price: amount,
        purchasePrice: 0,
        quantity: 1,
        stock: 999999,
        discount: 0,
        unit: 'шт',
        piecesPerPack: 0,
        isCustom: true,
      },
    ]);
    setSelectedItemId(cartItemId);
    setShowCustomItemModal(false);
    refocusBarcode();
  }, [refocusBarcode]);

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      try {
        const res = await api.get(`/products/barcode/${barcode}`);
        addToCart(res.data);
      } catch {
        toast.error(`Товар со штрихкодом «${barcode}» не найден`);
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
        toast.error(`Недостаточно товара на складе. Доступно: ${item.stock}`);
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

  // Вернуть отложенный чек в работу; текущий непустой чек при этом откладывается
  const restoreReceipt = useCallback((receipt: HeldReceipt) => {
    setHeldReceipts((prev) => {
      const rest = prev.filter((r) => r.id !== receipt.id);
      if (cart.length === 0) return rest;
      const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      return [...rest, { id: Date.now().toString(), items: [...cart], totalDiscount, createdAt: new Date(), label: `Чек от ${time}` }];
    });
    setCart(receipt.items);
    setTotalDiscount(receipt.totalDiscount);
    setSelectedItemId(receipt.items[0]?.id ?? null);
    setShowHeld(false);
  }, [cart, totalDiscount]);

  // ─── Product search panel ─────────────────────────────────
  const closeSearch = useCallback(() => {
    setShowSearch(false);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchQuery('');
    setSelectedCategoryId(null);
    loadProducts(null, '');
  }, [loadProducts]);

  const addFromSearch = useCallback((product: Product) => {
    closeSearch();
    addToCart(product);
  }, [closeSearch, addToCart]);

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
        setLastChange(Math.max(0, cashAmount + cardAmount - total));
        setShowPayment(false);
        setShowReceipt(true);
        clearCart();
      } catch (error: any) {
        notifyError(error, 'Ошибка при создании продажи');
      } finally {
        setLoading(false);
      }
    },
    [cart, totalDiscount, total, clearCart]
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
    onSearchFocus: () => setShowSearch(true),
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

  // ─── Discount modal ───────────────────────────────────────
  const handleDiscountClick = useCallback(() => setShowDiscountModal(true), []);

  // ─── Return (placeholder) ─────────────────────────────────
  const handleReturn = useCallback(() => {
    toast.info('Функция возврата: используйте раздел "История продаж" для оформления возврата.');
  }, []);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="pos-layout">
      {/* Левая часть — штрихкод и чек */}
      <div className="pos-main">
        <BarcodeInput
          ref={barcodeRef}
          onScan={handleBarcodeScan}
          refocusBarcode={refocusBarcode}
        />

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

        <div className="pos-hints">
          <span className="pos-hints-count">Позиций в чеке: {cart.length}</span>
          <span><kbd>+</kbd> <kbd>−</kbd> количество</span>
          <span><kbd>Del</kbd> удалить позицию</span>
          <span>Двойной клик — ввести количество</span>
        </div>
      </div>

      {/* Правая колонка — сумма, оплата, действия */}
      <aside className="pos-side">
        <div>
          <div className="pos-total-label">К оплате</div>
          <div className="pos-total-value">
            {formatCurrency(total).replace(' смн.', '')} <small>смн.</small>
          </div>
          <div className="pos-total-rows">
            <div>
              <span>Подитог</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {(itemDiscounts + totalDiscount) > 0 && (
              <div className="pos-total-discount">
                <span>Скидка</span>
                <span>−{formatCurrency(itemDiscounts + totalDiscount)}</span>
              </div>
            )}
          </div>
        </div>

        <button
          className="pos-pay"
          disabled={cart.length === 0}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowPayment(true);
          }}
          id="pos-pay-btn"
        >
          <CreditCard className="w-[26px] h-[26px]" />
          <span>Оплата</span>
          <kbd>F2</kbd>
        </button>

        <QuickActions
          onSearch={() => setShowSearch(true)}
          onClearCart={() => { if (cart.length > 0 && confirm('Очистить чек?')) clearCart(); }}
          onReturn={handleReturn}
          onDiscount={handleDiscountClick}
          onHoldReceipt={holdReceipt}
          onShowHeld={() => setShowHeld(true)}
          onCustomItem={() => setShowCustomItemModal(true)}
          onKkm={() => setShowKkm(true)}
          cartLength={cart.length}
          heldReceiptsCount={heldReceipts.length}
          refocusBarcode={refocusBarcode}
        />

        {selectedItem && !selectedItem.isCustom && (
          <div className="pos-selinfo">
            <span className="pos-selinfo-name">{selectedItem.name}</span>
            <div className="pos-selinfo-row">
              <span>Остаток</span>
              <span>{selectedItem.stock} {selectedItem.piecesPerPack > 0 ? 'шт' : selectedItem.unit || 'шт'}</span>
            </div>
            <div className="pos-selinfo-row">
              <span>Срок годности</span>
              <span>
                {selectedItem.expiryDate ? (
                  <>
                    до {new Date(selectedItem.expiryDate).toLocaleDateString('ru-RU', { month: '2-digit', year: 'numeric' })}
                    <span className={`badge ${getExpiryBadgeClass(getExpiryStatus(selectedItem.expiryDate))}`}>
                      {getExpiryLabel(getExpiryStatus(selectedItem.expiryDate))}
                    </span>
                  </>
                ) : 'не указан'}
              </span>
            </div>
            <div className="pos-selinfo-row">
              <span>Цена</span>
              <span>{formatCurrency(selectedItem.price)}</span>
            </div>
          </div>
        )}
      </aside>

      {showSearch && (
        <ProductSearchPanel
          products={products}
          loading={productsLoading}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onAddProduct={addFromSearch}
          onClose={closeSearch}
        />
      )}

      {showHeld && (
        <HeldReceiptsModal
          receipts={heldReceipts}
          onRestore={restoreReceipt}
          onClose={() => setShowHeld(false)}
        />
      )}

      {showKkm && (
        <KkmModal
          onClose={() => {
            setShowKkm(false);
            refocusBarcode();
          }}
        />
      )}

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

      {tabletProduct && (
        <TabletQtyModal
          product={tabletProduct}
          onConfirm={addTabletToCart}
          onClose={() => {
            setTabletProduct(null);
            refocusBarcode();
          }}
        />
      )}

      {showCustomItemModal && (
        <CustomItemModal
          onConfirm={addCustomItem}
          onClose={() => {
            setShowCustomItemModal(false);
            refocusBarcode();
          }}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={total}
          itemsCount={cart.length}
          onConfirm={handlePayment}
          onClose={() => {
            setShowPayment(false);
            refocusBarcode();
          }}
          loading={loading}
        />
      )}

      {showDiscountModal && (
        <DiscountModal
          subtotal={subtotal - itemDiscounts}
          current={totalDiscount}
          onConfirm={(value) => {
            setTotalDiscount(value);
            setShowDiscountModal(false);
          }}
          onClose={() => setShowDiscountModal(false)}
        />
      )}

      {showReceipt && lastSale && (
        <ReceiptModal sale={lastSale} change={lastChange} onClose={handleReceiptClose} />
      )}
    </div>
  );
}
