/**
 * RemoteOne - ErrorHandler Utility
 * Translates raw network/browser errors into transparent, actionable messages.
 * Never hides restrictions or fakes success.
 */

export class ErrorHandler {
  /**
   * Evaluates an exception and context, returning a structured diagnostic object.
   * @param {Error|any} error 
   * @param {Object} context - e.g. { brand: 'roku', ip: '192.168.1.50', mode: 'direct'|'bridge', command: 'Home' }
   * @returns {{ userMessage: string, technicalDetails: string, state: string, suggestion: string }}
   */
  static parse(error, context = {}) {
    const errString = (error?.message || String(error) || '').toLowerCase();
    const isHttps = window.location.protocol === 'https:';

    // 1. Mixed Content: HTTPS page attempting to fetch HTTP local IP
    if (isHttps && (errString.includes('mixed content') || errString.includes('failed to fetch'))) {
      if (context.mode === 'direct') {
        return {
          userMessage: 'El navegador bloqueó la comunicación directa por política de Contenido Mixto (HTTPS vs HTTP local).',
          technicalDetails: 'Los navegadores prohíben peticiones HTTP no cifradas desde sitios HTTPS. Usa el Local Bridge o abre la PWA por HTTP en la red local.',
          state: 'Bloqueado por navegador',
          suggestion: 'Activa el Local Bridge o sirve la PWA mediante HTTP local.'
        };
      }
    }

    // 2. CORS / Private Network Access block in Direct Mode
    if (context.mode === 'direct' && (errString.includes('failed to fetch') || errString.includes('networkerror') || errString.includes('cors'))) {
      return {
        userMessage: 'El navegador bloqueó la comunicación directa con el dispositivo.',
        technicalDetails: `Petición directa a ${context.ip || 'dispositivo'} bloqueada por el navegador (CORS o Private Network Access preflight). Roku no emite cabeceras Access-Control-Allow-Origin.`,
        state: 'Bloqueado por navegador',
        suggestion: 'Habilita el Local Bridge en Ajustes para enviar comandos de forma 100% verificada.'
      };
    }

    // 3. Timeout / Device unreachable
    if (errString.includes('timeout') || errString.includes('aborted') || errString.includes('timed out')) {
      return {
        userMessage: 'El TV no responde en el tiempo esperado.',
        technicalDetails: `Tiempo de espera agotado al conectar a ${context.ip || 'dispositivo'}:8060.`,
        state: 'Desconectado',
        suggestion: 'Verifica que el televisor esté encendido y que el teléfono esté en la misma red Wi-Fi.'
      };
    }

    // 4. HTTP 403 Forbidden on Roku ECP (Mobile app control disabled)
    if (errString.includes('403') || error?.status === 403) {
      return {
        userMessage: 'El control por aplicaciones móviles está deshabilitado en el Roku.',
        technicalDetails: 'El Roku devolvió HTTP 403 Forbidden. La configuración de control externo no permite peticiones desde este dispositivo.',
        state: 'No compatible',
        suggestion: 'En tu Roku ve a Configuración → Sistema → Configuración avanzada del sistema → Control por apps móviles y selecciona Permitir.'
      };
    }

    // 5. HTTP 404 / 400
    if (errString.includes('404') || error?.status === 404) {
      return {
        userMessage: 'El comando o función solicitada no fue reconocida por el dispositivo.',
        technicalDetails: `Endpoint no encontrado en ${context.ip || 'dispositivo'}. Comando: ${context.command || 'N/A'}.`,
        state: 'Error de comunicación',
        suggestion: 'Comprueba si tu modelo de televisor soporta este comando específico.'
      };
    }

    // 6. Generic Network error
    if (errString.includes('failed to fetch') || errString.includes('econnrefused')) {
      return {
        userMessage: 'El TV no responde. El teléfono y el TV podrían estar en redes diferentes.',
        technicalDetails: `Fallo de conexión a ${context.ip || 'dispositivo'}. Causa probable: aislamiento de clientes Wi-Fi (AP Isolation), red de invitados o IP incorrecta.`,
        state: 'Desconectado',
        suggestion: 'Asegúrate de que no estás en una red de invitados y que el aislamiento de AP del router esté desactivado.'
      };
    }

    // Fallback
    return {
      userMessage: 'Error de comunicación con el televisor.',
      technicalDetails: error?.message || String(error),
      state: 'Error de comunicación',
      suggestion: 'Revisa los detalles técnicos en la pantalla de Diagnóstico.'
    };
  }
}
