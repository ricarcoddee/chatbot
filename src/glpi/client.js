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
const config = require('../config');

let mockTicketCounter = 13687;

function isMockMode() {
  return !config.glpi.apiUrl;
}

async function initSession() {
  if (isMockMode()) {
    return 'mock-session-token';
  }
  const res = await fetch(`${config.glpi.apiUrl}/initSession`, {
    method: 'GET',
    headers: {
      'App-Token': config.glpi.appToken,
      Authorization: `user_token ${config.glpi.userToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`GLPI initSession failed: ${res.status}`);
  }
  const data = await res.json();
  return data.session_token;
}

async function createTicket(payload, sessionToken) {
  if (isMockMode()) {
    mockTicketCounter += 1;
    console.log('[GLPI MOCK] createTicket payload:', JSON.stringify(payload, null, 2));
    return { id: mockTicketCounter };
  }
  const res = await fetch(`${config.glpi.apiUrl}/Ticket`, {
    method: 'POST',
    headers: {
      'App-Token': config.glpi.appToken,
      'Session-Token': sessionToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: payload }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GLPI createTicket failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return { id: data.id };
}

// mediaBuffer ya viene descargado por el adaptador de canal (channels/whatsappWeb.js).
async function uploadDocument(ticketId, mediaBuffer, sessionToken) {
  if (isMockMode()) {
    const bytes = mediaBuffer ? mediaBuffer.length : 0;
    console.log(`[GLPI MOCK] uploadDocument for ticket ${ticketId}: ${bytes} bytes`);
    return { id: 'mock-document-id' };
  }
  const filename = `whatsapp-${ticketId}.jpg`;

  const form = new FormData();
  form.append(
    'uploadManifest',
    JSON.stringify({ input: { name: filename, _filename: [filename] } })
  );
  form.append('filename[0]', new Blob([mediaBuffer]), filename);

  const res = await fetch(`${config.glpi.apiUrl}/Document`, {
    method: 'POST',
    headers: {
      'App-Token': config.glpi.appToken,
      'Session-Token': sessionToken,
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GLPI uploadDocument failed: ${res.status} ${body}`);
  }
  const data = await res.json();

  await fetch(`${config.glpi.apiUrl}/Document_Item`, {
    method: 'POST',
    headers: {
      'App-Token': config.glpi.appToken,
      'Session-Token': sessionToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { documents_id: data.id, itemtype: 'Ticket', items_id: ticketId },
    }),
  });

  return { id: data.id };
}

async function addFollowup(ticketId, content, sessionToken) {
  if (isMockMode()) {
    console.log(`[GLPI MOCK] addFollowup ticket ${ticketId}: ${content}`);
    return;
  }
  const res = await fetch(`${config.glpi.apiUrl}/ITILFollowup`, {
    method: 'POST',
    headers: {
      'App-Token': config.glpi.appToken,
      'Session-Token': sessionToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: { items_id: ticketId, itemtype: 'Ticket', content, is_private: 0 } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GLPI addFollowup failed: ${res.status} ${body}`);
  }
}

async function killSession(sessionToken) {
  if (isMockMode()) return;
  await fetch(`${config.glpi.apiUrl}/killSession`, {
    method: 'GET',
    headers: {
      'App-Token': config.glpi.appToken,
      'Session-Token': sessionToken,
    },
  });
}

module.exports = { initSession, createTicket, uploadDocument, addFollowup, killSession, isMockMode };
