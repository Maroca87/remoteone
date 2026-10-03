# Guía de Instalación y Uso de RemoteOne PWA

**RemoteOne** está diseñada con enfoque **Mobile-First**, optimizada para ser utilizada cómodamente con una sola mano desde la pantalla táctil de un iPhone o dispositivo Android.

---

## 1. Conexión Directa desde iPhone / iPad (Safari)

RemoteOne está diseñada para funcionar **directamente desde tu iPhone sin depender de una PC**:

1. Conecta tu iPhone a la **misma red Wi-Fi** que tu televisor Roku.
2. Abre **Safari** y abre la URL de RemoteOne (servida por tu host web o servidor local).
3. Toca el botón de **Compartir** de Safari (el ícono de un cuadrado con una flecha hacia arriba).
4. Desplázate hacia abajo y selecciona **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
5. Confirma tocando **"Agregar"**.
6. Se creará el acceso directo con el emblema de RemoteOne en tu pantalla principal. Al abrirlo, se ejecutará en modo pantalla completa (*standalone*), con soporte de área segura (*safe-area-insets*) para el notch y el indicador inferior.

---

## 2. Instalación en Teléfono Android (Google Chrome)

1. Conecta tu teléfono a la **misma red Wi-Fi** que tu televisor Roku.
2. Abre **Google Chrome** y navega a la URL de RemoteOne.
3. En la parte superior de la aplicación pulsa el botón **"Instalar"**, o en el menú de Chrome (los 3 puntos verticales) selecciona **"Instalar aplicación"** o **"Agregar a pantalla principal"**.
4. ¡Listo! Se creará el acceso directo para uso a pantalla completa.

---

## 3. Uso Opcional con Local Bridge

Si decides utilizar el Local Bridge en una computadora o Raspberry Pi para descubrimiento SSDP automático por UDP multicast:
1. En la máquina host ejecuta: `python bridge/bridge.py`
2. En tu teléfono ve a **Ajustes ➔ Modo de comunicación**.
3. Selecciona **Bridge local (Opcional)** e introduce la IP de tu computadora (ejemplo: `http://192.168.1.10:3000`).
4. Pulsa **Probar** y guarda.

---

## 4. Estructura de Navegación Móvil

La aplicación cuenta con una barra de navegación inferior minimalista basada en iconos Lucide vectoriales:

* **Inicio:** Lista limpia de televisores, estado de conexión (Conectado / Desconectado) y botón para escanear red Wi-Fi o agregar por IP.
* **Control:** Consola de control remoto digital con D-Pad central, SELECT/OK, Back, Home, reproducción y controles de volumen.
* **Favoritos:** Accesos directos a canales de streaming (Netflix, YouTube, Prime, Disney+) y ejecución de secuencias automatizadas (macros).
* **Ajustes:** Configuración del modo de comunicación, guía de permisos de Roku OS, diagnóstico y modo simulación.
