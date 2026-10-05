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
  memberFilterError,
  type AdminPage,
} from '../lib/admin';
import type { ChatMessage } from '../lib/chats';
import useAdminResource from '../lib/useAdminResource';

const statusLabels = { completed: '완료', pending: '처리 중', failed: '실패' };

export default function AdminLogsPage() {
  const [search] = useSearchParams();
  const invalid =
    memberFilterError(search) || dateRangeError(search.get('start'), search.get('end'));
  const resource = useAdminResource<AdminPage<ChatMessage>>(
    invalid ? null : `/api/v1/admin/logs?${adminQuery(search, ['user_id', 'start', 'end'])}`,
  );
  return (
    <>
      <h1 className="text-2xl font-bold">대화 기록</h1>
      <AdminFilters key={search.toString()} />
      {invalid && (
        <p role="alert" className="alert alert-error">
          {invalid}
        </p>
      )}
      <AdminStatus {...resource} />
      {resource.data && (
        <>
          {resource.data.items.length ? (
            <AdminTable label="대화 기록 표">
              <thead>
                <tr>
                  <th>시각 (KST)</th>
                  <th>질문·답변</th>
                  <th>상태</th>
                  <th>요청 ID</th>
                  <th>세션</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((message) => (
                  <tr key={message.request_id}>
                    <td className="align-top whitespace-nowrap">
                      {formatAdminTime(message.created_at)}
                    </td>
                    <td className="max-w-2xl min-w-56 align-top">
                      <p className="font-medium wrap-anywhere whitespace-pre-wrap">
                        {message.question}
                      </p>
                      <p className="mt-3 wrap-anywhere whitespace-pre-wrap text-base-content/70">
                        {message.answer ?? '—'}
                      </p>
                      {message.finished_at && (
                        <p className="mt-3 text-xs text-base-content/50">
                          완료 시각 {formatAdminTime(message.finished_at)}
                        </p>
                      )}
                    </td>
                    <td className="align-top">
                      <span
                        className={`badge badge-soft whitespace-nowrap ${message.status === 'failed' ? 'badge-error' : message.status === 'pending' ? 'badge-warning' : 'badge-success'}`}
                      >
                        {statusLabels[message.status] ?? message.status}
                      </span>
                      {message.error_code && (
                        <p className="mt-2 text-xs text-error">{message.error_code}</p>
                      )}
                    </td>
                    <td className="max-w-40 align-top font-mono text-xs wrap-anywhere">
                      {message.request_id}
                    </td>
                    <td className="align-top">
                      <Link
                        to={`/admin/sessions/${message.chat_id}`}
                        className="btn btn-ghost btn-sm"
                        aria-label={`${message.question} 세션 보기`}
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
              조건에 맞는 대화 기록이 없어요.
            </p>
          )}
          <AdminPagination total={resource.data.total} loading={resource.loading} />
        </>
      )}
    </>
  );
}
