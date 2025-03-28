import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';

interface CreateProductFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProductForm({ onClose, onSuccess }: CreateProductFormProps) {
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    unit_price: '',
    stock_quantity: '',
    reorder_point: ''
  });

  useEffect(() => {
    if (!organization) return;
    loadExistingCategories();
  }, [organization]);

  const loadExistingCategories = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .order('name');

      if (error) throw error;

      setExistingCategories(data?.map(category => category.name) || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    const numericPrice = parseFloat(formData.unit_price);
    const numericQuantity = parseInt(formData.stock_quantity);
    const numericReorderPoint = parseInt(formData.reorder_point);

    if (isNaN(numericPrice) || numericPrice < 0) {
      addToast({
        type: 'error',
        title: 'Invalid Price',
        message: 'Please enter a valid unit price'
      });
      return;
    }

    if (isNaN(numericQuantity) || numericQuantity < 0) {
      addToast({
        type: 'error',
        title: 'Invalid Quantity',
        message: 'Please enter a valid stock quantity'
      });
      return;
    }

    if (isNaN(numericReorderPoint) || numericReorderPoint < 0) {
      addToast({
        type: 'error',
        title: 'Invalid Reorder Point',
        message: 'Please enter a valid reorder point'
      });
      return;
    }

    if (!formData.category) {
      addToast({
        type: 'error',
        title: 'Invalid Category',
        message: 'Please select or enter a category'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('products')
        .insert([{
          organization_id: organization.id,
          name: formData.name.trim(),
          category: formData.category.trim(),
          description: formData.description.trim() || null,
          unit_price: numericPrice,
          stock_quantity: numericQuantity,
          reorder_point: numericReorderPoint
        }]);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Product Created',
        message: 'Product has been created successfully'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create product'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setShowCustomCategory(false);
      setCustomCategory('');
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomCategory(value);
    setFormData(prev => ({ ...prev, category: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Create Product</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a category</option>
            {existingCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Unit Price *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stock Quantity *
          </label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={formData.stock_quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reorder Point *
          </label>
          <input
            type="number"
            required
            min="0"
            step="1"
            value={formData.reorder_point}
            onChange={(e) => setFormData(prev => ({ ...prev, reorder_point: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Creating...
            </>
          ) : (
            'Create Product'
          )}
        </button>
      </div>
    </form>
  );
} 