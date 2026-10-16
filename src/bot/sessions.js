/*
 * ╔══════════════════════════════════════════════╗
 * ║                  CHATBOT                     ║
 * ╠══════════════════════════════════════════════╣
 * ║ Proyecto:chatbot                             ║
 * ║ Autor: Ricardo Hernandez Diaz                ║
 * ║ Carné: 2024445                               ║
 * ║ Rol: Practicante                             ║
 * ╚══════════════════════════════════════════════╝
 */
const TTL_MS = 30 * 60 * 1000;

const sessions = new Map();

function getSession(phone) {
  const entry = sessions.get(phone);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    sessions.delete(phone);
    return null;
  }
  return entry.data;
}

function setSession(phone, data) {
  sessions.set(phone, { data, updatedAt: Date.now() });
}

function clearSession(phone) {
  sessions.delete(phone);
}

module.exports = { getSession, setSession, clearSession, TTL_MS };
