# Guía de Configuración de Televisores Roku

Esta guía explica cómo preparar tu televisor o reproductor Roku para ser controlado por **RemoteOne** mediante la red local Wi-Fi.

---

## 1. Requisito de Red Wi-Fi Local

Tanto tu teléfono móvil como tu televisor Roku deben estar conectados a la **misma red Wi-Fi**.

* **Evita redes de invitados (Guest Wi-Fi):** La mayoría de routers aíslan los dispositivos en redes de invitados para que no puedan comunicarse entre sí.
* **Aislamiento de AP (AP Isolation):** En la configuración de tu router, asegúrate de que la opción "AP Isolation" o "Client Isolation" esté **desactivada**.

---

## 2. Cómo Consultar la Dirección IP de tu Roku

Para agregar manualmente tu Roku o verificar su dirección:

1. Enciende tu televisor Roku con el control físico.
2. Ve a: **Configuración** (`Settings`).
3. Selecciona: **Red** (`Network`).
4. Selecciona: **Acerca de** (`About`).
5. En la columna derecha verás la **Dirección IP** (ejemplo: `192.168.1.50`).

---

## 3. Configuración Obligatoria: "Control por Aplicaciones Móviles"

En versiones recientes de Roku OS (Roku OS 9.x, 10.x, 11.x, 12.x, 13.x), Roku requiere que el usuario autorice explícitamente el control externo por red local.

Si esta opción está desactivada, el Roku responderá con un error **HTTP 403 Forbidden** a cualquier comando.

### Pasos para Activar el Control Seguro:

1. Ve a **Configuración** (`Settings`).
2. Selecciona **Sistema** (`System`).
3. Selecciona **Configuración avanzada del sistema** (`Advanced system settings`).
4. Selecciona **Control por aplicaciones móviles** (`Control by mobile apps`).
5. Selecciona **Acceso de red** (`Network access`).
6. Elige la opción segura recomendada:
   * **Predeterminado (`Default`)** o **Permitido (`Permitted`)**.

> **Nota de Seguridad Importante:**
> NO recomendamos seleccionar la opción `Permissive`. La opción `Default` o `Permitted` otorga los permisos necesarios para controlar el dispositivo dentro de la misma subred Wi-Fi de forma segura y controlada.

---

## 4. Detección de Capacidades del Dispositivo (Roku TV vs Stick)

Roku fabrica dos tipos de dispositivos principales:

| Característica | Roku TV (TCL, Hisense, Philips, Onn) | Roku Streaming Stick / Express |
|---|---|---|
| Control de Volumen (`VolumeUp`, `VolumeDown`) | **Soportado** | No soportado (control vía CEC/IR físico) |
| Silencio (`VolumeMute`) | **Soportado** | No soportado |
| Encendido / Apagado (`PowerOff`, `PowerOn`) | **Soportado** | Modo reposo únicamente |
| Sintonizador de Canales (`ChannelUp/Down`) | **Soportado** (con antena conectada) | No disponible |
| Entradas HDMI (`InputHDMI1..4`) | **Soportado** | No disponible |
| Navegación (Home, D-Pad, OK, Back) | **Soportado** | **Soportado** |
| Lanzamiento de Canales (Netflix, YouTube) | **Soportado** | **Soportado** |
| Transmisión de Texto (Búsqueda) | **Soportado** | **Soportado** |

RemoteOne lee automáticamente el parámetro XML `<is-tv>` de tu Roku para adaptar los botones visibles y no mostrar funciones que el hardware no posea.
