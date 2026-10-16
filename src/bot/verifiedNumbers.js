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
const fs = require('fs');
const config = require('../config');

function loadStore() {
  try {
    const raw = fs.readFileSync(config.verification.storageFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(
        `No se pudo leer ${config.verification.storageFile}, se arranca sin numeros verificados:`,
        err
      );
    }
    return {};
  }
}

let store = loadStore();

function isVerified(phone) {
  return Boolean(store[phone]);
}

function getVerifiedInfo(phone) {
  if (!store[phone]) return null;
  const { email, name, lastName } = store[phone];
  return { email, name, lastName };
}

function markVerified(phone, { email, name, lastName }) {
  store[phone] = { email, name, lastName, verifiedAt: new Date().toISOString() };
  try {
    fs.writeFileSync(config.verification.storageFile, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error(`No se pudo persistir ${config.verification.storageFile}:`, err);
  }
}

module.exports = { isVerified, getVerifiedInfo, markVerified };
