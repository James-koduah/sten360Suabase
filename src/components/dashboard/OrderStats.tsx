import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ORDER_STATUS_LABELS } from '../../utils/constants';

interface OrderStatusData {
  name: string;
  value: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface DailyOrderStats {
  date: string;
  orders: number;
}

interface OrderStatsProps {
  monthlyOrderStats: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  dailyOrderStats: DailyOrderStats[];
  isLoading: boolean;
}

const COLORS = [
  '#fef9c3', // text-yellow-800
  '#1E40AF', // text-blue-800
  '#065F46', // text-green-800
  '#dc2626'  // text-red-800
];

export const OrderStats: React.FC<OrderStatsProps> = ({ 
  monthlyOrderStats, 
  dailyOrderStats,
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg animate-pulse">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[300px] bg-gray-200 rounded"></div>
            <div className="h-[300px] bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const monthlyOrderData: OrderStatusData[] = [
    { name: ORDER_STATUS_LABELS.pending, value: monthlyOrderStats.pending, status: 'pending' },
    { name: ORDER_STATUS_LABELS.in_progress, value: monthlyOrderStats.in_progress, status: 'in_progress' },
    { name: ORDER_STATUS_LABELS.completed, value: monthlyOrderStats.completed, status: 'completed' },
    { name: ORDER_STATUS_LABELS.cancelled, value: monthlyOrderStats.cancelled, status: 'cancelled' }
  ];

  return (
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
  );
}; 