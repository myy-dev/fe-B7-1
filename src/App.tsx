import { Navigate, Route, Routes } from 'react-router';
import AppLayout from './layouts/AppLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminSessionPage from './pages/AdminSessionPage';
import AdminLogsPage from './pages/AdminLogsPage';
import AdminSystemLogsPage from './pages/AdminSystemLogsPage';
import AuthProvider from './components/AuthProvider';
import AuthGate from './components/AuthGate';
import { getHomePath, useAuth } from './lib/auth';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />
          <Route path="sessions/:chatId" element={<AdminSessionPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="system-logs" element={<AdminSystemLogsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/" element={<StartPage />} />
          <Route path="/chats" element={<ChatPage />} />
          <Route path="/chats/:chatId" element={<ChatPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

function StartPage() {
  const { user } = useAuth();
  return (
    <AuthGate>
      <Navigate to={getHomePath(user)} replace />
    </AuthGate>
  );
}
