# Matriz de Comandos Roku ECP

Esta matriz detalla los comandos oficiales de Roku External Control Protocol (puerto 8060) implementados en el código de **RemoteOne**, distinguiendo entre comandos generales para todos los dispositivos y comandos exclusivos para Roku TV.

Conforme a la regla fundamental del proyecto: **Ningún comando se marca como "Probado" en producción hasta que se valide con un televisor real en la red local**. La aplicación actualiza dinámicamente el estado de prueba en `localStorage` a medida que envías comandos exitosos con tu TV real.

---

## 1. Comandos Generales (Roku TV y Streaming Sticks / Players)

| Comando ECP | Acción | Implementado en Driver | Estado de Prueba Inicial |
|---|---|:---:|:---:|
| `Home` | Regresa al menú principal de Roku | **Sí** | Pendiente de prueba con TV real |
| `Up` | Flecha direccional arriba | **Sí** | Pendiente de prueba con TV real |
| `Down` | Flecha direccional abajo | **Sí** | Pendiente de prueba con TV real |
| `Left` | Flecha direccional izquierda | **Sí** | Pendiente de prueba con TV real |
| `Right` | Flecha direccional derecha | **Sí** | Pendiente de prueba con TV real |
| `Select` | Botón central de confirmación / OK | **Sí** | Pendiente de prueba con TV real |
| `Back` | Botón de retroceso | **Sí** | Pendiente de prueba con TV real |
| `Rev` | Rebobinado de reproducción | **Sí** | Pendiente de prueba con TV real |
| `Fwd` | Avance rápido de reproducción | **Sí** | Pendiente de prueba con TV real |
| `Play` | Reproducir / Pausar | **Sí** | Pendiente de prueba con TV real |
| `InstantReplay` | Repetición instantánea (~7 segundos) | **Sí** | Pendiente de prueba con TV real |
| `Info` | Menú de opciones (Asterisco `*`) | **Sí** | Pendiente de prueba con TV real |
| `Search` | Abre la búsqueda global de Roku | **Sí** | Pendiente de prueba con TV real |
| `Backspace` | Borra un carácter en campos de texto | **Sí** | Pendiente de prueba con TV real |
| `Enter` | Confirmar entrada de teclado | **Sí** | Pendiente de prueba con TV real |
| `Lit_<char>` | Transmisión de carácter tipográfico | **Sí** | Pendiente de prueba con TV real |

---

## 2. Comandos Exclusivos para Roku TV (`is-tv="true"`)

Estos comandos requieren hardware de televisor integrado (ej. TCL, Hisense, Philips, Onn). En dispositivos Streaming Stick están deshabilitados adaptativamente.

| Comando ECP | Acción | Implementado en Driver | Estado de Prueba Inicial |
|---|---|:---:|:---:|
| `VolumeUp` | Aumenta el volumen | **Sí** | Pendiente de prueba con TV real |
| `VolumeDown` | Reduce el volumen | **Sí** | Pendiente de prueba con TV real |
| `VolumeMute` | Silencia o activa el sonido | **Sí** | Pendiente de prueba con TV real |
| `PowerOff` | Apaga la pantalla del televisor | **Sí** | Pendiente de prueba con TV real |
| `PowerOn` | Enciende el televisor desde reposo | **Sí** | Pendiente de prueba con TV real |
| `ChannelUp` | Siguiente canal de antena (Tuner) | **Sí** | Pendiente de prueba con TV real |
| `ChannelDown` | Canal anterior de antena (Tuner) | **Sí** | Pendiente de prueba con TV real |
| `InputTuner` | Cambia a la entrada de antena de TV | **Sí** | Pendiente de prueba con TV real |
| `InputHDMI1` | Cambia a la entrada HDMI 1 | **Sí** | Pendiente de prueba con TV real |
| `InputHDMI2` | Cambia a la entrada HDMI 2 | **Sí** | Pendiente de prueba con TV real |
| `InputHDMI3` | Cambia a la entrada HDMI 3 | **Sí** | Pendiente de prueba con TV real |
| `InputHDMI4` | Cambia a la entrada HDMI 4 | **Sí** | Pendiente de prueba con TV real |
| `InputAV1` | Cambia a la entrada de video AV / RCA | **Sí** | Pendiente de prueba con TV real |

---

## 3. Endpoints de Consulta y Lanzamiento ECP

| Endpoint | Tipo | Implementado en Driver | Estado de Prueba |
|---|---|:---:|:---:|
| `/query/device-info` | Lectura XML de modelo y capacidades | **Sí** | Pendiente de prueba con TV real |
| `/query/apps` | Lectura XML de lista de canales instalados | **Sí** | Pendiente de prueba con TV real |
| `/query/active-app` | Consulta de canal en ejecución | **Sí** | Pendiente de prueba con TV real |
| `/launch/<appID>` | Lanzamiento directo de canal por ID | **Sí** | Pendiente de prueba con TV real |

---

## 4. Comandos Pendientes para Futuras Fases

Los siguientes comandos corresponden a periféricos o funciones especializadas que se incorporarán en actualizaciones posteriores:
* `FindRemote`: Alerta acústica para localizar control remoto físico emparejado.
* Comandos de control gestual táctil continuo.
