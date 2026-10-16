const {
  createInitialVerificationState,
  processVerificationMessage,
} = require('../../src/bot/verificationFlow');

const testConfig = {};

function msg(body) {
  return { body };
}

test('createInitialVerificationState starts at the EMAIL step', () => {
  expect(createInitialVerificationState('phone-1')).toEqual({ phone: 'phone-1', step: 'EMAIL' });
});

test('an invalid first message shows the full greeting and prompt, without advancing', () => {
  const state = createInitialVerificationState('phone-1');
  const result = processVerificationMessage(state, msg('hola'), testConfig);
  expect(result.state).toEqual({ phone: 'phone-1', step: 'EMAIL', attempted: true });
  expect(result.reply).toContain('Hola, soy el asistente de soporte.');
  expect(result.reply).toContain('Escribí el correo de tu cuenta de reclutamiento.');
  expect(result.action).toBeNull();
});

test('a second invalid attempt shows a short nudge, not the full greeting again', () => {
  const state = { phone: 'phone-1', step: 'EMAIL', attempted: true };
  const result = processVerificationMessage(state, msg('not-an-email'), testConfig);
  expect(result.reply).toBe('Ese correo no es válido. Escribilo de nuevo.');
  expect(result.reply).not.toContain('Hola, soy el asistente de soporte.');
  expect(result.action).toBeNull();
});

test('any correctly-formatted email advances to PASSWORD, regardless of domain', () => {
  const state = createInitialVerificationState('phone-1');
  const result = processVerificationMessage(state, msg('ricardo1basico@gmail.com'), testConfig);
  expect(result.state).toEqual({ phone: 'phone-1', step: 'PASSWORD', email: 'ricardo1basico@gmail.com' });
  expect(result.reply).toBe(
    'Ahora escribí tu contraseña. (No la guardamos — solo se usa una vez para verificar tu identidad.)'
  );
  expect(result.action).toBeNull();
});

test('an empty password re-prompts without triggering a login', () => {
  const state = { phone: 'phone-1', step: 'PASSWORD', email: 'ricardo@conred.gob.gt' };
  const result = processVerificationMessage(state, msg('   '), testConfig);
  expect(result.state).toEqual(state);
  expect(result.reply).toBe('Escribí tu contraseña para continuar.');
  expect(result.action).toBeNull();
});

test('a non-empty password triggers a LOGIN action with a null reply', () => {
  const state = { phone: 'phone-1', step: 'PASSWORD', email: 'ricardo@conred.gob.gt' };
  const result = processVerificationMessage(state, msg('Clave123'), testConfig);
  expect(result.state).toEqual(state);
  expect(result.reply).toBeNull();
  expect(result.action).toEqual({ type: 'LOGIN', email: 'ricardo@conred.gob.gt', password: 'Clave123' });
});

test('CANCELAR resets from the EMAIL step', () => {
  const state = { phone: 'phone-1', step: 'EMAIL', attempted: true };
  const result = processVerificationMessage(state, msg('CANCELAR'), testConfig);
  expect(result.state).toEqual({ phone: 'phone-1', step: 'EMAIL', attempted: true });
  expect(result.reply).toContain('Verificación reiniciada.');
  expect(result.reply).toContain('Hola, soy el asistente de soporte.');
  expect(result.action).toBeNull();
});

test('CANCELAR resets from the PASSWORD step', () => {
  const state = { phone: 'phone-1', step: 'PASSWORD', email: 'ricardo@conred.gob.gt' };
  const result = processVerificationMessage(state, msg('cancelar'), testConfig);
  expect(result.state).toEqual({ phone: 'phone-1', step: 'EMAIL', attempted: true });
  expect(result.reply).toContain('Verificación reiniciada.');
  expect(result.action).toBeNull();
});
