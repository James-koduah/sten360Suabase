import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { ShoppingCart, DollarSign, Package, CheckCircle, Clock, X, CreditCard } from 'lucide-react';
import { CURRENCIES, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../utils/constants';
import { PAYMENT_METHODS } from '../utils/inventory-constants';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useUI } from '../context/UIContext';
import { StatCards } from './dashboard/StatCards';
import { QuickActions } from './dashboard/QuickActions';
import { RevenueChart } from './dashboard/RevenueChart';
import { OrderStats } from './dashboard/OrderStats';
import { PaymentModal } from './dashboard/PaymentModal';

// Helper function to format numbers with commas
const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

interface Stats {
  activeOrders: number;
  revenueToday: number;
  outstandingAmount: number;
  currentMonthRevenue: number;
  ordersToday: number;
  salesToday: number;
  outstandingSales?: number;
  outstandingOrders?: number;
  completedOrdersToday: number;
  completedTasksToday: number;
  ordersDueToday: number;
  monthlyOrderStats: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
}

interface DailyRevenue {
  date: string;
  total: number;
  sales: number;
  service: number;
}

type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface OrderStatusData {
  name: string;
  value: number;
  status: OrderStatus;
}

interface DailyOrderStats {
  date: string;
  orders: number;
}

interface Payment {
  amount: number;
  reference_id: string;
  reference_type: string;
  created_at: string;
}

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
  orderId: string;
  outstandingBalance: number;
  referenceType: 'sales_order' | 'service_order';
}

interface OutstandingItem {
  id: string;
  type: 'sales_order' | 'service_order';
  number: string;
  client_name: string;
  outstanding_balance: number;
  created_at: string;
}

interface OrderWithClient {
  id: string;
  order_number: string;
  outstanding_balance: number;
  created_at: string;
  client: {
    name: string;
  };
}

const RecordPaymentModal = ({ isOpen, onClose, onPaymentRecorded, orderId, outstandingBalance, referenceType }: RecordPaymentModalProps) => {
  const { addToast } = useUI();
  const { organization } = useAuthStore();
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    if (numericAmount > outstandingBalance) {
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
        p_organization_id: organization?.id,
        p_order_id: orderId,
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
      setAmount('');
      setPaymentMethod('');
      setPaymentReference('');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount*
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  max={outstandingBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="0.00"
                  required
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Outstanding Balance: ${outstandingBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Method*
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., Check number, Transaction ID"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
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
        </div>
      </div>
    </div>
  );
};

export default function DashboardOverview() {
  const { organization } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    activeOrders: 0,
    revenueToday: 0,
    outstandingAmount: 0,
    currentMonthRevenue: 0,
    ordersToday: 0,
    salesToday: 0,
    completedOrdersToday: 0,
    completedTasksToday: 0,
    ordersDueToday: 0,
    monthlyOrderStats: {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    }
  });
  const { addToast } = useUI();
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [dailyOrderStats, setDailyOrderStats] = useState<DailyOrderStats[]>([]);
  const [loadedStats, setLoadedStats] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; type: 'sales_order' | 'service_order'; outstandingBalance: number } | null>(null);
  const [outstandingItems, setOutstandingItems] = useState<OutstandingItem[]>([]);
  const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '$';

  // Calculate interval based on screen width
  const getXAxisInterval = () => {
    if (screenWidth > 900) return 0;
    if (screenWidth > 600) return 3;
    return 4;
  };

  // Move load functions outside of useEffect
  const loadBasicStats = async () => {
    if (!organization) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
      const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

      // Run all queries in parallel
      const [
        activeOrdersResult,
        ordersTodayResult,
        salesTodayResult,
        outstandingOrdersResult,
        outstandingSalesResult,
        completedOrdersResult,
        completedTasksResult,
        ordersDueResult,
        todayRevenueResult,
        monthRevenueResult
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'cancelled'),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'cancelled')
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('sales_orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('orders')
          .select('outstanding_balance')
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'cancelled'),
        supabase
          .from('sales_orders')
          .select('outstanding_balance')
          .eq('organization_id', organization.id),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'completed')
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'completed')
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'cancelled')
          .eq('due_date', today),
        supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', organization.id)
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', organization.id)
          .gte('created_at', firstDayStr)
          .lte('created_at', lastDayStr + 'T23:59:59')
      ]);

      // Calculate outstanding amounts
      const totalOutstandingAmount = 
        (outstandingOrdersResult.data?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0) +
        (outstandingSalesResult.data?.reduce((sum, sale) => sum + (sale.outstanding_balance || 0), 0) || 0);

      // Calculate revenue amounts
      const revenueToday = todayRevenueResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
      const currentMonthRevenue = monthRevenueResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      // Update stats progressively
      const updates = [
        { key: 'activeOrders', value: activeOrdersResult.count || 0 },
        { key: 'ordersToday', value: ordersTodayResult.count || 0 },
        { key: 'salesToday', value: salesTodayResult.count || 0 },
        { key: 'outstandingAmount', value: totalOutstandingAmount },
        { key: 'outstandingSales', value: outstandingSalesResult.data?.reduce((sum, sale) => sum + (sale.outstanding_balance || 0), 0) || 0 },
        { key: 'outstandingOrders', value: outstandingOrdersResult.data?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0 },
        { key: 'completedOrdersToday', value: completedOrdersResult.count || 0 },
        { key: 'completedTasksToday', value: completedTasksResult.count || 0 },
        { key: 'ordersDueToday', value: ordersDueResult.count || 0 },
        { key: 'revenueToday', value: revenueToday },
        { key: 'currentMonthRevenue', value: currentMonthRevenue }
      ];

      // Update each stat individually to show progressive loading
      for (const update of updates) {
        setStats(prev => ({
          ...prev,
          [update.key]: update.value
        }));
        setLoadedStats(prev => [...prev, update.key]);
      }

    } catch (error) {
      console.error('Error loading basic stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadRevenueData = async () => {
    if (!organization || isLoadingStats) return;

    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
      const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

      // Get payments for sales orders today
      const { data: salesPaymentsToday } = await supabase
        .from('payments')
        .select('amount, reference_id, reference_type, created_at')
        .eq('organization_id', organization.id)
        .gte('created_at', firstDayStr)
        .lte('created_at', lastDayStr + 'T23:59:59');

      // Filter out payments from cancelled orders
      const validPayments = await Promise.all(
        salesPaymentsToday?.map(async (payment) => {
          if (payment.reference_type === 'service_order') {
            const { data: order } = await supabase
              .from('orders')
              .select('status')
              .eq('id', payment.reference_id)
              .single();
            return order?.status !== 'cancelled' ? payment : null;
          }
          return payment;
        }) || []
      );

      const currentMonthRevenue = validPayments
        .filter(payment => payment !== null)
        .reduce((sum, payment) => sum + (payment?.amount || 0), 0);

      // Process historical data for the chart
      const revenueByDate = new Map<string, { total: number; sales: number; service: number }>();
      
      // Initialize all dates in the current month with 0
      for (let i = 0; i <= lastDayOfMonth.getDate(); i++) {
        const date = new Date(firstDayOfMonth);
        date.setDate(i + 1);
        const dateStr = date.toISOString().split('T')[0];
        revenueByDate.set(dateStr, { total: 0, sales: 0, service: 0 });
      }

      // Process valid payments
      validPayments
        .filter(payment => payment !== null)
        .forEach(payment => {
          const date = payment?.created_at.split('T')[0];
          if (!date) return;
          
          const current = revenueByDate.get(date) || { total: 0, sales: 0, service: 0 };
          const amount = payment?.amount || 0;
          
          if (payment?.reference_type === 'sales_order') {
            current.sales += amount;
          } else if (payment?.reference_type === 'service_order') {
            current.service += amount;
          }
          current.total += amount;
          revenueByDate.set(date, current);
        });

      // Convert to array and sort by date
      const dailyRevenueData: DailyRevenue[] = Array.from(revenueByDate.entries())
        .map(([date, revenue]) => ({ 
          date, 
          total: revenue.total,
          sales: revenue.sales,
          service: revenue.service
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyRevenue(dailyRevenueData);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setIsLoadingRevenue(false);
    }
  };

  const loadOrderStats = async () => {
    if (!organization || isLoadingRevenue) return;

    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
      const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

      // Get current month's order statistics
      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('status')
        .eq('organization_id', organization.id)
        .gte('created_at', firstDayStr)
        .lte('created_at', lastDayStr + 'T23:59:59');

      const monthlyOrderStats = {
        pending: monthlyOrders?.filter(order => order.status === 'pending').length || 0,
        in_progress: monthlyOrders?.filter(order => order.status === 'in_progress').length || 0,
        completed: monthlyOrders?.filter(order => order.status === 'completed').length || 0,
        cancelled: monthlyOrders?.filter(order => order.status === 'cancelled').length || 0
      };

      // Get daily order stats for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: dailyOrders } = await supabase
        .from('orders')
        .select('created_at')
        .eq('organization_id', organization.id)
        .gte('created_at', thirtyDaysAgoStr)
        .order('created_at', { ascending: true });

      // Process daily order counts
      const orderCounts = new Map<string, number>();
      dailyOrders?.forEach(order => {
        const date = order.created_at.split('T')[0];
        orderCounts.set(date, (orderCounts.get(date) || 0) + 1);
      });

      // Fill in missing dates with 0
      const dailyOrderData: DailyOrderStats[] = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyOrderData.unshift({
          date: dateStr,
          orders: orderCounts.get(dateStr) || 0
        });
      }

      setStats(prev => ({
        ...prev,
        monthlyOrderStats
      }));
      setDailyOrderStats(dailyOrderData);
    } catch (error) {
      console.error('Error loading order stats:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadOutstandingItems = async () => {
    if (!organization) return;
    setIsLoadingOutstanding(true);

    try {
      // Fetch outstanding sales orders
      const { data: salesOrders, error: salesError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          order_number,
          outstanding_balance,
          created_at,
          client:clients!client_id (
            name
          )
        `)
        .eq('organization_id', organization.id)
        .gt('outstanding_balance', 0)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Fetch outstanding service orders
      const { data: serviceOrders, error: serviceError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          outstanding_balance,
          created_at,
          client:clients!client_id (
            name
          )
        `)
        .eq('organization_id', organization.id)
        .gt('outstanding_balance', 0)
        .order('created_at', { ascending: false });

      if (serviceError) throw serviceError;

      // Transform and combine the data
      const items: OutstandingItem[] = [
        ...(salesOrders as OrderWithClient[] || []).map(order => ({
          id: order.id,
          type: 'sales_order' as const,
          number: order.order_number,
          client_name: order.client?.name || 'N/A',
          outstanding_balance: order.outstanding_balance,
          created_at: order.created_at
        })),
        ...(serviceOrders as OrderWithClient[] || []).map(order => ({
          id: order.id,
          type: 'service_order' as const,
          number: order.order_number,
          client_name: order.client?.name || 'N/A',
          outstanding_balance: order.outstanding_balance,
          created_at: order.created_at
        }))
      ];

      setOutstandingItems(items);
    } catch (error) {
      console.error('Error loading outstanding items:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load outstanding items'
      });
    } finally {
      setIsLoadingOutstanding(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use the load functions in useEffect
  useEffect(() => {
    loadBasicStats();
  }, [organization]);

  useEffect(() => {
    loadRevenueData();
  }, [organization, isLoadingStats]);

  useEffect(() => {
    loadOrderStats();
  }, [organization, isLoadingRevenue]);

  const handleRecordPayment = async () => {
    await loadOutstandingItems();
    setShowPaymentModal(true);
  };

  const handlePaymentRecorded = () => {
    // Refresh the stats after payment is recorded
    loadBasicStats();
    loadRevenueData();
    loadOrderStats();
  };

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
      setShowPaymentModal(false);
      handlePaymentRecorded();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to record payment'
      });
    }
  };

  const filteredOutstandingItems = outstandingItems.filter(item => 
    item.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoadingStats) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Active Orders',
      value: stats.activeOrders,
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: undefined,
      key: 'activeOrders'
    },
    {
      name: 'Orders Today',
      value: stats.ordersToday,
      icon: ShoppingCart,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: undefined,
      key: 'ordersToday'
    },
    {
      name: 'Orders Due Today',
      value: stats.ordersDueToday,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      link: undefined,
      key: 'ordersDueToday'
    },
    {
      name: 'Completed Orders Today',
      value: stats.completedOrdersToday,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      link: undefined,
      key: 'completedOrdersToday'
    },
    {
      name: 'Completed Tasks Today',
      value: stats.completedTasksToday,
      icon: CheckCircle,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      link: undefined,
      key: 'completedTasksToday'
    },
    {
      name: 'Sales Today',
      value: stats.salesToday,
      icon: Package,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      link: undefined,
      key: 'salesToday'
    },
    {
      name: 'Revenue Today',
      value: `${currencySymbol} ${formatNumber(stats.revenueToday)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/dashboard/finances',
      key: 'revenueToday'
    },
    {
      name: 'Amount Owed By Clients',
      value: `${currencySymbol} ${formatNumber(stats.outstandingAmount)}`,
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-100',
      link: undefined,
      key: 'outstandingAmount',
      breakdown: {
        sales: stats.outstandingSales || 0,
        service: stats.outstandingOrders || 0
      }
    },
    {
      name: `Revenue for ${new Date().toLocaleString('default', { month: 'long' })}`,
      value: `${currencySymbol} ${formatNumber(stats.currentMonthRevenue)}`,
      icon: DollarSign,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      link: undefined,
      key: 'currentMonthRevenue'
    }
  ];

  const monthlyOrderData: OrderStatusData[] = stats.monthlyOrderStats ? [
    { name: ORDER_STATUS_LABELS.pending, value: stats.monthlyOrderStats.pending, status: 'pending' },
    { name: ORDER_STATUS_LABELS.in_progress, value: stats.monthlyOrderStats.in_progress, status: 'in_progress' },
    { name: ORDER_STATUS_LABELS.completed, value: stats.monthlyOrderStats.completed, status: 'completed' },
    { name: ORDER_STATUS_LABELS.cancelled, value: stats.monthlyOrderStats.cancelled, status: 'cancelled' }
  ] : [];

  const COLORS = [
    '#fef9c3', // text-yellow-800
    '#1E40AF', // text-blue-800
    '#065F46', // text-green-800
    '#dc2626'  // text-red-800
  ];

  const renderStatusItem = (status: OrderStatusData, index: number) => (
    <div key={status.name} className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: COLORS[index] }} />
        <span className="ml-2 text-sm font-medium" style={{ color: COLORS[index] }}>
          {status.name}
        </span>
      </div>
      <span className="text-sm text-gray-500">{status.value} orders</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <StatCards 
        stats={stats}
        loadedStats={loadedStats}
        currencySymbol={currencySymbol}
      />

      <QuickActions onRecordPayment={handleRecordPayment} />

      <RevenueChart 
        dailyRevenue={dailyRevenue}
        isLoading={isLoadingRevenue}
        currencySymbol={currencySymbol}
        screenWidth={screenWidth}
      />

      <OrderStats 
        monthlyOrderStats={stats.monthlyOrderStats}
        dailyOrderStats={dailyOrderStats}
        isLoading={isLoadingOrders}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentRecorded={handlePaymentRecorded}
        outstandingItems={outstandingItems}
        isLoading={isLoadingOutstanding}
        currencySymbol={currencySymbol}
      />
    </div>
  );
}