import React from 'react';
import { Package, Pill } from 'lucide-react';
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
      {products.map((product) => {
        const isTabletSale = (product.piecesPerPack || 0) > 0;
        const pricePerTablet = isTabletSale
          ? product.sellingPrice / (product.piecesPerPack || 1)
          : null;

        return (
          <button
            key={product.id}
            className={`pos-product-card ${isTabletSale ? 'pos-product-card--tablet' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onAddProduct(product);
              refocusBarcode();
            }}
          >
            <div className="pos-product-card-name">
              {product.name}
              {isTabletSale && (
                <span className="pos-product-card-tablet-badge">
                  <Pill className="w-3 h-3" />
                  Поштучно
                </span>
              )}
            </div>
            <div className="pos-product-card-info">
              <div className="pos-product-card-prices">
                <span className="pos-product-card-price">{formatCurrency(product.sellingPrice)}</span>
                {pricePerTablet !== null && (
                  <span className="pos-product-card-price-per-tablet">
                    {formatCurrency(pricePerTablet)}/шт
                  </span>
                )}
              </div>
              <span className={`pos-product-card-stock ${product.stock <= 0 ? 'pos-product-card-stock--zero' : ''}`}>
                {isTabletSale
                  ? `${product.stock} уп. (${product.stock * (product.piecesPerPack || 1)} шт)`
                  : `${product.stock} ${product.unit || 'шт'}`
                }
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(ProductGrid);
