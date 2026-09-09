import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { RentalLayout } from './layouts/RentalLayout.tsx';
import { Login } from './pages/Login.tsx';
import { ForgotPassword } from './pages/ForgotPassword.tsx';
import { ResetPassword } from './pages/ResetPassword.tsx';
import { StaffAndAccess } from './pages/StaffAndAccess.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Complexes } from './pages/Complexes.tsx';
import { ComplexDetail } from './pages/ComplexDetail.tsx';
import { Shops } from './pages/Shops.tsx';
import { ShopDetail } from './pages/ShopDetail.tsx';
import { Payments } from './pages/Payments.tsx';
import { Expenses } from './pages/Expenses.tsx';
import { Reports } from './pages/Reports.tsx';
import { BackupAndSync } from './pages/BackupAndSync.tsx';
import { Settings } from './pages/Settings.tsx';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin,
}) => {
  const { user, token, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAF9' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spin-animation" style={{ width: '36px', height: '36px', border: '3px solid rgba(23,107,82,0.2)', borderTopColor: '#176B52', borderRadius: '50%', margin: '0 auto 12px' }}></div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Validating Session...</div>
        </div>
      </div>
    );
  }

  if (!user && !token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Rental Staff Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RentalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="complexes" element={<Complexes />} />
            <Route path="complexes/:id" element={<ComplexDetail />} />
            <Route path="shops" element={<Shops />} />
            <Route path="shops/:id" element={<ShopDetail />} />
            <Route path="shops-and-tenants" element={<Navigate to="/shops" replace />} />
            <Route path="payments" element={<Payments />} />
            <Route path="rent-payments" element={<Navigate to="/payments" replace />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports-and-statement" element={<Navigate to="/reports" replace />} />
            <Route path="sync" element={<BackupAndSync />} />
            <Route path="backup-and-sync" element={<Navigate to="/sync" replace />} />

            {/* Admin-only Routes */}
            <Route
              path="staff-access"
              element={
                <ProtectedRoute requireAdmin>
                  <StaffAndAccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="settings"
              element={
                <ProtectedRoute requireAdmin>
                  <Settings />
                </ProtectedRoute>
              }
            />

            {/* /rental/ prefixed aliases */}
            <Route path="rental" element={<Navigate to="/dashboard" replace />} />
            <Route path="rental/dashboard" element={<Dashboard />} />
            <Route path="rental/complexes" element={<Complexes />} />
            <Route path="rental/complexes/:id" element={<ComplexDetail />} />
            <Route path="rental/shops" element={<Shops />} />
            <Route path="rental/shops/:id" element={<ShopDetail />} />
            <Route path="rental/payments" element={<Payments />} />
            <Route path="rental/expenses" element={<Expenses />} />
            <Route path="rental/reports" element={<Reports />} />
            <Route path="rental/backup-sync" element={<BackupAndSync />} />
            <Route path="rental/sync" element={<BackupAndSync />} />
            <Route
              path="rental/admin/users"
              element={
                <ProtectedRoute requireAdmin>
                  <StaffAndAccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="rental/staff-access"
              element={
                <ProtectedRoute requireAdmin>
                  <StaffAndAccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="rental/settings"
              element={
                <ProtectedRoute requireAdmin>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
