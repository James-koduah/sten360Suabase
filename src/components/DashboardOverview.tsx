import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { ShoppingCart, DollarSign, Package, CheckCircle, Clock } from 'lucide-react';
import { CURRENCIES, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../utils/constants';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

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
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [dailyOrderStats, setDailyOrderStats] = useState<DailyOrderStats[]>([]);
  const [loadedStats, setLoadedStats] = useState<string[]>([]);
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '$';

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate interval based on screen width
  const getXAxisInterval = () => {
    if (screenWidth > 900) return 0; // Show all dates
    if (screenWidth > 600) return 3; // Show every 4th date
    return 4; // Show every 5th date
  };

  // Load basic stats for stat cards - optimized parallel loading
  useEffect(() => {
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
          // Add revenue queries
          todayRevenueResult,
          monthRevenueResult
        ] = await Promise.all([
          // Active orders
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .not('status', 'eq', 'completed')
            .not('status', 'eq', 'cancelled'),
          // Orders today
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .not('status', 'eq', 'cancelled')
            .gte('created_at', today)
            .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
          // Sales today
          supabase
            .from('sales_orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .gte('created_at', today)
            .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
          // Outstanding orders
          supabase
            .from('orders')
            .select('outstanding_balance')
            .eq('organization_id', organization.id)
            .not('status', 'eq', 'cancelled'),
          // Outstanding sales
          supabase
            .from('sales_orders')
            .select('outstanding_balance')
            .eq('organization_id', organization.id),
          // Completed orders today
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .eq('status', 'completed')
            .gte('created_at', today)
            .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
          // Completed tasks today
          supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .eq('status', 'completed')
            .gte('created_at', today)
            .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
          // Orders due today
          supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id)
            .not('status', 'eq', 'completed')
            .not('status', 'eq', 'cancelled')
            .eq('due_date', today),
          // Today's revenue
          supabase
            .from('payments')
            .select('amount')
            .eq('organization_id', organization.id)
            .gte('created_at', today)
            .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()),
          // Month's revenue
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

    loadBasicStats();
  }, [organization]);

  // Load revenue data for the chart - second load
  useEffect(() => {
    const loadRevenueData = async () => {
      if (!organization || isLoadingStats) return; // Wait for basic stats to finish

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
          salesPaymentsToday?.map(async (payment: Payment) => {
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

        setStats(prev => ({
          ...prev,
          currentMonthRevenue,
          revenueToday: dailyRevenueData[dailyRevenueData.length - 1]?.total || 0
        }));
        setDailyRevenue(dailyRevenueData);
      } catch (error) {
        console.error('Error loading revenue data:', error);
      } finally {
        setIsLoadingRevenue(false);
      }
    };

    loadRevenueData();
  }, [organization, isLoadingStats]); // Add isLoadingStats as dependency

  // Load order statistics - third load
  useEffect(() => {
    const loadOrderStats = async () => {
      if (!organization || isLoadingRevenue) return; // Wait for revenue data to finish

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

    loadOrderStats();
  }, [organization, isLoadingRevenue]); // Add isLoadingRevenue as dependency

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
      {/* Stat Cards - Progressive loading */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const isLoaded = loadedStats.includes(stat.key);
          
          return (
            <div
              key={stat.name}
              className={`bg-white overflow-hidden shadow rounded-lg transition-opacity duration-300 ${
                isLoaded ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className="p-3">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.bg} rounded-md p-2`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="text-base font-semibold text-gray-900">
                        {isLoaded ? stat.value : (
                          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Always show */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/dashboard/orders"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className={`flex-shrink-0 bg-blue-100 rounded-md p-3`}>
                <ShoppingCart className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Manage Orders</p>
                <p className="text-sm text-gray-500">View and process orders</p>
              </div>
            </Link>

            <Link
              to="/dashboard/products"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className={`flex-shrink-0 bg-green-100 rounded-md p-3`}>
                <Package className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Manage Products</p>
                <p className="text-sm text-gray-500">Add or edit products</p>
              </div>
            </Link>

            <Link
              to="/dashboard/analytics"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className={`flex-shrink-0 bg-purple-100 rounded-md p-3`}>
                <DollarSign className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Sales Analytics</p>
                <p className="text-sm text-gray-500">View sales reports and trends</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Revenue Chart - Show loading state */}
      {isLoadingRevenue ? (
        <div className="bg-white shadow rounded-lg animate-pulse">
          <div className="px-4 py-5 sm:p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-[300px] bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Revenue for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenue} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date: string) => {
                      const d = new Date(date);
                      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
                    }}
                    interval={getXAxisInterval()}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickFormatter={(value: number) => `${currencySymbol}${formatNumber(value)}`}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${currencySymbol}${formatNumber(value)}`, name]}
                    labelFormatter={(date: string) => {
                      const d = new Date(date);
                      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
                    }}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                  />
                  <Bar 
                    dataKey="total" 
                    name="Total Revenue"
                    fill="#8B5CF6"
                    barSize={5}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="sales" 
                    name="Sales Orders"
                    fill="#10B981"
                    barSize={5}
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="service" 
                    name="Service Orders"
                    fill="#3B82F6"
                    barSize={5}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Order Statistics - Show loading state */}
      {isLoadingOrders ? (
        <div className="bg-white shadow rounded-lg animate-pulse">
          <div className="px-4 py-5 sm:p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[300px] bg-gray-200 rounded"></div>
              <div className="h-[300px] bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Orders for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Order Status Distribution</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyOrderData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={130}
                        innerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {monthlyOrderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="lg:border-l lg:border-gray-200 lg:pl-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Daily Order Trends (30 Days)</h4>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyOrderStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => new Date(date).getDate().toString()}
                        tick={{ fontSize: 10 }}
                        interval={4}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        width={30}
                      />
                      <Tooltip 
                        formatter={(value) => [value, 'Orders']}
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '0.5rem',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="orders" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}