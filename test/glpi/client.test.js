const glpiClient = require('../../src/glpi/client');

test('isMockMode is true when GLPI_API_URL is not configured', () => {
  expect(glpiClient.isMockMode()).toBe(true);
});

test('initSession resolves with a mock token in mock mode', async () => {
  const token = await glpiClient.initSession();
  expect(token).toBe('mock-session-token');
});

test('createTicket returns increasing numeric ids above 13687 in mock mode', async () => {
  const first = await glpiClient.createTicket({ name: 'a' });
  const second = await glpiClient.createTicket({ name: 'b' });
  expect(first.id).toBeGreaterThan(13687);
  expect(second.id).toBe(first.id + 1);
});

test('uploadDocument resolves with a mock document id in mock mode', async () => {
  const result = await glpiClient.uploadDocument(99999, Buffer.from('fake-image-data'), 'token');
  expect(result).toEqual({ id: 'mock-document-id' });
});

test('killSession resolves without throwing in mock mode', async () => {
  await expect(glpiClient.killSession('token')).resolves.toBeUndefined();
});
