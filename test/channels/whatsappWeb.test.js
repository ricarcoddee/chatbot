const config = require('../../src/config');
const { parseIncoming, sendMessage, isMockMode, rememberContacts, resetLidMapping } = require('../../src/channels/whatsappWeb');

beforeEach(() => {
  resetLidMapping();
});

test('parses a plain text message (conversation)', () => {
  const result = parseIncoming({
    key: { remoteJid: '521234567890@s.whatsapp.net', fromMe: false },
    message: { conversation: 'hola' },
  });
  expect(result).toEqual({
    from: '521234567890@s.whatsapp.net',
    body: 'hola',
    mediaUrl: null,
    displayPhone: '521234567890@s.whatsapp.net',
  });
});

test('uses senderPn as the display phone when the sender is addressed by @lid', () => {
  const result = parseIncoming({
    key: { remoteJid: '200837049676021@lid', fromMe: false, senderPn: '50242584634@s.whatsapp.net' },
    message: { conversation: 'hola' },
  });
  expect(result.from).toBe('200837049676021@lid');
  expect(result.displayPhone).toBe('50242584634@s.whatsapp.net');
});

test('falls back to the @lid itself as display phone when WhatsApp sends no senderPn', () => {
  const result = parseIncoming({
    key: { remoteJid: '200837049676021@lid', fromMe: false },
    message: { conversation: 'hola' },
  });
  expect(result.displayPhone).toBe('200837049676021@lid');
});

test('parses a quoted/extended text message', () => {
  const result = parseIncoming({
    key: { remoteJid: '521234567890@s.whatsapp.net', fromMe: false },
    message: { extendedTextMessage: { text: 'hola de nuevo' } },
  });
  expect(result.body).toBe('hola de nuevo');
});

test('parses an image message, using the caption as body and the raw message as mediaUrl', () => {
  const raw = {
    key: { remoteJid: '521234567890@s.whatsapp.net', fromMe: false },
    message: { imageMessage: { caption: 'la impresora no prende' } },
  };
  const result = parseIncoming(raw);
  expect(result.from).toBe('521234567890@s.whatsapp.net');
  expect(result.body).toBe('la impresora no prende');
  expect(result.mediaUrl).toBe(raw);
});

test('treats a missing text/caption as an empty string', () => {
  const result = parseIncoming({
    key: { remoteJid: '521234567890@s.whatsapp.net', fromMe: false },
    message: { stickerMessage: {} },
  });
  expect(result.body).toBe('');
});

test('returns null for messages sent by the bot itself', () => {
  const result = parseIncoming({
    key: { remoteJid: '521234567890@s.whatsapp.net', fromMe: true },
    message: { conversation: 'eco' },
  });
  expect(result).toBeNull();
});

test('returns null for updates without a message payload (e.g. protocol/reaction messages)', () => {
  expect(parseIncoming({ key: { remoteJid: '521234567890@s.whatsapp.net', fromMe: false } })).toBeNull();
  expect(parseIncoming(null)).toBeNull();
});

describe('LID phone resolution via remembered contacts', () => {
  test('a remembered contact mapping resolves an @lid to the real number', () => {
    rememberContacts([{ lid: '200837049676021@lid', jid: '50242584634@s.whatsapp.net' }]);

    const result = parseIncoming({
      key: { remoteJid: '200837049676021@lid', fromMe: false },
      message: { conversation: 'hola' },
    });

    expect(result.displayPhone).toBe('50242584634@s.whatsapp.net');
  });

  test('senderPn on the message itself takes priority over a remembered contact mapping', () => {
    rememberContacts([{ lid: '200837049676021@lid', jid: 'numero-viejo@s.whatsapp.net' }]);

    const result = parseIncoming({
      key: { remoteJid: '200837049676021@lid', fromMe: false, senderPn: '50242584634@s.whatsapp.net' },
      message: { conversation: 'hola' },
    });

    expect(result.displayPhone).toBe('50242584634@s.whatsapp.net');
  });

  test('ignores contacts without both lid and jid', () => {
    rememberContacts([{ lid: '200837049676021@lid' }, { jid: '50242584634@s.whatsapp.net' }, null, undefined]);

    const result = parseIncoming({
      key: { remoteJid: '200837049676021@lid', fromMe: false },
      message: { conversation: 'hola' },
    });

    expect(result.displayPhone).toBe('200837049676021@lid');
  });

  test('resetLidMapping clears previously remembered contacts', () => {
    rememberContacts([{ lid: '200837049676021@lid', jid: '50242584634@s.whatsapp.net' }]);
    resetLidMapping();

    const result = parseIncoming({
      key: { remoteJid: '200837049676021@lid', fromMe: false },
      message: { conversation: 'hola' },
    });

    expect(result.displayPhone).toBe('200837049676021@lid');
  });
});

describe('isMockMode / sendMessage', () => {
  const original = config.whatsappWeb.enabled;

  afterEach(() => {
    config.whatsappWeb.enabled = original;
    jest.restoreAllMocks();
  });

  test('is mock mode when WHATSAPP_WEB_ENABLED is off', () => {
    config.whatsappWeb.enabled = false;
    expect(isMockMode()).toBe(true);
  });

  test('logs to the console instead of sending when in mock mode', async () => {
    config.whatsappWeb.enabled = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await sendMessage('521234567890@s.whatsapp.net', 'hola');

    expect(logSpy).toHaveBeenCalledWith('[WHATSAPP-WEB MOCK] -> 521234567890@s.whatsapp.net: hola');
  });

  test('does nothing when text is falsy', async () => {
    config.whatsappWeb.enabled = false;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await sendMessage('521234567890@s.whatsapp.net', '');

    expect(logSpy).not.toHaveBeenCalled();
  });
});
