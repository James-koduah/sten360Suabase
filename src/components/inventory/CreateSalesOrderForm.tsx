import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Loader2, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { Product } from '../../types/inventory';
import { CURRENCIES } from '../../utils/constants';
import { Client } from '../../types/clients';

interface OrderItem {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_custom_item: boolean;
  product?: Product;
}

interface CreateSalesOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateSalesOrderForm({ onClose, onSuccess }: CreateSalesOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customItem, setCustomItem] = useState({
    name: '',
    quantity: 1,
    unit_price: 0
  });
  const [notes, setNotes] = useState('');
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    if (organization) {
      loadClients();
      loadProducts();
    }
  }, [organization]);

  const loadClients = async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load clients'
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadProducts = async () => {
    if (!organization?.id) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load products'
      });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock_quantity <= 0) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'This product is out of stock'
      });
      return;
    }

    const existingItem = orderItems.find(item => item.product_id === productId);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Not enough stock available'
        });
        return;
      }

      setOrderItems(prev => prev.map(item =>
        item.product_id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
              total_price: (item.quantity + 1) * item.unit_price
            }
          : item
      ));
    } else {
      setOrderItems(prev => [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.unit_price,
        total_price: product.unit_price,
        is_custom_item: false,
        product
      }]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customItem.name.trim() || customItem.quantity <= 0 || customItem.unit_price <= 0) return;

    setOrderItems(prev => [...prev, {
      product_id: null,
      name: customItem.name.trim(),
      quantity: customItem.quantity,
      unit_price: customItem.unit_price,
      total_price: customItem.quantity * customItem.unit_price,
      is_custom_item: true
    }]);

    setCustomItem({
      name: '',
      quantity: 1,
      unit_price: 0
    });
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    const item = orderItems[index];
    if (!item) return;

    if (!item.is_custom_item && item.product && quantity > item.product.stock_quantity) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Not enough stock available'
      });
      return;
    }

    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }

    setOrderItems(prev => prev.map((item, i) =>
      i === index
        ? {
            ...item,
            quantity,
            total_price: quantity * item.unit_price
          }
        : item
    ));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !selectedClient || orderItems.length === 0) return;

    setIsSubmitting(true);
    try {
      // Create sales order
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{
          organization_id: organization.id,
          client_id: selectedClient,
          total_amount: getTotalAmount(),
          outstanding_balance: getTotalAmount(),
          notes: notes.trim() || null
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems.map(item => ({
          sales_order_id: orderData.id,
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          is_custom_item: item.is_custom_item
        })));

      if (itemsError) throw itemsError;

      addToast({
        type: 'success',
        title: 'Order Created',
        message: 'Sales order has been created successfully.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create order'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingClients || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Create Sales Order</h3>
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
            Client *
          </label>
          <select
            required
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Add Products
          </label>
          <select
            value=""
            onChange={(e) => handleAddProduct(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select a product</option>
            {products.map(product => (
              <option
                key={product.id}
                value={product.id}
                disabled={product.stock_quantity <= 0}
              >
                {product.name} - {currencySymbol}{product.unit_price.toFixed(2)} ({product.stock_quantity} in stock)
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Custom Item Name
              </label>
              <input
                type="text"
                value={customItem.name}
                onChange={(e) => setCustomItem(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter item name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={customItem.quantity}
                onChange={(e) => setCustomItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unit Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={customItem.unit_price}
                onChange={(e) => setCustomItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddCustomItem}
              disabled={!customItem.name.trim() || customItem.quantity <= 0 || customItem.unit_price <= 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Item
            </button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orderItems.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-2" />
                      <div className="text-sm text-gray-900">{item.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4 text-gray-500" />
                      </button>
                      <span className="text-sm text-gray-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                        disabled={!item.is_custom_item && item.product && item.quantity >= item.product.stock_quantity}
                      >
                        <Plus className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {currencySymbol} {item.unit_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {currencySymbol} {item.total_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {orderItems.length > 0 && (
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    Total Amount:
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {currencySymbol} {getTotalAmount().toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            placeholder="Add any notes about this order"
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
          disabled={isSubmitting || !selectedClient || orderItems.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              Creating...
            </>
          ) : (
            'Create Sale'
          )}
        </button>
      </div>
    </form>
  );
} 