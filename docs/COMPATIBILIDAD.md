# Matriz de Compatibilidad y Análisis de Protocolos por Fabricante

Conforme a las directrices de **RemoteOne**, este documento analiza de forma rigurosa los protocolos reales, documentación oficial, mecanismos de emparejamiento y limitaciones de cada fabricante para la arquitectura PWA + Bridge.

---

## 1. Roku (Prioridad 1 — Soportado)

* **Protocolo Real:** Roku External Control Protocol (ECP).
* **Documentación Oficial:** Publicada oficialmente por Roku ([Roku ECP Specs](https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md)).
* **Transporte y Puertos:** HTTP / REST sobre el puerto TCP `8060`.
* **Descubrimiento:** SSDP (Simple Service Discovery Protocol) sobre UDP multicast `239.255.255.250:1900` con `ST: roku:ecp`.
* **Emparejamiento / Autenticación:** No requiere claves criptográficas ni PIN. Solo requiere que en la configuración del televisor esté autorizado el acceso de red ("Control by mobile apps: Default o Permitted").
* **¿Puede utilizarlo una PWA directamente?:**
  * Envío de comandos: **Sí**, mediante peticiones `POST` en modo `no-cors` (petición simple sin preflight).
  * Lectura de información (`/query/device-info` y `/query/apps`): **Limitado en PWA directa** debido a que Roku no envía cabeceras CORS (`Access-Control-Allow-Origin: *`).
* **¿Requiere Bridge?:** Opcional para comandos básicos; **Recomendado** para descubrimiento SSDP automático y lectura de datos XML.
* **Estado en RemoteOne:** **Soportado (MVP Funcional)**.

---

## 2. Xiaomi Smart TV (Prioridad 2 — En Preparación / Arquitectura Lista)

* **Protocolos Reales:**
  1. **Modelos Globales (Mi TV, Xiaomi TV A/P/Q Series con Android TV / Google TV):**
     * Protocolo: *Android TV Remote Control Protocol v2*.
     * Transporte y Puertos: TCP `6466` (Emparejamiento seguro TLS) y TCP `6467` (Control).
     * Serialización: Mensajes binarios Google Protocol Buffers (Protobuf).
     * Autenticación: Mutual TLS (mTLS) con generación de clave privada de cliente, intercambio de certificados y validación de código PIN de 4 a 6 dígitos mostrado en la pantalla del televisor.
  2. **Modelos Antiguos / China Continental (PatchWall OS):**
     * Protocolo propietario HTTP / UDP en puertos `6095` / `6096`. No documentado oficialmente y ausente en modelos vendidos globalmente con Android TV.
* **Documentación Oficial:** El protocolo Android TV Remote v2 está implementado internamente en Google Play Services y en la app Google TV. Documentado mediante ingeniería inversa rigurosa en proyectos de código abierto consolidados como Home Assistant (`androidtvremote2`).
* **¿Puede utilizarlo una PWA directamente?:** **NO.** Los navegadores web estándar prohíben abrir sockets TCP arbitrarios y gestionar conexiones mTLS con certificados de cliente autogenerados.
* **¿Requiere Bridge?:** **SÍ, obligatoriamente.** Se requiere un servicio en el Bridge local que gestione la conexión TLS, el handshake criptográfico y la serialización protobuf.
* **Estado en RemoteOne:** **Arquitectura preparada. No se simula funcionalidad ficticia hasta integrar el módulo mTLS en el bridge.**

---

## 3. Samsung Smart TV (Tizen OS)

* **Protocolo Real:** Samsung SmartView WebSocket API.
* **Transporte y Puertos:** WebSocket seguro (`wss://<ip>:8002/api/v2/channels/samsung.remote.control`).
* **Emparejamiento:** Handshake con intercambio de token. Requiere que el usuario acepte el permiso ("Permitir conexión") con el control remoto físico en la pantalla del televisor.
* **Limitaciones PWA:** Las llamadas WSS exigen certificados SSL válidos; al usar IPs locales (`wss://192.168.x.x:8002`), el navegador suele rechazar el certificado autofirmado del TV a menos que se use el Bridge.
* **Estado en RemoteOne:** No implementado (Planificado para Fase 2).

---

## 4. LG Smart TV (webOS)

* **Protocolo Real:** LG webOS Second Screen Protocol (SSAP).
* **Transporte y Puertos:** WebSocket (`ws://<ip>:3000` o `wss://<ip>:3001`).
* **Emparejamiento:** El televisor muestra una clave de emparejamiento (Pairing Key) en pantalla que debe enviarse en el payload inicial.
* **Limitaciones PWA:** Similar a Samsung, requiere WebSocket local con manejo de handshake.
* **Estado en RemoteOne:** No implementado (Planificado para Fase 2).

---

## 5. Sony Bravia (Android TV / Google TV)

* **Protocolo Real:** Sony Bravia REST API / IRCC-IP (Internet Remote Control Code).
* **Transporte y Puertos:** HTTP puerto `80`.
* **Emparejamiento:** Soporta autenticación mediante Pre-Shared Key (PSK) configurable en los ajustes del televisor (`Configuración → Red → Control IP → Clave previamente compartida`).
* **Limitaciones PWA:** Excelente candidato para control directo por HTTP si se configura una PSK y el TV habilita cabeceras de origen.
* **Estado en RemoteOne:** No implementado (Planificado para Fase 2).

---

## Resumen de Compatibilidad

| Fabricante | Protocolo | Requiere PIN/Auth | Soporte PWA Directo | Soporte con Bridge | Estado Actual |
|---|---|:---:|:---:|:---:|:---:|
| **Roku** | Roku ECP (HTTP 8060) | No (Solo autorización de red) | Sí (Comandos) | Sí (Completo con SSDP) | **Implementado** |
| **Xiaomi** | Android TV v2 (mTLS 6466) | Sí (PIN + Certificado) | No (Sin TCP crudo) | Sí (Con servicio mTLS) | **Arquitectura Lista** |
| **Samsung** | Tizen WSS 8002 | Sí (Token en pantalla) | Parcial (WSS local) | Sí | Pendiente |
| **LG** | webOS SSAP 3000 | Sí (Pairing Key) | Parcial (WS local) | Sí | Pendiente |
| **Sony** | Bravia IRCC HTTP | Sí (Pre-Shared Key) | Sí (Con PSK) | Sí | Pendiente |
