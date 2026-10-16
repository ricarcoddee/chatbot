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
const assignments = new Map();

function setAssignment(jid, record) {
  assignments.set(jid, record);
}

function getAssignment(jid) {
  return assignments.get(jid) || null;
}

function clearAssignment(jid) {
  assignments.delete(jid);
}

module.exports = { setAssignment, getAssignment, clearAssignment };
