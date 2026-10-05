import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('기본 라우팅', () => {
  it('시작 주소에서 채팅 시작 화면으로 이동한다', () => {
    render(
      <MemoryRouter>
        <App />
        <CurrentPath />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
    expect(screen.getByLabelText('현재 경로')).toHaveTextContent('/chats');
  });

  it('채팅 시작 주소로 직접 접근할 수 있다', () => {
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
      expect(
        screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' }),
      ).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
  });
});

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="현재 경로">{pathname}</output>;
}
