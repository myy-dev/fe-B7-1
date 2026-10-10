import { Component, type ReactNode } from 'react';
import { Link } from 'react-router';

export default class AdminRouteBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-dvh place-items-center bg-base-200 p-6">
        <section className="card w-full max-w-lg border border-base-300 bg-base-100">
          <div className="card-body gap-4">
            <h1 className="card-title">관리자 화면을 불러오지 못했어요.</h1>
            <p role="alert" className="alert text-sm alert-error">
              연결 상태를 확인하고 새로고침해 주세요.
            </p>
            <div className="card-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
              <Link to="/chats" className="btn btn-outline">
                대화 화면으로 이동
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
