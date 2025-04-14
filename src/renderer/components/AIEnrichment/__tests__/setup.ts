import { vi, beforeEach } from 'vitest';

// Setup global test mocks
vi.mock('../../../hooks/useAIEnrichment', () => ({
  useAIEnrichment: vi.fn(),
  default: vi.fn()
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
