import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Building2 } from 'lucide-react';

const EMPLOYEE_RANGES = [
  { label: '0-15 employees', value: 15 },
  { label: '15-30 employees', value: 30 },
  { label: '30-50 employees', value: 50 },
  { label: '50-100 employees', value: 100 },
  { label: '100-200 employees', value: 200 },
  { label: '200+ employees', value: 201 }
];

const CURRENCIES = [
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'NGN', name: 'Nigerian Naira' }
];

// List of countries - you can expand this
const COUNTRIES = [
  'Ghana',
  'Nigeria',
  'Kenya',
  'South Africa',
  'United States',
  'United Kingdom',
  'Canada'
].sort();

export default function OrganizationSetup() {
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    country: organization?.country || '',
    city: organization?.city || '',
    address: organization?.address || '',
    employee_count: organization?.employee_count || 15,
    currency: organization?.currency || 'GHS'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          country: formData.country,
          city: formData.city,
          address: formData.address,
          employee_count: formData.employee_count,
          currency: formData.currency
        })
        .eq('id', organization.id);

      if (error) throw error;

      // Update local state
      useAuthStore.setState({
        organization: {
          ...organization,
          ...formData
        }
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating organization:', error);
      alert('Failed to update organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Complete Your Organization Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please provide additional information about your organization
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Country
              </label>
              <select
                id="country"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                required
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select a country</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                required
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                required
                rows={3}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="employee_count" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Employees
              </label>
              <select
                id="employee_count"
                value={formData.employee_count}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_count: parseInt(e.target.value) }))}
                required
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                {EMPLOYEE_RANGES.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Currency
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                required
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Saving...' : 'Save Organization Details'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}