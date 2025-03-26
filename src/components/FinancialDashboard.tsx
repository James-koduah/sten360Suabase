import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { generateFinancialReport } from '../utils/reportUtils';
import * as XLSX from 'xlsx';
import { CURRENCIES } from '../utils/constants';

interface FinancialData {
  date: string;
  totalTasks: number;
  totalAmount: number;
  totalDeductions: number;
  netAmount: number;
}

export default function FinancialDashboard() {
  const { organization } = useAuthStore();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeklyData, setWeeklyData] = useState<FinancialData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  useEffect(() => {
    if (!organization) return;

    const loadWeeklyData = async () => {
      setIsLoading(true);
      try {
        const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select(`
            *,
            deductions (
              amount
            )
          `)
          .eq('organization_id', organization.id)
          .gte('date', weekStart.toISOString())
          .lte('date', weekEnd.toISOString());

        if (error) throw error;

        // Group tasks by date
        const groupedData = (tasksData || []).reduce((acc: Record<string, FinancialData>, task) => {
          const date = task.date;
          if (!acc[date]) {
            acc[date] = {
              date,
              totalTasks: 0,
              totalAmount: 0,
              totalDeductions: 0,
              netAmount: 0
            };
          }

          const deductionsTotal = task.deductions?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
          
          acc[date].totalTasks += 1;
          acc[date].totalAmount += task.amount;
          acc[date].totalDeductions += deductionsTotal;
          acc[date].netAmount += (task.amount - deductionsTotal);

          return acc;
        }, {});

        const sortedData = Object.values(groupedData).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setWeeklyData(sortedData);
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWeeklyData();
  }, [organization, currentWeek]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(current => 
      direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1)
    );
  };

  const exportReport = (exportFormat: 'excel' | 'pdf') => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
    const { workbook, pdf } = generateFinancialReport(weeklyData, {
      start: weekStart,
      end: weekEnd
    }, organization.currency);

    const fileName = `financial_report_${format(currentWeek, 'yyyy-MM-dd')}`;
    if (exportFormat === 'excel') {
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else {
      pdf.save(`${fileName}.pdf`);
    }
  };

  const weekTotal = weeklyData.reduce(
    (acc, day) => ({
      tasks: acc.tasks + day.totalTasks,
      amount: acc.amount + day.totalAmount,
      deductions: acc.deductions + day.totalDeductions,
      net: acc.net + day.netAmount
    }),
    { tasks: 0, amount: 0, deductions: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportReport('excel')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to PDF
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')} - {' '}
                  {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
                </span>
              </div>
              <button
                onClick={() => navigateWeek('next')}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Total Tasks</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">{weekTotal.tasks}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Total Amount</p>
              <p className="mt-2 text-3xl font-bold text-green-900">{currencySymbol} {weekTotal.amount.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-600">Total Deductions</p>
              <p className="mt-2 text-3xl font-bold text-red-900">{currencySymbol} {weekTotal.deductions.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-600">Net Amount</p>
              <p className="mt-2 text-3xl font-bold text-purple-900">{currencySymbol} {weekTotal.net.toFixed(2)}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : weeklyData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No financial data available for this week.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deductions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Net Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklyData.map((day) => (
                    <tr key={day.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(day.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.totalTasks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currencySymbol} {day.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {currencySymbol} {day.totalDeductions.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {currencySymbol} {day.netAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}