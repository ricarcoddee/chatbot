const { addBusinessHours } = require('../../src/sla/businessHours');

// Reference dates (verified): Mon Aug 17 2026, Tue Aug 18, Wed Aug 19,
// Fri Aug 21, Sat Aug 22, Mon Aug 24 2026.

test('ST1 (3h) started mid-morning finishes the same day', () => {
  const start = new Date(2026, 7, 17, 8, 0, 0); // Mon 08:00
  const result = addBusinessHours(start, 3);
  expect(result).toEqual(new Date(2026, 7, 17, 11, 0, 0));
});

test('ST2 (8h) started mid-morning finishes the next business day', () => {
  const start = new Date(2026, 7, 17, 8, 0, 0); // Mon 08:00
  const result = addBusinessHours(start, 8);
  expect(result).toEqual(new Date(2026, 7, 18, 8, 0, 0)); // Tue 08:00
});

test('ST3 (32h) started mid-morning finishes 4 business days later', () => {
  const start = new Date(2026, 7, 17, 8, 0, 0); // Mon 08:00
  const result = addBusinessHours(start, 32);
  expect(result).toEqual(new Date(2026, 7, 21, 8, 0, 0)); // Fri 08:00
});

test('skips the weekend', () => {
  const start = new Date(2026, 7, 21, 14, 0, 0); // Fri 14:00
  const result = addBusinessHours(start, 2);
  expect(result).toEqual(new Date(2026, 7, 24, 8, 0, 0)); // Mon 08:00
});

test('a start time on a non-business day snaps to the next business day', () => {
  const start = new Date(2026, 7, 22, 10, 0, 0); // Sat 10:00
  const result = addBusinessHours(start, 1);
  expect(result).toEqual(new Date(2026, 7, 24, 8, 0, 0)); // Mon 08:00
});

test('a start time before opening hour snaps to opening hour', () => {
  const start = new Date(2026, 7, 17, 6, 0, 0); // Mon 06:00
  const result = addBusinessHours(start, 1);
  expect(result).toEqual(new Date(2026, 7, 17, 8, 0, 0));
});

test('a start time after closing hour snaps to the next business day opening', () => {
  const start = new Date(2026, 7, 17, 16, 0, 0); // Mon 16:00
  const result = addBusinessHours(start, 1);
  expect(result).toEqual(new Date(2026, 7, 18, 8, 0, 0));
});
