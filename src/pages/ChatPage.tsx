import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import AuthGate from '../components/AuthGate';
import ChatDetailView from '../components/ChatDetailView';
import DeleteChatDialog from '../components/DeleteChatDialog';
import NewChatButton from '../components/NewChatButton';
import SessionList from '../components/SessionList';
import type { ChatSession } from '../lib/chats';
import useChatSessions from '../lib/useChatSessions';
import HomePage from './HomePage';

export default function ChatPage() {
  return (
    <AuthGate>
      <ChatWorkspace />
    </AuthGate>
  );
}

function ChatWorkspace() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const currentChatId = useRef(chatId);
  const { list, retryList, addSession, removeSession } = useChatSessions();
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  useEffect(() => {
    currentChatId.current = chatId;
  }, [chatId]);
  function deleteSession(id: string) {
    removeSession(id);
    if (currentChatId.current === id) navigate('/chats', { replace: true });
  }
  const deleteDialog = deleteTarget && (
    <DeleteChatDialog
      key={`delete-${deleteTarget.chat_id}`}
      session={deleteTarget}
      onDeleted={deleteSession}
      onClose={() => setDeleteTarget(null)}
    />
  );

  return (
    <div className="grid w-full min-w-0 items-start gap-5 lg:min-h-0 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-stretch">
      <aside
        aria-label="대화 선택"
        className="card min-w-0 border border-base-300 bg-base-100 lg:min-h-0"
      >
        <div className="card-body gap-4 p-4 lg:min-h-0">
          <h2 className="text-lg font-bold">대화 목록</h2>
          <NewChatButton
            label={chatId ? '새 대화' : '새 대화 시작'}
            onCreated={addSession}
            selection={chatId}
          />
          <div className="max-h-40 overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
            <SessionList list={list} onRetry={retryList} onDelete={setDeleteTarget} />
          </div>
        </div>
      </aside>
      {chatId ? <ChatDetailView key={chatId} chatId={chatId} /> : <HomePage />}
      {deleteDialog}
    </div>
  );
}
