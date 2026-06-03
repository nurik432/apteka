import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, X, Check, Delete } from 'lucide-react';

interface CartItem {
  id: string;
  productId: number | null;
  name: string;
  price: number;
  purchasePrice: number;
  quantity: number;
  stock: number;
  discount: number;
  unit?: string;
}

interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  barcode?: string;
  unit?: string;
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [defaultProducts, setDefaultProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Custom item state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');

  // Calculator modal state
  const [selectedItemForQty, setSelectedItemForQty] = useState<CartItem | null>(null);
  const [qtyInput, setQtyInput] = useState<string>('');

  // Payment modal state
  const [payCashAmount, setPayCashAmount] = useState<string>('');
  const [payCardAmount, setPayCardAmount] = useState<string>('');
  const [activePaymentField, setActivePaymentField] = useState<'cash' | 'card'>('cash');

  useEffect(() => {
    searchRef.current?.focus();
    loadDefaultProducts();
  }, []);

  const loadDefaultProducts = async () => {
    try {
      const res = await api.get('/products?limit=20');
      setDefaultProducts(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Search products
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await api.get(`/products?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(res.data.data);
    } catch {
      setSearchResults([]);
    }
  };

  // Barcode scan
  const handleBarcode = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const barcode = (e.target as HTMLInputElement).value.trim();
    if (!barcode) return;

    try {
      const res = await api.get(`/products/barcode/${barcode}`);
      addToCart(res.data);
      (e.target as HTMLInputElement).value = '';
    } catch {
      setCustomBarcode(barcode);
      setCustomPrice('');
      setShowCustomModal(true);
      (e.target as HTMLInputElement).value = '';
    }
  };

  const submitCustomItem = async () => {
    const price = parseFloat(customPrice);
    if (isNaN(price) || price < 0) {
      alert('Введите корректную цену');
      return;
    }
    
    const customName = customBarcode ? `Неизвестный товар (${customBarcode})` : 'Свободная цена';
    addToCart(
      { id: null, name: customName, sellingPrice: price, purchasePrice: 0, stock: 999999, unit: 'шт' } as any, 
      price, 
      customName
    );
    setShowCustomModal(false);
    setCustomPrice('');
    setCustomBarcode('');
    searchRef.current?.focus();
  };

  const addToCart = (product: Product | any, customPrice?: number, customName?: string) => {
    const finalPrice = customPrice !== undefined ? customPrice : product.sellingPrice;
    const finalName = customName !== undefined ? customName : product.name;
    const cartItemId = `${product.id || 'custom'}-${finalName}-${finalPrice}`;

    setCart(prev => {
      const existing = prev.find(item => item.id === cartItemId);
      if (existing) {
        if (existing.quantity >= product.stock && !customPrice) {
          alert('Недостаточно товара на складе');
          return prev;
        }
        return prev.map(item =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: cartItemId,
        productId: product.id || null,
        name: finalName,
        price: finalPrice,
        purchasePrice: product.purchasePrice || 0,
        quantity: 1,
        stock: product.stock || 999999,
        discount: 0,
        unit: product.unit || 'шт',
      }];
    });
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return item;
      if (newQty > item.stock && item.stock !== 999999) {
        alert(`Недостаточно товара на складе. Доступно: ${item.stock}`);
        return item;
      }
      return { ...item, quantity: newQty };
    }));
  };

  const setItemDiscount = (id: string, discount: number) => {
    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, discount } : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setTotalDiscount(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.max(0, subtotal - itemDiscounts - totalDiscount);

  const handleCashChange = (val: string) => {
    setPayCashAmount(val);
    const cash = parseFloat(val) || 0;
    const remaining = Math.max(0, total - cash);
    setPayCardAmount(remaining > 0 ? String(remaining) : '0');
  };

  const handleCardChange = (val: string) => {
    setPayCardAmount(val);
    const card = parseFloat(val) || 0;
    const remaining = Math.max(0, total - card);
    setPayCashAmount(remaining > 0 ? String(remaining) : '0');
  };

  const handleNumpadClick = (char: string) => {
    const isCash = activePaymentField === 'cash';
    const currentVal = isCash ? payCashAmount : payCardAmount;
    let newVal = currentVal;
    
    // If it's the initial state where cash == total, and we click a number, replace it.
    if (isCash && parseFloat(currentVal) === total && char !== '.') {
      newVal = char;
    } else {
      if (newVal === '0' && char !== '.') newVal = char;
      else newVal += char;
    }
    
    if (newVal.includes('.') && newVal.split('.')[1].length > 2) return;
    if (char === '.' && currentVal.includes('.')) return;
    
    if (isCash) handleCashChange(newVal);
    else handleCardChange(newVal);
  };

  const handleNumpadDelete = () => {
    const isCash = activePaymentField === 'cash';
    let val = (isCash ? payCashAmount : payCardAmount).slice(0, -1);
    if (!val) val = '0';
    if (isCash) handleCashChange(val);
    else handleCardChange(val);
  };

  const handleNumpadClear = () => {
    if (activePaymentField === 'cash') handleCashChange('0');
    else handleCardChange('0');
  };

  const handlePayment = async () => {
    if (cart.length === 0) return;
    
    const cash = parseFloat(payCashAmount) || 0;
    const card = parseFloat(payCardAmount) || 0;
    
    if (cash + card < total - 0.01) {
      alert('Внесенная сумма меньше итоговой суммы чека');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/sales', {
        items: cart.map(item => ({
          productId: item.productId,
          name: item.name, // send name for custom items
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
        })),
        discount: totalDiscount,
        paymentType: 'mixed',
        cashAmount: cash,
        cardAmount: card,
      });

      setLastSale(res.data);
      setShowPayment(false);
      setShowReceipt(true);
      setCart([]);
      setTotalDiscount(0);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка при создании продажи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Поиск товара..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-xl text-sm"
              style={{
                background: 'var(--color-card)',
                color: 'var(--color-foreground)',
                border: '1px solid var(--color-border)',
              }}
              id="pos-search"
            />
          </div>
          {/* Barcode and Custom Item */}
          <div className="flex gap-2 w-[260px]">
            <input
              ref={barcodeRef}
              type="text"
              placeholder="Штрихкод..."
              onKeyDown={handleBarcode}
              className="w-full h-12 px-4 rounded-xl text-sm flex-1"
              style={{
                background: 'var(--color-card)',
                color: 'var(--color-foreground)',
                border: '1px solid var(--color-border)',
              }}
              id="pos-barcode"
            />
            <button
              onClick={() => { setCustomBarcode(''); setCustomPrice(''); setShowCustomModal(true); }}
              className="h-12 px-3 rounded-xl flex items-center justify-center transition-colors hover:bg-muted"
              style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
              title="Неизвестный товар (Свободная цена)"
            >
              <Banknote className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Search Results */}
        {(searchResults.length > 0 || (searchQuery.length === 0 && defaultProducts.length > 0)) && (
          <div
            className="rounded-xl overflow-hidden animate-fadeIn"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            {(searchQuery.length > 0 ? searchResults : defaultProducts).map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <div className="min-w-0 flex-1 pr-4">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Остаток: {product.stock} {product.unit || 'шт'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm text-primary">{formatCurrency(product.sellingPrice)}</p>
                  <Plus className="w-4 h-4 text-muted-foreground ml-auto" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {searchResults.length === 0 && searchQuery.length > 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Найдите товар или отсканируйте штрихкод</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Cart */}
      <div
        className="w-[400px] flex flex-col rounded-2xl"
        style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
      >
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Чек
          </h2>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              Очистить
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Чек пуст</p>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="rounded-xl p-3 animate-fadeIn"
                style={{ background: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div 
                    className="flex-1 pr-2 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSelectedItemForQty(item);
                      setQtyInput(String(item.quantity));
                    }}
                    title="Изменить количество"
                  >
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(item.price)} / {item.unit || 'шт'}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={item.quantity || ''}
                        readOnly
                        onClick={() => {
                          setSelectedItemForQty(item);
                          setQtyInput(String(item.quantity));
                        }}
                        className="w-12 h-7 text-center text-sm font-medium bg-transparent outline-none cursor-pointer hover:bg-background"
                        style={{ border: '1px solid var(--color-border)', borderRadius: '0.375rem' }}
                      />
                      <span className="text-xs text-muted-foreground ml-1">{item.unit || ''}</span>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-background transition-colors"
                      style={{ border: '1px solid var(--color-border)' }}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity - item.discount)}</p>
                </div>
                {/* Item discount */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-muted-foreground">Скидка:</label>
                  <input
                    type="number"
                    min="0"
                    value={item.discount || ''}
                    onChange={(e) => setItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                    className="w-20 h-6 px-2 rounded text-xs"
                    style={{
                      background: 'var(--color-background)',
                      color: 'var(--color-foreground)',
                      border: '1px solid var(--color-border)',
                    }}
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground">смн.</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart footer */}
        <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          {/* Total discount */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Скидка на чек:</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={totalDiscount || ''}
                onChange={(e) => setTotalDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 h-8 px-2 rounded-lg text-sm text-right"
                style={{
                  background: 'var(--color-muted)',
                  color: 'var(--color-foreground)',
                  border: '1px solid var(--color-border)',
                }}
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">смн.</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Подитог</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {(itemDiscounts + totalDiscount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Скидка</span>
                <span className="text-destructive">-{formatCurrency(itemDiscounts + totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
              <span>Итого</span>
              <span className="text-primary">{formatCurrency(Math.max(0, total))}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setPayCashAmount(String(total));
              setPayCardAmount('0');
              setActivePaymentField('cash');
              setShowPayment(true);
            }}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            id="pos-pay-btn"
          >
            <CreditCard className="w-5 h-5" />
            Оплата
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-scaleIn"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Оплата</h2>
              <button onClick={() => setShowPayment(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-center text-2xl font-bold text-primary mb-6">{formatCurrency(total)}</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Наличные</label>
                <div className="relative">
                  <Banknote className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${activePaymentField === 'cash' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  <input
                    type="text"
                    value={payCashAmount}
                    readOnly
                    onClick={() => setActivePaymentField('cash')}
                    className="w-full h-12 pl-10 pr-12 rounded-xl text-lg font-semibold cursor-pointer transition-colors"
                    style={{ 
                      background: 'var(--color-muted)', 
                      border: `2px solid ${activePaymentField === 'cash' ? 'var(--color-primary)' : 'transparent'}`, 
                      color: 'var(--color-foreground)' 
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">смн.</div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Карта</label>
                <div className="relative">
                  <CreditCard className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${activePaymentField === 'card' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <input
                    type="text"
                    value={payCardAmount}
                    readOnly
                    onClick={() => setActivePaymentField('card')}
                    className="w-full h-12 pl-10 pr-12 rounded-xl text-lg font-semibold cursor-pointer transition-colors"
                    style={{ 
                      background: 'var(--color-muted)', 
                      border: `2px solid ${activePaymentField === 'card' ? 'var(--color-primary)' : 'transparent'}`, 
                      color: 'var(--color-foreground)' 
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">смн.</div>
                </div>
              </div>

              {((parseFloat(payCashAmount) || 0) + (parseFloat(payCardAmount) || 0)) > total + 0.01 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm font-medium flex justify-between">
                  <span>Сдача:</span>
                  <span>{formatCurrency(((parseFloat(payCashAmount) || 0) + (parseFloat(payCardAmount) || 0)) - total)}</span>
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNumpadClick(String(num))}
                    className="h-12 rounded-xl text-lg font-bold hover:bg-muted active:scale-95 transition-all"
                    style={{ border: '1px solid var(--color-border)' }}
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => handleNumpadClick('.')}
                  className="h-12 rounded-xl text-lg font-bold hover:bg-muted active:scale-95 transition-all"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  .
                </button>
                <button
                  onClick={() => handleNumpadClick('0')}
                  className="h-12 rounded-xl text-lg font-bold hover:bg-muted active:scale-95 transition-all"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  0
                </button>
                <button
                  onClick={handleNumpadDelete}
                  className="h-12 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || ((parseFloat(payCashAmount) || 0) + (parseFloat(payCardAmount) || 0) < total - 0.01)}
                className="w-full h-14 mt-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
              >
                Оплатить
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-scaleIn"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold">Продажа оформлена!</h2>
              <p className="text-sm text-muted-foreground">Чек #{lastSale.id}</p>
            </div>

            <div className="space-y-2 mb-6">
              {lastSale.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate flex-1 pr-2">{item.customName || item.product?.name}</span>
                  <span>{item.quantity} {item.product?.unit || 'шт'} × {formatCurrency(item.price)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
                <span>Итого</span>
                <span className="text-primary">{formatCurrency(lastSale.finalAmount)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>Оплата</span>
                <span>
                  {lastSale.paymentType === 'cash' ? 'Наличные' : 
                   lastSale.paymentType === 'card' ? 'Карта' : 
                   `Смеш. (${formatCurrency(lastSale.cashAmount)} нал / ${formatCurrency(lastSale.cardAmount)} карта)`}
                </span>
              </div>
            </div>

            <button
              onClick={() => { setShowReceipt(false); setLastSale(null); searchRef.current?.focus(); }}
              className="w-full h-10 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
            >
              Готово
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Item Modal */}
      {showCustomModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setShowCustomModal(false)}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-scaleIn shadow-2xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Свободная цена</h2>
              <button onClick={() => setShowCustomModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {customBarcode && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
                  Штрихкод <b>{customBarcode}</b> не найден в базе.
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Введите цену продажи</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitCustomItem();
                      }
                    }}
                    className="w-full h-12 px-4 rounded-xl text-lg font-bold transition-all focus:outline-none"
                    style={{
                      background: 'var(--color-muted)',
                      color: 'var(--color-foreground)',
                      border: '2px solid var(--color-primary)',
                    }}
                    placeholder="0.00"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    смн.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={submitCustomItem}
              className="w-full h-12 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
            >
              Добавить в чек
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Quantity Calculator Modal */}
      {selectedItemForQty && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedItemForQty(null)}>
          <div
            className="w-full max-w-xs rounded-3xl p-6 animate-scaleIn shadow-2xl"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold mb-1 truncate">{selectedItemForQty.name}</h2>
              <p className="text-sm text-muted-foreground">Укажите количество</p>
            </div>
            
            <div 
              className="w-full h-16 rounded-2xl flex items-center justify-end px-4 mb-6 text-3xl font-bold font-mono tracking-wider overflow-hidden"
              style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
            >
              {qtyInput || '0'}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => setQtyInput(prev => (prev === '0' ? String(num) : (prev.length < 5 ? prev + num : prev)))}
                  className="h-14 rounded-2xl text-xl font-bold hover:bg-muted active:scale-95 transition-all"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setQtyInput('0')}
                className="h-14 rounded-2xl text-lg font-bold text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                style={{ border: '1px solid var(--color-border)' }}
              >
                C
              </button>
              <button
                onClick={() => setQtyInput(prev => (prev === '0' ? '0' : (prev.length < 5 ? prev + '0' : prev)))}
                className="h-14 rounded-2xl text-xl font-bold hover:bg-muted active:scale-95 transition-all"
                style={{ border: '1px solid var(--color-border)' }}
              >
                0
              </button>
              <button
                onClick={() => setQtyInput(prev => prev.length > 1 ? prev.slice(0, -1) : '0')}
                className="h-14 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedItemForQty(null)}
                className="flex-1 h-12 rounded-xl font-medium hover:bg-muted transition-colors"
                style={{ border: '1px solid var(--color-border)' }}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const val = parseInt(qtyInput) || 0;
                  if (val > 0) {
                    if (val > selectedItemForQty.stock && selectedItemForQty.stock !== 999999) {
                      alert(`Недостаточно товара на складе. Доступно: ${selectedItemForQty.stock}`);
                    } else {
                      setCart(prev => prev.map(i => i.id === selectedItemForQty.id ? { ...i, quantity: val } : i));
                      setSelectedItemForQty(null);
                    }
                  } else {
                    setSelectedItemForQty(null);
                  }
                }}
                className="flex-1 h-12 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/25"
              >
                Готово
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
