import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, CreditCard, DollarSign } from 'lucide-react';

interface QuickActionsProps {
  onRecordPayment: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onRecordPayment }) => {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Quick Actions</h3>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/dashboard/orders?showCreateForm=true"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
              <ShoppingCart className="h-6 w-6 text-purple-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Create Order</p>
              <p className="text-sm text-gray-500">Create a new service order</p>
            </div>
          </Link>

          <Link
            to="/dashboard/sales?showCreateForm=true"
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
          >
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <CreditCard className="h-6 w-6 text-yellow-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Create Sale</p>
              <p className="text-sm text-gray-500">Create a new sales order</p>
            </div>
          </Link>

          <div
            className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 cursor-pointer"
            onClick={onRecordPayment}
          >
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <DollarSign className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Record Payment</p>
              <p className="text-sm text-gray-500">Record order payments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 