import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, User, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { SalesOrder } from '../../types/inventory';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../utils/inventory-constants';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import CreateSalesOrderForm from './CreateSalesOrderForm';
import { RecordPayment } from '../orders/RecordPayment';

type PaymentStatus = keyof typeof PAYMENT_STATUS_LABELS;

export default function SalesOrdersList() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  useEffect(() => {
    if (!organization) return;
    loadOrders();
  }, [organization]);

  const loadOrders = async () => {
    if (!organization?.id) return;

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
            product:products(*)
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
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load orders'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = await confirm({
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('sales_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderId));
      addToast({
        type: 'success',
        title: 'Order Deleted',
        message: 'Order has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete order'
      });
    }
  };

  const filteredOrders = orders.filter(order =>
    (statusFilter === 'all' || order.payment_status === statusFilter) &&
    (order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     order.client?.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Orders</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your sales orders and payments</p>
        </div>
        <button
          onClick={() => setShowAddOrder(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Sale
        </button>
      </div>

      {showAddOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddOrder(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
              <CreateSalesOrderForm
                onClose={() => setShowAddOrder(false)}
                onSuccess={loadOrders}
              />
            </div>
          </div>
        </div>
      )}

      {showPaymentForm && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => {
                setShowPaymentForm(false);
                setSelectedOrder(null);
              }} 
            />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold leading-6 text-gray-900">
                        Record Payment
                      </h3>
                      <button
                        onClick={() => {
                          setShowPaymentForm(false);
                          setSelectedOrder(null);
                        }}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <RecordPayment
                      orderId={selectedOrder.id}
                      outstandingBalance={selectedOrder.outstanding_balance}
                      onPaymentRecorded={() => {
                        setShowPaymentForm(false);
                        setSelectedOrder(null);
                        loadOrders();
                      }}
                      onCancel={() => {
                        setShowPaymentForm(false);
                        setSelectedOrder(null);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b space-y-4">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                statusFilter === 'all'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              All Orders
            </button>
            {(Object.entries(PAYMENT_STATUS_LABELS) as [PaymentStatus, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  statusFilter === key
                    ? `${PAYMENT_STATUS_COLORS[key].bg} ${PAYMENT_STATUS_COLORS[key].text}`
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="ml-2 flex-1 outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredOrders.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders found matching your search.'
                : 'No orders created yet. Start by creating a new order.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          {order.client?.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {order.items?.map(item => (
                          <div key={item.id} className="flex items-center text-sm">
                            <Package className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-900">{item.name}</span>
                            <span className="text-gray-500 ml-2">
                              × {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currencySymbol} {order.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          order.payment_status === 'paid'
                            ? 'text-green-600'
                            : order.payment_status === 'partially_paid'
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}>
                          {currencySymbol} {order.outstanding_balance.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {PAYMENT_STATUS_LABELS[order.payment_status]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        PAYMENT_STATUS_COLORS[order.payment_status].bg
                      } ${
                        PAYMENT_STATUS_COLORS[order.payment_status].text
                      }`}>
                        {PAYMENT_STATUS_LABELS[order.payment_status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {order.payment_status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPaymentForm(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <CreditCard className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {/* TODO: Implement edit */}}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
} 