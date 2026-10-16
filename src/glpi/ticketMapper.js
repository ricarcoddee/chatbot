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
const URGENCY_MEDIUM = 3;
const PRIORITY_MEDIUM = 3;

function findLocationId(locations, locationName) {
  const match = locations.find((loc) => loc.name === locationName);
  return match ? match.id : null;
}

function mapToGlpiPayload(session, config) {
  const categoryId = config.glpi.categoryIds[session.st];
  const locationId = findLocationId(config.locations, session.locationName);
  const verifiedSuffix = session.verifiedEmail
    ? session.verifiedName
      ? ` · Cuenta verificada: ${`${session.verifiedName} ${session.verifiedLastName || ''}`.trimEnd()} (${session.verifiedEmail})`
      : ` · Cuenta verificada: ${session.verifiedEmail}`
    : '';

  return {
    name: `${session.st} - ${session.name} - ${session.title}`,
    content:
      `${session.description}\n\n` +
      `Origen: WhatsApp · Solicitante: ${session.name} · WhatsApp ID: ${session.phone}${verifiedSuffix}`,
    itilcategories_id: categoryId ? Number(categoryId) : undefined,
    urgency: URGENCY_MEDIUM,
    priority: PRIORITY_MEDIUM,
    locations_id: locationId,
    entities_id: config.glpi.entityId,
  };
}

module.exports = { mapToGlpiPayload, findLocationId };
