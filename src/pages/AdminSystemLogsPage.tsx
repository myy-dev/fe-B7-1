import { Link, useSearchParams } from 'react-router';
import {
  AdminFilters,
  AdminPagination,
  AdminStatus,
  AdminTable,
} from '../components/AdminControls';
import {
  adminQuery,
  dateRangeError,
  formatAdminTime,
  type AdminPage,
  type SystemLog,
} from '../lib/admin';
import useAdminResource from '../lib/useAdminResource';

export default function AdminSystemLogsPage() {
  const [search] = useSearchParams();
  const invalid = dateRangeError(search.get('start'), search.get('end'));
  const resource = useAdminResource<AdminPage<SystemLog>>(
    invalid
      ? null
      : `/api/v1/admin/system-logs?${adminQuery(search, ['level', 'event', 'start', 'end'])}`,
  );
  return (
    <>
      <h1 className="text-2xl font-bold">시스템 로그</h1>
      <AdminFilters key={search.toString()} system />
      {invalid && (
        <p role="alert" className="alert alert-error">
          {invalid}
        </p>
      )}
      <AdminStatus {...resource} />
      {resource.data && (
        <>
          {resource.data.items.length ? (
            <AdminTable label="시스템 로그 표">
              <thead>
                <tr>
                  <th>시각 (KST)</th>
                  <th>레벨</th>
                  <th>이벤트</th>
                  <th>요청 ID</th>
                  <th>회원 번호(PK)</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((log, index) => (
                  <tr key={`${resource.data!.page}-${index}`}>
                    <td className="whitespace-nowrap">{formatAdminTime(log.timestamp)}</td>
                    <td>
                      <span
                        className={`badge badge-soft ${log.level === 'ERROR' ? 'badge-error' : log.level === 'WARNING' ? 'badge-warning' : 'badge-info'}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="max-w-sm font-mono text-xs wrap-anywhere">{log.event}</td>
                    <td className="max-w-sm font-mono text-xs wrap-anywhere">
                      {log.request_id || '—'}
                    </td>
                    <td>
                      {log.user_id == null ? (
                        '—'
                      ) : (
                        <Link className="link" to={`/admin/users/${log.user_id}`}>
                          {log.user_id}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          ) : (
            <p role="status" className="py-8 text-base-content/70">
              조건에 맞는 시스템 로그가 없어요.
            </p>
          )}
          <AdminPagination total={resource.data.total} loading={resource.loading} />
        </>
      )}
    </>
  );
}
