
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ManageParticipants from './pages/ManageParticipants';
import ParticipantForm from './pages/ParticipantForm';
import ParticipantDetails from './pages/ParticipantDetails';
import ManageCategories from './pages/ManageCategories';
import CategoryForm from './pages/CategoryForm';
import CategoryDetails from './pages/CategoryDetails';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DateProvider } from './contexts/DateContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) return <div>Loading...</div>; // TODO: Better loading state

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { session } = useAuth();
  const location = useLocation();

  if (session && (location.pathname === '/login' || location.pathname === '/register')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/participants" element={<ManageParticipants />} />
        <Route path="/participants/new" element={<ParticipantForm />} />
        <Route path="/participants/edit/:id" element={<ParticipantForm />} />
        <Route path="/participants/:id" element={<ParticipantDetails />} />

        <Route path="/categories" element={<ManageCategories />} />
        <Route path="/categories/new" element={<CategoryForm />} />
        <Route path="/categories/edit/:id" element={<CategoryForm />} />
        <Route path="/categories/:id" element={<CategoryDetails />} />

        <Route path="/expenses/new" element={<Expenses />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  React.useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <DateProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
            className: 'dark:bg-slate-800 dark:text-white',
          }} />
        </NotificationProvider>
      </DateProvider>
    </AuthProvider>

  );
};

export default App;
