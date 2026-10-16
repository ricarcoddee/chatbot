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
// WhatsApp a veces direcciona a un contacto por LID (identificador opaco,
// no el numero) en vez de su JID de telefono normal. En ese caso no hay
// numero real que mostrar.
function formatPhoneForDisplay(jid) {
  if (jid.endsWith('@lid')) return 'no disponible';
  return jid.replace(/[:@].*$/, '');
}

module.exports = { formatPhoneForDisplay };
