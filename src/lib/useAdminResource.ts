import { useEffect, useState } from 'react';
import { ApiError, apiRequest } from './api';

export default function useAdminResource<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const key = `${path}:${attempt}`;
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string;
    missing: boolean;
  }>({ key: '', data: null, error: '', missing: false });

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    async function load() {
      try {
        const data = await apiRequest<T>(path!, { signal: controller.signal });
        if (!controller.signal.aborted) setResult({ key, data, error: '', missing: false });
      } catch (cause) {
        if (!controller.signal.aborted)
          setResult({
            key,
            data: null,
            error: cause instanceof ApiError ? cause.message : '목록을 불러오지 못했어요.',
            missing: cause instanceof ApiError && [404, 422].includes(cause.status),
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [path, key]);

  const current = result.key === key;
  return {
    data: current ? result.data : null,
    error: current ? result.error : '',
    missing: current && result.missing,
    loading: Boolean(path) && !current,
    retry: () => setAttempt((value) => value + 1),
  };
}
