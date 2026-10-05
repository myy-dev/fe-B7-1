import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { API_BASE_URL } from './lib/api';
import './index.css';

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest(request, print) {
        // 모킹되지 않은 API가 실제 백엔드로 전달되지 않도록 한다.
        if (request.url.startsWith(`${API_BASE_URL}/api/`)) print.error();
      },
    });
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('앱을 표시할 요소를 찾을 수 없습니다.');

  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error('앱 초기화 실패:', error);
  const root = document.getElementById('root');
  if (root) root.textContent = '화면을 준비하지 못했습니다. 새로고침해 주세요.';
});
