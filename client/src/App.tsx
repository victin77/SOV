import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ForcePasswordChange from './components/ForcePasswordChange';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Appointments from './pages/Appointments';
import TagsPage from './pages/TagsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import WhatsAppInbox from './pages/WhatsAppInbox';
import SuperAdmin from './pages/SuperAdmin';
import SuperAdminCompany from './pages/SuperAdminCompany';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}<ForcePasswordChange /></Layout>;
}

function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/" />;
  return <>{children}</>;
}

function SmartHome() {
  const { user, impersonation } = useAuth();
  // SUPER_ADMIN without impersonation goes to admin panel
  if (user?.role === 'SUPER_ADMIN' && !impersonation.active) {
    return <Navigate to="/admin" />;
  }
  return <PrivateRoute><Dashboard /></PrivateRoute>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/admin" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
      <Route path="/admin/company/:id" element={<SuperAdminRoute><SuperAdminCompany /></SuperAdminRoute>} />

      <Route path="/" element={<SmartHome />} />
      <Route path="/pipeline" element={<PrivateRoute><Pipeline /></PrivateRoute>} />
      <Route path="/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
      <Route path="/leads/:id" element={<PrivateRoute><LeadDetail /></PrivateRoute>} />
      <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
      <Route path="/whatsapp" element={<PrivateRoute><WhatsAppInbox /></PrivateRoute>} />
      <Route path="/tags" element={<PrivateRoute><TagsPage /></PrivateRoute>} />
      <Route path="/import-export" element={<PrivateRoute><ImportExport /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

      <Route path="/users" element={
        <PrivateRoute>
          <RoleRoute roles={['ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
            <UsersPage />
          </RoleRoute>
        </PrivateRoute>
      } />
      <Route path="/audit" element={
        <PrivateRoute>
          <RoleRoute roles={['ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
            <AuditPage />
          </RoleRoute>
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
