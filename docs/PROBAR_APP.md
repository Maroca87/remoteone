# Guía de Pruebas y Validación de RemoteOne

Sigue estos pasos detallados para validar el funcionamiento del MVP con tu **Roku real** o en **Modo Demostración**.

---

## 1. Validación de los Criterios de Éxito del MVP (Requisito 32)

Para considerar el MVP exitoso, debes poder completar la siguiente secuencia:

1. **Abrir la PWA desde el teléfono:**
   * Abre `http://<IP-DE-TU-PC>:3000` en tu teléfono móvil conectado al Wi-Fi de tu casa.
2. **Estar conectado a la misma Wi-Fi que el Roku:**
   * Verifica que ambos compartan la misma subred (ejemplo: ambos en `192.168.1.x`).
3. **Agregar el Roku mediante el asistente:**
   * Toca **"+ AGREGAR TV"**.
   * Selecciona **Roku**.
   * Introduce la IP de tu Roku (obtenida en *Configuración → Red → Acerca de* en tu TV).
   * Asigna el nombre: `Roku Habitación`.
   * Habitación: `Habitación`.
4. **Ejecutar la herramienta "Probar Conexión" (Paso 5 del asistente):**
   * Presiona **"⚡ Ejecutar Prueba de Conexión"**.
   * Observa los 4 checks:
     * ✓ IP válida
     * ✓ Puerto 8060 accesible
     * ✓ Información obtenida (Modelo y si es TV)
     * ✓ Comando Home enviado
5. **Guardar el dispositivo:**
   * Toca **"✓ Guardar y Abrir Control"**.
6. **Probar los controles táctiles en tu televisor real:**
   * Presiona **HOME**: Tu televisor debe volver al menú inicial inmediatamente.
   * Presiona las flechas direccionales (**▲, ▼, ◀, ▶**): El cursor en la pantalla de tu TV debe desplazarse.
   * Presiona **OK**: Debe seleccionar el canal o elemento enfocado.
   * Presiona **ATRÁS**: Debe retroceder la pantalla.
   * Presiona **VOL +**, **VOL −**, y **MUTE** (si es un Roku TV): El volumen del televisor debe responder.
   * Presiona **Netflix** o **YouTube**: Debe abrir la aplicación correspondiente en tu televisor.
7. **Probar transmisión de texto (Teclado virtual):**
   * En tu Roku entra al buscador.
   * En RemoteOne toca el ícono del teclado (`⌨️`).
   * Escribe una palabra y presiona **"Enviar"**. Verás cómo las letras se escriben en el televisor.
8. **Probar persistencia:**
   * Cierra la pestaña o la PWA y vuelve a abrirla.
   * Debe aparecer: *"Continuar con Roku Habitación"* y abrir directamente tu control.

---

## 2. Cómo Probar el Modo Demostración (Sin TV físico)

Si deseas explorar la aplicación antes de encender tu televisor o sin estar en tu casa:

1. Ve a la pestaña **⚙ Ajustes**.
2. Activa el interruptor **"Modo Demostración (Demo)"**.
3. Verás un banner ámbar superior que indica: `⚠️ MODO DEMOSTRACIÓN ACTIVO — Los comandos son simulados`.
4. En **Inicio**, aparecerán dispositivos simulados (*Roku Sala Demo*, *Roku Habitación Demo*).
5. Podrás presionar todos los botones y macros para comprobar animaciones táctiles, feedback háptico y flujo visual.
6. Al desactivar el Modo Demostración, la aplicación regresa al modo de red real.

---

## 3. Ejecución de la Suite de Pruebas Automatizadas

RemoteOne incluye una suite de pruebas automatizadas:

### En el Navegador:
Abre en tu navegador:
```
http://localhost:3000/tests/index.html
```
Haz clic en **"Ejecutar Pruebas"**. La suite verificará:
* Inicialización de almacenamiento y esquemas.
* Registro, edición y eliminación de dispositivos.
* Detección de errores CORS y 403 Forbidden.
* Bloqueo de comandos no soportados en reproductores tipo Stick.
* Validación de direcciones IPv4 y parser XML de Roku.

### En la Terminal (CLI):
```powershell
cd C:\Users\Marcos\.gemini\antigravity-ide\scratch\RemoteOne
python tests/test_bridge_and_structure.py
```
Validará la existencia de todos los archivos del proyecto, la integridad de `manifest.json`, el inicio del bridge y las cabeceras CORS.
