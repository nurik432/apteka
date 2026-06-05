import React, { useEffect, useState, useCallback } from 'react';
import { Search, LayoutGrid } from 'lucide-react';
import api from '@/lib/api';
import type { Category } from '../types';

interface CategoryPanelProps {
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  refocusBarcode: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

function CategoryPanel({
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  refocusBarcode,
  searchRef,
}: CategoryPanelProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  };

  const handleCategoryClick = useCallback(
    (id: number | null) => {
      onSelectCategory(id);
      refocusBarcode();
    },
    [onSelectCategory, refocusBarcode]
  );

  return (
    <div className="pos-left-panel">
      {/* Поиск по названию */}
      <div className="pos-search-wrapper">
        <Search className="pos-search-icon" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Поиск товара..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pos-search-input"
          id="pos-search"
        />
        {searchQuery && (
          <button
            className="pos-search-clear"
            onMouseDown={(e) => {
              e.preventDefault();
              onSearchChange('');
              refocusBarcode();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Горячая клавиша */}
      <div className="pos-hotkey-hint">
        <kbd>F4</kbd> — поиск товара
      </div>

      {/* Категории */}
      <div className="pos-categories-title">
        <LayoutGrid className="w-4 h-4" />
        Категории
      </div>

      <div className="pos-categories-list">
        <button
          className={`pos-category-btn ${selectedCategoryId === null ? 'pos-category-btn--active' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            handleCategoryClick(null);
          }}
        >
          <span className="pos-category-btn-name">Все товары</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`pos-category-btn ${selectedCategoryId === cat.id ? 'pos-category-btn--active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleCategoryClick(cat.id);
            }}
          >
            <span className="pos-category-btn-name">{cat.name}</span>
            {cat._count && (
              <span className="pos-category-btn-count">{cat._count.products}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(CategoryPanel);
