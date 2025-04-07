import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { format } from 'date-fns';
import { 
  ArrowLeft, Phone, MapPin, Calendar, User, 
  DollarSign, Package, FileText, Upload, X,
  Loader2, XCircle
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

interface EditClientModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedClient: Client) => Promise<void>;
  isSubmitting: boolean;
}

function EditClientModal({ client, isOpen, onClose, onSave, isSubmitting }: EditClientModalProps) {
  const [editedClient, setEditedClient] = useState<Client>(client);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(editedClient);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Client Details</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editedClient.name}
                    onChange={(e) => setEditedClient(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={editedClient.phone || ''}
                    onChange={(e) => setEditedClient(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={editedClient.address || ''}
                    onChange={(e) => setEditedClient(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                    placeholder="Enter client address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input
                    type="date"
                    value={editedClient.date_of_birth || ''}
                    onChange={(e) => setEditedClient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
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
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddCustomFieldModalOpen, setIsAddCustomFieldModalOpen] = useState(false);

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

  const handleUpdateClient = async (updatedClient: Client) => {
    if (!organization) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updatedClient.name,
          phone: updatedClient.phone,
          address: updatedClient.address,
          date_of_birth: updatedClient.date_of_birth
        })
        .eq('id', updatedClient.id)
        .eq('organization_id', organization.id);

      if (error) throw error;

      setClient(updatedClient);
      setIsEditModalOpen(false);
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
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit Details
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Information Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information Card */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Details
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="mt-1 text-base text-gray-900 font-medium">{client.name}</div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="mt-1 text-base text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {client.phone || 'Not provided'}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <div className="mt-1 text-base text-gray-900 flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-1 text-gray-400 flex-shrink-0" />
                    {client.address || 'Not provided'}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="mt-1 text-base text-gray-900 flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {client.date_of_birth ? format(new Date(client.date_of_birth), 'MMMM d, yyyy') : 'Not provided'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Information Card */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Custom Information</h3>
                <button
                  onClick={() => setIsAddCustomFieldModalOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Custom Field
                </button>
              </div>
            </div>
            <div className="p-6">
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
                {(!client.custom_fields || client.custom_fields.length === 0) && (
                  <div className="text-center text-gray-500 py-4">
                    No custom information added yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Custom Field Modal */}
        {isAddCustomFieldModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={(e) => { e.preventDefault(); handleAddCustomField(); }}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Add Custom Information</h3>
                      <button
                        type="button"
                        onClick={() => setIsAddCustomFieldModalOpen(false)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <XCircle className="h-6 w-6" />
                      </button>
                    </div>

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
                          className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
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
                          className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                          placeholder="Enter field title"
                          required
                        />
                      </div>

                      {newCustomField.type === 'text' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Value</label>
                          <input
                            type="text"
                            value={newCustomField.value}
                            onChange={(e) => setNewCustomField(prev => ({ ...prev, value: e.target.value }))}
                            className="mt-1 block w-full min-h-[30px] py-2 px-4 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                            placeholder="Enter value"
                            required
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
                              required
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
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-400 transition-colors duration-200"
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
                    <button
                      type="button"
                      onClick={() => setIsAddCustomFieldModalOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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
                    <span className="text-sm font-medium text-red-600">Outstanding Balance</span>
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
                    <span className="text-sm font-medium text-blue-600">Total Amount</span>
                    <span className="text-lg font-bold text-blue-600">
                      {currencySymbol} {(client.orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Total Paid</span>
                    <span className="text-lg font-bold text-green-600">
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
                    <span className="text-sm font-medium text-red-600">Outstanding Balance</span>
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
                    <span className="text-sm font-medium text-blue-600">Total Amount</span>
                    <span className="text-lg font-bold text-blue-600">
                      {currencySymbol} {(client.sales_orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Total Paid</span>
                    <span className="text-lg font-bold text-green-600">
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
                    <span className="text-sm font-medium text-red-600">Outstanding Balance</span>
                    <span className={`text-lg font-bold ${client.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {currencySymbol} {client.total_balance.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600">Total Amount</span>
                    <span className="text-lg font-bold text-blue-600">
                      {currencySymbol} {(
                        (client.orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0) +
                        (client.sales_orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Total Paid</span>
                    <span className="text-lg font-bold text-green-600">
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

      <EditClientModal
        client={client}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateClient}
        isSubmitting={isSubmitting}
      />
    </div>
  );
} 