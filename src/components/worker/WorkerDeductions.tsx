import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { CURRENCIES } from '../../utils/constants';
import { useUI } from '../../context/UIContext';

interface WorkerDeductionsProps {
  task: any;
  tasks: any[];
  setTasks: (tasks: any[]) => void;
  organization: any;
}

const baseInputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2";

export default function WorkerDeductions({
  task,
  tasks,
  setTasks,
  organization
}: WorkerDeductionsProps) {
  const [newDeduction, setNewDeduction] = useState({
    amount: 0,
    reason: ''
  });
  const { confirm, addToast } = useUI();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  const handleAddDeduction = async () => {
    if (!task.id || !newDeduction.amount || !newDeduction.reason) return;

    try {
      const { data, error } = await supabase
        .from('deductions')
        .insert([{
          task_id: task.id,
          amount: newDeduction.amount,
          reason: newDeduction.reason.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            deductions: [...(t.deductions || []), data]
          };
        }
        return t;
      }));

      setNewDeduction({ amount: 0, reason: '' });

      addToast({
        type: 'success',
        title: 'Deduction Added',
        message: 'The deduction has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding deduction:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add deduction. Please try again.'
      });
    }
  };

  const handleRemoveDeduction = async (deductionId: string) => {
    const confirmed = await confirm({
      title: 'Remove Deduction',
      message: 'Are you sure you want to remove this deduction? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Remove',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', deductionId);

      if (error) throw error;

      setTasks(prev => prev.map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            deductions: t.deductions?.filter(d => d.id !== deductionId)
          };
        }
        return t;
      }));

      addToast({
        type: 'success',
        title: 'Deduction Removed',
        message: 'The deduction has been removed successfully.'
      });
    } catch (error) {
      console.error('Error removing deduction:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove deduction. Please try again.'
      });
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Add Deduction</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Amount ({currencySymbol})</label>
            <input
              type="number"
              value={newDeduction.amount || ''}
              onChange={(e) => setNewDeduction(prev => ({
                ...prev,
                amount: parseFloat(e.target.value) || 0
              }))}
              className={baseInputClasses}
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Reason</label>
            <input
              type="text"
              value={newDeduction.reason}
              onChange={(e) => setNewDeduction(prev => ({
                ...prev,
                reason: e.target.value
              }))}
              className={baseInputClasses}
            />
          </div>
        </div>
        <button
          onClick={handleAddDeduction}
          disabled={!newDeduction.amount || !newDeduction.reason.trim()}
          className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          Add Deduction
        </button>
      </div>

      {task.deductions && task.deductions.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Deductions</h4>
          {task.deductions.map(deduction => (
            <div key={deduction.id} className="flex items-center justify-between bg-red-50 p-3 rounded">
              <div>
                <p className="text-sm font-medium text-red-900">
                  {currencySymbol} {deduction.amount.toFixed(2)}
                </p>
                <p className="text-sm text-red-700">{deduction.reason}</p>
                <p className="text-xs text-red-600">
                  {format(new Date(deduction.created_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              <button
                onClick={() => handleRemoveDeduction(deduction.id)}
                className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}