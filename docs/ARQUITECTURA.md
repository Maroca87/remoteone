# RemoteOne - Documento de Arquitectura de Software

## 1. Visión General del Sistema

**RemoteOne** es una aplicación Web Progresiva (PWA) móvil diseñada para controlar dispositivos de televisión en la red local Wi-Fi.

El principio rector del sistema es la **fidelidad técnica y honestidad funcional**:
* No se inventan endpoints ni capacidades.
* No se simula éxito cuando un comando no puede ser verificado.
* Se manejan transparentemente las restricciones de seguridad del navegador (CORS, Private Network Access, Contenido Mixto).
* Se provee una arquitectura modular de controladores independientes por fabricante.

---

## 2. Diagrama de Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE INTERFAZ (UI)                        │
│   HomeView  │  RemoteView  │  DeviceSetupView  │  FavoritesView │
│   SettingsView   │  DiagnosticView   │  CompatibilityView       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│                     CAPA CENTRAL (CORE)                         │
│   DeviceManager      : Registro de dispositivos y drivers       │
│   ConnectionManager  : Modos Directo / Bridge y Health Check    │
│   CommandManager     : Despacho de comandos y macros            │
│   DiscoveryManager   : Coordinación de descubrimiento SSDP/mDNS │
│   StorageManager     : Persistencia local (localStorage)        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│               CAPA DE FABRICANTES (DRIVERS)                     │
│   RokuDriver    │   RokuCommands    │   RokuDiscovery           │
│   XiaomiDriver  │   XiaomiCommands  │   XiaomiDiscovery         │
│   (Futuros: SamsungDriver, LGDriver, SonyDriver)                │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        [Modo A: Directo]               [Modo B: Bridge]
                 │                               │
         Fetch desde PWA           Microservicio Local
        (no-cors / opaque)          (Node.js / Python)
                 │                   UDP Multicast SSDP
                 │                   HTTP Proxy + CORS
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                   Red Local Wi-Fi (LAN)
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
           Roku TV / Stick                  Xiaomi TV
             (Port 8060)                  (Port 6466/6467)
```

---

## 3. Capa de Controladores (Drivers)

Cada fabricante cuenta con una implementación desacoplada:

### 3.1 RokuDriver
* **Protocolo:** Roku External Control Protocol (ECP) sobre HTTP puerto `8060`.
* **Endpoints Oficiales:**
  * `POST /keypress/<key>`: Envío de pulsaciones de botones remotos.
  * `POST /keydown/<key>` y `POST /keyup/<key>`: Control sostenido.
  * `POST /keypress/Lit_<char>`: Envío de caracteres tipográficos para búsqueda de texto.
  * `POST /launch/<appId>`: Lanzamiento de canales (ej. Netflix: 12, YouTube: 837).
  * `GET /query/device-info`: Consulta de modelo, software, y si es televisor (`is-tv="true"`).
  * `GET /query/apps`: Consulta de canales instalados en el dispositivo.
  * `GET /query/active-app`: Canal actualmente en ejecución.
* **Manejo de Variantes:**
  * Si `is-tv="false"` (Roku Streaming Stick), los controles de volumen (`VolumeUp`, `VolumeDown`, `VolumeMute`), sintonizador (`ChannelUp`, `ChannelDown`) y entradas (`InputHDMI1..4`) se ocultan o desactivan adaptativamente.

### 3.2 XiaomiDriver
* **Estado:** Pendiente de validación por modelo.
* **Protocolo:** Android TV Remote Control Protocol v2.
  * Utiliza canales seguros TLS con certificados mutuos (mTLS) en puertos TCP `6466` (emparejamiento) y `6467` (control) con codificación Protocol Buffers (Protobuf).
* **Restricción Técnica:** Ningún navegador web permite abrir sockets TCP crudos con mTLS hacia la red local. Por tanto, el control Xiaomi exige el Local Bridge para gestionar la sesión mTLS.
* **Regla:** Se reporta honestamente `No compatible / Requiere mecanismo adicional`.

---

## 4. Análisis de Restricciones del Navegador (CORS, PNA, Mixed Content)

### 4.1 Modo A: Conexión Directa (PWA)
1. **Peticiones `POST /keypress/...`:**
   * La PWA utiliza `fetch(..., { method: 'POST', mode: 'no-cors' })`.
   * El navegador despacha la petición HTTP a la red local.
   * La respuesta es tratada como *opaca* (`status: 0`), lo que significa que el comando llega al televisor, pero el script no puede leer el cuerpo de respuesta HTTP.
2. **Peticiones `GET /query/device-info`:**
   * Al requerir leer el contenido XML, una petición directa sin cabeceras `Access-Control-Allow-Origin` en el Roku genera un bloqueo CORS en el navegador.
3. **Descubrimiento SSDP:**
   * Los navegadores carecen de sockets UDP crudos para emitir `M-SEARCH *` a `239.255.255.250:1900`.

### 4.2 Modo B: Local Bridge
El Local Bridge (/bridge) resuelve estas limitaciones al ejecutarse en el entorno del sistema operativo (Node.js o Python):
* Dispone de sockets UDP multicast para realizar SSDP oficial instantáneo.
* Realiza peticiones HTTP estándar al Roku y devuelve los datos con cabeceras CORS habilitadas.
* Permite lectura bidireccional completa del XML de `device-info` y `query/apps`.

---

## 5. Máquina de Estados de Conexión

Cada dispositivo transita por estados formales:
1. `Conectado`: Verificado mediante respuesta 200 OK o lectura de device-info.
2. `Desconectado`: El TV no responde en el timeout o no se encuentra en la IP.
3. `Intentando conectar`: Petición de comprobación en curso.
4. `No compatible`: El TV devolvió HTTP 403 (Control por apps móviles deshabilitado) o el modelo no admite el protocolo.
5. `Bloqueado por navegador`: Restricción de CORS, Contenido Mixto (HTTPS) o Private Network Access detectada.
6. `Error de comunicación`: Formato de IP inválido o fallo general de red.

---

## 6. Persistencia y Privacidad

* **Almacenamiento Local:** Todos los datos residen en `localStorage` del navegador.
* **Cero Telemetría Externa:** Ninguna IP, comando o nombre de TV se envía jamás a servidores en Internet.
* **Aislamiento de Red:** El bridge solo acepta conexiones dirigidas a subredes privadas RFC 1918 (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`, `127.0.0.1`).
