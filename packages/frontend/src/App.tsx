import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Onboarding from './pages/Onboarding';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/'} replace /> : <Register />}
      />

      {/* Account holder routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {user?.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Layout><Dashboard /></Layout>
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            {user?.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Layout><Onboarding /></Layout>
            )}
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <Layout><AdminDashboard /></Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
