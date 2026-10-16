 /* ╔══════════════════════════════════════════════╗
 * ║                  CHATBOT                     ║
 * ╠══════════════════════════════════════════════╣
 * ║ Proyecto:chatbot                             ║
 * ║ Autor: Ricardo Hernandez Diaz                ║
 * ║ Carné: 2024445                               ║
 * ║ Rol: Practicante                             ║
 * ╚══════════════════════════════════════════════╝
 */
require('dotenv').config();

const bundledLocations = require('./glpi/locations');

const ST_CATALOG = {
  ST1: { name: 'Atención remota', slaHours: 3 },
  ST2: { name: 'En sitio', slaHours: 8 },
  ST3: { name: 'Reparación de equipo de taller', slaHours: 32 },
};

function parseLocations(raw) {
  if (!raw) return [];
  return raw.split(',').map((pair) => {
    const [name, id] = pair.split(':');
    return { name: name.trim(), id: Number(id) };
  });
}

function parseTechnicians(raw) {
  if (!raw) return [];
  return raw.split(',').map((pair) => {
    const [name, phone] = pair.split(':');
    return { name: name.trim(), jid: `${phone.trim().replace(/\D/g, '')}@s.whatsapp.net` };
  });
}

const config = {
  port: Number(process.env.PORT) || 3001,
  rateLimit: {
    maxPerMinute: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE) || 10,
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS) || 120,
  },
  whatsappWeb: {
    enabled: process.env.WHATSAPP_WEB_ENABLED === 'true',
    authDir: process.env.WHATSAPP_WEB_AUTH_DIR || '.whatsapp-web-auth',
    // JID del grupo de WhatsApp del equipo tecnico (formato "xxxxx-xxxxx@g.us"
    // o "xxxxxxxxxxxxxxxxxx@g.us"). Se imprime por consola al conectar,
    // listando los grupos de los que el numero vinculado ya es miembro.
    teamGroupJid: process.env.WHATSAPP_WEB_TEAM_GROUP_JID || '',
    // Tecnicos que reciben tickets por turno (round-robin), ademas del aviso
    // al grupo. Vacio = no se notifica a nadie individualmente.
    technicians: parseTechnicians(process.env.WHATSAPP_WEB_TECHNICIANS),
  },
  glpi: {
    apiUrl: process.env.GLPI_API_URL || '',
    appToken: process.env.GLPI_APP_TOKEN || '',
    userToken: process.env.GLPI_USER_TOKEN || '',
    entityId: Number(process.env.GLPI_ENTITY_ID || 0),
    categoryIds: {
      ST1: process.env.GLPI_CAT_ST1 || '',
      ST2: process.env.GLPI_CAT_ST2 || '',
      ST3: process.env.GLPI_CAT_ST3 || '',
    },
  },
  verification: {
    enabled: process.env.VERIFICATION_ENABLED === 'true',
    storageFile: process.env.VERIFIED_NUMBERS_FILE || '.verified-numbers.json',
  },
  reclutamiento: {
    apiUrl: process.env.RECLUTAMIENTO_API_URL || '',
  },
  locations: process.env.GLPI_LOCATIONS ? parseLocations(process.env.GLPI_LOCATIONS) : bundledLocations,
  stCatalog: ST_CATALOG,
};


if (config.glpi.apiUrl) {
  ['ST1', 'ST2', 'ST3'].forEach((st) => {
    if (!config.glpi.categoryIds[st]) {
      console.warn(
        `Aviso: GLPI_CAT_${st} esta vacio — los tickets ${st} se crearan sin categoria en GLPI.`
      );
    }
  });
}

if (config.verification.enabled && !config.reclutamiento.apiUrl) {
  console.warn(
    'Aviso: VERIFICATION_ENABLED esta en true pero RECLUTAMIENTO_API_URL esta vacio — el login corre en modo mock y deja pasar a cualquiera.'
  );
}

module.exports = config;
module.exports.parseLocations = parseLocations;
module.exports.parseTechnicians = parseTechnicians;
