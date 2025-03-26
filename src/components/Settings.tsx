import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Building2, AlertTriangle, UserX, Globe, Building, MapPin, 
  Users, Coins, Package, ArrowLeft } from 'lucide-react';
import { useUI } from '../context/UIContext';

const EMPLOYEE_RANGES = [
  { value: 15, label: '0-15 employees' },
  { value: 30, label: '15-30 employees' },
  { value: 50, label: '30-50 employees' },
  { value: 100, label: '50-100 employees' },
  { value: 200, label: '100-200 employees' },
  { value: 201, label: '200+ employees' }
];

const CURRENCIES: Record<string, { name: string; symbol: string }> = {
  GHS: { name: 'Ghanaian Cedi', symbol: '₵' },
  USD: { name: 'US Dollar', symbol: '$' },
  EUR: { name: 'Euro', symbol: '€' },
  GBP: { name: 'British Pound', symbol: '£' },
  NGN: { name: 'Nigerian Naira', symbol: '₦' }
};

export default function Settings() {
  const { organization, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrg, setEditedOrg] = useState({
    name: organization.name,
    country: organization.country || '',
    city: organization.city || '',
    address: organization.address || '',
    employee_count: organization.employee_count || 15,
    currency: organization.currency || 'GHS'
  });
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, addToast } = useUI();

  const handleSave = async () => {
    if (!editedOrg.name.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editedOrg.name.trim(),
          country: editedOrg.country,
          city: editedOrg.city,
          address: editedOrg.address,
          employee_count: editedOrg.employee_count,
          currency: editedOrg.currency
        })
        .eq('id', organization.id);

      if (error) throw error;

      useAuthStore.setState({
        organization: { ...organization, ...editedOrg }
      });
      setIsEditing(false);
      
      addToast({
        type: 'success',
        title: 'Organization Updated',
        message: 'Organization details have been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update organization name. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrganization = async () => {
    const confirmed = await confirm({
      title: 'Delete Organization',
      message: 'Are you sure you want to delete your organization? This will permanently delete all workers, tasks, and associated data. This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete Organization',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id);

      if (error) throw error;

      await signOut();
      window.location.href = '/';

      addToast({
        type: 'success',
        title: 'Organization Deleted',
        message: 'Your organization and all associated data have been permanently deleted.'
      });
    } catch (error) {
      console.error('Error deleting organization:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete organization. Please try again.'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Services Section */}
      <div className="bg-white shadow rounded-lg divide-y">
        <div className="px-6 py-5">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-gray-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">Services</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage the services your organization provides.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-4">
            <Link
              to="/dashboard/settings/services"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Package className="h-4 w-4 mr-2" />
              Manage Services
            </Link>
          </div>
        </div>
      </div>

      {/* Organization Settings */}
      <div className="bg-white shadow rounded-lg divide-y">
        <div className="px-6 py-5">
          <div className="flex items-center">
            <Building2 className="h-6 w-6 text-gray-400" />
            <h3 className="ml-3 text-lg font-medium text-gray-900">Organization Settings</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization's basic information and settings.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-6">
            <div>
              {isEditing ? (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Organization Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={editedOrg.name}
                        onChange={(e) => setEditedOrg(prev => ({ ...prev, name: e.target.value }))}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter organization name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Country</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={editedOrg.country}
                        onChange={(e) => setEditedOrg(prev => ({ ...prev, country: e.target.value }))}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={editedOrg.city}
                        onChange={(e) => setEditedOrg(prev => ({ ...prev, city: e.target.value }))}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <div className="mt-1">
                      <textarea
                        value={editedOrg.address}
                        onChange={(e) => setEditedOrg(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Employees</label>
                    <div className="mt-1">
                      <select
                        value={editedOrg.employee_count || ''}
                        onChange={(e) => setEditedOrg(prev => ({ ...prev, employee_count: parseInt(e.target.value) }))}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        {EMPLOYEE_RANGES.map((range, index) => (
                          <option key={index} value={range.value}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <div className="mt-1">
                      <select
                        value={editedOrg.currency}
                        onChange={(e) => setEditedOrg(prev => ({ ...prev, currency: e.target.value }))}
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
                          <option key={code} value={code}>
                            {code} ({symbol}) - {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={isSaving || !editedOrg.name.trim()}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedOrg({
                        name: organization.name,
                        country: organization.country,
                        city: organization.city,
                        address: organization.address,
                        employee_count: organization.employee_count,
                        currency: organization.currency
                      });
                    }}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Organization Name</p>
                        <p className="text-base text-gray-900">{organization.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Country</p>
                        <p className="text-base text-gray-900">{organization.country}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Building className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">City</p>
                        <p className="text-base text-gray-900">{organization.city}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Address</p>
                        <p className="text-base text-gray-900">{organization.address}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Number of Employees</p>
                        <p className="text-base text-gray-900">
                          {EMPLOYEE_RANGES.find(range => range.value === organization.employee_count)?.label || 'Not set'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Coins className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Currency</p>
                        <p className="text-base text-gray-900">
                          {organization.currency} ({CURRENCIES[organization.currency]?.symbol}) - {CURRENCIES[organization.currency]?.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Organization Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white shadow rounded-lg divide-y space-y-4">
        <div className="px-6 py-5">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="ml-3 text-lg font-medium text-red-600">Danger Zone</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Irreversible and destructive actions
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Delete Organization</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Once you delete your organization, there is no going back. Please be certain.
                    This will delete:
                  </p>
                  <ul className="list-disc list-inside mt-2">
                    <li>All workers and their data</li>
                    <li>All tasks and financial records</li>
                    <li>All projects and rates</li>
                    <li>All uploaded files and images</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleDeleteOrganization}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete Organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Delete Account Section */}
        <div className="px-6 py-5">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <UserX className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Permanently delete your account and all associated data.
                    This action cannot be undone. This will:
                  </p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Delete your user account</li>
                    <li>Delete your organization</li>
                    <li>Remove all workers and their data</li>
                    <li>Remove all tasks and financial records</li>
                    <li>Delete all uploaded files</li>
                  </ul>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Delete Account',
                        message: 'Are you absolutely sure you want to delete your account? This action cannot be undone.',
                        type: 'danger',
                        confirmText: 'Delete Account',
                        cancelText: 'Cancel'
                      });

                      if (confirmed) {
                        try {
                          await useAuthStore.getState().deleteAccount();
                          window.location.href = '/';
                        } catch (error) {
                          console.error('Error deleting account:', error);
                        }
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete Account Permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}