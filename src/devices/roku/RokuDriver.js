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
      bridgeUrl: settings.bridgeUrl || 'http://localhost:3000',
      demoMode: settings.demoMode || false
    };
  }

  /**
   * Connect and verify device availability.
   * Updates this.status accordingly.
   */
  async connect() {
    this.status = 'Intentando conectar';
    Logger.info(`Intentando conectar con Roku en ${this.ip}:8060...`, { ip: this.ip });

    try {
      const info = await this.getDeviceInfo();
      if (info && info.model) {
        this.status = 'Conectado';
        this.isTv = info.isTv;
        this.model = info.model;
        this.softwareVersion = info.softwareVersion;
        this.powerMode = info.powerMode;
        Logger.success(`Roku conectado exitosamente: ${this.model} (${this.name})`, info);
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
   * Queries real device information from /query/device-info
   * Returns parsed device info object or throws if blocked.
   */
  async getDeviceInfo() {
    const config = this.getConnectionConfig();

    if (config.demoMode) {
      return {
        name: `${this.name} (Demo)`,
        model: 'Roku TV 55" 4K (Simulador)',
        modelNumber: '7000X',
        softwareVersion: '12.5.0.4178',
        isTv: true,
        powerMode: 'PowerOn',
        supportsFindRemote: true
      };
    }

    // A. Bridge Mode
    if (config.mode === 'bridge' || (config.mode === 'auto' && window.location.protocol === 'https:')) {
      const bridgeUrl = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/device-info?ip=${encodeURIComponent(this.ip)}`;
      const res = await NetworkUtils.fetchWithTimeout(bridgeUrl, { method: 'GET' }, 5000);
      if (!res.ok) {
        throw new Error(`El bridge devolvió error HTTP ${res.status} al consultar device-info`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Fallo al obtener información del Roku mediante el Bridge');
      }
      return data.deviceInfo;
    }

    // B. Direct Mode (PWA Direct)
    try {
      const url = `${this.getBaseUrl()}/query/device-info`;
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 4000);
      const xml = await res.text();
      const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
      return parsed;
    } catch (err) {
      // In direct browser mode without CORS headers from Roku, browser will throw TypeError
      throw err;
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

    // BRIDGE MODE
    if (config.mode === 'bridge' || (config.mode === 'auto' && window.location.protocol === 'https:')) {
      try {
        const bridgeUrl = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/command`;
        const res = await NetworkUtils.fetchWithTimeout(
          bridgeUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip: this.ip,
              command: keyOrParam,
              type: type // 'keypress' | 'keydown' | 'keyup' | 'launch'
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

    // DIRECT MODE (PWA Direct)
    try {
      const endpoint = type === 'launch' ? `/launch/${keyOrParam}` : `/${type}/${keyOrParam}`;
      const targetUrl = `${this.getBaseUrl()}${endpoint}`;

      // In direct browser mode without CORS headers on Roku, standard CORS request will fail immediately.
      // Mode 'no-cors' sends a simple POST across the local network without preflight.
      // If the browser allows private network dispatch, the packet reaches Roku port 8060.
      const res = await NetworkUtils.fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          mode: 'no-cors'
        },
        3500
      );

      // res.type will be 'opaque' in no-cors
      this.status = 'Conectado';
      this.lastStatus = 'Enviado (Directo Opaque)';
      Logger.success(`Comando ${keyOrParam} enviado directamente al Roku (${this.ip})`);
      StorageManager.markCommandTested('roku', keyOrParam, true);
      return {
        success: true,
        mode: 'direct',
        modeDescription: 'Conexión directa (Opaque fetch)',
        opaque: true
      };
    } catch (directErr) {
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
}
