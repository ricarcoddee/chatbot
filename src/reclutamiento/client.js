 /* ╔══════════════════════════════════════════════╗
 * ║                  CHATBOT                     ║
 * ╠══════════════════════════════════════════════╣
 * ║ Proyecto:chatbot                             ║
 * ║ Autor: Ricardo Hernandez Diaz                ║
 * ║ Carné: 2024445                               ║
 * ║ Rol: Practicante                             ║
 * ╚══════════════════════════════════════════════╝
 */
const config = require('../config');

function isMockMode() {
  return !config.reclutamiento.apiUrl;
}

function decodeJwtPayload(token) {
  const payloadSegment = token.split('.')[1];
  const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
  return JSON.parse(json);
}

async function login(email, password) {
  if (isMockMode()) {
    console.log(`[RECLUTAMIENTO MOCK] login aceptado para ${email}`);
    return { ok: true, name: 'Usuario', lastName: 'De Prueba' };
  }

  const res = await fetch(`${config.reclutamiento.apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_mail: email, p_password: password, recuerdame: false }),
  });

  if (res.status !== 200) {
    return { ok: false };
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/jwt_token=([^;]+)/);
  if (!match) {
    return { ok: false };
  }

  const payload = decodeJwtPayload(match[1]);
  return { ok: true, name: payload.ip_nombre, lastName: payload.ip_apellido };
}

module.exports = { login, isMockMode };
