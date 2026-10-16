const {
  getVerificationState,
  setVerificationState,
  clearVerificationState,
  TTL_MS,
} = require('../../src/bot/verificationState');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('returns null for an unknown phone number', () => {
  expect(getVerificationState('unknown')).toBeNull();
});

test('stores and retrieves a verification state', () => {
  setVerificationState('123', { step: 'EMAIL' });
  expect(getVerificationState('123')).toEqual({ step: 'EMAIL' });
});

test('expires a verification state after the TTL elapses', () => {
  setVerificationState('123', { step: 'EMAIL' });
  jest.advanceTimersByTime(TTL_MS + 1000);
  expect(getVerificationState('123')).toBeNull();
});

test('clearVerificationState removes a state immediately', () => {
  setVerificationState('123', { step: 'EMAIL' });
  clearVerificationState('123');
  expect(getVerificationState('123')).toBeNull();
});
