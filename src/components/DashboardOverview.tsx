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
  sixMonthRevenue: number;
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
    sixMonthRevenue: 0
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
          .not('status', 'eq', 'completed');

        // Get all outstanding amounts
        const { data: outstandingOrders } = await supabase
          .from('orders')
          .select('outstanding_balance')
          .eq('organization_id', organization.id);

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
          .select('amount')
          .eq('organization_id', organization.id)
          .gte('created_at', today)
          .lt('created_at', new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString());

        const revenueToday = salesPaymentsToday?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        // Get 6-month revenue
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

        const { data: sixMonthPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', organization.id)
          .gte('created_at', sixMonthsAgoStr)
          .lte('created_at', today + 'T23:59:59');

        const sixMonthRevenue = sixMonthPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

        // Process historical data for the chart
        const revenueByDate = new Map<string, { total: number; sales: number; service: number }>();
        
        // Initialize all dates in the range with 0
        const currentDate = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          revenueByDate.set(dateStr, { total: 0, sales: 0, service: 0 });
        }

        // Get historical payments
        const { data: historicalPayments } = await supabase
          .from('payments')
          .select('amount, created_at, reference_type')
          .eq('organization_id', organization.id)
          .gte('created_at', thirtyDaysAgoStr)
          .lte('created_at', today + 'T23:59:59');
        
        // Process payments
        historicalPayments?.forEach(payment => {
          const date = payment.created_at.split('T')[0];
          const current = revenueByDate.get(date) || { total: 0, sales: 0, service: 0 };
          const amount = payment.amount || 0;
          
          if (payment.reference_type === 'sales_order') {
            current.sales += amount;
          } else if (payment.reference_type === 'service_order') {
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

        setStats({
          activeOrders: activeOrdersCount || 0,
          revenueToday,
          outstandingAmount: totalOutstandingAmount,
          sixMonthRevenue
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
      link: '/dashboard/orders'
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
      link: '/dashboard/revenue'
    },
    {
      name: '6-Month Revenue',
      value: `${currencySymbol} ${formatNumber(stats.sixMonthRevenue)}`,
      icon: DollarSign,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      link: '/dashboard/finances'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.bg} rounded-md p-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stat.value}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Revenue Over The Past 30 days</h3>
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