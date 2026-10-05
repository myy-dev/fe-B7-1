/*! 🌼 daisyUI 5.7.47 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('기본 라우팅', () => {
  it('홈 화면을 표시한다', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
  });

  it('잘못된 주소에서 안내를 표시하고 홈으로 돌아갈 수 있다', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/unknown']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '홈으로 이동' }));
    expect(screen.getByRole('heading', { name: '반가워요, 저는 꽥꽥이예요.' })).toBeInTheDocument();
  });
});
