import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  startOfToday,
  endOfToday,
  startOfWeek as startOfThisWeek,
  endOfWeek as endOfThisWeek,
  startOfMonth as startOfThisMonth,
  endOfMonth as endOfThisMonth,
  startOfQuarter as startOfThisQuarter,
  endOfQuarter as endOfThisQuarter,
  startOfYear as startOfThisYear,
  endOfYear as endOfThisYear
} from 'date-fns';
import { Calendar, DollarSign, CreditCard, Smartphone, Building2, MoreHorizontal, TrendingUp, Users, Clock, FileText, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { CURRENCIES } from '../utils/constants';

interface PaymentMethodStats {
  method: string;
  amount: number;
  count: number;
}

interface Payment {
  id: number;
  reference_id: string;
  reference_type: 'sales_order' | 'service_order';
  amount: number;
  payment_method: string;
  transaction_reference: string | null;
  created_at: string;
  order_details?: {
    order_number: string;
    client_name: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C43'];

const generateCSV = (payments: Payment[], paymentStats: PaymentMethodStats[], currencySymbol: string) => {
  // Generate CSV for transactions
  const transactionHeaders = ['Order Number', 'Client Name', 'Amount', 'Payment Method', 'Date'];
  const transactionRows = payments.map(payment => [
    payment.order_details?.order_number || 'N/A',
    payment.order_details?.client_name || 'N/A',
    `${currencySymbol}${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    payment.payment_method,
    format(new Date(payment.created_at), 'MMM d, yyyy')
  ]);

  // Generate CSV for payment method statistics
  const statsHeaders = ['Payment Method', 'Total Amount', 'Transaction Count'];
  const statsRows = paymentStats.map(stat => [
    stat.method,
    `${currencySymbol}${stat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    stat.count.toString()
  ]);

  // Combine all data
  const csvContent = [
    ['Financial Report'],
    ['Date Range:', format(new Date(), 'MMM d, yyyy')],
    [],
    ['Transaction Details'],
    transactionHeaders,
    ...transactionRows,
    [],
    ['Payment Method Statistics'],
    statsHeaders,
    ...statsRows
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FinancialDashboard() {
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStats[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  const getDateRange = () => {
    if (!startDate || !endDate) {
      // Default to current month if no dates selected
      const now = new Date();
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      };
    }
    return {
      start: startOfDay(startDate),
      end: endOfDay(endDate)
    };
  };

  const fetchPaymentData = async () => {
    if (!organization) return;

    const { start, end } = getDateRange();

    try {
      // Fetch payment statistics
      const { data: statsData, error: statsError } = await supabase
        .from('payments')
        .select('payment_method, amount')
        .eq('organization_id', organization.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (statsError) throw statsError;

      // Calculate payment method statistics
      const stats = statsData.reduce((acc: PaymentMethodStats[], payment) => {
        const existingMethod = acc.find(s => s.method === payment.payment_method);
        if (existingMethod) {
          existingMethod.amount += payment.amount;
          existingMethod.count += 1;
        } else {
          acc.push({
            method: payment.payment_method,
            amount: payment.amount,
            count: 1
          });
        }
        return acc;
      }, []);

      setPaymentStats(stats);

      // Fetch detailed payment records
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }); // Most recent payments first

      if (paymentsError) throw paymentsError;

      // Fetch reference items separately
      const transformedPayments = await Promise.all(
        paymentsData.map(async (payment) => {
          let orderDetails = {
            order_number: 'N/A',
            client_name: 'N/A'
          };

          if (payment.reference_type === 'sales_order') {
            const { data: salesOrderData, error: salesOrderError } = await supabase
              .from('sales_orders')
              .select(`
                order_number,
                clients (
                  name
                )
              `)
              .eq('id', payment.reference_id)
              .single();

            if (!salesOrderError && salesOrderData) {
              orderDetails = {
                order_number: salesOrderData.order_number,
                client_name: salesOrderData.clients?.[0]?.name || 'N/A'
              };
            }
          } else if (payment.reference_type === 'service_order') {
            const { data: orderData, error: orderError } = await supabase
              .from('orders')
              .select(`
                order_number,
                clients:clients(name)
              `)
              .eq('id', payment.reference_id)
              .single();

            if (!orderError && orderData) {
              orderDetails = {
                order_number: orderData.order_number,
                client_name: orderData.clients || 'N/A'
              };
            }
          }

          return {
            ...payment,
            order_details: orderDetails
          };
        })
      );

      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch payment data'
      });
    }
  };

  const handleExport = () => {
    const dateRange = startDate && endDate 
      ? `${format(startDate, 'MMM d, yyyy')}-${format(endDate, 'MMM d, yyyy')}`
      : format(new Date(), 'MMM d, yyyy');
    
    const filename = `financial-report-${dateRange}.csv`;
    const csvContent = generateCSV(payments, paymentStats, currencySymbol);
    downloadCSV(csvContent, filename);
  };

  useEffect(() => {
    fetchPaymentData();
  }, [dateRange, organization]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Report</h1>
              <p className="mt-1 text-sm text-gray-500">
                {startDate && endDate 
                  ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
                  : format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <div className="relative">
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholderText="Select date range"
                  dateFormat="MMM d, yyyy"
                />
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Charts and Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Payment Methods Distribution */}
          <div className="bg-white rounded-lg shadow lg:col-span-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Payment Methods Distribution</h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {/* Total Amount Summary */}
                <div className="flex flex-col items-center justify-center py-4 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-500 mb-1">Total Amount</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{paymentStats.reduce((sum, stat) => sum + stat.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {/* Payment Method Breakdown */}
                {paymentStats.map((stat, index) => (
                  <div key={stat.method} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-gray-600">{stat.method}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {currencySymbol}{stat.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({stat.count})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStats}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {paymentStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${currencySymbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Payment Records Table */}
          <div className="bg-white rounded-lg shadow lg:col-span-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link 
                          to={`/dashboard/${payment.reference_type === 'sales_order' ? 'sales' : 'orders'}/${payment.reference_id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {payment.order_details?.order_number || 'N/A'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {currencySymbol}{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currencySymbol}{payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payments.length} transactions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {startDate && endDate 
                        ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
                        : format(new Date(), 'MMM d, yyyy')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}