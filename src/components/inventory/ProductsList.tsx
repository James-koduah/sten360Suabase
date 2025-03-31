import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Package, ChevronDown, FolderTree } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { Product } from '../../types/inventory';
import { CURRENCIES } from '../../utils/constants';
import CreateProductForm from './CreateProductForm';
import { Link } from 'react-router-dom';

interface Category {
  id: number;
  name: string;
  organization_id: string;
}

export default function ProductsList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter(category => 
      category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!organization) return;
    loadProducts();
    loadCategories();
  }, [organization]);

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
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load categories'
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const confirmed = await confirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      addToast({
        type: 'success',
        title: 'Product Deleted',
        message: 'Product has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete product'
      });
    }
  };

  const filteredProducts = products.filter(product =>
    (categoryFilter === 'all' || product.category === categoryFilter) &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     product.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your inventory</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddProduct(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </button>
          <Link
            to="/dashboard/categories"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
          >
            <FolderTree className="h-4 w-4 mr-2" />
            Manage Categories
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            className="inline-flex items-center justify-between w-full sm:w-48 rounded-lg border border-gray-300 py-2 pl-3 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <span className="truncate">
              {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute z-10 mt-1 w-full sm:w-48 rounded-md bg-white shadow-lg">
              <div className="p-2">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  className="block w-full rounded-md border border-gray-300 py-1.5 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="max-h-60 overflow-auto">
                <div
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setCategoryFilter('all');
                    setShowCategoryDropdown(false);
                    setCategorySearch('');
                  }}
                >
                  All Categories
                </div>
                {filteredCategories.map(category => (
                  <div
                    key={category.id}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setCategoryFilter(category.name);
                      setShowCategoryDropdown(false);
                      setCategorySearch('');
                    }}
                  >
                    {category.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No products found.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-gray-500">{product.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {currencySymbol} {product.unit_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        product.stock_quantity <= product.reorder_point
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {product.stock_quantity}
                      </span>
                      {product.stock_quantity <= product.reorder_point && (
                        <span className="text-xs text-red-500 ml-2">
                          Low stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {/* TODO: Implement edit */}}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
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

      {showAddProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddProduct(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
              <CreateProductForm
                onClose={() => setShowAddProduct(false)}
                onSuccess={loadProducts}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 