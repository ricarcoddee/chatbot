const os = require('os');
const path = require('path');
const fs = require('fs');

const tmpFile = path.join(os.tmpdir(), `verified-numbers-test-${Date.now()}-${Math.random()}.json`);
process.env.VERIFIED_NUMBERS_FILE = tmpFile;

const { isVerified, getVerifiedInfo, markVerified } = require('../../src/bot/verifiedNumbers');

afterAll(() => {
  fs.rmSync(tmpFile, { force: true });
});

test('isVerified is false for an unknown phone number', () => {
  expect(isVerified('50242584634')).toBe(false);
});

test('getVerifiedInfo returns null for an unknown phone number', () => {
  expect(getVerifiedInfo('50242584634')).toBeNull();
});

test('markVerified persists the phone info and isVerified reflects it', () => {
  markVerified('50242584634', { email: 'ricardo@conred.gob.gt', name: 'Ricardo', lastName: 'Hernández' });
  expect(isVerified('50242584634')).toBe(true);
  expect(getVerifiedInfo('50242584634')).toEqual({
    email: 'ricardo@conred.gob.gt',
    name: 'Ricardo',
    lastName: 'Hernández',
  });
});

test('markVerified writes the file to disk with the expected shape', () => {
  markVerified('50242584634', { email: 'ricardo@conred.gob.gt', name: 'Ricardo', lastName: 'Hernández' });
  const raw = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
  expect(raw['50242584634'].email).toBe('ricardo@conred.gob.gt');
  expect(raw['50242584634'].name).toBe('Ricardo');
  expect(raw['50242584634'].lastName).toBe('Hernández');
  expect(typeof raw['50242584634'].verifiedAt).toBe('string');
});

test('a fresh module load (simulating a process restart) still sees data persisted to disk', () => {
  markVerified('50249999999', { email: 'persisted@conred.gob.gt', name: 'Ana', lastName: 'López' });
  jest.resetModules();
  const fresh = require('../../src/bot/verifiedNumbers');
  expect(fresh.isVerified('50249999999')).toBe(true);
  expect(fresh.getVerifiedInfo('50249999999')).toEqual({
    email: 'persisted@conred.gob.gt',
    name: 'Ana',
    lastName: 'López',
  });
});
