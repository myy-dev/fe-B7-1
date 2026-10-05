import { Link, Route, Routes } from 'react-router';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-base-300 bg-base-100">
        <nav aria-label="주 메뉴" className="navbar mx-auto max-w-5xl px-6">
          <Link to="/" className="text-xl font-bold">
            B7-1
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
