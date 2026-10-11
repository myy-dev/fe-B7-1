import type { AdminUser } from '../lib/admin';

export default function AdminRoleBadge({ role }: { role: AdminUser['role'] }) {
  return (
    <span className={`badge ${role === 'admin' ? 'badge-neutral' : 'badge-ghost'}`}>
      {role === 'admin' ? '관리자' : role === 'user' ? '사용자' : '확인 불가'}
    </span>
  );
}
