import { useEffect, useRef, useState } from 'react';
import type { AdminUser } from '../lib/admin';
import { ApiError, apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import ConfirmDialog from './ConfirmDialog';
import FeedbackToast from './FeedbackToast';
import AdminRoleBadge from './AdminRoleBadge';

export default function AdminRoleControl({ member }: { member: AdminUser }) {
  const { user } = useAuth();
  const [role, setRole] = useState(member.role);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; message: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const nextRole = role === 'user' ? 'admin' : 'user';
  const nextLabel = nextRole === 'admin' ? '관리자' : '사용자';
  const canChange =
    user?.role === 'admin' && user.id !== member.id && (role === 'user' || role === 'admin');

  useEffect(() => () => request.current?.abort(), []);
  async function changeRole() {
    if (!canChange || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setNotice(null);
    try {
      const result = await apiRequest<Pick<AdminUser, 'id' | 'username' | 'role'>>(
        `/api/v1/admin/users/${member.id}/role`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: nextRole }),
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted) return;
      if (
        result?.id !== member.id ||
        result.username !== member.username ||
        result.role !== nextRole
      )
        throw new ApiError(502, '권한 변경 결과를 확인하지 못했어요. 다시 조회해 주세요.');
      setRole(result.role);
      setNotice({ error: false, message: `${nextLabel}로 변경했어요.` });
    } catch (cause) {
      if (!controller.signal.aborted)
        setNotice({
          error: true,
          message:
            cause instanceof ApiError
              ? cause.message
              : '권한을 변경하지 못했어요. 다시 시도해 주세요.',
        });
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setPending(false);
        setOpen(false);
      }
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="회원 권한">
        <span className="text-sm text-base-content/60">권한</span>
        <AdminRoleBadge role={role} />
        {canChange && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pending}
            onClick={() => {
              setNotice(null);
              setOpen(true);
            }}
          >
            {nextLabel}로 변경
          </button>
        )}
      </div>
      {open && (
        <ConfirmDialog
          title="회원 권한을 변경할까요?"
          description={
            <>
              {member.name} ({member.username}) · {role === 'admin' ? '관리자' : '사용자'} →{' '}
              {nextLabel}
            </>
          }
          pending={pending}
          confirmLabel="변경"
          pendingLabel="변경 중…"
          closeLabel="권한 변경 확인 닫기"
          onConfirm={changeRole}
          onClose={() => setOpen(false)}
        />
      )}
      {notice && (
        <FeedbackToast
          message={notice.message}
          error={notice.error}
          closeLabel="권한 변경 알림 닫기"
          onClose={() => setNotice(null)}
        />
      )}
    </>
  );
}
