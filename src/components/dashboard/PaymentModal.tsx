import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PAYMENT_METHODS } from '../../utils/inventory-constants';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface OutstandingItem {
  id: string;
  type: 'sales_order' | 'service_order';
  number: string;
  client_name: string;
  outstanding_balance: number;
  created_at: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
  outstandingItems: OutstandingItem[];
  isLoading: boolean;
  currencySymbol: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentRecorded,
  outstandingItems,
  isLoading,
  currencySymbol
}) => {
  const { addToast } = useUI();
  const { organization } = useAuthStore();
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; type: 'sales_order' | 'service_order'; outstandingBalance: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !organization) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const amount = formData.get('amount') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const paymentReference = formData.get('paymentReference') as string;

    if (!amount || !paymentMethod) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid payment amount'
      });
      return;
    }

    if (numericAmount > selectedOrder.outstandingBalance) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Payment amount cannot exceed outstanding balance'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('record_payment', {
        p_organization_id: organization.id,
        p_order_id: selectedOrder.id,
        p_amount: numericAmount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_recorded_by: user.id
      });

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Success',
        message: 'Payment recorded successfully'
      });

      setSelectedOrder(null);
      onClose();
      onPaymentRecorded();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to record payment'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOutstandingItems = [...outstandingItems]
    .filter(item => 
      item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedOrder ? 'Record Payment' : 'Select Order'}
            </h3>
            <button
              onClick={() => {
                onClose();
                setSelectedOrder(null);
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {selectedOrder ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount*
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{currencySymbol}</span>
                  </div>
                  <input
                    type="text"
                    name="amount"
                    max={selectedOrder.outstandingBalance}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                    required
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Outstanding Balance: {currencySymbol} {selectedOrder.outstandingBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Method*
                </label>
                <select
                  name="paymentMethod"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  required
                >
                  <option value="">Select a payment method</option>
                  {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Reference
                </label>
                <input
                  type="text"
                  name="paymentReference"
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., Check number, Transaction ID"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {isSubmitting ? 'Recording Payment...' : 'Record Payment'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6">
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Search by order number or ID..."
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredOutstandingItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No outstanding items found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOutstandingItems.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => setSelectedOrder({
                        id: item.id,
                        type: item.type,
                        outstandingBalance: item.outstanding_balance
                      })}
                      className="w-full text-left p-4 border rounded-lg hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.type === 'sales_order' ? 'Sales Order' : 'Service Order'} #{item.number}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {currencySymbol} {item.outstanding_balance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 