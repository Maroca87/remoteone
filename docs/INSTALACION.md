# Guía de Instalación y Uso de RemoteOne PWA

**RemoteOne** está diseñada con enfoque **Mobile-First**, optimizada para ser utilizada cómodamente con una sola mano desde la pantalla táctil de un teléfono móvil.

---

## 1. Instalación en Teléfono Android (Google Chrome)

1. Conecta tu teléfono a la **misma red Wi-Fi** que tu televisor Roku.
2. Inicia el servidor de RemoteOne en tu computadora o Raspberry Pi:
   ```powershell
   cd C:\Users\Marcos\.gemini\antigravity-ide\scratch\RemoteOne\bridge
   python bridge.py
   ```
3. Observa la IP de tu PC que muestra la consola (ejemplo: `http://192.168.1.45:3000`).
4. Abre **Google Chrome** en tu teléfono y escribe dicha dirección en la barra de navegación:
   ```
   http://192.168.1.45:3000
   ```
5. En la parte superior de la aplicación verás el botón **"⬇ Instalar"**, o puedes tocar el menú de Chrome (los 3 puntos verticales arriba a la derecha).
6. Selecciona **"Agregar a la pantalla principal"** o **"Instalar aplicación"**.
7. ¡Listo! Se creará un acceso directo en tu teléfono con el ícono de RemoteOne. Al abrirlo, se ejecutará en modo pantalla completa (*standalone*), como una aplicación nativa, ocultando la barra del navegador.

---

## 2. Instalación en iPhone / iPad (Safari)

1. Conecta tu dispositivo iOS a la misma Wi-Fi.
2. Abre **Safari** y navega a `http://<IP-DE-TU-PC>:3000`.
3. Toca el botón de **Compartir** (el ícono de un cuadrado con una flecha hacia arriba).
4. Desplázate hacia abajo y selecciona **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
5. Toca **"Agregar"**. La PWA se abrirá sin los marcos de Safari.

---

## 3. Uso en Computadora de Escritorio (Chrome / Edge)

1. Abre `http://localhost:3000` en tu navegador Chrome o Edge.
2. En la barra de direcciones aparecerá el ícono de instalación de PWA (una pantalla con una flecha hacia abajo).
3. Haz clic en **"Instalar RemoteOne"** para tenerla como ventana independiente en tu barra de tareas.

---

## 4. Estructura de Navegación Móvil

La aplicación cuenta con una barra de navegación inferior fija adaptada para interacción ergonómica con el pulgar:

* **🏠 Inicio:** Lista de tus televisores, estado en tiempo real, botón para continuar con el último televisor utilizado y botón para agregar o buscar televisores.
* **📺 Controles:** Mando a distancia táctil adaptado (D-Pad amplio, OK central, Home, Atrás, Volumen, Canales, Silencio, Entradas HDMI y canales directos).
* **⭐ Favoritos:** Accesos directos a streaming (Netflix, YouTube, etc.) y ejecución de Macros automatizadas (ej. *Modo Película*).
* **⚙ Ajustes:** Selección de modo (Directo vs Bridge), guía de Roku, modo Demo, matriz de compatibilidad y log de diagnóstico.
