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
let cursor = 0;

function getNextTechnician(technicians) {
  if (!technicians || technicians.length === 0) return null;
  const technician = technicians[cursor % technicians.length];
  cursor += 1;
  return technician;
}

function resetQueue() {
  cursor = 0;
}

module.exports = { getNextTechnician, resetQueue };
