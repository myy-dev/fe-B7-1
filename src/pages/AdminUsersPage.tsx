import { Link, useSearchParams } from 'react-router';
import { AdminPagination, AdminStatus, AdminTable } from '../components/AdminControls';
import { adminQuery, formatAdminTime, type AdminPage, type AdminUser } from '../lib/admin';
import useAdminResource from '../lib/useAdminResource';

export default function AdminUsersPage() {
  const [search] = useSearchParams();
  const resource = useAdminResource<AdminPage<AdminUser>>(
    `/api/v1/admin/users?${adminQuery(search, [])}`,
  );
  return (
    <>
      <h1 className="text-2xl font-bold">회원 목록</h1>
      <AdminStatus {...resource} />
      {resource.data && (
        <>
          {resource.data.items.length ? (
            <AdminTable label="회원 목록 표">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>아이디</th>
                  <th>가입 시각 (KST)</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td className="whitespace-nowrap">
                      <time dateTime={user.created_at}>{formatAdminTime(user.created_at)}</time>
                    </td>
                    <td>
                      <Link
                        className="btn btn-ghost btn-sm"
                        to={`/admin/users/${user.id}`}
                        aria-label={`${user.name} 회원 상세`}
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
              회원이 없어요.
            </p>
          )}
          <AdminPagination total={resource.data.total} loading={resource.loading} />
        </>
      )}
    </>
  );
}
