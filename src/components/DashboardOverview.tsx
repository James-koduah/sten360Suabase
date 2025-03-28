import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { ShoppingCart, DollarSign, Package } from 'lucide-react';
import { CURRENCIES } from '../utils/constants';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  activeOrders: number;
  salesToday: number;
  revenueToday: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
}

export default function DashboardOverview() {
  const { organization } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    activeOrders: 0,
    salesToday: 0,
    revenueToday: 0
  });
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '$';

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

        // Get historical data for the past 30 days including today
        const { data: historicalSalesData } = await supabase
          .from('sales_orders')
          .select('total_amount, outstanding_balance, created_at')
          .eq('organization_id', organization.id)
          .gte('created_at', thirtyDaysAgoStr)
          .lte('created_at', today + 'T23:59:59');

        const { data: historicalOrdersData } = await supabase
          .from('orders')
          .select('total_amount, outstanding_balance, created_at')
          .eq('organization_id', organization.id)
          .gte('created_at', thirtyDaysAgoStr)
          .lte('created_at', today + 'T23:59:59');

        const salesToday = historicalSalesData?.filter(sale => sale.created_at.startsWith(today)).length || 0;
        
        // Calculate total revenue from sales_orders
        const salesRevenue = historicalSalesData?.filter(sale => sale.created_at.startsWith(today))
          .reduce((sum, sale) => {
            const paidAmount = (sale.total_amount || 0) - (sale.outstanding_balance || 0);
            return sum + paidAmount;
          }, 0) || 0;

        // Calculate total revenue from orders
        const ordersRevenue = historicalOrdersData?.filter(order => order.created_at.startsWith(today))
          .reduce((sum, order) => {
            const paidAmount = (order.total_amount || 0) - (order.outstanding_balance || 0);
            return sum + paidAmount;
          }, 0) || 0;

        const revenueToday = salesRevenue + ordersRevenue;

        // Process historical data for the chart
        const revenueByDate = new Map<string, number>();
        
        // Initialize all dates in the range with 0
        const currentDate = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          revenueByDate.set(dateStr, 0);
        }
        
        // Process sales orders
        historicalSalesData?.forEach(sale => {
          const date = sale.created_at.split('T')[0];
          const paidAmount = (sale.total_amount || 0) - (sale.outstanding_balance || 0);
          revenueByDate.set(date, (revenueByDate.get(date) || 0) + paidAmount);
        });

        // Process orders
        historicalOrdersData?.forEach(order => {
          const date = order.created_at.split('T')[0];
          const paidAmount = (order.total_amount || 0) - (order.outstanding_balance || 0);
          revenueByDate.set(date, (revenueByDate.get(date) || 0) + paidAmount);
        });

        // Convert to array and sort by date
        const dailyRevenueData = Array.from(revenueByDate.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setStats({
          activeOrders: activeOrdersCount || 0,
          salesToday,
          revenueToday
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
      name: 'Sales Today',
      value: stats.salesToday,
      icon: Package,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: '/dashboard/sales'
    },
    {
      name: 'Revenue Today',
      value: `${currencySymbol} ${stats.revenueToday.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/dashboard/revenue'
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
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Revenue Over Time</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date: string) => new Date(date).toLocaleDateString()}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value: number) => `${currencySymbol}${value.toFixed(0)}`}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Revenue']}
                  labelFormatter={(date: string) => new Date(date).toLocaleDateString()}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#8B5CF6"
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