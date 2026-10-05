import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="space-y-6">
      <p className="font-semibold text-primary">404</p>
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-base-content/70">주소를 확인하거나 홈으로 돌아가세요.</p>
      <Link to="/" className="btn btn-primary">
        홈으로 이동
      </Link>
    </section>
  );
}
