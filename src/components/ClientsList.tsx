import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Phone, MapPin, Calendar, Upload, X, Loader2, Pencil } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { format } from 'date-fns';
import { CURRENCIES } from '../utils/constants';
import { Link } from 'react-router-dom';

interface CustomField {
  id: string;
  title: string;
  value: string;
  type: 'text' | 'file';
}

interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  custom_fields?: CustomField[];
  total_balance: number;
  orders?: Array<{ outstanding_balance: number }>;
  sales_orders?: Array<{ outstanding_balance: number }>;
}

interface NewCustomField {
  title: string;
  value: string;
  type: 'text' | 'file';
  file: File | null;
}

export default function ClientsList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newCustomField, setNewCustomField] = useState<NewCustomField>({
    title: '',
    value: '',
    type: 'text',
    file: null
  });
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    customFields: [{ title: '', value: '', type: 'text' as const, file: null as File | null }]
  });
  const [isUploading, setIsUploading] = useState(false);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  useEffect(() => {
    if (!organization) return;
    loadClients();
  }, [organization]);

  const loadClients = async () => {
    if (!organization?.id) return;

    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*),
          orders:orders(outstanding_balance),
          sales_orders:sales_orders(outstanding_balance)
        `)
        .eq('organization_id', organization.id)
        .order('name');

      if (clientsError) throw clientsError;

      // Calculate total balance for each client from both orders and sales_orders
      const clientsWithBalance = clientsData?.map(client => {
        const ordersBalance = client.orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        const salesOrdersBalance = client.sales_orders?.reduce((sum: number, order: any) => sum + (order.outstanding_balance || 0), 0) || 0;
        
        return {
          ...client,
          total_balance: ordersBalance + salesOrdersBalance
        };
      }) || [];

      setClients(clientsWithBalance);
    } catch (error) {
      console.error('Error loading clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load clients'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClient = async () => {
    if (!organization || !newClient.name.trim()) return;

    setIsUploading(true);
    try {
      // First insert the client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          organization_id: organization.id,
          name: newClient.name.trim(),
          phone: newClient.phone.trim(),
          address: newClient.address.trim(),
          date_of_birth: newClient.date_of_birth || null
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // Then insert custom fields
      const validCustomFields = newClient.customFields.filter(field => 
        field.title.trim() && (field.type === 'text' ? field.value.trim() : field.file)
      );
      
      if (validCustomFields.length > 0) {
        for (const field of validCustomFields) {
          let fieldValue = field.value;

          if (field.type === 'file' && field.file) {
            // Upload file to storage
            const fileExt = field.file.name.split('.').pop()?.toLowerCase();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${organization.id}/clients/${clientData.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('profiles')
              .upload(filePath, field.file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('profiles')
              .getPublicUrl(filePath);

            fieldValue = publicUrl;
          }

          // Create custom field record
          const { error: fieldError } = await supabase
            .from('client_custom_fields')
            .insert({
              client_id: clientData.id,
              title: field.title.trim(),
              value: fieldValue,
              type: field.type
            });

          if (fieldError) throw fieldError;
        }
      }

      // Reload clients to get the new data with custom fields
      await loadClients();

      setNewClient({
        name: '',
        phone: '',
        address: '',
        date_of_birth: '',
        customFields: [{ title: '', value: '', type: 'text', file: null }]
      });
      setShowAddClient(false);

      addToast({
        type: 'success',
        title: 'Client Added',
        message: 'New client has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add client'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This will also delete all their custom information.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      setClients(prev => prev.filter(client => client.id !== clientId));

      addToast({
        type: 'success',
        title: 'Client Deleted',
        message: 'Client has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete client'
      });
    }
  };

  const handleEditClient = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: client.name,
          phone: client.phone,
          address: client.address,
          date_of_birth: client.date_of_birth
        })
        .eq('id', clientId);

      if (error) throw error;

      setEditingClient(null);
      addToast({
        type: 'success',
        title: 'Client Updated',
        message: 'Client details have been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update client'
      });
    }
  };

  const handleAddCustomField = async (clientId: string, title: string, value: string, type: 'text' | 'file' | 'image' = 'text') => {
    try {
      const { data, error } = await supabase
        .from('client_custom_fields')
        .insert([{
          client_id: clientId,
          title: title.trim(),
          value: value.trim(),
          type
        }])
        .select()
        .single();

      if (error) throw error;

      setClients(prev => prev.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            custom_fields: [...(client.custom_fields || []), data]
          };
        }
        return client;
      }));

      addToast({
        type: 'success',
        title: 'Field Added',
        message: 'Custom field has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding custom field:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add custom field'
      });
    }
  };

  const handleDeleteCustomField = async (clientId: string, fieldId: string) => {
    try {
      const { error } = await supabase
        .from('client_custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setClients(prev => prev.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            custom_fields: client.custom_fields?.filter(f => f.id !== fieldId)
          };
        }
        return client;
      }));

      addToast({
        type: 'success',
        title: 'Field Deleted',
        message: 'Custom field has been deleted successfully.'
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

  const addCustomField = () => {
    setNewClient(prev => ({
      ...prev,
      customFields: [...prev.customFields, { title: '', value: '', type: 'text', file: null }]
    }));
  };

  const removeCustomField = (index: number) => {
    setNewClient(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  const updateCustomField = (index: number, updates: { title?: string; file?: File | null }) => {
    setNewClient(prev => ({
      ...prev,
      customFields: prev.customFields.map((f, i) => 
        i === index ? { ...f, ...updates } : f
      )
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <button
          onClick={() => setShowAddClient(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </button>
      </div>

      {showAddClient && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Client</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={newClient.name}
                onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={newClient.phone}
                onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                value={newClient.address}
                onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                value={newClient.date_of_birth}
                onChange={(e) => setNewClient(prev => ({ ...prev, date_of_birth: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Custom Information</h4>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </button>
              </div>

              {newClient.customFields.map((field, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={field.title}
                        onChange={(e) => updateCustomField(index, { title: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="Enter field title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateCustomField(index, { type: e.target.value as 'text' | 'file' })}
                        className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="file">File</option>
                      </select>
                    </div>
                    {field.type === 'text' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Value</label>
                        <input
                          type="text"
                          value={field.value || ''}
                          onChange={(e) => updateCustomField(index, { value: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
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
                                updateCustomField(index, { file });
                              }
                            }}
                            className="hidden"
                            id={`file-${index}`}
                          />
                          <label
                            htmlFor={`file-${index}`}
                            className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </label>
                          {field.file && (
                            <span className="ml-3 text-sm text-gray-500">
                              {field.file.name}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomField(index)}
                    className="mt-8 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddClient(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                disabled={!newClient.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add Client'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="ml-2 flex-1 outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredClients.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery ? 'No clients found matching your search.' : 'No clients added yet.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Birth
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Custom Information
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingClient === client.id ? (
                        <input
                          type="text"
                          value={client.name}
                          onChange={(e) => setClients(prev => prev.map(c => 
                            c.id === client.id ? { ...c, name: e.target.value } : c
                          ))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      ) : (
                        <Link
                          to={`/clients/${client.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {client.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingClient === client.id ? (
                        <div className="space-y-2">
                          <input
                            type="tel"
                            value={client.phone || ''}
                            onChange={(e) => setClients(prev => prev.map(c => 
                              c.id === client.id ? { ...c, phone: e.target.value } : c
                            ))}
                            placeholder="Phone"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                          <textarea
                            value={client.address || ''}
                            onChange={(e) => setClients(prev => prev.map(c => 
                              c.id === client.id ? { ...c, address: e.target.value } : c
                            ))}
                            placeholder="Address"
                            rows={2}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {client.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {client.phone}
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-1" />
                              {client.address}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingClient === client.id ? (
                        <input
                          type="date"
                          value={client.date_of_birth || ''}
                          onChange={(e) => setClients(prev => prev.map(c => 
                            c.id === client.id ? { ...c, date_of_birth: e.target.value } : c
                          ))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      ) : client.date_of_birth ? (
                        <div className="text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {format(new Date(client.date_of_birth), 'MMM d, yyyy')}
                          </div>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {client.custom_fields?.map((field, index) => (
                          <div key={field.id} className="flex items-center justify-between mb-2 bg-gray-50 p-2 rounded">
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
                              onClick={() => handleDeleteCustomField(client.id, field.id)}
                              className="ml-2 p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {editingClient === client.id && (
                          <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-4">Add Custom Information</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Type</label>
                                <select
                                  value={newCustomField.type}
                                  onChange={(e) => setNewCustomField(prev => ({ 
                                    ...prev, 
                                    type: e.target.value as 'text' | 'file',
                                    value: '',
                                    file: null
                                  }))}
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
                                    value={newCustomField.value || ''}
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
                                      id={`custom-file-${client.id}`}
                                    />
                                    <label
                                      htmlFor={`custom-file-${client.id}`}
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
                              <div className="flex justify-end space-x-3">
                                <button
                                  onClick={() => setNewCustomField({ title: '', value: '', type: 'text', file: null })}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                                >
                                  Clear
                                </button>
                                <button
                                  onClick={() => {
                                    if (newCustomField.title && (newCustomField.value || newCustomField.file)) {
                                      handleAddCustomField(
                                        client.id, 
                                        newCustomField.title, 
                                        newCustomField.value || '', 
                                        newCustomField.type
                                      );
                                      setNewCustomField({ title: '', value: '', type: 'text', file: null });
                                    }
                                  }}
                                  disabled={!newCustomField.title || (!newCustomField.value && !newCustomField.file)}
                                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                                >
                                  Add Field
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${client.total_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {currencySymbol} {client.total_balance.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          Total Outstanding
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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