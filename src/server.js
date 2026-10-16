/* ╔══════════════════════════════════════════════╗
 * ║                  CHATBOT                     ║
 * ╠══════════════════════════════════════════════╣
 * ║ Proyecto:chatbot                             ║
 * ║ Autor: Ricardo Hernandez Diaz                ║
 * ║ Carné: 2024445                               ║
 * ║ Rol: Practicante                             ║
 * ╚══════════════════════════════════════════════╝
 */
const express = require('express');
const config = require('./config');
const { createInitialSession, processMessage, normalizeKeyword, MENU_TEXT } = require('./bot/flow');
const { getSession, setSession, clearSession } = require('./bot/sessions');
const { mapToGlpiPayload } = require('./glpi/ticketMapper');
const glpiClient = require('./glpi/client');
const { addBusinessHours } = require('./sla/businessHours');
const whatsappWebChannel = require('./channels/whatsappWeb');
const { formatPhoneForDisplay } = require('./bot/phoneDisplay');
const technicianQueue = require('./bot/technicianQueue');
const { registerMessage, formatWaitTime } = require('./bot/rateLimit');
const assignments = require('./bot/assignments');
const verifiedNumbers = require('./bot/verifiedNumbers');
const verificationState = require('./bot/verificationState');
const { createInitialVerificationState, processVerificationMessage } = require('./bot/verificationFlow');
const reclutamientoClient = require('./reclutamiento/client');

// Backstop: una promesa rechazada sin capturar no debe tumbar el proceso y con
// el las sesiones en memoria de todos los usuarios.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const app = express();
// El body crudo se guarda en req.rawBody para poder validar la firma de
// Meta (X-Hub-Signature-256) antes de confiar en el JSON ya parseado.
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


async function handleMessage(channel, message) {
  const chatId = message.from;

  const windowMs = config.rateLimit.windowSeconds * 1000;
  const rateLimitStatus = registerMessage(chatId, config.rateLimit.maxPerMinute, windowMs);
  if (rateLimitStatus.limited) {
    if (rateLimitStatus.shouldWarn) {
      await channel.sendMessage(
        chatId,
        `Estás enviando mensajes muy rápido. Esperá ${formatWaitTime(windowMs)} e intentá de nuevo.`
      );
    }
    return;
  }

  if (config.verification.enabled && !verifiedNumbers.isVerified(chatId)) {
    await handleVerificationMessage(channel, chatId, message);
    return;
  }

  const session = getSession(chatId) || createInitialSession(chatId, message.displayPhone);
  const result = processMessage(session, message, config);

  if (!result.readyToSubmit) {
    setSession(chatId, result.session);
    await channel.sendMessage(chatId, result.reply);
    return;
  }

  await submitTicket(channel, chatId, result.session);
}

// Verifica la identidad de un numero de WhatsApp contra el sistema de
// reclutamiento interno antes de dejarlo llegar al flujo normal de creacion
// de ticket. Solo se llama cuando config.verification.enabled es true y el
// numero todavia no esta en verifiedNumbers.js — ver el chequeo al
// principio de handleMessage.
async function handleVerificationMessage(channel, chatId, message) {
  const state = verificationState.getVerificationState(chatId) || createInitialVerificationState(chatId);
  const result = processVerificationMessage(state, message, config);

  if (result.action && result.action.type === 'LOGIN') {
    let loginResult;
    try {
      loginResult = await reclutamientoClient.login(result.action.email, result.action.password);
    } catch (err) {
      console.error(`No se pudo validar el login para ${result.action.email}:`, err);
      await channel.sendMessage(chatId, 'No pudimos validar tus datos, intentá de nuevo en un momento.');
      return;
    }

    if (loginResult.ok) {
      verifiedNumbers.markVerified(chatId, {
        email: result.action.email,
        name: loginResult.name,
        lastName: loginResult.lastName,
      });
      verificationState.clearVerificationState(chatId);
      await channel.sendMessage(chatId, '¡Listo! Tu identidad quedó verificada.\n\n' + MENU_TEXT);
      return;
    }

    verificationState.setVerificationState(chatId, {
      phone: chatId,
      step: 'PASSWORD',
      email: result.action.email,
    });
    await channel.sendMessage(
      chatId,
      'Usuario o contraseña incorrectos. Escribí tu contraseña de nuevo, o CANCELAR para empezar de nuevo.'
    );
    return;
  }

  verificationState.setVerificationState(chatId, result.state);
  await channel.sendMessage(chatId, result.reply);
}

async function submitTicket(channel, chatId, session) {
  let sessionToken = null;
  try {
    sessionToken = await glpiClient.initSession();
    const verifiedInfo = config.verification.enabled ? verifiedNumbers.getVerifiedInfo(chatId) : null;
    const sessionForPayload = verifiedInfo
      ? {
          ...session,
          verifiedEmail: verifiedInfo.email,
          verifiedName: verifiedInfo.name,
          verifiedLastName: verifiedInfo.lastName,
        }
      : session;
    const payload = mapToGlpiPayload(sessionForPayload, config);
    const ticket = await glpiClient.createTicket(payload, sessionToken);

    // La foto es opcional: si falla la descarga o la subida, el ticket ya
    // existe y no debe reportarse como fallido (el usuario duplicaria).
    if (session.mediaUrl) {
      try {
        const mediaBuffer = await channel.downloadMedia(session.mediaUrl);
        await glpiClient.uploadDocument(ticket.id, mediaBuffer, sessionToken);
      } catch (mediaErr) {
        console.error(`No se pudo adjuntar la foto al ticket #${ticket.id}:`, mediaErr);
      }
    }

    const stInfo = config.stCatalog[session.st];
    const dueDate = addBusinessHours(new Date(), stInfo.slaHours);
    const confirmationMessage =
      `Ticket #${ticket.id} creado.\n` +
      `Categoría: ${session.st} - ${stInfo.name}\n` +
      `Atención estimada: máximo ${stInfo.slaHours} horas hábiles (antes de ${dueDate.toLocaleString('es-ES')})`;
    await channel.sendMessage(chatId, confirmationMessage);

    if (config.whatsappWeb.teamGroupJid) {
      const teamMessage =
        `📋 Nuevo ticket #${ticket.id}\n` +
        `Categoría: ${session.st} - ${stInfo.name}\n` +
        `Dirección: ${session.locationName}\n` +
        `Título: ${session.title}\n` +
        `Solicitante: ${session.name}\n` +
        `Teléfono: ${formatPhoneForDisplay(session.displayPhone)}`;
      try {
        await whatsappWebChannel.sendMessage(config.whatsappWeb.teamGroupJid, teamMessage);
      } catch (teamErr) {
        console.error(`No se pudo avisar al grupo del equipo sobre el ticket #${ticket.id}:`, teamErr);
      }
    }

    // Reparto por turnos: ademas del aviso al grupo (si hay), le toca a un
    // tecnico especifico en orden rotativo, que puede aceptar o rechazar
    // por WhatsApp (ver notifyTechnician/handleTechnicianReply).
    await notifyTechnician(ticket.id, session, stInfo, []);

    // Solo se descarta la sesión cuando el ticket quedó creado.
    clearSession(chatId);
  } catch (err) {
    console.error('Error creando ticket en GLPI:', err);
    // La sesión se conserva tal cual (sigue en CONFIRM con todos los datos)
    // para que el usuario pueda reintentar con SI sin volver a capturar nada.
    await channel.sendMessage(
      chatId,
      'No pude registrar tu ticket en este momento. Un técnico te contactará pronto.'
    );
  } finally {
    if (sessionToken) {
      try {
        await glpiClient.killSession(sessionToken);
      } catch (killErr) {
        console.error('Error cerrando la sesión de GLPI:', killErr);
      }
    }
  }
}

// Le ofrece el ticket al siguiente tecnico en la rotacion que todavia no lo
// haya recibido (llamado tanto al crear el ticket como al reasignar por un
// RECHAZAR). offeredJids son los JIDs a los que ya se les ofrecio ESTE
// ticket — evita reofrecerselo a quien acaba de rechazarlo, aun cuando el
// cursor round-robin (compartido entre todos los tickets) volviera a caer
// en el/ella. Best-effort: un fallo de WhatsApp no debe afectar al ticket
// ya creado.
async function notifyTechnician(ticketId, session, stInfo, offeredJids) {
  const technicians = config.whatsappWeb.technicians;
  let technician = null;
  for (let i = 0; i < technicians.length; i += 1) {
    const candidate = technicianQueue.getNextTechnician(technicians);
    if (!candidate) break;
    if (!offeredJids.includes(candidate.jid)) {
      technician = candidate;
      break;
    }
  }
  if (!technician) return;

  const technicianMessage =
    `👤 Ticket #${ticketId} asignado a vos por turno\n` +
    `Categoría: ${session.st} - ${stInfo.name}\n` +
    `Dirección: ${session.locationName}\n` +
    `Título: ${session.title}\n` +
    `Solicitante: ${session.name}\n` +
    `Teléfono: ${formatPhoneForDisplay(session.displayPhone)}\n\n` +
    'Responde ACEPTAR o RECHAZAR.';

  assignments.setAssignment(technician.jid, {
    ticketId,
    technicianName: technician.name,
    st: session.st,
    stName: stInfo.name,
    locationName: session.locationName,
    title: session.title,
    name: session.name,
    phone: session.phone,
    displayPhone: session.displayPhone,
    offeredJids: [...offeredJids, technician.jid],
  });

  try {
    await whatsappWebChannel.sendMessage(technician.jid, technicianMessage);
  } catch (technicianErr) {
    assignments.clearAssignment(technician.jid);
    console.error(`No se pudo avisar a ${technician.name} sobre el ticket #${ticketId}:`, technicianErr);
  }
}

// Intercepta los mensajes entrantes de WhatsApp Web que vienen de un tecnico
// con una asignacion pendiente, antes de que lleguen al flujo de creacion de
// ticket de flow.js. Devuelve true si el mensaje fue manejado aca (no debe
// pasarse a handleMessage), false si el remitente no tiene nada pendiente.
async function handleTechnicianReply(message) {
  const assignment = assignments.getAssignment(message.from);
  if (!assignment) return false;

  const keyword = normalizeKeyword((message.body || '').trim());

  if (keyword === 'ACEPTAR') {
    assignments.clearAssignment(message.from);
    try {
      await whatsappWebChannel.sendMessage(
        message.from,
        `Anotado, quedás a cargo del ticket #${assignment.ticketId}.`
      );
    } catch (technicianErr) {
      console.error(
        `No se pudo confirmar al técnico la aceptación del ticket #${assignment.ticketId}:`,
        technicianErr
      );
    }
    if (config.whatsappWeb.teamGroupJid) {
      try {
        await whatsappWebChannel.sendMessage(
          config.whatsappWeb.teamGroupJid,
          `✅ Ticket #${assignment.ticketId}: lo tomó ${assignment.technicianName}.`
        );
      } catch (groupErr) {
        console.error(`No se pudo avisar al grupo que se tomó el ticket #${assignment.ticketId}:`, groupErr);
      }
    }
    // Registrar en GLPI quién tomó el ticket.
    let sessionToken = null;
    try {
      sessionToken = await glpiClient.initSession();
      await glpiClient.addFollowup(
        assignment.ticketId,
        `Técnico asignado: ${assignment.technicianName} (aceptó vía WhatsApp).`,
        sessionToken
      );
    } catch (glpiErr) {
      console.error(`No se pudo registrar en GLPI la aceptación del ticket #${assignment.ticketId}:`, glpiErr);
    } finally {
      if (sessionToken) {
        try { await glpiClient.killSession(sessionToken); } catch (_) {}
      }
    }
    return true;
  }

  if (keyword === 'RECHAZAR') {
    assignments.clearAssignment(message.from);
    try {
      await whatsappWebChannel.sendMessage(message.from, 'Ok, se reasigna a otro técnico.');
    } catch (technicianErr) {
      console.error(
        `No se pudo confirmar al técnico el rechazo del ticket #${assignment.ticketId}:`,
        technicianErr
      );
    }

    const offeredJids = assignment.offeredJids;
    const technicianCount = config.whatsappWeb.technicians.length;
    if (offeredJids.length >= technicianCount) {
      if (config.whatsappWeb.teamGroupJid) {
        try {
          await whatsappWebChannel.sendMessage(
            config.whatsappWeb.teamGroupJid,
            `⚠️ Ticket #${assignment.ticketId}: ningún técnico lo aceptó. Necesita atención manual.`
          );
        } catch (groupErr) {
          console.error(`No se pudo avisar al grupo que el ticket #${assignment.ticketId} quedó sin tomar:`, groupErr);
        }
      }
      return true;
    }

    const stInfo = { name: assignment.stName };
    await notifyTechnician(assignment.ticketId, assignment, stInfo, offeredJids);
    return true;
  }

  try {
    await whatsappWebChannel.sendMessage(
      message.from,
      `Respondé ACEPTAR o RECHAZAR para el ticket #${assignment.ticketId}.`
    );
  } catch (technicianErr) {
    console.error(
      `No se pudo recordarle al técnico que responda sobre el ticket #${assignment.ticketId}:`,
      technicianErr
    );
  }
  return true;
}

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Servidor escuchando en puerto ${config.port}`);
  });

  whatsappWebChannel.startConnection(async (message) => {
    const handled = await handleTechnicianReply(message);
    if (handled) return;
    await handleMessage(whatsappWebChannel, message);
  });
}

module.exports = app;
