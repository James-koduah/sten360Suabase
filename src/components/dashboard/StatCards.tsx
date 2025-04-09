import React from 'react';
import { ShoppingCart, DollarSign, Package, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CURRENCIES } from '../../utils/constants';

interface StatCard {
  name: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bg: string;
  link?: string;
  key: string;
  breakdown?: {
    sales: number;
    service: number;
  };
}

interface StatCardsProps {
  stats: {
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
  };
  loadedStats: string[];
  currencySymbol: string;
}

const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const StatCards: React.FC<StatCardsProps> = ({ stats, loadedStats, currencySymbol }) => {
  const statCards: StatCard[] = [
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

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const isLoaded = loadedStats.includes(stat.key);
        const content = (
          <div
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

        return stat.link ? (
          <Link key={stat.name} to={stat.link} className="block">
            {content}
          </Link>
        ) : (
          <div key={stat.name}>
            {content}
          </div>
        );
      })}
    </div>
  );
}; 