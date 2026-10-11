import { useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { dateRangeError, memberFilterError, pageParams, toKstInput, toUtc } from '../lib/admin';

export function AdminStatus({
  loading,
  error,
  missing = false,
  retry,
}: {
  loading: boolean;
  error: string;
  missing?: boolean;
  retry: () => void;
}) {
  if (loading)
    return (
      <p role="status" className="flex items-center gap-2 py-8 text-sm text-base-content/70">
        <span aria-hidden="true" className="loading loading-sm loading-spinner" />
        불러오는 중
      </p>
    );
  if (error)
    return (
      <div className="space-y-3 py-4">
        <p role="alert" className="alert alert-error">
          {error}
        </p>
        {!missing && (
          <button className="btn btn-outline btn-sm" onClick={retry}>
            다시 불러오기
          </button>
        )}
      </div>
    );
  return null;
}

export function AdminTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="min-w-0 overflow-x-auto rounded-box border border-base-300 bg-base-100"
    >
      <table className="table table-zebra">{children}</table>
    </div>
  );
}

export function AdminPagination({ total, loading }: { total: number; loading: boolean }) {
  const [search, setSearch] = useSearchParams();
  const { page, size } = pageParams(search);
  const pages = Math.max(1, Math.ceil(total / size));
  const sizes = [...new Set([10, 20, 50, 100, size])].sort((a, b) => a - b);
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(search);
    for (const [key, value] of Object.entries(values)) next.set(key, value);
    setSearch(next);
  }
  return (
    <nav aria-label="페이지 이동" className="flex flex-wrap items-center justify-between gap-4">
      <label className="flex items-center gap-2 text-sm">
        페이지당
        <select
          className="select w-24 select-sm"
          value={size}
          disabled={loading}
          onChange={(event) => change({ size: event.target.value, page: '1' })}
        >
          {sizes.map((value) => (
            <option key={value} value={value}>
              {value}개
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span aria-live="polite">
          총 {total}건 · {page} / {pages} 페이지
        </span>
        <div className="join">
          <button
            className="btn join-item btn-outline btn-sm"
            disabled={loading || page <= 1}
            onClick={() => change({ page: String(page - 1) })}
          >
            이전
          </button>
          <button
            className="btn join-item btn-outline btn-sm"
            disabled={loading || page >= pages}
            onClick={() => change({ page: String(page + 1) })}
          >
            다음
          </button>
        </div>
      </div>
    </nav>
  );
}

export function AdminFilters({ system = false }: { system?: boolean }) {
  const [search, setSearch] = useSearchParams();
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams({ page: '1', size: String(pageParams(search).size) });
    for (const key of system ? ['level', 'event'] : ['user_id']) {
      const value = String(form.get(key) ?? '').trim();
      if (value) next.set(key, value);
    }
    for (const key of ['start', 'end']) {
      const value = String(form.get(key) ?? '');
      if (value) {
        if (!Number.isFinite(Date.parse(`${value}+09:00`))) {
          setError('조회 기간을 확인해 주세요.');
          return;
        }
        next.set(key, toUtc(value));
      }
    }
    const invalid = memberFilterError(next) || dateRangeError(next.get('start'), next.get('end'));
    setError(invalid);
    if (!invalid) setSearch(next);
  }
  const currentLevel = search.get('level') ?? '';
  const levels = [
    ...new Set(['INFO', 'WARNING', 'ERROR', ...(currentLevel ? [currentLevel] : [])]),
  ];
  return (
    <form
      onSubmit={submit}
      className="card border border-base-300 bg-base-100"
      aria-label="조회 조건"
    >
      <div className="card-body gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {system ? (
            <>
              <label className="fieldset p-0">
                레벨
                <select name="level" defaultValue={currentLevel} className="select w-full">
                  <option value="">전체</option>
                  {levels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="fieldset p-0">
                이벤트
                <input
                  name="event"
                  className="input w-full"
                  defaultValue={search.get('event') ?? ''}
                />
              </label>
            </>
          ) : (
            <label className="fieldset p-0">
              회원 번호(PK)
              <input
                name="user_id"
                inputMode="numeric"
                className="input w-full"
                defaultValue={search.get('user_id') ?? ''}
              />
            </label>
          )}
          <label className="fieldset min-w-0 p-0">
            조회 시작 시각 (KST)
            <input
              name="start"
              type="datetime-local"
              step="1"
              className="input w-full min-w-0"
              defaultValue={toKstInput(search.get('start'))}
            />
          </label>
          <label className="fieldset min-w-0 p-0">
            조회 종료 시각 (KST)
            <input
              name="end"
              type="datetime-local"
              step="1"
              className="input w-full min-w-0"
              defaultValue={toKstInput(search.get('end'))}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button className="btn btn-neutral btn-sm" type="submit">
            조회
          </button>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => {
              setError('');
              setSearch({ page: '1', size: String(pageParams(search).size) });
            }}
          >
            초기화
          </button>
        </div>
      </div>
    </form>
  );
}
