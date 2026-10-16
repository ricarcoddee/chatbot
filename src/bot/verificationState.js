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

const states = new Map();

function getVerificationState(phone) {
  const entry = states.get(phone);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    states.delete(phone);
    return null;
  }
  return entry.data;
}

function setVerificationState(phone, data) {
  states.set(phone, { data, updatedAt: Date.now() });
}

function clearVerificationState(phone) {
  states.delete(phone);
}

module.exports = { getVerificationState, setVerificationState, clearVerificationState, TTL_MS };
