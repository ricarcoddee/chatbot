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
// Ventana por numero (no deslizante): guarda cuenta de mensajes y si ya se
// aviso en esta ventana. Mismo criterio que sessions.js/technicianQueue.js:
// estado en memoria, no sobrevive un reinicio.
const buckets = new Map(); // chatId -> { count, windowStart, warned }

function registerMessage(chatId, limit, windowMs) {
  const now = Date.now();
  const bucket = buckets.get(chatId);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(chatId, { count: 1, windowStart: now, warned: false });
    return { limited: false };
  }

  bucket.count += 1;
  if (bucket.count <= limit) return { limited: false };
  if (bucket.warned) return { limited: true, shouldWarn: false };

  bucket.warned = true;
  return { limited: true, shouldWarn: true };
}

function resetRateLimit() {
  buckets.clear();
}

// Texto para avisarle a la persona cuanto tiene que esperar. Minutos cuando
// la ventana es un numero entero de minutos (el caso normal configurado),
// segundos si no.
function formatWaitTime(windowMs) {
  const totalSeconds = windowMs / 1000;
  if (totalSeconds % 60 === 0) {
    const minutes = totalSeconds / 60;
    return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  }
  return `${totalSeconds} segundos`;
}

module.exports = { registerMessage, resetRateLimit, formatWaitTime };
