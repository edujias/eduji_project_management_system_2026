import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { apiFetch } from '@/lib/api';

describe('apiFetch', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    // Mock window.location.reload
    // @ts-ignore
    delete window.location;
    window.location = {
      ...originalLocation,
      reload: vi.fn(),
    } as any;
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should make a successful fetch request with correct headers', async () => {
    const mockResponseData = { data: 'test-success' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });
    global.fetch = mockFetch;

    const result = await apiFetch('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4001/api/test-endpoint',
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    expect(result).toEqual(mockResponseData);
  });

  it('should fetch using Bearer token from arguments', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = mockFetch;

    await apiFetch('/test-endpoint', {}, 'token-from-args');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4001/api/test-endpoint',
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-from-args',
        },
      }
    );
  });

  it('should fetch using Bearer token from localStorage if argument is not provided', async () => {
    localStorage.setItem('token', 'token-from-localstorage');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    global.fetch = mockFetch;

    await apiFetch('/test-endpoint');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4001/api/test-endpoint',
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-from-localstorage',
        },
      }
    );
  });

  it('should throw an error on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    await expect(apiFetch('/test-endpoint')).rejects.toThrow('Sunucuya bağlanılamadı.');
  });

  it('should throw API error when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid payload' }),
    });
    global.fetch = mockFetch;

    await expect(apiFetch('/test-endpoint')).rejects.toThrow('Invalid payload');
  });

  it('should clean credentials and reload page on 401 Unauthorized', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', JSON.stringify({ name: 'User' }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized access' }),
    });
    global.fetch = mockFetch;

    await expect(apiFetch('/test-endpoint')).rejects.toThrow('Unauthorized access');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.reload).toHaveBeenCalled();
  });
});
