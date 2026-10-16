const { registerMessage, resetRateLimit, formatWaitTime } = require('../../src/bot/rateLimit');

const ONE_MINUTE = 60 * 1000;
const TWO_MINUTES = 2 * ONE_MINUTE;

beforeEach(() => {
  jest.useFakeTimers();
  resetRateLimit();
});

afterEach(() => {
  jest.useRealTimers();
});

test('allows messages up to the limit', () => {
  expect(registerMessage('123', 3, ONE_MINUTE)).toEqual({ limited: false });
  expect(registerMessage('123', 3, ONE_MINUTE)).toEqual({ limited: false });
  expect(registerMessage('123', 3, ONE_MINUTE)).toEqual({ limited: false });
});

test('the message that exceeds the limit is flagged to warn once', () => {
  registerMessage('123', 2, ONE_MINUTE);
  registerMessage('123', 2, ONE_MINUTE);
  expect(registerMessage('123', 2, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: true });
});

test('further messages in the same window stay limited without warning again', () => {
  registerMessage('123', 1, ONE_MINUTE);
  expect(registerMessage('123', 1, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: true });
  expect(registerMessage('123', 1, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: false });
  expect(registerMessage('123', 1, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: false });
});

test('a new window after the configured duration resets the count and can warn again', () => {
  registerMessage('123', 1, ONE_MINUTE);
  expect(registerMessage('123', 1, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: true });

  jest.advanceTimersByTime(ONE_MINUTE);

  expect(registerMessage('123', 1, ONE_MINUTE)).toEqual({ limited: false });
  expect(registerMessage('123', 1, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: true });
});

test('different chat ids are tracked independently', () => {
  registerMessage('a', 1, ONE_MINUTE);
  expect(registerMessage('a', 1, ONE_MINUTE)).toEqual({ limited: true, shouldWarn: true });
  expect(registerMessage('b', 1, ONE_MINUTE)).toEqual({ limited: false });
});

test('a longer configured window keeps someone limited past the old 60s mark', () => {
  registerMessage('123', 1, TWO_MINUTES);
  registerMessage('123', 1, TWO_MINUTES); // over the limit, warned

  jest.advanceTimersByTime(ONE_MINUTE + 1);

  // Todavia dentro de la ventana de 2 minutos: sigue limitado, sin re-avisar.
  expect(registerMessage('123', 1, TWO_MINUTES)).toEqual({ limited: true, shouldWarn: false });

  jest.advanceTimersByTime(ONE_MINUTE);

  // Pasados los 2 minutos completos: nueva ventana.
  expect(registerMessage('123', 1, TWO_MINUTES)).toEqual({ limited: false });
});

describe('formatWaitTime', () => {
  test('formats a whole number of minutes', () => {
    expect(formatWaitTime(TWO_MINUTES)).toBe('2 minutos');
  });

  test('uses singular for exactly one minute', () => {
    expect(formatWaitTime(ONE_MINUTE)).toBe('1 minuto');
  });

  test('falls back to seconds when not a whole number of minutes', () => {
    expect(formatWaitTime(90 * 1000)).toBe('90 segundos');
  });
});
