import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { Product, ProductCategory } from '../../types/inventory';
import { PRODUCT_CATEGORIES } from '../../utils/inventory-constants';

interface EditProductFormProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProductForm({ product, onClose, onSuccess }: EditProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productData, setProductData] = useState({
    name: product.name,
    category: product.category,
    description: product.description || '',
    unit_price: product.unit_price.toString(),
    stock_quantity: product.stock_quantity.toString(),
    reorder_point: product.reorder_point.toString(),
    sku: product.sku
  });
  const { organization } = useAuthStore();
  const { addToast } = useUI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    setIsSubmitting(true);
    try {
      // Update product
      const { error } = await supabase
        .from('products')
        .update({
          name: productData.name.trim(),
          category: productData.category,
          description: productData.description.trim() || null,
          unit_price: parseFloat(productData.unit_price) || 0,
          stock_quantity: parseInt(productData.stock_quantity) || 0,
          reorder_point: parseInt(productData.reorder_point) || 0,
          sku: productData.sku.trim()
        })
        .eq('id', product.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Product Updated',
        message: 'Product has been updated successfully.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update product'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Edit Product</h3>
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
            value={productData.name}
            onChange={(e) => setProductData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Enter product name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            SKU *
          </label>
          <input
            type="text"
            required
            value={productData.sku}
            onChange={(e) => setProductData(prev => ({ ...prev, sku: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Enter SKU"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={productData.category}
            onChange={(e) => setProductData(prev => ({ ...prev, category: e.target.value as ProductCategory }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            {Object.entries(PRODUCT_CATEGORIES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={productData.description}
            onChange={(e) => setProductData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Enter product description"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Unit Price *
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={productData.unit_price}
                onChange={(e) => setProductData(prev => ({ ...prev, unit_price: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Stock Quantity *
            </label>
            <input
              type="number"
              required
              min="0"
              value={productData.stock_quantity}
              onChange={(e) => setProductData(prev => ({ ...prev, stock_quantity: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Reorder Point
          </label>
          <input
            type="number"
            min="0"
            value={productData.reorder_point}
            onChange={(e) => setProductData(prev => ({ ...prev, reorder_point: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="0"
          />
          <p className="mt-1 text-sm text-gray-500">
            You'll be alerted when stock falls below this number
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !productData.name.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
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
      </div>
    </form>
  );
} 