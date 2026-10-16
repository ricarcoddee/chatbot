const config = require('../src/config');
const { parseLocations, parseTechnicians } = config;

test('parseLocations parses a single "name:id" pair', () => {
  expect(parseLocations('Sede Central:1')).toEqual([{ name: 'Sede Central', id: 1 }]);
});

test('parseLocations parses multiple comma-separated pairs', () => {
  expect(parseLocations('Sede A:1,Sede B:2')).toEqual([
    { name: 'Sede A', id: 1 },
    { name: 'Sede B', id: 2 },
  ]);
});

test('parseLocations returns an empty array for empty input', () => {
  expect(parseLocations('')).toEqual([]);
  expect(parseLocations(undefined)).toEqual([]);
});

test('parseTechnicians parses a single "name:phone" pair into a WhatsApp JID', () => {
  expect(parseTechnicians('Ricardo Hernandez:42584634')).toEqual([
    { name: 'Ricardo Hernandez', jid: '42584634@s.whatsapp.net' },
  ]);
});

test('parseTechnicians parses multiple comma-separated pairs', () => {
  expect(parseTechnicians('Ricardo Hernandez:42584634,Toño:30911545')).toEqual([
    { name: 'Ricardo Hernandez', jid: '42584634@s.whatsapp.net' },
    { name: 'Toño', jid: '30911545@s.whatsapp.net' },
  ]);
});

test('parseTechnicians strips non-digit characters from the phone number', () => {
  expect(parseTechnicians('Ricardo:+502 4258-4634')).toEqual([
    { name: 'Ricardo', jid: '50242584634@s.whatsapp.net' },
  ]);
});

test('parseTechnicians returns an empty array for empty input', () => {
  expect(parseTechnicians('')).toEqual([]);
  expect(parseTechnicians(undefined)).toEqual([]);
});

test('verification is disabled by default (mock/test env)', () => {
  expect(config.verification.enabled).toBe(false);
});

test('reclutamiento.apiUrl is empty by default (mock/test env)', () => {
  expect(config.reclutamiento.apiUrl).toBe('');
});

test('the real stCatalog pins the agreed SLA hours per service category', () => {
  expect(config.stCatalog.ST1.slaHours).toBe(3);
  expect(config.stCatalog.ST2.slaHours).toBe(8);
  expect(config.stCatalog.ST3.slaHours).toBe(32);
});

test('config.locations falls back to the bundled CONRED catalog when GLPI_LOCATIONS is unset', () => {
  // GLPI_LOCATIONS no esta en MOCK_MODE_VARS (test/setup-env.js), asi que refleja
  // lo que tenga el .env real. Este test solo aplica cuando esta vacia/ausente ahi.
  if (process.env.GLPI_LOCATIONS) {
    return;
  }
  const bundled = require('../src/glpi/locations');
  expect(config.locations).toEqual(bundled);
});

test('config.rateLimit.maxPerMinute defaults to 10 when RATE_LIMIT_MAX_PER_MINUTE is unset', () => {
  // RATE_LIMIT_MAX_PER_MINUTE no esta en MOCK_MODE_VARS (test/setup-env.js), asi
  // que refleja lo que tenga el .env real — mismo caso que GLPI_LOCATIONS arriba.
  if (process.env.RATE_LIMIT_MAX_PER_MINUTE) {
    return;
  }
  expect(config.rateLimit.maxPerMinute).toBe(10);
});

test('config.rateLimit.windowSeconds defaults to 120 when RATE_LIMIT_WINDOW_SECONDS is unset', () => {
  // Mismo caso que RATE_LIMIT_MAX_PER_MINUTE arriba: no esta en MOCK_MODE_VARS.
  if (process.env.RATE_LIMIT_WINDOW_SECONDS) {
    return;
  }
  expect(config.rateLimit.windowSeconds).toBe(120);
});
