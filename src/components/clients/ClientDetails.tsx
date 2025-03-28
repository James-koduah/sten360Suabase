import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { format } from 'date-fns';
import { 
  ArrowLeft, Phone, MapPin, Calendar, User, 
  DollarSign, Package, FileText, Upload, X,
  Loader2
} from 'lucide-react';
import { CURRENCIES } from '../../utils/constants';

interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  custom_fields?: Array<{
    id: string;
    title: string;
    value: string;
    type: 'text' | 'file';
  }>;
  total_balance: number;
  orders?: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    outstanding_balance: number;
    created_at: string;
    status: string;
  }>;
  sales_orders?: Array<{
    id: string;
    order_number: string;
    total_amount: number;
    outstanding_balance: number;
    payment_status: 'unpaid' | 'partial' | 'paid';
    notes?: string;
    created_at: string;
  }>;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  outstanding_balance: number;
  created_at: string;
  status: string;
}

interface CustomField {
  title: string;
  value: string;
  type: 'text' | 'file';
  file: File | null;
}

interface SalesOrder {
  id: string;
  order_number: string;
  total_amount: number;
  outstanding_balance: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  created_at: string;
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCustomField, setNewCustomField] = useState<CustomField>({
    title: '',
    value: '',
    type: 'text',
    file: null
  });
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  useEffect(() => {
    if (!id || !organization) return;
    loadClientDetails();
  }, [id, organization]);

  const loadClientDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*),
          orders:orders(
            id,
            order_number,
            total_amount,
            outstanding_balance,
            created_at,
            status
          ),
          sales_orders:sales_orders(
            id,
            order_number,
            total_amount,
            outstanding_balance,
            payment_status,
            notes,
            created_at
          )
        `)
        .eq('id', id)
        .eq('organization_id', organization?.id)
        .single();

      if (error) throw error;

      // Calculate total balance from both orders and sales_orders
      const ordersBalance = data.orders?.reduce(
        (sum: number, order: Order) => sum + (order.outstanding_balance || 0),
        0
      ) || 0;

      const salesOrdersBalance = data.sales_orders?.reduce(
        (sum: number, order: SalesOrder) => sum + (order.outstanding_balance || 0),
        0
      ) || 0;

      setClient({
        ...data,
        total_balance: ordersBalance + salesOrdersBalance
      });
    } catch (error) {
      console.error('Error loading client details:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load client details'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: client.name,
          phone: client.phone,
          address: client.address,
          date_of_birth: client.date_of_birth
        })
        .eq('id', client.id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      setIsEditing(false);
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Client details updated successfully'
      });
    } catch (error) {
      console.error('Error updating client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update client details'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomField = async () => {
    if (!client || !organization) return;

    setIsSubmitting(true);
    try {
      let fieldValue = newCustomField.value;

      if (newCustomField.type === 'file' && newCustomField.file) {
        const fileExt = newCustomField.file.name.split('.').pop()?.toLowerCase();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${organization.id}/clients/${client.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, newCustomField.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        fieldValue = publicUrl;
      }

      const { error } = await supabase
        .from('client_custom_fields')
        .insert({
          client_id: client.id,
          title: newCustomField.title.trim(),
          value: fieldValue,
          type: newCustomField.type
        });

      if (error) throw error;

      setNewCustomField({ title: '', value: '', type: 'text', file: null });
      loadClientDetails();
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Custom field added successfully'
      });
    } catch (error) {
      console.error('Error adding custom field:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add custom field'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    if (!client) return;

    try {
      const { error } = await supabase
        .from('client_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      loadClientDetails();
      addToast({
        type: 'success',
        title: 'Success',
        message: 'Custom field deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting custom field:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete custom field'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Client not found</h3>
        <Link
          to="/clients"
          className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard/clients"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-sm text-gray-500">Client ID: {client.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateClient}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Edit Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Basic Information Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={client.name}
                    onChange={(e) => setClient(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                ) : (
                  <div className="mt-1 text-sm text-gray-900">{client.name}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={client.phone || ''}
                    onChange={(e) => setClient(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                ) : (
                  <div className="mt-1 text-sm text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {client.phone || 'Not provided'}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                {isEditing ? (
                  <textarea
                    value={client.address || ''}
                    onChange={(e) => setClient(prev => prev ? { ...prev, address: e.target.value } : null)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                ) : (
                  <div className="mt-1 text-sm text-gray-900 flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-1 text-gray-400" />
                    {client.address || 'Not provided'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={client.date_of_birth || ''}
                    onChange={(e) => setClient(prev => prev ? { ...prev, date_of_birth: e.target.value } : null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                ) : (
                  <div className="mt-1 text-sm text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {client.date_of_birth ? format(new Date(client.date_of_birth), 'MMM d, yyyy') : 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Custom Information</h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {client.custom_fields?.map((field) => (
                <div key={field.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{field.title}: </span>
                    {field.type === 'file' ? (
                      <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        View File
                      </a>
                    ) : (
                      <span>{field.value}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCustomField(field.id)}
                    className="ml-4 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add Custom Field Form */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-4">Add Custom Information</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={newCustomField.type}
                      onChange={(e) => {
                        const type = e.target.value as 'text' | 'file';
                        setNewCustomField(prev => ({
                          ...prev,
                          type,
                          value: '',
                          file: null
                        }));
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="file">File</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={newCustomField.title}
                      onChange={(e) => setNewCustomField(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter field title"
                    />
                  </div>
                  {newCustomField.type === 'text' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Value</label>
                      <input
                        type="text"
                        value={newCustomField.value}
                        onChange={(e) => setNewCustomField(prev => ({ ...prev, value: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Enter value"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">File</label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewCustomField(prev => ({ ...prev, file }));
                            }
                          }}
                          className="hidden"
                          id="custom-file"
                        />
                        <label
                          htmlFor="custom-file"
                          className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </label>
                        {newCustomField.file && (
                          <span className="ml-3 text-sm text-gray-500">
                            {newCustomField.file.name}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddCustomField}
                      disabled={isSubmitting || !newCustomField.title || (!newCustomField.value && !newCustomField.file)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Adding...
                        </>
                      ) : (
                        'Add Field'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Financial Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders Summary */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Orders Summary</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Number of Orders</span>
                    <span className="text-lg font-bold text-gray-900">
                      {client.orders?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Outstanding Balance</span>
                    <span className={`text-lg font-bold ${
                      (client.orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0) > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {currencySymbol} {(client.orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currencySymbol} {(client.orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Paid</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currencySymbol} {(client.orders?.reduce((sum, order) => sum + (order.total_amount - order.outstanding_balance), 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Orders Summary */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Sales Orders Summary</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Number of Sales Orders</span>
                    <span className="text-lg font-bold text-gray-900">
                      {client.sales_orders?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Outstanding Balance</span>
                    <span className={`text-lg font-bold ${
                      (client.sales_orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0) > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {currencySymbol} {(client.sales_orders?.reduce((sum, order) => sum + (order.outstanding_balance || 0), 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currencySymbol} {(client.sales_orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Paid</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currencySymbol} {(client.sales_orders?.reduce((sum, order) => sum + (order.total_amount - order.outstanding_balance), 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="bg-white shadow rounded-lg overflow-hidden border-2 border-blue-500">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-blue-50">
              <h3 className="text-lg font-medium text-gray-900">Total Summary</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Number of Orders</span>
                    <span className="text-lg font-bold text-gray-900">
                      {(client.orders?.length || 0) + (client.sales_orders?.length || 0)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Outstanding Balance</span>
                    <span className={`text-lg font-bold ${client.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {currencySymbol} {client.total_balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currencySymbol} {(
                        (client.orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0) +
                        (client.sales_orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Paid</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currencySymbol} {(
                        (client.orders?.reduce((sum, order) => sum + (order.total_amount - order.outstanding_balance), 0) || 0) +
                        (client.sales_orders?.reduce((sum, order) => sum + (order.total_amount - order.outstanding_balance), 0) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Orders History Card */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Orders History</h3>
          </div>
          <div className="overflow-x-auto">
            {(client.orders && client.orders.length > 0 || client.sales_orders && client.sales_orders.length > 0) ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {client.orders?.map((order) => (
                    <tr key={`order-${order.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/dashboard/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Order
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currencySymbol} {order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          order.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {currencySymbol} {order.outstanding_balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {client.sales_orders?.map((order) => (
                    <tr key={`sales-${order.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/dashboard/sales/${order.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Sales Order
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currencySymbol} {order.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          order.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {currencySymbol} {order.outstanding_balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No orders found for this client.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 