import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { SalesOrder, PaymentMethod } from '../../types/inventory';
import { PAYMENT_METHODS } from '../../utils/inventory-constants';
import { CURRENCIES } from '../../utils/constants';

interface ReceivePaymentFormProps {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReceivePaymentForm({ order, onClose, onSuccess }: ReceivePaymentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: order.outstanding_balance.toString(),
    payment_method: 'cash' as PaymentMethod,
    transaction_reference: ''
  });
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    const amount = parseFloat(paymentData.amount);
    if (isNaN(amount) || amount <= 0 || amount > order.outstanding_balance) {
      addToast({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid payment amount'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          sales_order_id: order.id,
          amount,
          payment_method: paymentData.payment_method,
          transaction_reference: paymentData.transaction_reference.trim() || null,
          recorded_by: organization.id
        }]);

      if (paymentError) throw paymentError;

      addToast({
        type: 'success',
        title: 'Payment Recorded',
        message: 'Payment has been recorded successfully.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to record payment'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Receive Payment</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Order Number
          </label>
          <div className="mt-1 text-sm text-gray-900">
            {order.order_number}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client
          </label>
          <div className="mt-1 text-sm text-gray-900">
            {order.client?.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Total Amount
            </label>
            <div className="mt-1 text-sm text-gray-900">
              {currencySymbol} {order.total_amount.toFixed(2)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Outstanding Balance
            </label>
            <div className="mt-1 text-sm font-medium text-red-600">
              {currencySymbol} {order.outstanding_balance.toFixed(2)}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment Amount *
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">
                {currencySymbol}
              </span>
            </div>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              max={order.outstanding_balance}
              value={paymentData.amount}
              onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
              className="block w-full pl-7 pr-12 rounded-md border border-gray-300 py-2 px-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment Method *
          </label>
          <select
            required
            value={paymentData.payment_method}
            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value as PaymentMethod }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Transaction Reference
          </label>
          <input
            type="text"
            value={paymentData.transaction_reference}
            onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_reference: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Enter transaction reference (optional)"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !paymentData.amount || parseFloat(paymentData.amount) <= 0 || parseFloat(paymentData.amount) > order.outstanding_balance}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Recording...
            </>
          ) : (
            'Record Payment'
          )}
        </button>
      </div>
    </form>
  );
} 