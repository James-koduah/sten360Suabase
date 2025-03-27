import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, User, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { Link } from 'react-router-dom';
import CreateOrderForm from './CreateOrderForm';
import { format, startOfWeek, endOfWeek, getWeek, getYear, isAfter } from 'date-fns';
import { CURRENCIES, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/constants';

interface Order {
  id: string;
  order_number: string;
  client_id: string;
  description: string | null;
  due_date: string | null;
  status: keyof typeof ORDER_STATUS_COLORS;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  created_at: string;
  client: {
    name: string;
  };
  workers: {
    id: string;
    worker_id: string;
    worker: {
      name: string;
    };
    project_id: string;
    project: {
      name: string;
    };
    status: string;
  }[];
  services: {
    id: string;
    service_id: string;
    service: {
      name: string;
    };
    quantity: number;
    cost: number;
  }[];
}

export default function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<keyof typeof ORDER_STATUS_COLORS | 'all'>('all');
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const now = new Date();
  const currentWeek = getWeek(currentDate, { weekStartsOn: 1 });
  const currentYear = getYear(currentDate);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  useEffect(() => {
    if (!organization) return;
    loadOrders();
  }, [organization, currentDate]);

  const loadOrders = async () => {
    if (!organization?.id) return;
    
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
            project_id,
            project:projects(name),
            status
          ),
          services:order_services(
            id,
            service_id,
            service:services(name),
            quantity,
            cost
          ),
          outstanding_balance,
          payment_status
        `)
        .eq('organization_id', organization.id)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())
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


  const handleWeekChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
  };

  const filteredOrders = orders.filter(order =>
    (order.client.name.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (statusFilter === 'all' || order.status === statusFilter)
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
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and track your customer orders</p>
        </div>
        <button
          onClick={() => setShowAddOrder(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Order
        </button>
      </div>

      {/* Week Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleWeekChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-sm">
              <span className="font-medium text-gray-900">
                Week {currentWeek}, {currentYear}
              </span>
              <p className="text-gray-500 text-xs mt-0.5">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </p>
            </div>
            <button
              onClick={() => handleWeekChange('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              disabled={isAfter(weekEnd, now)}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="text-sm text-gray-500">{orders.length} orders this week</div>
        </div>
      </div>

      {/* Create Order Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddOrder(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
              <CreateOrderForm
                onClose={() => setShowAddOrder(false)}
                onSuccess={loadOrders}
              />
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
            {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key as keyof typeof ORDER_STATUS_COLORS)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  statusFilter === key
                    ? `${ORDER_STATUS_COLORS[key as keyof typeof ORDER_STATUS_COLORS].bg} ${ORDER_STATUS_COLORS[key as keyof typeof ORDER_STATUS_COLORS].text}`
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
              No orders found. Start by creating a new order.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        <Link
                          to={`/dashboard/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {order.order_number}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          {order.client.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.workers?.length ? 
                          order.workers.map(w => w.worker.name).join(', ') 
                          : 'Unassigned'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {order.due_date ? format(new Date(order.due_date), 'MMM d, yyyy') : 'No due date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ORDER_STATUS_COLORS[order.status].bg
                      } ${
                        ORDER_STATUS_COLORS[order.status].text
                      }`}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
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
                          {currencySymbol} {(order.outstanding_balance).toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {order.payment_status === 'paid' 
                            ? 'Paid' 
                            : order.payment_status === 'partially_paid' 
                            ? 'Outstanding' 
                            : 'Unpaid'}
                        </span>
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