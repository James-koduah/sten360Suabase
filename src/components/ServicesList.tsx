import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { CURRENCIES } from '../utils/constants';

interface Service {
  id: string;
  name: string;
  cost: number;
  created_at: string;
}

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [newService, setNewService] = useState({
    name: '',
    cost: 0
  });
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  useEffect(() => {
    if (!organization) return;
    loadServices();
  }, [organization]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load services'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async () => {
    if (!organization || !newService.name.trim() || !newService.cost) return;

    try {
      const { data, error } = await supabase
        .from('services')
        .insert([{
          organization_id: organization.id,
          name: newService.name.trim(),
          cost: newService.cost
        }])
        .select()
        .single();

      if (error) throw error;

      setServices(prev => [...prev, data]);
      setNewService({ name: '', cost: 0 });
      setShowAddService(false);

      addToast({
        type: 'success',
        title: 'Service Added',
        message: 'The service has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding service:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add service. Please try again.'
      });
    }
  };

  const handleUpdateService = async (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: service.name,
          cost: service.cost
        })
        .eq('id', serviceId);

      if (error) throw error;

      setEditingService(null);
      addToast({
        type: 'success',
        title: 'Service Updated',
        message: 'The service has been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating service:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update service. Please try again.'
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const confirmed = await confirm({
      title: 'Delete Service',
      message: 'Are you sure you want to delete this service? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(prev => prev.filter(s => s.id !== serviceId));
      addToast({
        type: 'success',
        title: 'Service Deleted',
        message: 'The service has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete service. Please try again.'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Services</h2>
        <button
          onClick={() => setShowAddService(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </button>
      </div>

      {showAddService && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Service</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
              <input
                type="text"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter service name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cost ({currencySymbol}) *</label>
              <input
                type="number"
                value={newService.cost || ''}
                onChange={(e) => setNewService(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                min="0"
                step="0.01"
                placeholder="Enter service cost"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={() => setShowAddService(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                disabled={!newService.name.trim() || !newService.cost}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 flex items-center transition-colors duration-200 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {services.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No services added yet. Start by adding a new service.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map(service => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingService === service.id ? (
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => setServices(prev =>
                          prev.map(s => s.id === service.id ? { ...s, name: e.target.value } : s)
                        )}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    ) : (
                      service.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingService === service.id ? (
                      <input
                        type="number"
                        value={service.cost}
                        onChange={(e) => setServices(prev =>
                          prev.map(s => s.id === service.id ? { ...s, cost: parseFloat(e.target.value) || 0 } : s)
                        )}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        min="0"
                        step="0.01"
                      />
                    ) : (
                      `${currencySymbol} ${service.cost.toFixed(2)}`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingService === service.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleUpdateService(service.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingService(null);
                            loadServices(); // Reset to original data
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingService(service.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}