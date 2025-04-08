import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Building2, Users, ClipboardList, Settings as SettingsIcon, LogOut, UserSquare2, Package, ShoppingCart, DollarSign, FolderTree } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import OrderDetails from './orders/OrderDetails';
import OrdersList from './orders/OrdersList';
import WorkersList from './WorkersList';
import WorkerDetails from './WorkerDetails';
import DashboardOverview from './DashboardOverview';
import TasksList from './TasksList';
import Settings from './Settings';
import ClientsList from './ClientsList';
import FinancialDashboard from './FinancialDashboard';
import ServicesList from './services/ServicesList';
import ProductsList from './inventory/ProductsList';
import SalesOrdersList from './inventory/SalesOrdersList';
import SalesOrderDetails from './inventory/SalesOrderDetails';
import Categories from '../pages/Categories';

export default function Dashboard() {
  const { user, organization } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if organization setup is complete
  const isSetupComplete = organization && organization.country && organization.city && 
    organization.address && organization.employee_count && organization.currency;

  // Redirect to setup if not complete
  if (!isSetupComplete) {
    return <Navigate to="/organization-setup" />;
  }

  // If no user or organization, render nothing - let the router handle redirection
  if (!user || !organization) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await useAuthStore.getState().signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = [
    { name: 'Overview', path: '/dashboard', icon: Building2 },
    { name: 'Workers', path: '/dashboard/workers', icon: Users },
    { name: 'Clients', path: '/dashboard/clients', icon: UserSquare2 },
    { name: 'Orders', path: '/dashboard/orders', icon: ShoppingCart },
    { name: 'Tasks', path: '/dashboard/tasks', icon: ClipboardList },
    { name: 'Inventory', path: '/dashboard/inventory', icon: Package },
    { name: 'Sales', path: '/dashboard/sales', icon: DollarSign },
    { name: 'Settings', path: '/dashboard/settings', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                {organization.name}
              </span>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="ml-4 inline-flex items-center px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="ml-4 sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Mobile menu */}
        <div className={`sm:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="pt-2 pb-3 space-y-1 bg-white shadow-sm rounded-lg">
            {navigation.map((item) => {
              const isActive = location.pathname === item.path || 
                item.path !== '/dashboard' &&
                (location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                    isActive
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className={`h-5 w-5 mr-2 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Desktop menu */}
        <nav className="hidden sm:flex items-center justify-center space-x-1 bg-white shadow-sm rounded-lg p-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path || 
              item.path !== '/dashboard' &&
              (location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`px-4 py-2 text-sm font-medium rounded-md flex items-center ${
                  isActive
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className={`h-5 w-5 mr-2 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route index element={<DashboardOverview />} />
          <Route path="workers" element={<WorkersList />} />
          <Route path="workers/:id" element={<WorkerDetails />} />
          <Route path="clients" element={<ClientsList />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="tasks" element={<TasksList status={undefined} />} />
          <Route path="tasks/pending" element={<TasksList status="pending" />} />
          <Route path="tasks/in_progress" element={<TasksList status="in_progress" />} />
          <Route path="tasks/delayed" element={<TasksList status="delayed" />} />
          <Route path="tasks/completed" element={<TasksList status="completed" />} />
          <Route path="inventory" element={<ProductsList />} />
          <Route path="categories" element={<Categories />} />
          <Route path="sales" element={<SalesOrdersList />} />
          <Route path="sales/:id" element={<SalesOrderDetails />} />
          <Route path="finances" element={<FinancialDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/services" element={<ServicesList />} />
        </Routes>
      </main>
    </div>
  );
}