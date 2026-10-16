describe('modo mock (RECLUTAMIENTO_API_URL vacio)', () => {
  let login, isMockMode;

  beforeAll(() => {
    jest.resetModules();
    process.env.RECLUTAMIENTO_API_URL = '';
    ({ login, isMockMode } = require('../../src/reclutamiento/client'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('isMockMode is true', () => {
    expect(isMockMode()).toBe(true);
  });

  test('login always succeeds with a placeholder name, without calling fetch', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await login('cualquiera@gmail.com', 'lo-que-sea');
    expect(result).toEqual({ ok: true, name: 'Usuario', lastName: 'De Prueba' });
    expect(logSpy).toHaveBeenCalledWith('[RECLUTAMIENTO MOCK] login aceptado para cualquiera@gmail.com');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('modo real (RECLUTAMIENTO_API_URL configurado)', () => {
  let login, isMockMode;

  beforeAll(() => {
    jest.resetModules();
    process.env.RECLUTAMIENTO_API_URL = 'https://reclutamiento.conred.gob.gt';
    ({ login, isMockMode } = require('../../src/reclutamiento/client'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('isMockMode is false', () => {
    expect(isMockMode()).toBe(false);
  });

  test('sends the login payload with the expected field names', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ status: 200, headers: { get: () => null } });

    await login('ricardo@conred.gob.gt', 'Clave123');

    expect(fetchSpy).toHaveBeenCalledWith('https://reclutamiento.conred.gob.gt/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_mail: 'ricardo@conred.gob.gt', p_password: 'Clave123', recuerdame: false }),
    });
  });

  test('a successful login decodes the name and last name from the JWT cookie', async () => {
    const payload = { ip_nombre: 'Ricardo', ip_apellido: 'Hernández' };
    const token = `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
    jest.spyOn(global, 'fetch').mockResolvedValue({
      status: 200,
      headers: { get: () => `jwt_token=${token}; Path=/; HttpOnly` },
    });

    const result = await login('ricardo@conred.gob.gt', 'clave-correcta');

    expect(result).toEqual({ ok: true, name: 'Ricardo', lastName: 'Hernández' });
  });

  test('a non-200 status is treated as invalid credentials', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ status: 401, headers: { get: () => null } });

    const result = await login('ricardo@conred.gob.gt', 'clave-mala');

    expect(result).toEqual({ ok: false });
  });

  test('a 200 response without a jwt_token cookie is treated as invalid credentials', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ status: 200, headers: { get: () => null } });

    const result = await login('ricardo@conred.gob.gt', 'clave-mala');

    expect(result).toEqual({ ok: false });
  });
});
