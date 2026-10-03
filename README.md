# RemoteOne — Control Preciso Universal

**RemoteOne** es una aplicación Web Progresiva (PWA) móvil diseñada para convertir tu teléfono (iPhone / Android) en un control remoto digital táctil y minimalista para televisores conectados a la misma red Wi-Fi local.

El desarrollo sigue una regla inquebrantable de **fidelidad técnica y honestidad**:
* No se inventan endpoints, protocolos ni capacidades ficticias.
* No se simula éxito cuando un comando no puede ser verificado.
* Diseñada para operar directamente desde el teléfono sin depender de una PC.
* El **Bridge Local** es estrictamente opcional.

---

## Dispositivos Soportados

| Dispositivo / Fabricante | Protocolo Real | Estado Actual | Capacidades |
|---|---|:---:|---|
| **Roku TV** (TCL, Hisense, etc.) | Roku ECP (HTTP 8060) | **Soportado (Prioridad 1)** | D-Pad, OK, Home, Back, Volumen, Mute, Canales, Power, HDMI, Apps, Texto. |
| **Roku Streaming Stick / Player** | Roku ECP (HTTP 8060) | **Soportado** | Controles adaptativos (se ocultan volumen y sintonizador en modelos stick). |
| **Xiaomi TV** (Android TV / Google TV) | Android TV Remote v2 | **Validación pendiente (Prioridad 2)** | Requiere emparejamiento PIN y canales mTLS en TCP 6466/6467. Sin endpoints inventados. |
| **Samsung Smart TV** | Tizen WebSocket (8002) | Planificado Fase 2 | Requiere token pairing en pantalla. |
| **LG Smart TV** | webOS WebSocket (3000) | Planificado Fase 2 | Requiere Client Key. |
| **Sony Bravia** | IRCC-IP REST API | Planificado Fase 2 | Compatible con Pre-Shared Key (PSK). |

---

## Arquitectura de Comunicación: Teléfono Primero

### 1. Conexión Directa PWA (Predeterminada)

```
┌──────────────┐         Wi-Fi Local         ┌──────────────┐
│    iPhone    │ ──────────────────────────► │   Roku TV    │
│  RemoteOne   │    HTTP 8060 (Roku ECP)     │ 192.168.1.X  │
└──────────────┘                             └──────────────┘
```

* **Sin intermediarios:** La PWA envía peticiones directas desde el navegador móvil al televisor en tu red Wi-Fi.
* **Sin PC obligatoria:** No necesitas tener encendida tu computadora para controlar tu televisor.
* **Sin `localhost`:** En un iPhone, `localhost` representa al propio teléfono. RemoteOne nunca asume `localhost:3000` como dirección predeterminada.

### 2. Local Bridge (Opcional)

Si deseas utilizar el Local Bridge para descubrimiento automático SSDP por UDP multicast o lectura detallada de metadatos XML:
* Configura la dirección IP real de la máquina en tu red local (ejemplo: `http://192.168.1.10:3000`).
* El modo Automático prioriza la conexión directa PWA y solo recurre al Bridge cuando esté configurado y disponible.

---

## Configuración de tu Roku

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

## Cómo Agregar y Probar tu Televisor

1. En la pantalla de inicio de RemoteOne, pulsa **"Escanear red Wi-Fi"** o **"Agregar dispositivo por IP"**.
2. Introduce la IP local de tu Roku (ej. `192.168.1.35`).
3. Asigna el nombre y habitación (ej. `Roku Habitación`).
4. La aplicación ejecuta una verificación técnica honesta:
   * Formato y validación IPv4.
   * Comunicación con puerto 8060.
   * Detección de modelo y capacidades.
   * Envío de comando de prueba (`Home`).
5. ¡Listo! Se abre el control remoto digital con D-Pad ergonómico y controles táctiles.

---

## Identidad Visual y Diseño

* **Estética de consola tecnológica:** Inspirada en dispositivos de precisión dedicados.
* **Cero emojis:** Todos los iconos pertenecen a la biblioteca profesional **Lucide Icons** (SVG vectoriales).
* **Tipografía moderna:** Familia tipográfica **Inter** con jerarquía equilibrada.
* **Ergonomía de una mano:** D-Pad central, accesos inmediatos a Back/Home y controles de volumen en zona accesible con el pulgar.
* **Diseño responsive para iPhone:** Soporte completo de safe-area-insets (`env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`).

---

## Estructura del Proyecto

```
RemoteOne/
├── index.html                   # Shell principal PWA (Mobile-first, Dark console theme)
├── manifest.json                # Web App Manifest para instalación en móvil
├── sw.js                        # Service Worker para caché y funcionamiento offline
├── app.js                       # Controlador principal y navegación
├── css/
│   └── style.css                # Sistema de diseño moderno, variables, D-Pad táctil
├── assets/
│   └── icons/icon.svg           # Emblema geométrico vectorial
├── src/
│   ├── core/                    # Gestores de persistencia, conexión y dispositivos
│   │   ├── StorageManager.js
│   │   ├── ConnectionManager.js
│   │   ├── DeviceManager.js
│   │   ├── CommandManager.js
│   │   └── DiscoveryManager.js
│   ├── devices/                 # Controladores por fabricante
│   │   ├── roku/
│   │   │   ├── RokuDriver.js
│   │   │   ├── RokuCommands.js
│   │   │   └── RokuDiscovery.js
│   │   └── xiaomi/
│   │       ├── XiaomiDriver.js
│   │       ├── XiaomiCommands.js
│   │       └── XiaomiDiscovery.js
│   ├── ui/                      # Vistas modulares e iconografía SVG
│   │   ├── Icons.js             # Biblioteca de iconos Lucide SVG (Cero emojis)
│   │   ├── HomeView.js
│   │   ├── RemoteView.js
│   │   ├── DeviceSetupView.js
│   │   ├── FavoritesView.js
│   │   ├── SettingsView.js
│   │   ├── DiagnosticView.js
│   │   └── CompatibilityView.js
│   └── utils/                   # Utilidades de red, error handling y logger
│       ├── NetworkUtils.js
│       ├── ErrorHandler.js
│       └── Logger.js
├── bridge/                      # Servidor opcional para PC / Mac / Raspberry Pi
│   ├── bridge.py                # Implementación en Python 3
│   └── server.js                # Implementación en Node.js
└── tests/                       # Suite de validación y pruebas unitarias
    ├── index.html
    ├── test_runner.js
    └── test_bridge_and_structure.py
```
