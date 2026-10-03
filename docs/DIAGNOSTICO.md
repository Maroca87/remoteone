# Guía de Diagnóstico y Resolución de Problemas

RemoteOne incorpora una pantalla de diagnóstico en tiempo real accesible desde **Ajustes ➔ Diagnóstico**.

Esta guía describe cómo interpretar cada estado y resolver incidencias de conectividad.

---

## 1. Interpretación de los Estados de Conexión

| Estado | Significado Técnico | Acción Recomendada |
|---|---|---|
| **Conectado** | El televisor responde en el puerto 8060 o se confirmó el comando correctamente. | Todo funciona con normalidad. |
| **Conectando** | Comprobación de alcance en curso. | Espera unos instantes mientras se resuelve la petición. |
| **Desconectado** | Tiempo de espera agotado o fallo de conexión en la IP indicada. | 1. Comprueba que el TV esté encendido.<br>2. Verifica que la IP no haya cambiado por DHCP.<br>3. Confirma que teléfono y TV estén en la misma red Wi-Fi. |
| **Bloqueado por navegador** | El navegador bloqueó la petición por política de Contenido Mixto o Private Network Access. | Asegúrate de abrir la app por HTTP en tu red local o configura el Bridge LAN opcional. |
| **No compatible** | El televisor devolvió **HTTP 403 Forbidden** o el modelo requiere autorización previa. | En Roku: Ve a *Configuración → Sistema → Configuración avanzada → Control por apps móviles* y selecciona **Permitida**. |
| **Error de comunicación** | Formato de IP inválido o caída del enlace Wi-Fi. | Revisa el formato de IP en la configuración del televisor. |

---

## 2. Escenarios Comunes de Conectividad

### Escenario A: "El control por aplicaciones móviles está deshabilitado en el Roku (HTTP 403)"
* **Causa:** La configuración de seguridad de Roku OS bloquea peticiones ECP externas por defecto en versiones recientes de firmware.
* **Solución:**
  1. En tu Roku entra a: *Configuración → Sistema → Configuración avanzada del sistema → Control por aplicaciones móviles → Acceso de red*.
  2. Cámbialo de "Desactivado" a **"Predeterminado"** o **"Permitido"**.

### Escenario B: "El TV no responde / Teléfono y TV en redes aisladas"
* **Causa:**
  1. El router tiene activado el "Aislamiento de clientes" (*AP Isolation* o *Client Isolation*).
  2. El teléfono está en una red Wi-Fi de invitados (*Guest Network*) que no permite ver otros dispositivos.
  3. El router no enruta paquetes entre las bandas de 2.4 GHz y 5 GHz.
* **Solución:**
  1. Conecta ambos dispositivos al mismo SSID de Wi-Fi principal.
  2. Desactiva *AP Isolation* en el panel de control de tu router.

---

## 3. Uso del Botón "Copiar Diagnóstico"

En la pantalla de diagnóstico encontrarás el botón **"Copiar"**.

Al pulsarlo, se copia automáticamente al portapapeles un informe estructurado como este:

```text
==============================================
      REMOTEONE - DIAGNOSTIC REPORT
==============================================
Fecha/Hora: 3/10/2026, 09:45:00
Dispositivo: Roku Habitación (192.168.1.35:8060)
Estado: Conectado
Protocolo: Roku ECP
Modo Activo: PWA Directo (Wi-Fi)
Último comando: Home
Última respuesta: Success
```
