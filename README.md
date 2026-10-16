# Chatbot WhatsApp -> GLPI


## Instalacion

```bash
npm install
cp .env.example .env
``

## Levantar el servidor

```bash
npm start
```

El servidor sirve en `http://localhost:3000` (o el puerto de `PORT`) la ruta
`GET /health` (chequeo de salud), mas las rutas de WhatsApp Cloud API (`GET
/webhook/whatsapp` para la verificacion del webhook, `POST /webhook/whatsapp`
para mensajes entrantes). Si `WHATSAPP_WEB_ENABLED=true`, al arrancar el
proceso tambien conecta el canal de WhatsApp Web (sin necesidad de URL
publica ni tunel para ese canal).

## Probar con WhatsApp Web (sin registro de negocio, sin pagar)

**Advertencia:** este canal usa el protocolo no oficial de WhatsApp Web
(libreria Baileys), no la API de negocios de Meta. Viola los Terminos de
Servicio de WhatsApp y hay riesgo real de que el numero que uses quede
baneado. Usalo solo para pruebas y, si podes, con un numero secundario, no tu
WhatsApp personal principal.

1. En `.env`, poné `WHATSAPP_WEB_ENABLED=true`.
2. Corre `npm start` (o `node src\server.js` si `npm` falla por la politica
   de ejecucion de PowerShell). Va a aparecer un codigo QR en la consola.
3. En tu telefono: WhatsApp > Dispositivos vinculados > Vincular un
   dispositivo, y escaneá el QR.
4. Una vez conectado (`WhatsApp Web conectado.` en la consola), mandale un
   mensaje de WhatsApp desde **otro** numero al numero que vinculaste para
   iniciar la conversacion con el bot.

La sesion vinculada queda guardada en `WHATSAPP_WEB_AUTH_DIR` (por defecto
`.whatsapp-web-auth/`, ya excluida en `.gitignore`) — no hace falta volver a
escanear el QR en los proximos arranques, salvo que desvincules el
dispositivo desde el telefono.

### Aviso al equipo por WhatsApp cuando se crea un ticket

Si configurás `WHATSAPP_WEB_TEAM_GROUP_JID`, cada ticket creado (sin importar
por qué canal entró) manda ademas un resumen a ese grupo de WhatsApp. Al
conectar, la consola lista los grupos de los que el numero vinculado ya es
miembro junto con su JID — copiá el que corresponda al grupo del equipo.

## Configurar el webhook de WhatsApp

Necesitas una app en [Meta for Developers](https://developers.facebook.com/)
con el producto **WhatsApp** ya agregado (numero de prueba o numero real, no
se documenta ese paso aca).

1. **Exponer el servidor local**: mientras desarrollas, usa un tunel como
   [ngrok](https://ngrok.com/) para conseguir una URL HTTPS publica:
   ```bash
   ngrok http 3000
   ```
   Copia la URL `https://...ngrok...` que te da.
2. **Completar `.env`** con los datos de tu app (Meta for Developers > tu app
   > WhatsApp > Configuracion de la API, y Configuracion basica de la app):
   - `WHATSAPP_ACCESS_TOKEN`: el token de acceso
   - `WHATSAPP_PHONE_NUMBER_ID`: el Phone Number ID del numero
   - `WHATSAPP_VERIFY_TOKEN`: inventa un string cualquiera (lo vas a repetir en el paso 4)
   - `WHATSAPP_APP_SECRET`: el App Secret de la app (para validar la firma de los webhooks)
3. Corre `npm start`.
4. En el panel de Meta for Developers, en la configuracion del webhook de
   WhatsApp, pone como **Callback URL** `<tu-url-de-ngrok>/webhook/whatsapp`
   y como **Verify Token** el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN`.
   Suscribite al campo `messages`.
5. Mandale un mensaje de WhatsApp al numero de la app para iniciar la
   conversacion con el bot.

## Conectar GLPI (cuando tengas la API)

Pidele a tu administrador de GLPI estos datos y ponlos en `.env`:

- `GLPI_API_URL`: URL base de la API REST, ej. `https://glpi.tuempresa.com/apirest.php`
- `GLPI_APP_TOKEN`: Configuracion > General > API > "App Token" (se crea ahi)
- `GLPI_USER_TOKEN`: Perfil del usuario tecnico (una cuenta de servicio, ej.
  `bot-whatsapp`) > "Tokens de acceso remoto" > Token API
- `GLPI_ENTITY_ID`: ID de la entidad/empresa en GLPI (0 si solo hay una)
- `GLPI_CAT_ST1`, `GLPI_CAT_ST2`, `GLPI_CAT_ST3`: IDs de las categorias ITIL
  "Atencion remota", "En sitio" y "Reparacion de equipo de taller"
  (Configuracion > Categorias ITIL en GLPI)
- `GLPI_LOCATIONS`: lista `nombre visible:ID` separada por comas, una por
  cada sede/sucursal que debe aparecer en el menu del bot

No hace falta tocar el codigo: en cuanto `GLPI_API_URL` deje de estar vacio,
el bot empieza a crear tickets reales en vez de simulados.

## Tests

```bash
npm test
```
