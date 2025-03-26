export type ProductCategory = 'raw_material' | 'finished_good' | 'packaging' | 'other';

export type OrderStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentMethod = 'cash' | 'mobile_money' | 'bank_transfer' | 'other';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: ProductCategory;
  sku: string;
  unit_price: number;
  stock_quantity: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  organization_id: string;
  client_id: string;
  order_number: string;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    name: string;
  };
  items?: SalesOrderItem[];
  payments?: Payment[];
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom_item: boolean;
  created_at: string;
  product?: Product;
}

export interface Payment {
  id: string;
  sales_order_id: string;
  amount: number;
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer' | 'other';
  transaction_reference: string | null;
  recorded_by: string;
  created_at: string;
  recorded_by_user?: {
    name: string;
  };
} 