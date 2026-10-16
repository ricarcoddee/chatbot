const { setAssignment, getAssignment, clearAssignment } = require('../../src/bot/assignments');

test('returns null for a JID with no pending assignment', () => {
  expect(getAssignment('unknown@s.whatsapp.net')).toBeNull();
});

test('stores and retrieves a pending assignment', () => {
  const record = { ticketId: 42, technicianName: 'Toño', attempt: 1 };
  setAssignment('30911545@s.whatsapp.net', record);
  expect(getAssignment('30911545@s.whatsapp.net')).toEqual(record);
});

test('a new assignment for the same JID overwrites the previous one', () => {
  setAssignment('30911545@s.whatsapp.net', { ticketId: 1, attempt: 1 });
  setAssignment('30911545@s.whatsapp.net', { ticketId: 2, attempt: 1 });
  expect(getAssignment('30911545@s.whatsapp.net')).toEqual({ ticketId: 2, attempt: 1 });
});

test('clearAssignment removes a pending assignment', () => {
  setAssignment('30911545@s.whatsapp.net', { ticketId: 42, attempt: 1 });
  clearAssignment('30911545@s.whatsapp.net');
  expect(getAssignment('30911545@s.whatsapp.net')).toBeNull();
});

test('clearAssignment on a JID with no assignment is a no-op', () => {
  expect(() => clearAssignment('never-assigned@s.whatsapp.net')).not.toThrow();
});
