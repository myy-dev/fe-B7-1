import { Link, useParams, useSearchParams } from 'react-router';
import { AdminPagination, AdminStatus, AdminTable } from '../components/AdminControls';
import {
  adminQuery,
  formatAdminTime,
  positiveInteger,
  type AdminPage,
  type AdminSession,
  type AdminUserDetail,
} from '../lib/admin';
import useAdminResource from '../lib/useAdminResource';
import AdminRoleControl from '../components/AdminRoleControl';

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const [search] = useSearchParams();
  const id = positiveInteger(userId);
  const user = useAdminResource<AdminUserDetail>(id ? `/api/v1/admin/users/${id}` : null);
  const query = adminQuery(search, []);
  if (id) query.set('user_id', String(id));
  const sessions = useAdminResource<AdminPage<AdminSession>>(
    id ? `/api/v1/admin/sessions?${query}` : null,
  );
  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/admin/users">회원 목록</Link>
          </li>
          <li>회원 상세</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">회원 상세</h1>
      {!id && (
        <p role="alert" className="alert alert-error">
          회원 주소를 확인해 주세요.
        </p>
      )}
      <AdminStatus {...user} />
      {user.data && (
        <>
          <section aria-label="회원 정보" className="card border border-base-300 bg-base-100">
            <div className="card-body gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{user.data.name}</h2>
                <Link className="btn btn-outline btn-sm" to={`/admin/logs?user_id=${id}`}>
                  회원 대화 기록
                </Link>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="text-sm text-base-content/60">회원 번호(PK)</dt>
                  <dd className="mt-1">{user.data.id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-base-content/60">아이디</dt>
                  <dd className="mt-1 wrap-anywhere">{user.data.username}</dd>
                </div>
                <div>
                  <dt className="text-sm text-base-content/60">가입 시각 (KST)</dt>
                  <dd className="mt-1">{formatAdminTime(user.data.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-base-content/60">최근 로그인 (KST)</dt>
                  <dd className="mt-1">{formatAdminTime(user.data.last_login_at)}</dd>
                </div>
              </dl>
              <AdminRoleControl key={`${user.data.id}:${user.data.role}`} member={user.data} />
            </div>
          </section>
          <h2 className="text-lg font-bold">대화 세션</h2>
          <AdminStatus {...sessions} />
          {sessions.data && (
            <>
              {sessions.data.items.length ? (
                <AdminTable label="회원 대화 세션 표">
                  <thead>
                    <tr>
                      <th>대화</th>
                      <th>생성 시각 (KST)</th>
                      <th>질문 수</th>
                      <th>상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.data.items.map((session) => (
                      <tr key={session.chat_id}>
                        <td>
                          <p className="max-w-sm wrap-anywhere">{session.title || '새 대화'}</p>
                          <p className="mt-1 max-w-sm font-mono text-xs wrap-anywhere text-base-content/60">
                            {session.chat_id}
                          </p>
                        </td>
                        <td className="whitespace-nowrap">{formatAdminTime(session.created_at)}</td>
                        <td>{session.message_count}</td>
                        <td>
                          <Link
                            className="btn btn-ghost btn-sm"
                            to={`/admin/sessions/${session.chat_id}`}
                            aria-label={`${session.title || '새 대화'} 대화 보기`}
                          >
                            보기
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              ) : (
                <p role="status" className="py-8 text-base-content/70">
                  대화 세션이 없어요.
                </p>
              )}
              <AdminPagination total={sessions.data.total} loading={sessions.loading} />
            </>
          )}
        </>
      )}
    </>
  );
}
