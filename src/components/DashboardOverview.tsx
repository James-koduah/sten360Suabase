import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { ShoppingCart, DollarSign, Package, CheckCircle, Clock } from 'lucide-react';
import { CURRENCIES } from '../utils/constants';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}

interface DailyRevenue {
  date: string;
  total: number;
  sales: number;
  service: number;
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
    ordersDueToday: 0
  });
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
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

  useEffect(() => {
    const loadStats = async () => {
      if (!organization) return;

      try {
        // Get today's date in ISO format
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Get active orders (not completed)
        const { count: activeOrdersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'cancelled');

        // Get today's orders count
        const { count: ordersTodayCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'cancelled')
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        // Get today's sales count
        const { count: salesTodayCount } = await supabase
          .from('sales_orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        // Get all outstanding amounts
        const { data: outstandingOrders } = await supabase
          .from('orders')
          .select('outstanding_balance')
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'cancelled');

        const { data: outstandingSales } = await supabase
          .from('sales_orders')
          .select('outstanding_balance')
          .eq('organization_id', organization.id);

        const totalOutstandingAmount = 
          (outstandingOrders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0) +
          (outstandingSales?.reduce((sum, sale) => sum + (sale.outstanding_balance || 0), 0) || 0);

        // Get payments for sales orders today
        const { data: salesPaymentsToday } = await supabase
          .from('payments')
          .select('amount, reference_id, reference_type')
          .eq('organization_id', organization.id)
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        // Filter out payments from cancelled orders
        const validPaymentsToday = await Promise.all(
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

        const revenueToday = validPaymentsToday
          .filter(payment => payment !== null)
          .reduce((sum, payment) => sum + (payment?.amount || 0), 0);

        // Get current month's revenue
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
        const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

        const { data: currentMonthPayments } = await supabase
          .from('payments')
          .select('amount, reference_id, reference_type')
          .eq('organization_id', organization.id)
          .gte('created_at', firstDayStr)
          .lte('created_at', lastDayStr + 'T23:59:59');

        // Filter out payments from cancelled orders
        const validCurrentMonthPayments = await Promise.all(
          currentMonthPayments?.map(async (payment) => {
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

        const currentMonthRevenue = validCurrentMonthPayments
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

        // Get historical payments for current month
        const { data: historicalPayments } = await supabase
          .from('payments')
          .select('amount, created_at, reference_type, reference_id')
          .eq('organization_id', organization.id)
          .gte('created_at', firstDayStr)
          .lte('created_at', lastDayStr + 'T23:59:59');
        
        // Process payments and filter out cancelled orders
        const validHistoricalPayments = await Promise.all(
          historicalPayments?.map(async (payment) => {
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

        // Process valid payments
        validHistoricalPayments
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

        // Get completed orders count for today
        const { count: completedOrdersTodayCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'completed')
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        // Get completed tasks count for today
        const { count: completedTasksTodayCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .eq('status', 'completed')
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        // Get orders due today
        const { count: ordersDueTodayCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .not('status', 'eq', 'completed')
          .not('status', 'eq', 'cancelled')
          .eq('due_date', today);

        setStats({
          activeOrders: activeOrdersCount || 0,
          revenueToday,
          outstandingAmount: totalOutstandingAmount,
          currentMonthRevenue,
          ordersToday: ordersTodayCount || 0,
          salesToday: salesTodayCount || 0,
          outstandingSales: outstandingSales?.reduce((sum, sale) => sum + (sale.outstanding_balance || 0), 0) || 0,
          outstandingOrders: outstandingOrders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0,
          completedOrdersToday: completedOrdersTodayCount || 0,
          completedTasksToday: completedTasksTodayCount || 0,
          ordersDueToday: ordersDueTodayCount || 0
        });
        setDailyRevenue(dailyRevenueData);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [organization]);

  if (isLoading) {
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
      link: undefined
    },
    {
      name: 'Orders Today',
      value: stats.ordersToday,
      icon: ShoppingCart,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: undefined
    },
    {
      name: 'Orders Due Today',
      value: stats.ordersDueToday,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      link: undefined
    },
    {
      name: 'Completed Orders Today',
      value: stats.completedOrdersToday,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      link: undefined
    },
    {
      name: 'Completed Tasks Today',
      value: stats.completedTasksToday,
      icon: CheckCircle,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      link: undefined
    },
    {
      name: 'Sales Today',
      value: stats.salesToday,
      icon: Package,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      link: undefined
    },
    {
      name: 'Revenue Today',
      value: `${currencySymbol} ${formatNumber(stats.revenueToday)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/dashboard/finances'
    },
    {
      name: 'Amount Owed By Clients',
      value: `${currencySymbol} ${formatNumber(stats.outstandingAmount)}`,
      icon: DollarSign,
      color: 'text-red-600',
      bg: 'bg-red-100',
      link: undefined,
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
      link: undefined
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          stat.link ? (
            <Link
              key={stat.name}
              to={stat.link}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-3">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.bg} rounded-md p-2`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="text-base font-semibold text-gray-900">{stat.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg group relative"
            >
              <div className="p-3">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${stat.bg} rounded-md p-2`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="text-base font-semibold text-gray-900">{stat.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              {stat.breakdown && (
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3">
                  <div className="flex flex-col h-full justify-center">
                    <div className="text-xs text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>Sales Orders:</span>
                        <span>{currencySymbol} {formatNumber(stat.breakdown.sales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service Orders:</span>
                        <span>{currencySymbol} {formatNumber(stat.breakdown.service)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        ))}
      </div>

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
    </div>
  );
}