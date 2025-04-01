import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar, User, Package, Clock, 
  FileText, CheckCircle, XCircle, AlertTriangle, DollarSign
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { RecordPayment } from './RecordPayment';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const STATUS_ICONS: { [key in 'pending' | 'in_progress' | 'completed' | 'cancelled']: LucideIcon } = {
  pending: AlertTriangle,
  in_progress: Clock,
  completed: CheckCircle,
  cancelled: XCircle
};

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_reference: string;
  created_at: string;
}

interface OrderService {
  id: string;
  service: {
    name: string;
  };
  quantity: number;
  cost: number;
}

interface CustomField {
  id: string;
  field: {
    title: string;
    value: string;
  };
}

interface OrderWorker {
  id: string;
  worker: {
    name: string;
  };
  project: {
    name: string;
  };
  status: string;
}

interface Order {
  id: string;
  order_number: string;
  client: {
    name: string;
  };
  description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  created_at: string;
  workers: OrderWorker[];
  services: OrderService[];
  payments: Payment[];
  custom_fields: CustomField[];
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
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
        .from('orders')
        .select(`
          *,
          client:clients(name),
          workers:order_workers(
            id,
            worker_id,
            worker:workers(name),
            project:projects(name)
          ),
          services:order_services(
            id,
            service_id,
            quantity,
            cost,
            service:services(name)
          ),
          custom_fields:order_custom_fields(
            id,
            field:client_custom_fields(title, value)
          )
        `)
        .eq('id', id)
        .single();
        
      const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
        .select('*')
        .eq('reference_type', 'service_order')
        .eq('reference_id', id);

      if (error) throw error;
      setOrder({...data, payments: paymentsData || []} as Order);
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

  const handleUpdateStatus = async (newStatus: Order['status']) => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Order status updated to ${STATUS_LABELS[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update order status'
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this order? This action cannot be undone.');
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Order Deleted',
        message: 'The order has been deleted successfully.'
      });
      
      // Redirect to orders list
      window.location.href = '/dashboard/orders';
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
          to="/dashboard/orders"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard/orders"
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
        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-full border ${STATUS_COLORS[order.status]} flex items-center space-x-2`}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{STATUS_LABELS[order.status]}</span>
          </div>
          <div className="relative">
            <select
              value={order.status}
              onChange={(e) => handleUpdateStatus(e.target.value as Order['status'])}
              className="appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Mark as Pending</option>
              <option value="in_progress">Mark as In Progress</option>
              <option value="completed">Mark as Completed</option>
              <option value="cancelled">Mark as Cancelled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Services</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                {order.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {service.service.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Quantity: {service.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {currencySymbol} {service.cost.toFixed(2)}
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

          {/* Custom Fields */}
          {order.custom_fields?.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Custom Information</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  {order.custom_fields.map((field) => (
                    <div key={field.id} className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {field.field.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {field.field.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <p className="text-xl font-bold text-blue-900">{currencySymbol} {order?.total_amount.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Amount Paid</p>
                    <p className="text-xl font-bold text-green-900">
                      {currencySymbol} {(order?.total_amount - (order?.outstanding_balance || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">Outstanding Balance</p>
                    <p className="text-xl font-bold text-orange-900">
                      {currencySymbol} {(order?.outstanding_balance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-500">Payment Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${order?.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                      order?.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}>
                    {order?.payment_status === 'paid' ? 'Paid' :
                     order?.payment_status === 'partially_paid' ? 'Partially Paid' :
                     'Unpaid'}
                  </span>
                </div>

                {/* Payment History */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h4>
                  {order?.payments && order.payments.length > 0 ? (
                    <div className="border rounded-lg divide-y">
                      {order.payments.map(payment => (
                        <div key={payment.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {currencySymbol} {payment.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {payment.payment_method} • {payment.payment_reference}
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

          {/* Worker Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Assigned Workers</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                {order.workers?.length ? (
                  order.workers.map(worker => (
                    <div key={worker.id} className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {worker.worker.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {worker.project.name}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No workers assigned</p>
                )}
              </div>
            </div>
          </div>

          {/* Due Date */}
          {order.due_date && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Due Date</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {format(new Date(order.due_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          )}

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

          {/* Description */}
          {order.description && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Description</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <p className="text-sm text-gray-500">{order.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}