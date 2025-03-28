import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar, User, Package, CreditCard,
  FileText, DollarSign
} from 'lucide-react';
import { RecordPayment } from '../orders/RecordPayment';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../utils/inventory-constants';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  created_at: string;
  recorded_by: string;
}

interface SalesOrderItem {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom_item: boolean;
  product?: {
    id: string;
    name: string;
    stock_quantity: number;
  };
}

interface SalesOrder {
  id: string;
  order_number: string;
  client: {
    name: string;
  };
  notes: string;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  created_at: string;
  items: SalesOrderItem[];
  payments: Payment[];
}

export default function SalesOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  useEffect(() => {
    if (!id) return;
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          client:clients(name),
          items:sales_order_items(
            id,
            product_id,
            name,
            quantity,
            unit_price,
            total_price,
            is_custom_item,
            product:products(
              id,
              name,
              stock_quantity
            )
          ),
          payments:payments(
            id,
            amount,
            payment_method,
            transaction_reference,
            created_at,
            recorded_by
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data as SalesOrder);
    } catch (error) {
      console.error('Error loading order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load order details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this order? This action cannot be undone.');
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Order Deleted',
        message: 'The order has been deleted successfully.'
      });
      
      // Redirect to orders list
      window.location.href = '/dashboard/sales';
    } catch (error) {
      console.error('Error deleting order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete order. Please try again.'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found.</p>
        <Link
          to="/dashboard/sales"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sales Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard/sales"
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Order {order.order_number}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Created on {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Items</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Quantity: {item.quantity} × {currencySymbol} {item.unit_price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {currencySymbol} {item.total_price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-900">Total Amount</span>
                  <span className="font-bold text-gray-900">
                    {currencySymbol} {order.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Notes</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <p className="text-sm text-gray-500">{order.notes}</p>
              </div>
            </div>
          )}

          {/* Payment Details Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
                  Payment Details
                </h3>
                {order.payment_status !== 'paid' && (
                  <RecordPayment
                    orderId={order.id}
                    outstandingBalance={order.outstanding_balance}
                    onPaymentRecorded={loadOrderDetails}
                  />
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Payment Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Total Amount</p>
                    <p className="text-xl font-bold text-blue-900">{currencySymbol} {order.total_amount.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Amount Paid</p>
                    <p className="text-xl font-bold text-green-900">
                      {currencySymbol} {(order.total_amount - order.outstanding_balance).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">Outstanding Balance</p>
                    <p className="text-xl font-bold text-orange-900">
                      {currencySymbol} {order.outstanding_balance.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-500">Payment Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${PAYMENT_STATUS_COLORS[order.payment_status].bg}
                    ${PAYMENT_STATUS_COLORS[order.payment_status].text}`}>
                    {PAYMENT_STATUS_LABELS[order.payment_status]}
                  </span>
                </div>

                {/* Payment History */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h4>
                  {order.payments && order.payments.length > 0 ? (
                    <div className="border rounded-lg divide-y">
                      {order.payments.map(payment => (
                        <div key={payment.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {currencySymbol} {payment.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {payment.payment_method} • {payment.transaction_reference}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {format(new Date(payment.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No payments recorded yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Client</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">
                  {order.client.name}
                </span>
              </div>
            </div>
          </div>

          {/* Delete Order Button */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Danger Zone</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <button
                onClick={() => handleDeleteOrder(order.id)}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 