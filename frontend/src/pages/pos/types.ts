export interface CartItem {
  id: string;
  productId: number | null;
  name: string;
  price: number;
  purchasePrice: number;
  quantity: number;
  stock: number;
  discount: number;
  unit?: string;
  piecesPerPack: number;
  isCustom?: boolean;
}

export interface Product {
  id: number;
  name: string;
  sellingPrice: number;
  purchasePrice: number;
  stock: number;
  barcode?: string;
  unit?: string;
  piecesPerPack?: number;
  categoryId?: number | null;
  category?: Category | null;
  form?: string;
  dosage?: string;
  image?: string | null;
}

export interface Category {
  id: number;
  name: string;
  _count?: { products: number };
}

export interface HeldReceipt {
  id: string;
  items: CartItem[];
  totalDiscount: number;
  createdAt: Date;
  label: string;
}
