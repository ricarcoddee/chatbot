const { getSession, setSession, clearSession, TTL_MS } = require('../../src/bot/sessions');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('returns null for an unknown phone number', () => {
  expect(getSession('unknown')).toBeNull();
});

test('stores and retrieves a session', () => {
  setSession('123', { step: 'MENU' });
  expect(getSession('123')).toEqual({ step: 'MENU' });
});

test('expires a session after the TTL elapses', () => {
  setSession('123', { step: 'MENU' });
  jest.advanceTimersByTime(TTL_MS + 1000);
  expect(getSession('123')).toBeNull();
});

test('clearSession removes a session immediately', () => {
  setSession('123', { step: 'MENU' });
  clearSession('123');
  expect(getSession('123')).toBeNull();
});
