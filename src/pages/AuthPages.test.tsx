import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { API_BASE_URL } from '../lib/api';
import { server } from '../mocks/server';

function renderPage(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return userEvent.setup();
}

describe('로그인 미리보기', () => {
  it('필수 입력을 안내한다', async () => {
    const user = renderPage('/login');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByText('아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
  });

  it('중복 제출을 막고 성공 시 채팅 시작 화면으로 이동한다', async () => {
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/api/v1/auth/login`, async ({ request }) => {
        calls++;
        expect(await request.json()).toEqual({ username: 'friend', password: 'example-password' });
        await delay(150);
        return HttpResponse.json({ message: '완료' });
      }),
    );
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), ' friend ');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    await user.dblClick(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('button', { name: '로그인 중…' })).toBeDisabled();
    expect(screen.getByLabelText('아이디')).toBeDisabled();
    await screen.findByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' });
    expect(calls).toBe(1);
  });

  it('로그인 실패 시 입력을 보존하고 수정 후 다시 시도한다', async () => {
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), 'wrong');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '아이디 또는 비밀번호를 확인해 주세요.',
    );
    expect(screen.getByLabelText('비밀번호')).toHaveValue('example-password');
    await user.clear(screen.getByLabelText('아이디'));
    await user.type(screen.getByLabelText('아이디'), 'friend');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    await screen.findByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' });
  });

  it.each([
    [
      '서버 오류',
      () => HttpResponse.json({ message: '잠시 연결이 어려워요.' }, { status: 503 }),
      '잠시 연결이 어려워요.',
    ],
    ['네트워크 오류', () => HttpResponse.error(), '연결하지 못했어요. 다시 시도해 주세요.'],
  ])('%s를 안내하고 제출 버튼을 복원한다', async (_label, response, message) => {
    server.use(http.post(`${API_BASE_URL}/api/v1/auth/login`, response));
    const user = renderPage('/login');
    await user.type(screen.getByLabelText('아이디'), 'friend');
    await user.type(screen.getByLabelText('비밀번호'), 'example-password');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: '로그인' })).toBeEnabled();
  });
});
