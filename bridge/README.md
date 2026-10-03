# RemoteOne - Local Network Bridge

El **Local Bridge** es un microservicio local diseñado para ejecutarse en tu computadora o Raspberry Pi dentro de la **misma red Wi-Fi** que tus televisores y tu teléfono móvil.

---

## ¿Por qué es necesario el Local Bridge?

Los navegadores web modernos (Chrome, Safari, Edge) imponen restricciones de seguridad a las aplicaciones web y PWAs:

1. **CORS (Cross-Origin Resource Sharing):** Roku ECP (puerto 8060) no emite cabeceras `Access-Control-Allow-Origin: *`. Las peticiones estándar son bloqueadas por el navegador.
2. **Private Network Access (PNA):** Los navegadores bloquean o restringen peticiones desde orígenes externos hacia IPs privadas (`192.168.x.x`).
3. **Contenido Mixto (Mixed Content):** Si la PWA se sirve por HTTPS, los navegadores prohíben llamadas HTTP no seguras a `http://192.168.x.x:8060`.
4. **Descubrimiento SSDP (UDP Multicast):** Los navegadores web carecen de APIs de sockets UDP crudos, impidiendo emitir paquetes multicast `239.255.255.250:1900` de forma nativa.

El Bridge soluciona esto actuando como un intermediario local transparente:
```
Teléfono (PWA)  ──[HTTP/CORS habilitado]──>  Local Bridge  ──[HTTP/UDP LAN]──>  Roku TV / Xiaomi TV
```

---

## Cómo ejecutar el Bridge

Tienes **dos opciones** según lo que tengas instalado:

### Opción 1: Con Python (¡Listo para usar sin instalar nada extra!)

Si tienes Python instalado:
```powershell
cd C:\Users\Marcos\.gemini\antigravity-ide\scratch\RemoteOne\bridge
python bridge.py
```

El servidor iniciará en el puerto 3000 y mostrará:
```
====================================================
  RemoteOne Local Bridge activo en el puerto 3000
  URL local:   http://localhost:3000
  Para móvil:  http://<IP-DE-ESTE-PC>:3000
====================================================
```

### Opción 2: Con Node.js

Si tienes Node.js:
```powershell
cd C:\Users\Marcos\.gemini\antigravity-ide\scratch\RemoteOne\bridge
npm start
```
(O directamente: `node server.js`).

---

## Cómo abrir la PWA en tu teléfono a través del Bridge

1. Averigua la IP local de tu computadora ejecutando `ipconfig` (ejemplo: `192.168.1.45`).
2. Con tu teléfono conectado a la **misma red Wi-Fi**, abre Chrome en tu teléfono y visita:
   ```
   http://192.168.1.45:3000
   ```
3. ¡Listo! La PWA se cargará directamente servida por el bridge, con acceso completo al descubrimiento SSDP y control instantáneo sin bloqueos de navegador.
4. En el menú de Chrome de tu teléfono, selecciona **"Agregar a pantalla principal"** para instalar la PWA como una app nativa.

---

## Seguridad Garantizada

* **100% Local:** El bridge **NUNCA** envía datos ni comandos hacia Internet.
* **Filtro de IPs Privadas:** Solo acepta comunicarse con rangos privados locales (`192.168.x.x`, `10.x.x.x`, `127.0.0.1`, `172.16-31.x.x`). Cualquier intento de conexión a IPs públicas es rechazado.
* **No expone puertos al router:** No requiere ni debe abrir puertos WAN/NAT.
* **Sin almacenamiento de contraseñas:** No guarda credenciales de tu red ni de cuentas de streaming.

---

## Endpoints de la API REST Local

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/status` | Verifica que el bridge esté activo. |
| `GET` | `/api/discover` | Ejecuta búsqueda UDP SSDP M-SEARCH real y devuelve TVs Roku. |
| `GET` | `/api/proxy/roku/device-info?ip=...` | Lee y parsea `/query/device-info` del Roku. |
| `GET` | `/api/proxy/roku/apps?ip=...` | Lee los canales/apps instalados en el Roku. |
| `POST` | `/api/proxy/roku/command` | Envía `keypress`, `keydown`, `keyup` o `launch`. |
