import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';

interface CreateCategoryFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCategoryForm({ onClose, onSuccess }: CreateCategoryFormProps) {
  const [categoryName, setCategoryName] = useState('');
  const { addToast } = useUI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: categoryName }]);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Category Created',
        message: 'The category has been created successfully.'
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to create category'
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-lg font-bold mb-4">Create New Category</h2>
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
          Create
        </button>
      </div>
    </form>
  );
} 