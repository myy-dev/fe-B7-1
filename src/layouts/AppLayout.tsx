import { Link, Outlet, useMatch } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';

export default function AppLayout() {
  const isChatPage = Boolean(useMatch('/chats/*'));
  const isHomePage = Boolean(useMatch('/chats'));

  return (
    <div className={`flex min-h-dvh flex-col ${isChatPage ? 'lg:h-dvh lg:min-h-[32rem]' : ''}`}>
      <a
        href="#main-content"
        className="btn fixed top-3 left-4 z-50 -translate-y-24 btn-primary focus:translate-y-0"
      >
        본문으로 건너뛰기
      </a>
      <header className="shrink-0 border-b border-base-300/70 bg-base-200">
        <nav
          aria-label="서비스 이동"
          className="navbar min-h-20 justify-between gap-4 px-5 sm:px-8 lg:px-5"
        >
          <Link
            to="/chats"
            aria-label="꽥꽥이 처음 화면"
            className="flex items-center gap-2.5 rounded-field"
          >
            <span className="grid size-11 place-items-center rounded-full bg-secondary">
              <DuckAvatar className="size-10" />
            </span>
            <span className="text-xl font-extrabold tracking-tight">꽥꽥이</span>
          </Link>
          <Link to="/login" className="btn btn-ghost btn-sm">
            로그인
          </Link>
        </nav>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className={`mx-auto grid w-full max-w-6xl flex-1 place-items-center px-5 py-12 sm:px-8 sm:py-16 ${isChatPage ? 'lg:min-h-0 lg:max-w-none lg:place-items-stretch lg:px-5 lg:py-5' : ''}`}
      >
        <Outlet />
      </main>
      {!isHomePage && (
        <footer
          className={`shrink-0 px-5 pt-4 pb-8 text-center text-xs leading-relaxed text-base-content/70 sm:text-sm ${isChatPage ? 'lg:py-2' : ''}`}
        >
          가벼운 수다도, 진지한 이야기도. 꽥꽥이와 함께.
        </footer>
      )}
    </div>
  );
}
