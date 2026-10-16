const { getNextTechnician, resetQueue } = require('../../src/bot/technicianQueue');

beforeEach(() => {
  resetQueue();
});

const technicians = [
  { name: 'Ricardo Hernandez', jid: '42584634@s.whatsapp.net' },
  { name: 'Toño', jid: '30911545@s.whatsapp.net' },
];

test('returns null when there are no technicians configured', () => {
  expect(getNextTechnician([])).toBeNull();
  expect(getNextTechnician(undefined)).toBeNull();
});

test('returns the first technician on the first call', () => {
  expect(getNextTechnician(technicians)).toEqual(technicians[0]);
});

test('alternates technicians on successive calls (round-robin)', () => {
  expect(getNextTechnician(technicians)).toEqual(technicians[0]);
  expect(getNextTechnician(technicians)).toEqual(technicians[1]);
  expect(getNextTechnician(technicians)).toEqual(technicians[0]);
  expect(getNextTechnician(technicians)).toEqual(technicians[1]);
});

test('wraps around correctly with a single technician', () => {
  const single = [technicians[0]];
  expect(getNextTechnician(single)).toEqual(single[0]);
  expect(getNextTechnician(single)).toEqual(single[0]);
});

test('resetQueue restarts the rotation from the first technician', () => {
  getNextTechnician(technicians);
  getNextTechnician(technicians);
  resetQueue();
  expect(getNextTechnician(technicians)).toEqual(technicians[0]);
});
