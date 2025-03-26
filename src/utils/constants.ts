export const CURRENCIES: Record<string, { name: string; symbol: string }> = {
  GHS: { name: 'Ghanaian Cedi', symbol: '₵' },
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  NGN: { name: 'Nigerian Naira', symbol: '₦' }
};

export const ORDER_STATUS_COLORS = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  delayed: { bg: 'bg-orange-100', text: 'text-orange-800', hover: 'hover:bg-orange-200' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200' }
};

export const ORDER_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  cancelled: 'Cancelled'
};