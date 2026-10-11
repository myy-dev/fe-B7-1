import { Navigate, Route, Routes } from 'react-router';
import AdminLayout from './layouts/AdminLayout';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminSessionPage from './pages/AdminSessionPage';
import AdminLogsPage from './pages/AdminLogsPage';
import AdminSystemLogsPage from './pages/AdminSystemLogsPage';
import NotFoundPage from './pages/NotFoundPage';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:userId" element={<AdminUserDetailPage />} />
        <Route path="sessions/:chatId" element={<AdminSessionPage />} />
        <Route path="logs" element={<AdminLogsPage />} />
        <Route path="system-logs" element={<AdminSystemLogsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
