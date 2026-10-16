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
const { normalizeKeyword } = require('./flow');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createInitialVerificationState(phone) {
  return { phone, step: 'EMAIL' };
}

function emailPrompt() {
  return (
    'Hola, soy el asistente de soporte. Antes de continuar, necesito verificar que sos parte de la institución.\n\n' +
    'Escribí el correo de tu cuenta de reclutamiento.'
  );
}

function processVerificationMessage(state, message, config) {
  const body = (message.body || '').trim();
  const keyword = normalizeKeyword(body);

  if (keyword === 'CANCELAR') {
    return {
      state: { phone: state.phone, step: 'EMAIL', attempted: true },
      reply: 'Verificación reiniciada.\n\n' + emailPrompt(),
      action: null,
    };
  }

  if (state.step === 'PASSWORD') {
    if (!body) {
      return { state, reply: 'Escribí tu contraseña para continuar.', action: null };
    }
    return {
      state,
      reply: null,
      action: { type: 'LOGIN', email: state.email, password: body },
    };
  }

  // step EMAIL
  if (!EMAIL_RE.test(body)) {
    return {
      state: { phone: state.phone, step: 'EMAIL', attempted: true },
      reply: state.attempted ? 'Ese correo no es válido. Escribilo de nuevo.' : emailPrompt(),
      action: null,
    };
  }
  return {
    state: { phone: state.phone, step: 'PASSWORD', email: body },
    reply: 'Ahora escribí tu contraseña. (No la guardamos — solo se usa una vez para verificar tu identidad.)',
    action: null,
  };
}

module.exports = { createInitialVerificationState, processVerificationMessage };
