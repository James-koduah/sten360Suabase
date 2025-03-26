import { ProductCategory, PaymentMethod, PaymentStatus } from '../types/inventory';

export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = {
  raw_material: 'Raw Material',
  finished_good: 'Finished Good',
  packaging: 'Packaging',
  other: 'Other'
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
  other: 'Other'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  paid: 'Paid'
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string; hover: string }> = {
  unpaid: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    hover: 'hover:bg-red-200'
  },
  partially_paid: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200'
  },
  paid: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200'
  }
};

export const PRODUCT_CATEGORY_COLORS: Record<ProductCategory, { bg: string; text: string; hover: string }> = {
  raw_material: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200'
  },
  finished_good: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200'
  },
  packaging: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200'
  },
  other: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-200'
  }
}; 