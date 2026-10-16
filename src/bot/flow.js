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
const STEPS = {
  MENU: 'MENU',
  NAME: 'NAME',
  LOCATION: 'LOCATION',
  TITLE: 'TITLE',
  DESCRIPTION: 'DESCRIPTION',
  CONFIRM: 'CONFIRM',
};

const MENU_TEXT =
  'Hola, soy un asistente automático del Departamento de Informática. ¿Qué tipo de atención necesitas?\n' +
  '1. Atención remota: Brindar soporte técnico a los usuarios a distancia, solucionando problemas de software, configuración y otros inconvenientes mediante herramientas de acceso remoto.\n' +
  '2. En sitio: Proporcionar soporte técnico presencial en las instalaciones, realizando diagnósticos, configuraciones y solución de problemas directamente en el lugar.\n' +
  '3. Reparación de equipo de taller: Realizar el diagnóstico, mantenimiento y reparación de los equipos  en el taller, asegurando su correcto funcionamiento.\n\n' +
  'Responde con el número. Escribe CANCELAR en cualquier momento para reiniciar.';

const ST_BY_OPTION = { '1': 'ST1', '2': 'ST2', '3': 'ST3' };

// Quita acentos y pasa a mayúsculas para que "Sí", "SI" y "sí" sean equivalentes.
function normalizeKeyword(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
}

function createInitialSession(phone, displayPhone) {
  return { phone, displayPhone: displayPhone || phone, step: STEPS.MENU };
}

// Agrupación regional de las delegaciones departamentales (fija, según el
// organigrama de CONRED: cada "Delegación Regional I-VIII" agrupa un set de
// delegaciones departamentales). Los nombres en `departments` deben coincidir
// exactamente con los de src/glpi/locations.js para que ticketMapper.js
// resuelva el ID de GLPI — el campo `name` de cada región es solo la
// etiqueta que se muestra en el menú y no participa en esa resolución.
const REGIONS = [
  { name: 'Región I - Metropolitana', departments: ['Delegación Departamental de Guatemala'] },
  {
    name: 'Región II - Norte',
    departments: ['Delegación Departamental de Alta Verapaz', 'Delegación Departamental de Baja Verapaz'],
  },
  {
    name: 'Región III - Nororiente',
    departments: [
      'Delegación Departamental de Izabal',
      'Delegación Departamental de Zacapa',
      'Delegación Departamental de Chiquimula',
      'Delegación Departamental de El Progreso',
    ],
  },
  {
    name: 'Región IV - Suroriente',
    departments: [
      'Delegación Departamental de Jutiapa',
      'Delegación Departamental de Jalapa',
      'Delegación Departamental de Santa Rosa',
    ],
  },
  {
    name: 'Región V - Central',
    departments: [
      'Delegación Departamental de Chimaltenango',
      'Delegación Departamental de Sacatepéquez',
      'Delegación Departamental de Escuintla',
    ],
  },
  {
    name: 'Región VI - Suroccidente',
    departments: [
      'Delegación Departamental de San Marcos',
      'Delegación Departamental de Quetzaltenango',
      'Delegación Departamental de Totonicapán',
      'Delegación Departamental de Sololá',
      'Delegación Departamental de Retalhuleu',
      'Delegación Departamental de Suchitepéquez',
    ],
  },
  {
    name: 'Región VII - Noroccidente',
    departments: ['Delegación Departamental de Huehuetenango', 'Delegación Departamental de Quiché'],
  },
  {
    name: 'Región VIII - Petén',
    departments: ['Delegación Departamental de Petén', 'Delegación Departamental de Poptún, Petén'],
  },
];

// Estructura institucional fija: las mismas 22 direcciones/unidades se
// ofrecen sin importar la región elegida (son de la Secretaría Ejecutiva,
// no dependen de la geografía). Los nombres deben coincidir exactamente con
// los de src/glpi/locations.js para que ticketMapper.js resuelva el ID de GLPI.
const INSTITUTIONAL_STRUCTURE = [
  'Dirección Administrativa',
  'Dirección de Asesoría Jurídica',
  'Dirección de Comunicación Social',
  'Dirección de Coordinación',
  'Dirección de Gestión Integral de Reducción de Riesgos a Desastres',
  'Dirección de Logística',
  'Dirección de Mitigación',
  'Dirección de Planificación y Desarrollo Institucional',
  'Dirección de Preparación',
  'Dirección de Recuperación',
  'Dirección de Recursos Humanos',
  'Dirección de Respuesta',
  'Dirección del Sistema de Comando de Incidentes',
  'Dirección Financiera',
  'Inspectoría General',
  'Secretaría Ejecutiva',
  'Subsecretaría de Coordinación y Administración',
  'Subsecretaría de Gestión de la Reducción del Riesgo',
  'Unidad de Asesoría Específica',
  'Unidad de Auditoría Interna',
  'Unidad de Género',
  'Unidad de Información Pública',
];

function buildRegionMenu() {
  const lines = REGIONS.map((region, i) => `${i + 1}. ${region.name}`);
  return `¿En qué región estás?\n${lines.join('\n')}\n\nResponde con el número de tu región.`;
}

function combinedLocationOptions(region) {
  return [...INSTITUTIONAL_STRUCTURE, ...region.departments];
}

function buildCombinedMenu(region) {
  const lines = combinedLocationOptions(region).map((name, i) => `${i + 1}. ${name}`);
  return `${region.name}: ¿en qué dirección, unidad o delegación estás?\n${lines.join('\n')}\n\nResponde con el número.`;
}

// El body llega del usuario: nunca indexar un objeto plano con el directamente
// (claves heredadas como "toString" o "constructor" devolverian algo truthy).
function stForOption(option) {
  return Object.prototype.hasOwnProperty.call(ST_BY_OPTION, option)
    ? ST_BY_OPTION[option]
    : undefined;
}

function processMessage(session, message, config) {
  const body = (message.body || '').trim();
  const keyword = normalizeKeyword(body);

  if (keyword === 'CANCELAR') {
    return {
      session: createInitialSession(session.phone, session.displayPhone),
      reply: 'Conversación reiniciada.\n\n' + MENU_TEXT,
      readyToSubmit: false,
    };
  }

  switch (session.step) {
    case STEPS.MENU: {
      const st = stForOption(body);
      if (!st) {
        return {
          session,
          reply: MENU_TEXT,
          readyToSubmit: false,
        };
      }
      return {
        session: { ...session, step: STEPS.NAME, st },
        reply: '¿Cuál es tu nombre completo?',
        readyToSubmit: false,
      };
    }
    case STEPS.NAME: {
      if (!body) {
        return { session, reply: 'Por favor escribe tu nombre completo.', readyToSubmit: false };
      }
      return {
        session: { ...session, step: STEPS.LOCATION, name: body },
        reply: buildRegionMenu(),
        readyToSubmit: false,
      };
    }
    case STEPS.LOCATION: {
      // Ya eligió región y tiene el menú combinado (estructura institucional +
      // delegaciones de esa región) pendiente de selección.
      if (session.pendingRegion) {
        const index = Number(body) - 1;
        const options = combinedLocationOptions(session.pendingRegion);
        const locationName = Number.isInteger(index) ? options[index] : undefined;
        if (locationName) {
          const { pendingRegion, ...rest } = session;
          return {
            session: { ...rest, step: STEPS.TITLE, locationName },
            reply: 'Describe el problema en una línea.',
            readyToSubmit: false,
          };
        }
        return {
          session,
          reply: 'Opción inválida.\n' + buildCombinedMenu(session.pendingRegion),
          readyToSubmit: false,
        };
      }

      // Recién entra a LOCATION: el mensaje debe ser el número de región (1-8).
      const index = Number(body) - 1;
      const region = Number.isInteger(index) ? REGIONS[index] : undefined;
      if (!region) {
        return { session, reply: 'Opción inválida.\n' + buildRegionMenu(), readyToSubmit: false };
      }
      return {
        session: { ...session, pendingRegion: region },
        reply: buildCombinedMenu(region),
        readyToSubmit: false,
      };
    }
    case STEPS.TITLE: {
      if (!body) {
        return { session, reply: 'Por favor escribe un título breve del problema.', readyToSubmit: false };
      }
      return {
        session: { ...session, step: STEPS.DESCRIPTION, title: body },
        reply: '¿Tienes una foto del problema? Envíala, o escribe LISTO para continuar sin foto.',
        readyToSubmit: false,
      };
    }
    case STEPS.DESCRIPTION: {
      if (!body && !message.mediaUrl) {
        return {
          session,
          reply: 'Envía una foto o escribe LISTO para continuar.',
          readyToSubmit: false,
        };
      }
      const stInfo = config.stCatalog[session.st];
      const description = session.title;
      const mediaUrl = message.mediaUrl || null;
      const next = { ...session, step: STEPS.CONFIRM, description, mediaUrl };
      const summary =
        'Resumen del ticket:\n' +
        `Categoría: ${session.st} - ${stInfo.name}\n` +
        `Dirección: ${session.locationName}\n` +
        `Título: ${session.title}\n` +
        `Foto adjunta: ${mediaUrl ? 'Sí' : 'No'}\n\n` +
        '¿Confirmas? Responde SI o NO.';
      return { session: next, reply: summary, readyToSubmit: false };
    }
    case STEPS.CONFIRM: {
      if (keyword === 'SI') {
        return { session, reply: null, readyToSubmit: true };
      }
      if (keyword === 'NO') {
        return {
          session: createInitialSession(session.phone, session.displayPhone),
          reply: 'Ticket descartado.\n\n' + MENU_TEXT,
          readyToSubmit: false,
        };
      }
      return { session, reply: 'Responde SI para confirmar o NO para descartar.', readyToSubmit: false };
    }
    default:
      return { session: createInitialSession(session.phone, session.displayPhone), reply: MENU_TEXT, readyToSubmit: false };
  }
}

module.exports = { STEPS, MENU_TEXT, createInitialSession, processMessage, normalizeKeyword };
