import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, getExpiryStatus, getExpiryBadgeClass, getExpiryLabel, notifyError } from '@/lib/utils';
import type { Category, Product } from '../types';

interface ProductSearchPanelProps {
  products: Product[];
  loading: boolean;
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddProduct: (product: Product) => void;
  onClose: () => void;
}

const formatMonth = (date: string) =>
  new Date(date).toLocaleDateString('ru-RU', { month: '2-digit', year: 'numeric' });

/** Панель поиска товара (F4): список с остатком и сроком годности, управление стрелками и Enter */
export default function ProductSearchPanel({
  products,
  loading,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onAddProduct,
  onClose,
}: ProductSearchPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => notifyError(err, 'Не удалось загрузить категории'));
    inputRef.current?.focus();
  }, []);

  // Новый список — выделение на первую строку
  useEffect(() => { setActive(0); }, [products]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, products.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const product = products[active];
      if (product && product.stock > 0) onAddProduct(product);
    }
  };

  return (
    <div className="pos-search animate-fadeIn" onKeyDown={handleKeyDown} role="dialog" aria-label="Поиск товара">
      <div className="pos-search-head">
        <div className="pos-barcode-wrapper">
          <span className="pos-barcode-icon"><Search className="w-5 h-5" /></span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Название, штрихкод или артикул"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pos-barcode-input"
            id="pos-search"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="pos-chips">
          <button
            type="button"
            className={`pos-chip ${selectedCategoryId === null ? 'pos-chip--active' : ''}`}
            onMouseDown={e => { e.preventDefault(); onSelectCategory(null); }}
          >
            Все товары
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              className={`pos-chip ${selectedCategoryId === cat.id ? 'pos-chip--active' : ''}`}
              onMouseDown={e => { e.preventDefault(); onSelectCategory(cat.id); }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pos-search-cols">
        <span>Товар</span>
        <span>Остаток</span>
        <span>Срок годности</span>
        <span className="pos-search-price">Цена</span>
      </div>

      <div className="pos-search-list" ref={listRef}>
        {loading ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="pos-search-row">
              <span className="pos-skeleton-line" style={{ width: `${55 + (i % 3) * 12}%` }} />
              <span className="pos-skeleton-line" style={{ width: 60 }} />
              <span className="pos-skeleton-line" style={{ width: 110 }} />
              <span className="pos-skeleton-line" style={{ width: 60, marginLeft: 'auto' }} />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="pos-search-empty">
            Ничего не найдено. Проверьте название или выберите другую категорию.
          </div>
        ) : (
          products.map((product, i) => {
            const pieces = product.piecesPerPack || 0;
            const outOfStock = product.stock <= 0;
            const status = getExpiryStatus(product.expiryDate ?? null);
            return (
              <button
                key={product.id}
                type="button"
                data-active={i === active}
                className={`pos-search-row ${i === active ? 'pos-search-row--active' : ''} ${outOfStock ? 'pos-search-row--off' : ''}`}
                disabled={outOfStock}
                onMouseEnter={() => setActive(i)}
                onMouseDown={e => { e.preventDefault(); if (!outOfStock) onAddProduct(product); }}
              >
                <span className="pos-search-name">
                  <b>{product.name}</b>
                  <small>
                    {product.category?.name || 'Без категории'}
                    {pieces > 0 && ` · поштучно, ${formatCurrency(product.sellingPrice / pieces)} за шт`}
                  </small>
                </span>
                <span>
                  {outOfStock ? 'Нет в наличии' : `${product.stock} ${pieces > 0 ? 'уп.' : product.unit || 'шт'}`}
                </span>
                <span className="flex items-center gap-2">
                  {product.expiryDate ? (
                    <>
                      до {formatMonth(product.expiryDate)}
                      <span className={`badge ${getExpiryBadgeClass(status)}`}>{getExpiryLabel(status)}</span>
                    </>
                  ) : '—'}
                </span>
                <span className="pos-search-price">{formatCurrency(product.sellingPrice)}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="pos-search-foot">
        <span><kbd>↑</kbd> <kbd>↓</kbd> выбор</span>
        <span><kbd>Enter</kbd> добавить в чек</span>
        <span className="ml-auto num">Найдено: {products.length}</span>
      </div>
    </div>
  );
}
