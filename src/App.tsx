import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import SignupPage from './pages/SignupPage';
import AuthProvider from './components/AuthProvider';
import AuthGate from './components/AuthGate';
import AdminRouteBoundary from './components/AdminRouteBoundary';
import { getHomePath, useAuth } from './lib/auth';

const AdminRoutes = lazy(() => import('./AdminRoutes'));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/admin/*"
          element={
            <AdminRouteBoundary>
              <Suspense
                fallback={
                  <p role="status" className="p-8 text-center">
                    <span className="loading loading-sm loading-spinner" aria-hidden="true" />{' '}
                    관리자 화면 불러오는 중
                  </p>
                }
              >
                <AdminRoutes />
              </Suspense>
            </AdminRouteBoundary>
          }
        />
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
