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
const fs = require('fs/promises');
const qrcode = require('qrcode-terminal');
const config = require('../config');


let baileysPromise = null;
function loadBaileys() {
  if (!baileysPromise) baileysPromise = import('@whiskeysockets/baileys');
  return baileysPromise;
}

let sock = null;

// Mapea @lid (identificador opaco) -> @s.whatsapp.net (numero real), aprendido
// de la libreta de contactos que manda WhatsApp al conectar/sincronizar.
// En memoria, no sobrevive un reinicio del proceso — mismo criterio que
// sessions.js/technicianQueue.js.
const lidToPhoneJid = new Map();

function isMockMode() {
  return !config.whatsappWeb.enabled;
}

function rememberContacts(contacts) {
  for (const contact of contacts || []) {
    if (contact && contact.lid && contact.jid) {
      lidToPhoneJid.set(contact.lid, contact.jid);
    }
  }
}

function resetLidMapping() {
  lidToPhoneJid.clear();
}

// WhatsApp a veces direcciona a un contacto por LID (identificador opaco, no
// el numero) en vez de su JID de telefono normal — remoteJid termina en
// "@lid". displayPhone es solo para mostrar (avisos al grupo/tecnico); from
// sigue siendo remoteJid para enrutar sesiones y respuestas. Para resolver el
// numero real de un @lid se intenta, en orden: (1) msg.key.senderPn, si
// WhatsApp lo manda en ese mensaje puntual; (2) lidResolver, la libreta de
// contactos aprendida via rememberContacts (persiste mientras dure la
// conexion, no depende de que cada mensaje traiga senderPn); (3) si ninguno
// resuelve, el propio @lid (formatPhoneForDisplay lo muestra como "no
// disponible" en vez de un ID que parece numero).
function resolveDisplayPhone(from, key, lidResolver) {
  if (!from.endsWith('@lid')) return from;
  return key.senderPn || lidResolver.get(from) || from;
}

function parseIncoming(msg, lidResolver = lidToPhoneJid) {
  if (!msg || !msg.key || msg.key.fromMe) return null;
  const from = msg.key.remoteJid;
  const content = msg.message;
  if (!from || !content) return null;

  const body =
    content.conversation ||
    (content.extendedTextMessage && content.extendedTextMessage.text) ||
    (content.imageMessage && content.imageMessage.caption) ||
    '';

  const mediaUrl = content.imageMessage ? msg : null;
  const displayPhone = resolveDisplayPhone(from, msg.key, lidResolver);

  return { from, body, mediaUrl, displayPhone };
}

async function sendMessage(to, text) {
  if (!text) return;
  if (isMockMode() || !sock) {
    console.log(`[WHATSAPP-WEB MOCK] -> ${to}: ${text}`);
    return;
  }
  await sock.sendMessage(to, { text });
}

async function downloadMedia(rawMessage) {
  const { downloadMediaMessage } = await loadBaileys();
  return downloadMediaMessage(rawMessage, 'buffer', {}, {
    reuploadRequest: sock.updateMediaMessage,
  });
}

async function listGroups() {
  try {
    const groups = await sock.groupFetchAllParticipating();
    const entries = Object.values(groups);
    if (!entries.length) {
      console.log('Este número no es miembro de ningún grupo de WhatsApp todavía.');
      return;
    }
    console.log('Grupos de WhatsApp de los que este número es miembro (JID para WHATSAPP_WEB_TEAM_GROUP_JID):');
    entries.forEach((g) => console.log(`  - ${g.subject}: ${g.id}`));
  } catch (err) {
    console.error('No se pudo listar los grupos de WhatsApp:', err);
  }
}

async function startConnection(onMessage) {
  if (isMockMode()) {
    console.warn(
      'Aviso: WHATSAPP_WEB_ENABLED no esta en "true" — no se arranca la conexion de WhatsApp Web.'
    );
    return;
  }

  const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = await loadBaileys();
  const { state, saveCreds } = await useMultiFileAuthState(config.whatsappWeb.authDir);
  sock = makeWASocket({ auth: state, printQRInTerminal: false });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('contacts.upsert', rememberContacts);
  sock.ev.on('contacts.update', rememberContacts);

  sock.ev.on('connection.update', async (update) => {
    if (update.qr) {
      console.log('Escaneá este código QR con WhatsApp (Dispositivos vinculados > Vincular un dispositivo):');
      qrcode.generate(update.qr, { small: true });
    }
    if (update.connection === 'open') {
      console.log('WhatsApp Web conectado.');
      listGroups();
    }
    if (update.connection === 'close') {
      const statusCode = update.lastDisconnect && update.lastDisconnect.error &&
        update.lastDisconnect.error.output && update.lastDisconnect.error.output.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.warn(
        loggedOut
          ? 'Sesión de WhatsApp Web cerrada desde el teléfono — hay que volver a escanear el QR (generando uno nuevo)...'
          : 'Conexión de WhatsApp Web perdida, reconectando...'
      );
      // La sesión guardada (creds.me) sigue marcando el número como "vinculado" aunque el
      // teléfono la haya cerrado, así que Baileys reintentaría un login y nunca ofrecería un
      // QR nuevo si no se borra el estado de auth persistido.
      if (loggedOut) {
        await fs.rm(config.whatsappWeb.authDir, { recursive: true, force: true });
      }
      startConnection(onMessage);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const raw of messages) {
      const message = parseIncoming(raw);
      if (!message) continue;
      try {
        await onMessage(message);
      } catch (err) {
        console.error('Error procesando mensaje de WhatsApp Web:', err);
      }
    }
  });
}

module.exports = {
  parseIncoming,
  sendMessage,
  downloadMedia,
  startConnection,
  isMockMode,
  rememberContacts,
  resetLidMapping,
};
