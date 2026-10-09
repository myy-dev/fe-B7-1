import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';
import { signIn } from './lib/auth';
import { createMockLoginResponse } from './mocks/handlers';

describe('기본 라우팅', () => {
  it('비로그인 상태의 시작 주소는 로그인 화면으로 이동한다', () => {
    render(
      <MemoryRouter>
        <App />
        <CurrentPath />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/login');
  });

  it('로그인 후 채팅 시작 주소로 직접 접근할 수 있다', () => {
    signIn(createMockLoginResponse());
    render(
      <MemoryRouter initialEntries={['/chats']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
  });

  it.each(['/unknown', '/chats/unknown/messages'])(
    '잘못된 주소 %s에서 처음 화면으로 돌아갈 수 있다',
    async (path) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>,
      );
      expect(screen.getByRole('heading', { name: '앗, 길을 잃었나 봐요!' })).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: '처음 화면으로 돌아가기' }));
      expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
    },
  );

  it('404 화면의 브랜드 링크로 처음 화면으로 이동할 수 있다', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('link', { name: '꽥꽥이 처음 화면' }));
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument();
  });

  it.each(['/', '/login', '/signup'])('로그인 상태의 %s 접근은 채팅 화면으로 이동한다', (path) => {
    signIn(createMockLoginResponse());
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
        <CurrentPath />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/chats');
  });
});

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="현재 경로">{pathname}</output>;
}
