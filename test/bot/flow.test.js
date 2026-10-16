const { STEPS, MENU_TEXT, createInitialSession, processMessage } = require('../../src/bot/flow');

const testConfig = {
  stCatalog: {
    ST1: { name: 'Atención remota', slaHours: 3 },
    ST2: { name: 'En sitio', slaHours: 8 },
    ST3: { name: 'Reparación de equipo de taller', slaHours: 32 },
  },
};

function msg(body, mediaUrl = null) {
  return { body, mediaUrl };
}

test('createInitialSession starts at the MENU step', () => {
  expect(createInitialSession('phone-1')).toEqual({ phone: 'phone-1', displayPhone: 'phone-1', step: STEPS.MENU });
});

test('createInitialSession keeps a display phone distinct from the routing phone when given one', () => {
  expect(createInitialSession('200837049676021@lid', '50242584634@s.whatsapp.net')).toEqual({
    phone: '200837049676021@lid',
    displayPhone: '50242584634@s.whatsapp.net',
    step: STEPS.MENU,
  });
});

test('an invalid menu choice sends a greeting and repeats the menu without advancing', () => {
  const session = createInitialSession('phone-1');
  const result = processMessage(session, msg('9'), testConfig);
  expect(result.session.step).toBe(STEPS.MENU);
  expect(result.reply).toBe(MENU_TEXT);
  expect(result.readyToSubmit).toBe(false);
});

test('MENU_TEXT includes the agreed description for each category', () => {
  expect(MENU_TEXT).toContain(
    'Atención remota: Brindar soporte técnico a los usuarios a distancia, solucionando problemas de software, configuración y otros inconvenientes mediante herramientas de acceso remoto.'
  );
  expect(MENU_TEXT).toContain(
    'En sitio: Proporcionar soporte técnico presencial en las instalaciones, realizando diagnósticos, configuraciones y solución de problemas directamente en el lugar.'
  );
  expect(MENU_TEXT).toContain(
    'Reparación de equipo de taller: Realizar el diagnóstico, mantenimiento y reparación de los equipos  en el taller, asegurando su correcto funcionamiento.'
  );
});

test('MENU_TEXT starts with the bot greeting', () => {
  expect(MENU_TEXT.startsWith('Hola, soy un asistente automático del Departamento de Informática.')).toBe(true);
});

test('choosing option 2 selects ST2 and asks for the name', () => {
  const session = createInitialSession('phone-1');
  const result = processMessage(session, msg('2'), testConfig);
  expect(result.session).toEqual({ phone: 'phone-1', displayPhone: 'phone-1', step: STEPS.NAME, st: 'ST2' });
  expect(result.reply).toMatch(/nombre/i);
});

test('an empty name is rejected without advancing the step', () => {
  const session = { phone: 'phone-1', step: STEPS.NAME, st: 'ST2' };
  const result = processMessage(session, msg('   '), testConfig);
  expect(result.session.step).toBe(STEPS.NAME);
});

test('entering LOCATION from NAME shows the region menu', () => {
  const session = { phone: 'phone-1', step: STEPS.NAME, st: 'ST2' };
  const result = processMessage(session, msg('Ricardo Hernández'), testConfig);
  expect(result.session.step).toBe(STEPS.LOCATION);
  expect(result.reply).toMatch(/¿En qué región estás\?/);
  expect(result.reply).toContain('1. Región I');
  expect(result.reply).toContain('8. Región VIII');
});

test('an invalid region choice repeats the region menu without advancing', () => {
  const session = { phone: 'phone-1', step: STEPS.LOCATION, st: 'ST2', name: 'Ricardo' };
  const result = processMessage(session, msg('99'), testConfig);
  expect(result.session.step).toBe(STEPS.LOCATION);
  expect(result.session.pendingRegion).toBeUndefined();
  expect(result.reply).toContain('Opción inválida.');
  expect(result.reply).toContain('¿En qué región estás?');
});

test('choosing región 5 shows the combined menu: 22 fixed areas + that región\'s delegations', () => {
  const session = { phone: 'phone-1', step: STEPS.LOCATION, st: 'ST2', name: 'Ricardo' };
  const result = processMessage(session, msg('5'), testConfig);
  expect(result.session.step).toBe(STEPS.LOCATION);
  expect(result.session.pendingRegion.name).toBe('Región V - Central');
  expect(result.reply).toContain('Región V - Central: ¿en qué dirección, unidad o delegación estás?');
  // Las 22 direcciones/unidades fijas van primero (1-22)...
  expect(result.reply).toContain('1. Dirección Administrativa');
  expect(result.reply).toContain('22. Unidad de Información Pública');
  // ...seguidas de las delegaciones departamentales de la Región V (23-25).
  expect(result.reply).toContain('23. Delegación Departamental de Chimaltenango');
  expect(result.reply).toContain('24. Delegación Departamental de Sacatepéquez');
  expect(result.reply).toContain('25. Delegación Departamental de Escuintla');
});

test('an invalid combined-menu choice repeats it, keeping the region pending', () => {
  const pendingRegion = {
    name: 'Región V',
    departments: [
      'Delegación Departamental de Chimaltenango',
      'Delegación Departamental de Sacatepéquez',
      'Delegación Departamental de Escuintla',
    ],
  };
  const session = { phone: 'phone-1', step: STEPS.LOCATION, st: 'ST2', name: 'Ricardo', pendingRegion };
  const result = processMessage(session, msg('999'), testConfig);
  expect(result.session.step).toBe(STEPS.LOCATION);
  expect(result.session.pendingRegion).toEqual(pendingRegion);
  expect(result.reply).toContain('Opción inválida.');
  expect(result.reply).toContain('Región V: ¿en qué dirección, unidad o delegación estás?');
});

test('picking one of the 22 fixed areas (not a delegation) advances to TITLE', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.LOCATION,
    st: 'ST2',
    name: 'Ricardo',
    pendingRegion: { name: 'Región V', departments: ['Delegación Departamental de Escuintla'] },
  };
  const result = processMessage(session, msg('16'), testConfig); // #16 = Secretaría Ejecutiva
  expect(result.session.step).toBe(STEPS.TITLE);
  expect(result.session.locationName).toBe('Secretaría Ejecutiva');
  expect(result.session.pendingRegion).toBeUndefined();
});

test('picking a delegation (past the 22 fixed areas) advances to TITLE and clears pendingRegion', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.LOCATION,
    st: 'ST2',
    name: 'Ricardo',
    pendingRegion: {
      name: 'Región V',
      departments: [
        'Delegación Departamental de Chimaltenango',
        'Delegación Departamental de Sacatepéquez',
        'Delegación Departamental de Escuintla',
      ],
    },
  };
  const result = processMessage(session, msg('25'), testConfig); // 22 + 3rd department = Escuintla
  expect(result.session.step).toBe(STEPS.TITLE);
  expect(result.session.locationName).toBe('Delegación Departamental de Escuintla');
  expect(result.session.pendingRegion).toBeUndefined();
});

test('the full happy path reaches CONFIRM with readyToSubmit on SI', () => {
  let session = createInitialSession('phone-1');
  session = processMessage(session, msg('2'), testConfig).session; // -> NAME
  session = processMessage(session, msg('Ricardo Hernández'), testConfig).session; // -> LOCATION (region menu)
  session = processMessage(session, msg('1'), testConfig).session; // Región I -> combined menu
  session = processMessage(session, msg('16'), testConfig).session; // #16 = Secretaría Ejecutiva -> TITLE
  session = processMessage(session, msg('No enciende la impresora'), testConfig).session; // -> DESCRIPTION
  const afterDescription = processMessage(
    session,
    msg('No prende desde ayer', 'tg-file-abc123'),
    testConfig
  );
  expect(afterDescription.session.step).toBe(STEPS.CONFIRM);
  expect(afterDescription.reply).toMatch(/Confirmas/i);

  const confirmed = processMessage(afterDescription.session, msg('SI'), testConfig);
  expect(confirmed.readyToSubmit).toBe(true);
  expect(confirmed.reply).toBeNull();
  expect(confirmed.session).toEqual({
    phone: 'phone-1',
    displayPhone: 'phone-1',
    step: STEPS.CONFIRM,
    st: 'ST2',
    name: 'Ricardo Hernández',
    locationName: 'Secretaría Ejecutiva',
    title: 'No enciende la impresora',
    description: 'No enciende la impresora',
    mediaUrl: 'tg-file-abc123',
  });
});

test('answering NO at confirmation discards the ticket and resets to MENU', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.CONFIRM,
    st: 'ST1',
    name: 'A',
    locationName: 'Secretaría Ejecutiva',
    title: 'T',
    description: 'D',
    mediaUrl: null,
  };
  const result = processMessage(session, msg('NO'), testConfig);
  expect(result.session).toEqual({ phone: 'phone-1', displayPhone: 'phone-1', step: STEPS.MENU });
  expect(result.readyToSubmit).toBe(false);
});

test('CANCELAR resets the conversation from any step', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.TITLE,
    st: 'ST3',
    name: 'A',
    locationName: 'Dirección de Logística',
  };
  const result = processMessage(session, msg('cancelar'), testConfig);
  expect(result.session).toEqual({ phone: 'phone-1', displayPhone: 'phone-1', step: STEPS.MENU });
});

test('CANCELAR keeps a display phone that differs from the routing phone (does not fall back to it)', () => {
  const session = {
    phone: '200837049676021@lid',
    displayPhone: '50242584634@s.whatsapp.net',
    step: STEPS.TITLE,
    st: 'ST3',
    name: 'A',
    locationName: 'Dirección de Logística',
  };
  const result = processMessage(session, msg('cancelar'), testConfig);
  expect(result.session).toEqual({
    phone: '200837049676021@lid',
    displayPhone: '50242584634@s.whatsapp.net',
    step: STEPS.MENU,
  });
});

test('description step accepts a photo with no text', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.DESCRIPTION,
    st: 'ST1',
    name: 'A',
    locationName: 'Dirección de Logística',
    title: 'T',
  };
  const result = processMessage(session, msg('', 'tg-file-xyz'), testConfig);
  expect(result.session.step).toBe(STEPS.CONFIRM);
  expect(result.session.mediaUrl).toBe('tg-file-xyz');
  expect(result.session.description).toBe('T');
});

test('description step ignores free text and always uses the title as the GLPI description', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.DESCRIPTION,
    st: 'ST1',
    name: 'A',
    locationName: 'Dirección de Logística',
    title: 'No enciende la impresora',
  };
  const result = processMessage(
    session,
    msg('Esto es un texto libre que no debería guardarse'),
    testConfig
  );
  expect(result.session.step).toBe(STEPS.CONFIRM);
  expect(result.session.description).toBe('No enciende la impresora');
  expect(result.reply).toContain('Categoría: ST1 - Atención remota');
  expect(result.reply).toContain('Dirección: Dirección de Logística');
  expect(result.reply).toContain('Título: No enciende la impresora');
  expect(result.reply).toContain('Foto adjunta: No');
  expect(result.reply).not.toContain('Esto es un texto libre que no debería guardarse');
  expect(result.reply).not.toContain('Descripción:');
});

test('description step re-prompts when there is no text and no photo', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.DESCRIPTION,
    st: 'ST1',
    name: 'A',
    locationName: 'Dirección de Logística',
    title: 'T',
  };
  const result = processMessage(session, msg(''), testConfig);
  expect(result.session.step).toBe(STEPS.DESCRIPTION);
  expect(result.reply).toBe('Envía una foto o escribe LISTO para continuar.');
  expect(result.readyToSubmit).toBe(false);
});

test('completing TITLE asks about a photo before moving to DESCRIPTION', () => {
  const session = {
    phone: 'phone-1',
    step: STEPS.TITLE,
    st: 'ST1',
    name: 'A',
    locationName: 'Dirección de Logística',
  };
  const result = processMessage(session, msg('No enciende la impresora'), testConfig);
  expect(result.session.step).toBe(STEPS.DESCRIPTION);
  expect(result.reply).toBe(
    '¿Tienes una foto del problema? Envíala, o escribe LISTO para continuar sin foto.'
  );
});

const { normalizeKeyword } = require('../../src/bot/flow');

test('normalizeKeyword uppercases and strips accents', () => {
  expect(normalizeKeyword('sí')).toBe('SI');
  expect(normalizeKeyword('Aceptar')).toBe('ACEPTAR');
  expect(normalizeKeyword('  rechazar  ')).toBe('  RECHAZAR  ');
});
