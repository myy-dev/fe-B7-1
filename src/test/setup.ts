import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from '../mocks/server';
import { resetAuthMocks, resetChatMocks } from '../mocks/handlers';
import { signOut } from '../lib/auth';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  signOut();
  server.resetHandlers();
  resetChatMocks();
  resetAuthMocks();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());
