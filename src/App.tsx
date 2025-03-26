import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthLayout from './components/auth/AuthLayout';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/Dashboard';
import OrganizationSetup from './components/OrganizationSetup';
import LandingPage from './components/LandingPage';
import { UIProvider } from './context/UIContext';
import ClientDetails from './components/clients/ClientDetails';

export default function App() {
  const { user, error, initialized } = useAuthStore();

  // Show loading state during initialization
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 mb-2">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <UIProvider>
      <BrowserRouter>
        <Routes>
          {/* Show landing page for unauthenticated users */}
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
          </Route>

          {/* Organization Setup */}
          <Route
            path="/organization-setup"
            element={user ? <OrganizationSetup /> : <Navigate to="/signin" replace />}
          />

          {/* Protected routes */}
          <Route
            path="/dashboard/*"
            element={user ? <Dashboard /> : <Navigate to="/signin" replace />}
          />

          <Route path="/clients/:id" element={<ClientDetails />} />
        </Routes>
      </BrowserRouter>
    </UIProvider>
  );
}