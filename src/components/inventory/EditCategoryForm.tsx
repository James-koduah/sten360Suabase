import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';

interface Category {
  id: string;
  name: string;
  product_count: number;
}

interface EditCategoryFormProps {
  category: Category;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCategoryForm({ category, onClose, onSuccess }: EditCategoryFormProps) {
  const [categoryName, setCategoryName] = useState(category.name);
  const { addToast } = useUI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: categoryName })
        .eq('id', category.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Category Updated',
        message: 'The category has been updated successfully.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating category:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update category'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Edit Category</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Category Name</label>
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
          required
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="mr-2 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Update
        </button>
      </div>
    </form>
  );
} 