import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import { 
  ArrowLeft, Calendar, User, Package, Clock, 
  FileText, CheckCircle, XCircle, AlertTriangle, DollarSign,
  X, Printer
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { RecordPayment } from './RecordPayment';
import { CancelOrderModal } from './CancelOrderModal';
import OrderReceipt from './OrderReceipt';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled'
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  delayed: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const STATUS_ICONS: Record<OrderStatus, LucideIcon> = {
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
    id: string;
    name: string;
  };
  project: {
    name: string;
  };
  status: string;
  task_description: string;
  start_date: string;
  end_date: string;
  amount: number;
}

interface Task {
  id: string;
  status: TaskStatus;
  description?: string;
  created_at: string;
  completed_at?: string;
  delay_reason?: string;
  worker_id: string;
  project_id: string;
  order_id: string;
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
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  workers: OrderWorker[];
  services: OrderService[];
  payments: Payment[];
  custom_fields: CustomField[];
  tasks: Task[];
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
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
            status,
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

      // Load tasks for this order
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(name),
          worker:workers(name),
          deductions(*)
        `)
        .eq('order_id', id);

      if (error) throw error;
      if (tasksError) throw tasksError;
      
      setOrder({...data, payments: paymentsData || [], tasks: tasksData || []} as Order);
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
        message: `Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`
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

  const handleDeleteOrder = async (reason: string, cancelWorkerTasks: boolean) => {
    if (!order) return;

    try {
      // Update order status to cancelled
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled', 
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: organization?.id || null
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Only update worker tasks if the user chose to do so
      if (cancelWorkerTasks) {
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ status: 'cancelled' })
          .eq('order_id', order.id);

        if (taskError) throw taskError;
      }

      // Update all associated payments to cancelled status
      const { error: paymentsError } = await supabase
        .from('payments')
        .update({ 
          status: 'cancelled'
        })
        .eq('reference_type', 'service_order')
        .eq('reference_id', order.id);

      if (paymentsError) throw paymentsError;
      // Refresh the order details
      await loadOrderDetails();
      
      addToast({
        type: 'success',
        title: 'Order Cancelled',
        message: 'The order and all associated worker tasks and payments have been cancelled successfully.'
      });
      
      setIsCancelModalOpen(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to cancel the order'
      });
    }
  };

  const handleUpdateWorkerStatus = async (workerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_workers')
        .update({ status: newStatus })
        .eq('id', workerId);

      if (error) throw error;

      // Refresh the order details to show updated status
      loadOrderDetails();
      
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: 'Worker task status has been updated'
      });
    } catch (error) {
      console.error('Error updating worker status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update worker status'
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus, delayReason?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        status_changed_at: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'delayed' && delayReason) {
        updateData.delay_reason = delayReason;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      // Refresh the order details to show updated status
      loadOrderDetails();
      
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Task status updated to ${TASK_STATUS_LABELS[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task status'
      });
    }
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'delayed') {
      setSelectedTask(task);
      setIsDelayModalOpen(true);
    } else {
      handleUpdateTaskStatus(task.id, newStatus);
    }
  };

  const handleDelaySubmit = () => {
    if (selectedTask && delayReason.trim()) {
      handleUpdateTaskStatus(selectedTask.id, 'delayed', delayReason.trim());
      setIsDelayModalOpen(false);
      setDelayReason('');
      setSelectedTask(null);
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
            <h2 className={`text-2xl font-bold ${order.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
              Order {order.order_number}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Created on {format(new Date(order.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-full border ${ORDER_STATUS_COLORS[order.status]} flex items-center space-x-2`}>
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
          </div>
          <button
            onClick={() => setIsReceiptOpen(true)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </button>
          {order.status !== 'cancelled' && (
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Info */}
        <div className="lg:col-span-2 space-y-6">
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
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
                  Payment Details
                </h3>
                {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
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
                    <p className={`text-xl font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-blue-900'}`}>
                      {currencySymbol} {order?.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Amount Paid</p>
                    <p className={`text-xl font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-green-900'}`}>
                      {currencySymbol} {(order?.total_amount - (order?.outstanding_balance || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-sm text-orange-600 font-medium">Outstanding Balance</p>
                    <p className={`text-xl font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-orange-900'}`}>
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
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment History</h4>
                  {order?.payments && order.payments.length > 0 ? (
                    <div className="border rounded-lg divide-y">
                      {order.payments.map(payment => (
                        <div key={payment.id} className={`p-4 flex items-center justify-between ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
                          <div>
                            <p className={`text-sm font-medium ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {currencySymbol} {payment.amount.toFixed(2)}
                            </p>
                            <p className={`text-xs mt-1 ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                              {payment.payment_method} • {payment.payment_reference}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
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

          {/* Workers Info */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Assigned Workers</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.workers?.length ? (
                  order.workers.map(worker => {
                    const workerId = (worker as any).worker_id;
                    const workerTasks = order.tasks?.filter(task => task.worker_id === workerId) || [];
                    
                    const WorkerCard = (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 hover:border-blue-500">
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <User className="h-6 w-6 text-blue-600" />
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{worker.worker.name}</h4>
                                <p className="text-sm text-gray-500">{worker.project.name}</p>
                              </div>
                            </div>
                          </div>
                          
                          {worker.task_description && (
                            <div className="mt-4">
                              <p className="text-sm text-gray-600 line-clamp-2">{worker.task_description}</p>
                            </div>
                          )}

                          {/* Task Status Section */}
                          {workerTasks.length > 0 && (
                            <div className="space-y-3">
                              {workerTasks.map(task => (
                                <div key={task.id} className={`pt-3 ${task.status === 'cancelled' ? 'opacity-75' : ''}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                          task.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                          task.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                          'bg-yellow-100 text-yellow-800'}`}>
                                        {TASK_STATUS_LABELS[task.status]}
                                      </span>
                                      <span className={`text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                                        {format(new Date(task.created_at), 'MMM d, yyyy')}
                                      </span>
                                    </div>
                                    <div className="relative">
                                      {task.status !== 'cancelled' && (
                                        <select
                                          value={task.status}
                                          onChange={(e) => {
                                            const newStatus = e.target.value as TaskStatus;
                                            handleStatusChange(task, newStatus);
                                          }}
                                          className="appearance-none bg-white border border-gray-300 rounded-md py-1 pl-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="in_progress">In Progress</option>
                                          <option value="delayed">Delayed</option>
                                          <option value="completed">Completed</option>
                                        </select>
                                      )}
                                      {task.status !== 'cancelled' && (
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {task.description && (
                                    <p className={`mt-1 text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                      {task.description}
                                    </p>
                                  )}
                                  {task.delay_reason && (
                                    <p className="mt-1 text-sm text-red-600">Delay reason: {task.delay_reason}</p>
                                  )}
                                  {task.completed_at && (
                                    <p className={`mt-1 text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                                      Completed: {format(new Date(task.completed_at), 'MMM d, yyyy HH:mm')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              {worker.start_date && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>{format(new Date(worker.start_date), 'MMM d')}</span>
                                </div>
                              )}
                              {worker.end_date && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>{format(new Date(worker.end_date), 'MMM d')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                    return workerId ? (
                      <div key={worker.id} className="block">
                        <Link
                          to={`/dashboard/workers/${workerId}`}
                          className="block"
                        >
                          <div className="flex items-center space-x-3 p-4 border-b">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{worker.worker.name}</h4>
                              <p className="text-sm text-gray-500">{worker.project.name}</p>
                            </div>
                          </div>
                        </Link>
                        <div className="p-4">
                          {worker.task_description && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-600 line-clamp-2">{worker.task_description}</p>
                            </div>
                          )}

                          {/* Task Status Section */}
                          {workerTasks.length > 0 && (
                            <div className="space-y-3">
                              {workerTasks.map(task => (
                                <div key={task.id} className={`pt-3 ${task.status === 'cancelled' ? 'opacity-75' : ''}`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                          task.status === 'delayed' ? 'bg-red-100 text-red-800' :
                                          task.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                          'bg-yellow-100 text-yellow-800'}`}>
                                        {TASK_STATUS_LABELS[task.status]}
                                      </span>
                                      <span className={`text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                                        {format(new Date(task.created_at), 'MMM d, yyyy')}
                                      </span>
                                    </div>
                                    <div className="relative">
                                      {task.status !== 'cancelled' && (
                                        <select
                                          value={task.status}
                                          onChange={(e) => {
                                            const newStatus = e.target.value as TaskStatus;
                                            handleStatusChange(task, newStatus);
                                          }}
                                          className="appearance-none bg-white border border-gray-300 rounded-md py-1 pl-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="in_progress">In Progress</option>
                                          <option value="delayed">Delayed</option>
                                          <option value="completed">Completed</option>
                                        </select>
                                      )}
                                      {task.status !== 'cancelled' && (
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {task.description && (
                                    <p className={`mt-1 text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                                      {task.description}
                                    </p>
                                  )}
                                  {task.delay_reason && (
                                    <p className="mt-1 text-sm text-red-600">Delay reason: {task.delay_reason}</p>
                                  )}
                                  {task.completed_at && (
                                    <p className={`mt-1 text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                                      Completed: {format(new Date(task.completed_at), 'MMM d, yyyy HH:mm')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              {worker.start_date && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>{format(new Date(worker.start_date), 'MMM d')}</span>
                                </div>
                              )}
                              {worker.end_date && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  <span>{format(new Date(worker.end_date), 'MMM d')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div key={worker.id} className="block">
                        {WorkerCard}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">No workers assigned</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Details Card - Consolidated */}
          <div className={`bg-white shadow rounded-lg overflow-hidden ${order.status === 'cancelled' ? 'opacity-75' : ''}`}>
            <div className="px-4 py-5 sm:px-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              {/* Client Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Client</h4>
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <span className={`text-sm font-medium ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {order.client.name}
                  </span>
                </div>
              </div>

              {/* Description */}
              {order.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                  <p className={`text-sm ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                    {order.description}
                  </p>
                </div>
              )}

              {/* Due Date */}
              {order.due_date && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Due Date</h4>
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span className={`text-sm font-medium ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {format(new Date(order.due_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              )}

              {/* Services */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Services</h4>
                <div className="space-y-3">
                  {order.services.map((service) => (
                    <div
                      key={service.id}
                      className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${order.status === 'cancelled' ? 'line-through text-gray-400' : ''}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.service.name}
                          </p>
                          <p className="text-xs text-gray-500">
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
                <div className="mt-4 pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">Total Amount</span>
                    <span className={`font-bold ${order.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {currencySymbol} {order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cancel Order Button - Only show if order is not cancelled */}
          {order.status !== 'cancelled' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Danger Zone</h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                <button
                  onClick={() => setIsCancelModalOpen(true)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Receipt Modal */}
      {isReceiptOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <OrderReceipt
              orderId={order.id}
              onClose={() => setIsReceiptOpen(false)}
            />
          </div>
        </div>
      )}

      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={(reason: string, cancelWorkerTasks: boolean) => handleDeleteOrder(reason, cancelWorkerTasks)}
      />

      {/* Delay Reason Modal */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Delay Reason</h3>
              <button
                onClick={() => {
                  setIsDelayModalOpen(false);
                  setDelayReason('');
                  setSelectedTask(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label htmlFor="delay-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Delay
              </label>
              <textarea
                id="delay-reason"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Please provide a reason for the delay..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsDelayModalOpen(false);
                  setDelayReason('');
                  setSelectedTask(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDelaySubmit}
                disabled={!delayReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}