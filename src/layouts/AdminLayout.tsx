import { Link, NavLink, Outlet } from 'react-router';

export default function AdminLayout() {
  return (
    <div data-theme="light" className="flex min-h-dvh flex-col bg-base-200 text-base-content">
      <a
        href="#admin-content"
        className="btn fixed top-3 left-4 z-50 -translate-y-24 btn-primary focus:translate-y-0"
      >
        본문으로 건너뛰기
      </a>
      <header className="border-b border-base-300 bg-base-100">
        <nav aria-label="관리자 서비스 이동" className="navbar min-h-20 justify-between gap-4 px-5">
          <Link to="/admin/users" className="text-lg font-bold">
            꽥꽥이 관리자
          </Link>
          <Link to="/chats" className="btn btn-ghost btn-sm">
            서비스로 이동
          </Link>
        </nav>
      </header>
      <div className="grid flex-1 content-start gap-5 p-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="card h-fit border border-base-300 bg-base-100 lg:sticky lg:top-5">
          <nav aria-label="관리자 메뉴" className="p-2">
            <ul className="menu w-full">
              {[
                ['/admin/users', '회원'],
                ['/admin/logs', '대화 기록'],
                ['/admin/system-logs', '시스템 로그'],
              ].map(([path, label]) => (
                <li key={path}>
                  <NavLink to={path} className={({ isActive }) => (isActive ? 'menu-active' : '')}>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main id="admin-content" tabIndex={-1} className="min-w-0 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
