import { Link, useParams } from 'react-router';
import { AdminStatus } from '../components/AdminControls';
import ChatMessages from '../components/ChatMessages';
import { formatAdminTime, type AdminSessionDetail } from '../lib/admin';
import useAdminResource from '../lib/useAdminResource';

export default function AdminSessionPage() {
  const { chatId } = useParams();
  const valid = Boolean(
    chatId && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(chatId),
  );
  const resource = useAdminResource<AdminSessionDetail>(
    valid ? `/api/v1/admin/sessions/${encodeURIComponent(chatId!)}` : null,
  );
  return (
    <>
      <div className="breadcrumbs text-sm">
        <ul>
          <li>
            <Link to="/admin/users">회원 목록</Link>
          </li>
          {resource.data && (
            <li>
              <Link to={`/admin/users/${resource.data.user_id}`}>회원 {resource.data.user_id}</Link>
            </li>
          )}
          <li>세션 상세</li>
        </ul>
      </div>
      <h1 className="text-2xl font-bold">세션 상세</h1>
      {!valid && (
        <p role="alert" className="alert alert-error">
          대화 주소를 확인해 주세요.
        </p>
      )}
      <AdminStatus {...resource} />
      {resource.data && (
        <section aria-label="세션 대화" className="card min-w-0 border border-base-300 bg-base-100">
          <div className="card-body gap-6 p-5 sm:p-8">
            <header className="space-y-2 border-b border-base-300 pb-4">
              <h2 className="text-lg font-bold wrap-anywhere">{resource.data.title}</h2>
              <p className="font-mono text-xs wrap-anywhere text-base-content/60">
                {resource.data.chat_id}
              </p>
              <p className="text-sm text-base-content/70">
                {formatAdminTime(resource.data.created_at)} · 질문 {resource.data.message_count}건
              </p>
            </header>
            {resource.data.messages.length ? (
              <ChatMessages
                messages={resource.data.messages}
                questionAuthor={`회원 ${resource.data.user_id}`}
              />
            ) : (
              <p role="status" className="py-8 text-center text-base-content/70">
                아직 대화가 없어요.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
