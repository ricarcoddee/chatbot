const { formatPhoneForDisplay } = require('../../src/bot/phoneDisplay');

test('returns a plain phone number unchanged', () => {
  expect(formatPhoneForDisplay('50242584634')).toBe('50242584634');
});

test('strips the WhatsApp Web JID suffix', () => {
  expect(formatPhoneForDisplay('50242584634@s.whatsapp.net')).toBe('50242584634');
});

test('strips a device id together with the JID suffix', () => {
  expect(formatPhoneForDisplay('50242584634:5@s.whatsapp.net')).toBe('50242584634');
});

test('returns a not-available placeholder for an unresolved @lid (no real number known)', () => {
  expect(formatPhoneForDisplay('200837049676021@lid')).toBe('no disponible');
});
