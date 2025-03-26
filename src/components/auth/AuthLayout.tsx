import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Building2 } from 'lucide-react';

export default function AuthLayout() {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sten360
        </h2>
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-600">
            Complete Business Management Platform
          </p>
          <p className="text-xs text-gray-500 mt-1">
            A Sten Business Solution
          </p>
        </div>
      </div>

      <Outlet />
    </div>
  );
}