import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router';
import { expect, it, vi } from 'vitest';
import App from './App';
import { signIn } from './lib/auth';
import { createMockLoginResponse } from './mocks/handlers';

vi.mock('./AdminRoutes', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/AdminRoutes-missing.js');
});

function AdminNavigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/admin/users')}>관리자 진입</button>;
}

it('관리자 코드 다운로드 실패를 안내하고 기존 앱과 로그인 상태를 유지한다', async () => {
  signIn(createMockLoginResponse(1800, 'admin'));
  const caught = vi.fn();
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/chats']}>
      <App />
      <AdminNavigation />
    </MemoryRouter>,
    { onCaughtError: caught },
  );
  await screen.findByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' });
  await user.click(screen.getByRole('button', { name: '관리자 진입' }));
  await screen.findByRole('heading', { name: '관리자 화면을 불러오지 못했어요.' });
  expect(screen.getByRole('button', { name: '새로고침' })).toBeEnabled();
  expect(caught).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: '관리자 진입' })).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: '대화 화면으로 이동' }));
  await screen.findByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' });
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
});
