// src/config.js llama a dotenv.config(), que lee el .env real del desarrollador.
// Los tests asumen modo mock (sin GLPI ni WhatsApp reales), asi que estas variables
// se limpian antes de que cualquier modulo de test se cargue.
//
// Ojo: borrarlas no basta — dotenv rellena cualquier clave que NO exista en
// process.env, asi que un .env real las volveria a poner. En cambio dotenv nunca
// pisa una clave que ya existe, aunque valga cadena vacia. Por eso se borran y
// acto seguido se fijan a '': asi quedan neutralizadas pase lo que pase.
const MOCK_MODE_VARS = [
  'GLPI_API_URL',
  'GLPI_APP_TOKEN',
  'GLPI_USER_TOKEN',
  'WHATSAPP_WEB_ENABLED',
  'VERIFICATION_ENABLED',
  'RECLUTAMIENTO_API_URL',
];

MOCK_MODE_VARS.forEach((name) => {
  delete process.env[name];
  process.env[name] = '';
});
