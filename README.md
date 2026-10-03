# ⚡ RemoteOne — Universal TV Remote PWA

**RemoteOne** es una aplicación Web Progresiva (PWA) móvil diseñada para convertir tu teléfono en un control remoto táctil y moderno para televisores conectados a la misma red Wi-Fi local.

El desarrollo sigue una regla inquebrantable de **fidelidad técnica y honestidad**:
* No se inventan endpoints, protocolos ni capacidades ficticias.
* No se simula éxito cuando un comando no puede ser verificado.
* Si el navegador bloquea la comunicación por CORS o restricciones de red privada, se explica con total transparencia y se resuelve mediante un **Bridge Local** opcional y ligero.

---

## 📱 Dispositivos Soportados

| Dispositivo / Fabricante | Protocolo Real | Estado Actual | Notas |
|---|---|:---:|---|
| **Roku TV** (TCL, Hisense, etc.) | Roku ECP (HTTP 8060) | **🟢 Soportado al 100% (Prioridad 1)** | D-Pad, OK, Home, Back, Volumen, Mute, Canales, Power, HDMI, Apps, Texto. |
| **Roku Streaming Stick / Player** | Roku ECP (HTTP 8060) | **🟢 Soportado** | Controles adaptativos (se ocultan volumen y sintonizador no disponibles en sticks). |
| **Xiaomi TV** (Android TV / Google TV) | Android TV Remote Protocol v2 | **🟡 Arquitectura Lista (Prioridad 2)** | Requiere emparejamiento PIN y canales mTLS en puerto 6466/6467. No se simula funcionalidad ficticia. |
| **Samsung Smart TV** | Tizen WebSocket (8002) | ⚪ Planificado Fase 2 | Requiere token pairing en pantalla. |
| **LG Smart TV** | webOS WebSocket (3000) | ⚪ Planificado Fase 2 | Requiere Client Key. |
| **Sony Bravia** | IRCC-IP REST API | ⚪ Planificado Fase 2 | Compatible con Pre-Shared Key (PSK). |

---

## 🚀 Inicio Rápido

### Opción Recomendada: Ejecutar con el Local Bridge (Zero-Dependency)

Tu computadora actúa como servidor del Bridge local y sirve la PWA directamente a tu teléfono móvil:

1. **Abre PowerShell en tu computadora:**
   ```powershell
   cd C:\Users\Marcos\.gemini\antigravity-ide\scratch\RemoteOne\bridge
   python bridge.py
   ```
   *(También puedes usar Node.js ejecutando `npm start` si tienes Node instalado).*

2. **La terminal mostrará tu dirección de acceso:**
   ```
   ====================================================
     RemoteOne Local Bridge activo en el puerto 3000
     URL local:   http://localhost:3000
     Para móvil:  http://192.168.1.45:3000
   ====================================================
   ```

3. **Abre la PWA en tu teléfono:**
   * Conecta tu teléfono a la **misma red Wi-Fi**.
   * Abre **Chrome** (o Safari en iPhone) y escribe la dirección de tu PC (ejemplo: `http://192.168.1.45:3000`).
   * Toca **"⬇ Instalar"** o en el menú del navegador selecciona **"Agregar a pantalla principal"**.

---

## 📺 Configuración de tu Roku

### 1. Activar "Control por aplicaciones móviles" (Imprescindible)
En versiones recientes de Roku OS debes autorizar el control externo por red local; de lo contrario, el televisor responderá con **HTTP 403 Forbidden**:

1. En tu Roku ve a: **Configuración** (`Settings`).
2. Entra a: **Sistema** (`System`) ➔ **Configuración avanzada del sistema** (`Advanced system settings`).
3. Selecciona: **Control por aplicaciones móviles** (`Control by mobile apps`).
4. Selecciona: **Acceso de red** (`Network access`).
5. Elige la opción segura: **Predeterminado (`Default`)** o **Permitido (`Permitted`)**.
   *(No es necesario seleccionar "Permissive").*

### 2. Consultar la IP de tu Roku
1. En tu Roku ve a: **Configuración** ➔ **Red** ➔ **Acerca de**.
2. Anota la **Dirección IP** (ejemplo: `192.168.1.50`).

---

## 🛠️ Cómo Agregar y Probar tu Televisor

1. En la pantalla de inicio de RemoteOne, pulsa **"+ AGREGAR TV"**.
2. **Paso 1:** Selecciona **Roku**.
3. **Paso 2:** Selecciona **IP Manual** (o *Buscar con Bridge* para descubrimiento SSDP automático).
4. **Paso 3 y 4:** Asigna el nombre (ej. `Roku Habitación`) y la habitación (`Habitación`).
5. **Paso 5 — Herramienta "Probar Conexión":**
   * Presiona **"⚡ Ejecutar Prueba de Conexión"**.
   * La app verificará de forma independiente:
     * ✓ Resolución de IP.
     * ✓ Puerto 8060 accesible.
     * ✓ Lectura de modelo y datos del televisor (`/query/device-info`).
     * ✓ Envío del comando de prueba (`Home`).
6. **Paso 6:** Guarda el televisor y ¡listo! Se abrirá el control remoto físico adaptado.

---

## 🌐 Limitaciones de una PWA y Cuándo Usar el Local Bridge

### ¿Por qué existe el Local Bridge?
Los navegadores web imponen políticas de seguridad para proteger al usuario:
1. **CORS:** Roku ECP no emite cabeceras `Access-Control-Allow-Origin: *`. En modo directo puro, el navegador impide leer los datos XML del televisor.
2. **Contenido Mixto (Mixed Content):** Si una PWA se carga desde HTTPS, el navegador bloquea las llamadas HTTP locales hacia `http://192.168.x.x:8060`.
3. **Falta de sockets UDP:** Los navegadores no pueden emitir paquetes multicast UDP crudos (`239.255.255.250:1900`), por lo que el descubrimiento oficial SSDP requiere un intermediario local.

### Dos Modos de Comunicación:
* **Modo A (Directo):** La PWA envía llamadas opacas directas desde el teléfono. Si el navegador lo permite, el comando llega al televisor sin servidores intermedios.
* **Modo B (Local Bridge):** Un microservicio ligero en tu PC o Raspberry Pi que elimina al 100% los bloqueos de CORS, permite descubrimiento SSDP oficial y lectura completa de canales y estado.

RemoteOne muestra en todo momento una etiqueta visible con el modo en uso:
`Conexión directa` o `Bridge local`.

---

## 🧪 Modo Demostración (Demo)

Si quieres explorar la interfaz táctil sin encender tu televisor:
1. Ve a **⚙ Ajustes**.
2. Activa **"Modo Demostración"**.
3. Aparecerá un banner ámbar superior advirtiendo que los comandos son simulados. Podrás probar animaciones, D-Pad, selección de canales y macros.

---

## 🧩 Cómo Agregar Soporte para un Nuevo Fabricante

Gracias a la arquitectura desacoplada por controladores, añadir una nueva marca (ej. Samsung, LG, Sony) no requiere reescribir la aplicación:

1. Crea la carpeta en `src/devices/<marca>/`.
2. Define los comandos reales en `<Marca>Commands.js`.
3. Implementa el controlador en `<Marca>Driver.js` heredando la interfaz:
   * `connect()`, `getStatus()`, `getDeviceInfo()`, `sendKeypress()`, `testConnection()`.
4. Registra el controlador en `src/core/DeviceManager.js` dentro del método `createDriver()`.
5. Si el protocolo requiere sockets TCP crudos o mTLS (como Android TV), añade el proxy en `bridge/server.js` y `bridge/bridge.py`.

---

## 📁 Estructura del Proyecto

```
RemoteOne/
├── index.html                   # Shell principal de la PWA (Mobile-first, Dark theme)
├── manifest.json                # Web App Manifest para instalación en móvil
├── sw.js                        # Service Worker para funcionamiento offline
├── app.js                       # Controlador principal y enrutador SPA
├── css/
│   └── style.css                # Diseño táctil moderno, D-Pad ergonómico y animaciones
├── assets/
│   └── icons/icon.svg           # Ícono vectorial de la aplicación
├── src/
│   ├── core/                    # Núcleo del sistema
│   │   ├── DeviceManager.js     # Ciclo de vida y drivers activos
│   │   ├── ConnectionManager.js # Gestión Directo vs Bridge y comprobación de salud
│   │   ├── CommandManager.js    # Despachador de comandos y secuencias de macros
│   │   ├── StorageManager.js    # Persistencia local (localStorage)
│   │   └── DiscoveryManager.js  # Coordinador de búsqueda SSDP/mDNS
│   ├── devices/                 # Controladores desacoplados por fabricante
│   │   ├── roku/
│   │   │   ├── RokuDriver.js    # Implementación real ECP (puerto 8060)
│   │   │   ├── RokuDiscovery.js # Descubrimiento SSDP oficial
│   │   │   └── RokuCommands.js  # Especificación de comandos oficiales
│   │   └── xiaomi/
│   │       ├── XiaomiDriver.js  # Controlador Android TV (regla honesta sin fakes)
│   │       ├── XiaomiDiscovery.js
│   │       └── XiaomiCommands.js
│   ├── ui/                      # Vistas de la aplicación
│   │   ├── HomeView.js          # Mis televisores, estado y accesos directos
│   │   ├── RemoteView.js        # Mando a distancia táctil adaptativo
│   │   ├── DeviceSetupView.js   # Asistente de 6 pasos y prueba de 4 puntos
│   │   ├── FavoritesView.js     # Accesos rápidos, canales y macros
│   │   ├── SettingsView.js      # Ajustes de red, guía Roku y modo demo
│   │   ├── DiagnosticView.js    # Resumen técnico y log en vivo
│   │   └── CompatibilityView.js # Matriz de compatibilidad por fabricante
│   └── utils/
│       ├── Logger.js            # Registro estructurado y exportación a portapapeles
│       ├── ErrorHandler.js      # Traducción de bloqueos de navegador a mensajes claros
│       └── NetworkUtils.js      # Validador IPv4, timeouts, haptics y parser XML
├── bridge/                      # Microservicio local Wi-Fi
│   ├── package.json             # Manifiesto Node.js
│   ├── server.js                # Servidor Node.js (SSDP UDP multicast + HTTP relay)
│   ├── bridge.py                # Servidor Python 3 (cero dependencias externas)
│   └── README.md                # Documentación del Local Bridge
├── docs/                        # Documentación técnica exhaustiva
│   ├── ARQUITECTURA.md          # Especificación de capas y diseño técnico
│   ├── ROKU_CONFIG.md           # Guía de configuración en televisores Roku
│   ├── PROBAR_APP.md            # Guía paso a paso para validar el MVP
│   ├── DIAGNOSTICO.md           # Interpretación de logs y solución de fallos
│   ├── COMANDOS_ROKU.md         # Matriz de comandos implementados vs pendientes
│   └── COMPATIBILIDAD.md        # Análisis de protocolos y restricciones por marca
├── tests/                       # Suite de pruebas automatizadas
│   ├── index.html               # Ejecutor de pruebas unitarias en navegador
│   ├── test_runner.js           # Pruebas de almacenamiento, drivers y errores
│   └── test_bridge_and_structure.py # Validador CLI de estructura y API
└── config.example.json          # Ejemplo de configuración y almacenamiento
```

---

## 🔒 Seguridad y Privacidad

1. **Local al 100%:** RemoteOne **NUNCA** envía datos, comandos ni nombres de televisores a servidores externos en Internet.
2. **Sin apertura de puertos:** No requiere ni debe abrir puertos WAN/NAT en el router.
3. **Filtro estricto de red privada:** El bridge rechaza cualquier petición dirigida a direcciones IP públicas de Internet.
4. **Sin contraseñas:** No solicita ni almacena contraseñas de tu Wi-Fi ni de cuentas de streaming.
