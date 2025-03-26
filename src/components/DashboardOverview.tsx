import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Users, ClipboardList, TrendingUp, DollarSign } from 'lucide-react';
import { CURRENCIES } from '../utils/constants';
import { Link } from 'react-router-dom';

interface Stats {
  totalWorkers: number;
  pendingTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  completedTasks: number;
  totalPayouts: number;
}

export default function DashboardOverview() {
  const { organization } = useAuthStore();
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    delayedTasks: 0,
    completedTasks: 0,
    totalPayouts: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  useEffect(() => {
    const loadStats = async () => {
      if (!organization) return;

      try {
        // Get workers count
        const { count: workersCount } = await supabase
          .from('workers')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id);

        // Get tasks stats
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('status, amount, deductions(*)')
          .eq('organization_id', organization.id);

        const pendingTasks = tasksData?.filter(t => t.status === 'pending').length || 0;
        const inProgressTasks = tasksData?.filter(t => t.status === 'in_progress').length || 0;
        const delayedTasks = tasksData?.filter(t => t.status === 'delayed').length || 0;
        const completedTasks = tasksData?.filter(t => t.status === 'completed').length || 0;
        const totalPayouts = tasksData?.reduce((sum, task) => {
          const deductions = task.deductions?.reduce((dSum, d) => dSum + (d.amount || 0), 0) || 0;
          return sum + (task.amount - deductions);
        }, 0) || 0;

        setStats({
          totalWorkers: workersCount || 0,
          pendingTasks,
          inProgressTasks,
          delayedTasks,
          completedTasks,
          totalPayouts
        });
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
      name: 'Total Workers',
      value: stats.totalWorkers,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/dashboard/workers'
    },
    {
      name: 'Assigned Tasks',
      value: stats.pendingTasks,
      icon: ClipboardList,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      link: '/dashboard/tasks/pending'
    },
    {
      name: 'In Progress',
      value: stats.inProgressTasks,
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      link: '/dashboard/tasks/in_progress'
    },
    {
      name: 'Delayed Tasks',
      value: stats.delayedTasks,
      icon: ClipboardList,
      color: 'text-red-600',
      bg: 'bg-red-100',
      link: '/dashboard/tasks/delayed'
    },
    {
      name: 'Completed Tasks',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
      link: '/dashboard/tasks/completed'
    },
    {
      name: 'Total Payouts',
      value: `${currencySymbol} ${stats.totalPayouts.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      link: '/dashboard/finances'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
          <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Actions</h3>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/dashboard/workers"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className={`flex-shrink-0 bg-blue-100 rounded-md p-3`}>
                <Users className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Manage Workers</p>
                <p className="text-sm text-gray-500">Add or edit worker details</p>
              </div>
            </Link>

            <Link
              to="/dashboard/tasks"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className={`flex-shrink-0 bg-yellow-100 rounded-md p-3`}>
                <ClipboardList className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Manage Tasks</p>
                <p className="text-sm text-gray-500">Create and track tasks</p>
              </div>
            </Link>

            <Link
              to="/dashboard/finances"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className={`flex-shrink-0 bg-purple-100 rounded-md p-3`}>
                <DollarSign className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Financial Reports</p>
                <p className="text-sm text-gray-500">View and export financial data</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}