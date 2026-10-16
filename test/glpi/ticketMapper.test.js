const { mapToGlpiPayload, findLocationId } = require('../../src/glpi/ticketMapper');

const testConfig = {
  stCatalog: {
    ST1: { name: 'Atención remota', slaHours: 3 },
    ST2: { name: 'En sitio', slaHours: 8 },
    ST3: { name: 'Reparación de equipo de taller', slaHours: 32 },
  },
  glpi: {
    entityId: 0,
    categoryIds: { ST1: '10', ST2: '11', ST3: '12' },
  },
  locations: [{ name: 'Sede Central', id: 1 }],
};

const session = {
  phone: '123456789',
  st: 'ST2',
  name: 'Ricardo Hernández',
  locationName: 'Sede Central',
  title: 'No enciende la impresora',
  description: 'La impresora de recepción no prende desde ayer',
  mediaUrl: null,
};

test('maps a full session to a GLPI ticket payload', () => {
  const payload = mapToGlpiPayload(session, testConfig);
  expect(payload).toEqual({
    name: 'ST2 - Ricardo Hernández - No enciende la impresora',
    content:
      'La impresora de recepción no prende desde ayer\n\n' +
      'Origen: WhatsApp · Solicitante: Ricardo Hernández · WhatsApp ID: 123456789',
    itilcategories_id: 11,
    urgency: 3,
    priority: 3,
    locations_id: 1,
    entities_id: 0,
  });
});

test('includes the verified name and email in the content when both are present', () => {
  const verifiedSession = {
    ...session,
    verifiedEmail: 'ricardo@conred.gob.gt',
    verifiedName: 'Ricardo',
    verifiedLastName: 'Hernández',
  };
  const payload = mapToGlpiPayload(verifiedSession, testConfig);
  expect(payload.content).toBe(
    'La impresora de recepción no prende desde ayer\n\n' +
      'Origen: WhatsApp · Solicitante: Ricardo Hernández · WhatsApp ID: 123456789 · Cuenta verificada: Ricardo Hernández (ricardo@conred.gob.gt)'
  );
});

test('includes only the verified email when no verified name is present', () => {
  const verifiedSession = { ...session, verifiedEmail: 'ricardo@conred.gob.gt' };
  const payload = mapToGlpiPayload(verifiedSession, testConfig);
  expect(payload.content).toBe(
    'La impresora de recepción no prende desde ayer\n\n' +
      'Origen: WhatsApp · Solicitante: Ricardo Hernández · WhatsApp ID: 123456789 · Cuenta verificada: ricardo@conred.gob.gt'
  );
});

test('findLocationId returns the matching id', () => {
  expect(findLocationId(testConfig.locations, 'Sede Central')).toBe(1);
});

test('findLocationId returns null when there is no match', () => {
  expect(findLocationId(testConfig.locations, 'Sede Desconocida')).toBeNull();
});
