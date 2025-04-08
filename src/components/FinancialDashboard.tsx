import { useState, useEffect, useRef } from 'react';
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    status?: string;
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
  const dashboardRef = useRef<HTMLDivElement>(null);

  const getDateRange = () => {
    if (!startDate || !endDate) {
      // Default to current day if no dates selected
      const now = new Date();
      return {
        start: startOfDay(now),
        end: endOfDay(now)
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
        .select('payment_method, amount, reference_id, reference_type')
        .eq('organization_id', organization.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (statsError) throw statsError;

      // Fetch order statuses for all payments
      const orderStatuses = await Promise.all(
        statsData.map(async (payment) => {
          if (payment.reference_type === 'service_order') {
            const { data: orderData } = await supabase
              .from('orders')
              .select('status')
              .eq('id', payment.reference_id)
              .single();
            return { id: payment.reference_id, status: orderData?.status };
          }
          return { id: payment.reference_id, status: null };
        })
      );

      // Create a map of order statuses
      const orderStatusMap = orderStatuses.reduce((acc, { id, status }) => {
        acc[id] = status;
        return acc;
      }, {} as Record<string, string | null>);

      // Calculate payment method statistics (excluding cancelled orders)
      const stats = statsData.reduce((acc: PaymentMethodStats[], payment) => {
        const orderStatus = orderStatusMap[payment.reference_id];
        // Skip cancelled orders in statistics
        if (orderStatus === 'cancelled') return acc;

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
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch reference items separately
      const transformedPayments = await Promise.all(
        paymentsData.map(async (payment) => {
          let orderDetails = {
            order_number: 'N/A',
            client_name: 'N/A',
            status: null
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
                client_name: salesOrderData.clients?.[0]?.name || 'N/A',
                status: null
              };
            }
          } else if (payment.reference_type === 'service_order') {
            const { data: orderData, error: orderError } = await supabase
              .from('orders')
              .select(`
                order_number,
                clients:clients(name),
                status
              `)
              .eq('id', payment.reference_id)
              .single();

            if (!orderError && orderData) {
              orderDetails = {
                order_number: orderData.order_number,
                client_name: orderData.clients || 'N/A',
                status: orderData.status
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

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgWidth = 297; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const dateRange = startDate && endDate 
        ? `${format(startDate, 'MMM d, yyyy')}-${format(endDate, 'MMM d, yyyy')}`
        : format(new Date(), 'MMM d, yyyy');
      
      pdf.save(`financial-report-${dateRange}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF'
      });
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [dateRange, organization]);

  return (
    <div className="min-h-screen bg-gray-50" ref={dashboardRef}>
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
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
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
            <div className="p-6">
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStats}
                      dataKey="amount"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      innerRadius={60}
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
                    <tr key={payment.id} className={`hover:bg-gray-50 ${payment.order_details?.status === 'cancelled' ? 'opacity-75' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link 
                          to={`/dashboard/${payment.reference_type === 'sales_order' ? 'sales' : 'orders'}/${payment.reference_id}`}
                          className={`${payment.order_details?.status === 'cancelled' ? 'line-through text-gray-400 hover:text-gray-500' : 'text-blue-600 hover:text-blue-800'} hover:underline font-medium`}
                        >
                          {payment.order_details?.order_number || 'N/A'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={payment.order_details?.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}>
                          {currencySymbol}{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={payment.order_details?.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}>
                          {payment.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={payment.order_details?.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}>
                          {format(new Date(payment.created_at), 'MMM d, yyyy')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {currencySymbol}{payments
                        .filter(p => p.order_details?.status !== 'cancelled')
                        .reduce((sum, p) => sum + p.amount, 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payments.filter(p => p.order_details?.status !== 'cancelled').length} transactions
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