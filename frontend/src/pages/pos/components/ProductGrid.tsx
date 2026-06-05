import React from 'react';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onAddProduct: (product: Product) => void;
  refocusBarcode: () => void;
}

function ProductGrid({ products, loading, onAddProduct, refocusBarcode }: ProductGridProps) {
  if (loading) {
    return (
      <div className="pos-product-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="pos-product-card pos-product-card--skeleton">
            <div className="pos-skeleton-line pos-skeleton-line--short" />
            <div className="pos-skeleton-line pos-skeleton-line--long" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="pos-product-grid-empty">
        <Package className="w-8 h-8 opacity-30" />
        <p>Товары не найдены</p>
      </div>
    );
  }

  return (
    <div className="pos-product-grid">
      {products.map((product) => (
        <button
          key={product.id}
          className="pos-product-card"
          onMouseDown={(e) => {
            e.preventDefault();
            onAddProduct(product);
            refocusBarcode();
          }}
        >
          <div className="pos-product-card-name">{product.name}</div>
          <div className="pos-product-card-info">
            <span className="pos-product-card-price">{formatCurrency(product.sellingPrice)}</span>
            <span className={`pos-product-card-stock ${product.stock <= 0 ? 'pos-product-card-stock--zero' : ''}`}>
              {product.stock} {product.unit || 'шт'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default React.memo(ProductGrid);
