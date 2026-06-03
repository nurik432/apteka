import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'sonner';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProductsPage from '@/pages/ProductsPage';
import POSPage from '@/pages/POSPage';
import WarehousePage from '@/pages/WarehousePage';
import InventoryPage from '@/pages/InventoryPage';
import ExpiryPage from '@/pages/ExpiryPage';
import SuppliersPage from '@/pages/SuppliersPage';
import ReportsPage from '@/pages/ReportsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import UsersPage from '@/pages/UsersPage';
import SettingsPage from '@/pages/SettingsPage';
import DictionariesPage from '@/pages/DictionariesPage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="pos" element={
          <ProtectedRoute roles={['ADMIN', 'PHARMACIST']}>
            <POSPage />
          </ProtectedRoute>
        } />
        <Route path="warehouse" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STOREKEEPER']}>
            <WarehousePage />
          </ProtectedRoute>
        } />
        <Route path="inventory" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STOREKEEPER']}>
            <InventoryPage />
          </ProtectedRoute>
        } />
        <Route path="expiry" element={<ExpiryPage />} />
        <Route path="suppliers" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STOREKEEPER']}>
            <SuppliersPage />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STOREKEEPER']}>
            <OrdersPage />
          </ProtectedRoute>
        } />
        <Route path="orders/:id" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER', 'STOREKEEPER']}>
            <OrderDetailPage />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <AnalyticsPage />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={['ADMIN']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="dictionaries" element={
          <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
            <DictionariesPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute roles={['ADMIN']}>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
