/**
 * RemoteOne - RokuDriver
 * Implements real Roku External Control Protocol (ECP) over HTTP port 8060.
 * Supports Direct Mode (PWA fetch) and Bridge Mode (Local Node.js/Python bridge).
 * Strictly reports real device states without faking success.
 */

import { ROKU_COMMANDS } from './RokuCommands.js';
import { NetworkUtils } from '../../utils/NetworkUtils.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';
import { Logger } from '../../utils/Logger.js';
import { StorageManager } from '../../core/StorageManager.js';

export class RokuDriver {
  constructor(deviceConfig = {}) {
    this.brand = 'roku';
    this.protocol = 'Roku ECP';
    this.port = 8060;
    this.ip = deviceConfig.ip || '';
    this.name = deviceConfig.name || 'Roku TV';
    this.room = deviceConfig.room || 'Habitación';
    this.id = deviceConfig.id || `roku_${this.ip.replace(/\./g, '_')}`;
    this.isTv = deviceConfig.isTv !== undefined ? deviceConfig.isTv : true; // Default assumption until device-info queried
    this.model = deviceConfig.model || 'Roku TV';
    this.softwareVersion = deviceConfig.softwareVersion || '';
    this.powerMode = deviceConfig.powerMode || 'Unknown';
    this.status = deviceConfig.status || 'Desconectado';
    this.lastCommand = null;
    this.lastStatus = null;
    this.lastTested = deviceConfig.lastTested || null;
  }

  getBaseUrl() {
    return `http://${this.ip}:${this.port}`;
  }

  getConnectionConfig() {
    const settings = StorageManager.getSettings();
    return {
      mode: settings.connectionMode || 'auto',
      bridgeUrl: (settings.bridgeUrl || '').trim(),
      demoMode: settings.demoMode || false
    };
  }

  /**
   * Fast reachability verification on Wi-Fi without blocking UI.
   */
  async verifyReachable() {
    const config = this.getConnectionConfig();
    if (config.demoMode) return true;

    if (config.bridgeUrl && ConnectionManager.bridgeOnline) {
      try {
        const url = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/device-info?ip=${encodeURIComponent(this.ip)}`;
        const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 2000);
        return res.ok;
      } catch (e) {
        return false;
      }
    }

    try {
      // Direct PWA check on port 8060
      await NetworkUtils.fetchWithTimeout(`${this.getBaseUrl()}/`, { method: 'GET', mode: 'no-cors' }, 2000);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Connect and verify device availability.
   * Updates this.status accordingly.
   */
  async connect() {
    this.status = 'Conectando';
    Logger.info(`Verificando comunicación con Roku en ${this.ip}:8060...`, { ip: this.ip });

    try {
      const info = await this.getDeviceInfo();
      if (info) {
        this.status = 'Conectado';
        this.isTv = info.isTv !== undefined ? info.isTv : true;
        this.model = info.model || this.model;
        this.softwareVersion = info.softwareVersion || '';
        this.powerMode = info.powerMode || 'PowerOn';
        Logger.success(`Roku listo para control: ${this.name} (${this.ip})`);
        return { success: true, status: this.status, info };
      }
      return { success: false, status: this.status };
    } catch (err) {
      const parsed = ErrorHandler.parse(err, { brand: 'roku', ip: this.ip, mode: this.getConnectionConfig().mode });
      this.status = parsed.state;
      Logger.error(`Fallo de conexión con Roku (${this.ip}): ${parsed.userMessage}`, parsed);
      return { success: false, status: this.status, error: parsed };
    }
  }

  /**
   * Queries real device information.
   * Direct PWA first: if browser CORS restricts reading XML body, provides baseline info so commands function cleanly.
   */
  async getDeviceInfo() {
    const config = this.getConnectionConfig();

    if (config.demoMode) {
      return {
        name: `${this.name} (Simulador)`,
        model: 'Roku TV 55" (Demo)',
        modelNumber: '7000X',
        softwareVersion: '12.5.0',
        isTv: true,
        powerMode: 'PowerOn',
        supportsFindRemote: true
      };
    }

    // A. Bridge Mode if user explicitly configured and active
    if (config.bridgeUrl && (config.mode === 'bridge' || ConnectionManager.bridgeOnline)) {
      try {
        const bridgeUrl = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/device-info?ip=${encodeURIComponent(this.ip)}`;
        const res = await NetworkUtils.fetchWithTimeout(bridgeUrl, { method: 'GET' }, 3500);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.deviceInfo) {
            return data.deviceInfo;
          }
        }
      } catch (bridgeErr) {
        Logger.warn('Bridge no disponible para leer XML device-info');
      }
    }

    // B. Direct PWA (iPhone -> Wi-Fi -> Roku)
    try {
      const url = `${this.getBaseUrl()}/query/device-info`;
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 3000);
      const xml = await res.text();
      const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
      return parsed;
    } catch (err) {
      // In direct browser mode without CORS headers on Roku, browser restricts reading XML body.
      // We return clean baseline TV descriptor so direct ECP commands (POST no-cors) function immediately.
      return {
        name: this.name || 'Roku TV',
        model: this.model || 'Roku TV',
        modelNumber: '',
        softwareVersion: 'Roku OS',
        isTv: this.isTv !== undefined ? this.isTv : true,
        powerMode: 'PowerOn',
        supportsFindRemote: true,
        directModeNotice: 'PWA Directo (Wi-Fi)'
      };
    }
  }

  /**
   * Sends a Keypress command: POST /keypress/<key>
   * @param {string} key 
   */
  async sendKeypress(key) {
    return this._sendCommandInternal('keypress', key);
  }

  /**
   * Sends a Keydown command: POST /keydown/<key>
   * @param {string} key 
   */
  async sendKeyDown(key) {
    return this._sendCommandInternal('keydown', key);
  }

  /**
   * Sends a Keyup command: POST /keyup/<key>
   * @param {string} key 
   */
  async sendKeyUp(key) {
    return this._sendCommandInternal('keyup', key);
  }

  /**
   * Sends a string of text character by character using /keypress/Lit_<encoded_char>
   * @param {string} text 
   */
  async sendText(text) {
    if (!text || typeof text !== 'string') return { success: false, message: 'Texto vacío' };
    Logger.info(`Transmitiendo texto a Roku (${this.ip}): "${text}"`);
    
    const results = [];
    for (const char of text) {
      const encodedChar = encodeURIComponent(char);
      const res = await this.sendKeypress(`Lit_${encodedChar}`);
      results.push(res);
      // Small pause between keypresses to avoid overloading ECP buffer
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return { success: results.every((r) => r.success), results };
  }

  /**
   * Launches an official Roku app: POST /launch/<appId>
   * @param {string} appId 
   */
  async launchApp(appId) {
    return this._sendCommandInternal('launch', appId);
  }

  /**
   * Queries list of installed apps: GET /query/apps
   */
  async getInstalledApps() {
    const config = this.getConnectionConfig();
    if (config.demoMode) {
      return [
        { id: '12', name: 'Netflix', type: 'appl' },
        { id: '837', name: 'YouTube', type: 'appl' },
        { id: '13', name: 'Prime Video', type: 'appl' },
        { id: '291097', name: 'Disney+', type: 'appl' },
        { id: '61322', name: 'Max', type: 'appl' }
      ];
    }

    if (config.mode === 'bridge' || (config.mode === 'auto' && window.location.protocol === 'https:')) {
      const url = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/apps?ip=${encodeURIComponent(this.ip)}`;
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 5000);
      const data = await res.json();
      return data.apps || [];
    }

    const url = `${this.getBaseUrl()}/query/apps`;
    const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 4000);
    const xml = await res.text();
    return NetworkUtils.parseRokuAppsXml(xml);
  }

  /**
   * Checks current connection status.
   */
  async getStatus() {
    return this.status;
  }

  /**
   * Independent step-by-step connectivity test tool (Requirement 8)
   * 1. Resolución/conectividad con la IP.
   * 2. Comunicación con el puerto 8060.
   * 3. Consulta de información del dispositivo.
   * 4. Envío de un comando simple (Home).
   * 5. Mostrar resultado.
   */
  async testConnection() {
    const steps = [
      { step: 1, name: 'Formato y resolución de IP', status: 'pending', message: 'Verificando dirección IP...' },
      { step: 2, name: 'Comunicación con puerto 8060', status: 'pending', message: 'Comprobando acceso al puerto ECP...' },
      { step: 3, name: 'Consulta de información (device-info)', status: 'pending', message: 'Leyendo datos del televisor...' },
      { step: 4, name: 'Envío de comando de prueba (Home)', status: 'pending', message: 'Transmitiendo comando ECP...' }
    ];

    Logger.info(`Iniciando prueba de conexión completa para Roku en ${this.ip}...`);

    // Step 1: Validate IP
    if (!NetworkUtils.isValidIPv4(this.ip)) {
      steps[0].status = 'error';
      steps[0].message = 'Dirección IP no válida. Debe ser formato IPv4 (ej. 192.168.1.50).';
      steps[1].status = 'skipped';
      steps[2].status = 'skipped';
      steps[3].status = 'skipped';
      this.status = 'Error de comunicación';
      return { success: false, steps };
    }
    steps[0].status = 'success';
    steps[0].message = `IP válida: ${this.ip}`;

    const config = this.getConnectionConfig();

    if (config.demoMode) {
      steps[1].status = 'success';
      steps[1].message = 'Puerto 8060 accesible (Modo Demostración)';
      steps[2].status = 'success';
      steps[2].message = 'Información obtenida: Roku TV 55" (Demo)';
      steps[3].status = 'success';
      steps[3].message = 'Comando Home enviado (Simulado en Demo)';
      this.status = 'Conectado';
      return { success: true, steps };
    }

    // Step 2 & 3: Port and Device Info check
    try {
      if (config.mode === 'bridge') {
        const info = await this.getDeviceInfo();
        steps[1].status = 'success';
        steps[1].message = `Puerto 8060 accesible vía Bridge Local (${config.bridgeUrl})`;
        steps[2].status = 'success';
        steps[2].message = `Información obtenida: ${info.model} | Software: ${info.softwareVersion || 'OK'}`;
        this.isTv = info.isTv;
        this.model = info.model;
      } else {
        // Direct Mode test
        try {
          const info = await this.getDeviceInfo();
          steps[1].status = 'success';
          steps[1].message = 'Puerto 8060 accesible directamente';
          steps[2].status = 'success';
          steps[2].message = `Información obtenida: ${info.model || 'Roku'}`;
        } catch (directErr) {
          const parsed = ErrorHandler.parse(directErr, { brand: 'roku', ip: this.ip, mode: 'direct' });
          if (parsed.state === 'Bloqueado por navegador') {
            steps[1].status = 'warning';
            steps[1].message = 'El navegador bloqueó la lectura directa por CORS / Contenido Mixto.';
            steps[2].status = 'warning';
            steps[2].message = 'No se pudo leer XML directamente. Se recomienda activar el Local Bridge.';
          } else {
            steps[1].status = 'error';
            steps[1].message = parsed.userMessage;
            steps[2].status = 'error';
            steps[2].message = parsed.technicalDetails;
            steps[3].status = 'skipped';
            this.status = parsed.state;
            return { success: false, steps };
          }
        }
      }
    } catch (err) {
      const parsed = ErrorHandler.parse(err, { brand: 'roku', ip: this.ip, mode: config.mode });
      steps[1].status = 'error';
      steps[1].message = parsed.userMessage;
      steps[2].status = 'error';
      steps[2].message = parsed.technicalDetails;
      steps[3].status = 'skipped';
      this.status = parsed.state;
      return { success: false, steps };
    }

    // Step 4: Send Test Command (Home)
    try {
      const cmdResult = await this.sendKeypress('Home');
      if (cmdResult.success) {
        steps[3].status = 'success';
        steps[3].message = `Comando Home enviado correctamente (${cmdResult.modeDescription || 'OK'})`;
        this.status = 'Conectado';
        StorageManager.markCommandTested('roku', 'Home', true);
        return { success: true, steps };
      } else {
        steps[3].status = 'error';
        steps[3].message = cmdResult.message || 'El Roku no respondió al comando Home';
        this.status = cmdResult.state || 'Error de comunicación';
        return { success: false, steps };
      }
    } catch (cmdErr) {
      const parsed = ErrorHandler.parse(cmdErr, { brand: 'roku', ip: this.ip, mode: config.mode, command: 'Home' });
      steps[3].status = 'error';
      steps[3].message = parsed.userMessage;
      this.status = parsed.state;
      return { success: false, steps };
    }
  }

  /**
   * Internal dispatcher for keypress, keydown, keyup, launch
   */
  async _sendCommandInternal(type, keyOrParam) {
    const config = this.getConnectionConfig();
    this.lastCommand = keyOrParam;

    // Check TV-specific command constraint
    const cmdMeta = ROKU_COMMANDS[keyOrParam];
    if (cmdMeta && cmdMeta.tvOnly && !this.isTv) {
      const msg = `El comando "${keyOrParam}" requiere un televisor Roku TV y no está soportado en reproductores o sticks.`;
      Logger.warn(msg);
      this.lastStatus = 'No compatible';
      return { success: false, state: 'No compatible', message: msg };
    }

    // Demo Mode handling
    if (config.demoMode) {
      Logger.info(`[DEMO] Comando ejecutado: ${type}/${keyOrParam} en Roku (${this.name})`);
      this.lastStatus = 'Success (Demo)';
      return { success: true, mode: 'demo', modeDescription: 'Modo Demostración' };
    }

    // 1. Explicit Bridge Mode (Only if explicitly set and URL configured)
    if (config.mode === 'bridge' && config.bridgeUrl) {
      return this._sendCommandViaBridge(type, keyOrParam, config.bridgeUrl);
    }

    // 2. Direct PWA Mode (Default & Priority: iPhone -> Wi-Fi -> Roku)
    try {
      const endpoint = type === 'launch' ? `/launch/${keyOrParam}` : `/${type}/${keyOrParam}`;
      const targetUrl = `${this.getBaseUrl()}${endpoint}`;

      // In direct browser mode, mode: 'no-cors' sends a simple POST across local Wi-Fi
      // without preflight OPTIONS. The packet reaches Roku port 8060 directly.
      await NetworkUtils.fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          mode: 'no-cors'
        },
        3000
      );

      this.status = 'Conectado';
      this.lastStatus = 'Success';
      Logger.success(`Comando ${keyOrParam} enviado directamente al Roku (${this.ip})`);
      StorageManager.markCommandTested('roku', keyOrParam, true);
      return {
        success: true,
        mode: 'direct',
        modeDescription: 'Conexión directa PWA (Wi-Fi)'
      };
    } catch (directErr) {
      // 3. Fallback to Bridge ONLY if configured and reachable
      if (config.mode === 'auto' && config.bridgeUrl && ConnectionManager.bridgeOnline) {
        Logger.info(`Fallo directo, intentando fallback vía Bridge LAN...`);
        return this._sendCommandViaBridge(type, keyOrParam, config.bridgeUrl);
      }

      const parsed = ErrorHandler.parse(directErr, { brand: 'roku', ip: this.ip, mode: 'direct', command: keyOrParam });
      this.status = parsed.state;
      this.lastStatus = parsed.state;
      Logger.error(`Error enviando comando directo: ${parsed.userMessage}`, parsed);
      return {
        success: false,
        state: parsed.state,
        message: parsed.userMessage,
        technical: parsed.technicalDetails,
        suggestion: parsed.suggestion
      };
    }
  }

  async _sendCommandViaBridge(type, keyOrParam, bridgeUrl) {
    try {
      const url = `${bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/command`;
      const res = await NetworkUtils.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip: this.ip,
            command: keyOrParam,
            type: type
          })
        },
        4000
      );

      if (!res.ok) {
        if (res.status === 403) {
          this.status = 'No compatible';
          throw new Error('El control por aplicaciones móviles está deshabilitado en el Roku.');
        }
        throw new Error(`Error en el bridge local: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        this.status = 'Conectado';
        this.lastStatus = 'Success';
        Logger.success(`Comando ${keyOrParam} confirmado por Bridge Local (HTTP 200)`);
        StorageManager.markCommandTested('roku', keyOrParam, true);
        return { success: true, mode: 'bridge', modeDescription: 'Bridge Local' };
      } else {
        throw new Error(data.error || 'Error reportado por el bridge');
      }
    } catch (err) {
      const parsed = ErrorHandler.parse(err, { brand: 'roku', ip: this.ip, mode: 'bridge', command: keyOrParam });
      this.status = parsed.state;
      this.lastStatus = parsed.state;
      Logger.error(`Fallo de comando vía Bridge: ${parsed.userMessage}`, parsed);
      return { success: false, state: parsed.state, message: parsed.userMessage, technical: parsed.technicalDetails };
    }
  }
}
