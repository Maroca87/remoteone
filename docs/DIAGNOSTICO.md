# Guía de Diagnóstico y Resolución de Problemas

RemoteOne incorpora una pantalla de diagnóstico en tiempo real accesible desde **⚙ Ajustes ➔ 📊 Log de Diagnóstico**.

Esta guía describe cómo interpretar cada mensaje y resolver las incidencias de conectividad más comunes.

---

## 1. Interpretación de los Estados de Conexión

| Estado | Significado Técnico | Acción Recomendada |
|---|---|---|
| 🟢 **Conectado** | El televisor responde en el puerto 8060 o el bridge confirmó el comando con HTTP 200 OK. | Todo funciona correctamente. |
| 🟡 **Intentando conectar** | Comprobación de salud en curso. | Espera 2 segundos mientras se resuelve la petición. |
| 🔴 **Desconectado** | Tiempo de espera agotado (Timeout) o fallo de conexión TCP en la IP indicada. | 1. Comprueba que el TV esté encendido.<br>2. Verifica que la IP no haya cambiado por DHCP.<br>3. Confirma que teléfono y TV estén en la misma Wi-Fi. |
| 🟣 **Bloqueado por navegador** | El navegador bloqueó la petición directa por política de CORS, Contenido Mixto (HTTPS) o Private Network Access. | Activa y utiliza el **Local Bridge** (/bridge) para eliminar las restricciones del sandbox del navegador. |
| ⚪ **No compatible** | El televisor devolvió **HTTP 403 Forbidden** o el modelo requiere un protocolo no soportado por llamadas HTTP directas (ej. Xiaomi mTLS). | En Roku: Ve a *Configuración → Sistema → Configuración avanzada → Control por apps móviles* y selecciona **Permitir**. |
| ⚠️ **Error de comunicación** | Formato de IP inválido o caída temporal del socket de red. | Revisa el formato de IP en la configuración del televisor. |

---

## 2. Los 3 Escenarios de Error Más Comunes

### Escenario A: "El navegador bloqueó la comunicación directa con el dispositivo"
* **Causa:** Estás ejecutando la PWA directamente desde un navegador web o un servidor HTTPS, y al hacer `fetch("http://192.168.1.50:8060/...")`, las políticas de seguridad del navegador bloquean la petición porque Roku no incluye la cabecera `Access-Control-Allow-Origin: *`.
* **Solución:**
  1. Inicia el bridge local ejecutando `python bridge.py` en la carpeta `/bridge`.
  2. En RemoteOne ve a **⚙ Ajustes** y selecciona **"Bridge Local Obligatorio"** o usa la URL del bridge (`http://<tu-pc>:3000`) desde el navegador de tu teléfono.

### Escenario B: "El control por aplicaciones móviles está deshabilitado en el Roku (HTTP 403)"
* **Causa:** La configuración de seguridad de Roku bloquea peticiones ECP externas por defecto en versiones recientes de firmware.
* **Solución:**
  1. En tu Roku entra a: *Configuración → Sistema → Configuración avanzada del sistema → Control por aplicaciones móviles → Acceso de red*.
  2. Cámbialo de "Desactivado" a **"Predeterminado"** o **"Permitido"**.

### Escenario C: "El TV no responde / El teléfono y el TV podrían estar en redes diferentes"
* **Causa:**
  1. El router tiene activado el "Aislamiento de clientes" (*AP Isolation* o *Client Isolation*).
  2. El teléfono está conectado a una red de 5 GHz y el TV a una red de 2.4 GHz en routers que no enrutan tráfico entre ambas bandas.
  3. El teléfono está en una red de invitados (*Guest Network*).
* **Solución:**
  1. Conecta ambos dispositivos exactamente al mismo nombre de red (SSID).
  2. Desactiva *AP Isolation* en el panel de control de tu router.

---

## 3. Uso del Botón "Copiar Diagnóstico"

En la pantalla de diagnóstico encontrarás el botón **"📋 Copiar diagnóstico"**.

Al pulsarlo, se copia automáticamente al portapapeles de tu teléfono o computadora un informe estructurado como este:

```text
==============================================
      REMOTEONE - DIAGNOSTIC REPORT
==============================================
Fecha/Hora: 3/10/2026, 08:45:00
Plataforma: Mozilla/5.0 (Linux; Android 14) Chrome/128...
Protocolo PWA: http:
Origen: http://192.168.1.45:3000
Modo Conexión PWA: Bridge local
Bridge URL: http://localhost:3000
----------------------------------------------
DISPOSITIVO ACTIVO:
  Nombre: Roku Habitación
  Habitación: Habitación
  Marca: roku
  IP: 192.168.1.50
  Puerto: 8060
  Protocolo: Roku ECP
  Modelo: TCL Roku TV 50" (50S435)
  Es TV: Sí (Soporta Volumen/Canales/Power)
  Versión Software: 12.5.0
  Estado Actual: Conectado
  Último Comando: Home
  Último Resultado: Success
----------------------------------------------
HISTORIAL RECIENTE DE ACCIONES Y ERRORES:
[08:44:50] [INFO] Intentando conectar con Roku en 192.168.1.50:8060...
[08:44:51] [SUCCESS] Roku conectado exitosamente: 50S435 (Roku Habitación)
[08:44:55] [INFO] Ejecutando comando: [Home] en "Roku Habitación" (roku)
[08:44:55] [SUCCESS] Comando Home confirmado por Bridge Local (HTTP 200)
==============================================
```

Este reporte te permite identificar de un vistazo si el problema radica en el router, la IP, el protocolo o la política de seguridad del navegador.
