import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyRevenue {
  date: string;
  total: number;
  sales: number;
  service: number;
}

interface RevenueChartProps {
  dailyRevenue: DailyRevenue[];
  isLoading: boolean;
  currencySymbol: string;
  screenWidth: number;
}

const formatNumber = (num: number) => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const RevenueChart: React.FC<RevenueChartProps> = ({ 
  dailyRevenue, 
  isLoading, 
  currencySymbol,
  screenWidth 
}) => {
  const getXAxisInterval = () => {
    if (screenWidth > 900) return 0;
    if (screenWidth > 600) return 3;
    return 4;
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg animate-pulse">
        <div className="px-4 py-5 sm:p-6">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-[300px] bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
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
  );
}; 