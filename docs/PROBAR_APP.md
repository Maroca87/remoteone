# Guía de Pruebas y Validación de RemoteOne

Sigue estos pasos detallados para validar el funcionamiento del MVP con tu **Roku real** o en **Modo Simulación**.

---

## 1. Validación de los Criterios de Éxito del MVP

Para validar el flujo completo desde tu teléfono:

1. **Abrir la PWA desde el teléfono:**
   * Abre RemoteOne en el navegador de tu teléfono conectado a la red Wi-Fi de tu casa.
2. **Estar conectado a la misma Wi-Fi que el Roku:**
   * Verifica que ambos compartan la misma subred local (ejemplo: ambos en `192.168.1.x`).
3. **Agregar el Roku mediante el asistente:**
   * Toca **"Escanear red Wi-Fi"** o **"Agregar dispositivo por IP"**.
   * Introduce la IP de tu Roku (obtenida en *Configuración → Red → Acerca de* en tu TV).
   * Asigna el nombre: `Roku Habitación` y ubicación: `Habitación`.
4. **Verificación de conectividad (Paso 4 del asistente):**
   * Observa los 4 checks de validación:
     * IP válida
     * Puerto 8060 accesible
     * Información obtenida (Modelo y si es TV)
     * Comando Home enviado
5. **Guardar el dispositivo:**
   * Toca **"Continuar"** y luego **"Abrir Control Remoto"**.
6. **Probar los controles táctiles en tu televisor real:**
   * Presiona **HOME**: Tu televisor debe volver al menú inicial inmediatamente.
   * Presiona las flechas direccionales del D-Pad (Arriba, Abajo, Izquierda, Derecha): El cursor en la pantalla de tu TV debe desplazarse.
   * Presiona **OK**: Debe seleccionar el canal o elemento enfocado.
   * Presiona **Atrás**: Debe retroceder la pantalla.
   * Presiona **VOL +**, **VOL −**, y **MUTE** (en modelos Roku TV): El volumen del televisor debe responder.
   * En **Favoritos**, presiona **Netflix** o **YouTube**: Debe abrir la aplicación correspondiente en tu televisor.
7. **Probar transmisión de texto (Teclado virtual):**
   * En tu Roku entra al buscador.
   * En RemoteOne toca el botón del teclado.
   * Escribe una palabra y presiona **"Enviar"**. Verás cómo las letras se transmiten al televisor.
8. **Probar persistencia:**
   * Cierra la PWA y vuelve a abrirla.
   * Tu televisor se recordará automáticamente como activo y abrirá directamente tu control.

---

## 2. Cómo Probar el Modo Simulación (Sin TV físico)

Si deseas explorar la aplicación antes de conectar un televisor real:

1. Ve a la pestaña **Ajustes**.
2. Activa el interruptor **"Modo simulación"**.
3. Verás un banner superior indicando que los comandos son simulados.
4. Podrás presionar todos los botones para comprobar animaciones táctiles, feedback háptico y flujo visual.
5. Al desactivar el Modo Simulación, la aplicación regresa al modo de red Wi-Fi real.

---

## 3. Ejecución de la Suite de Pruebas Automatizadas

RemoteOne incluye una suite de pruebas automatizadas:

### Desde la Consola (Python):
```powershell
python tests/test_bridge_and_structure.py
```

### En el Navegador:
Abre en tu navegador `tests/index.html` y pulsa **"Ejecutar Pruebas"**.
