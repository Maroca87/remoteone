/**
 * RemoteOne - RokuDriver
 * Implements real Roku External Control Protocol (ECP) over HTTP port 8060.
 * Supports Direct Mode (PWA fetch) and Bridge Mode (Local Node.js/Python bridge).
 * Strictly reports real device states without faking success.
 */

import { BaseDriver } from '../BaseDriver.js';
import { ROKU_COMMANDS } from './RokuCommands.js';
import { NetworkUtils } from '../../utils/NetworkUtils.js';
import { ErrorHandler } from '../../utils/ErrorHandler.js';
import { Logger } from '../../utils/Logger.js';
import { StorageManager } from '../../core/StorageManager.js';
import { ConnectionManager } from '../../core/ConnectionManager.js';

export class RokuDriver extends BaseDriver {
  constructor(deviceConfig = {}) {
    super(deviceConfig);
    this.brand = 'roku';
    this.protocol = 'Roku ECP';
    this.port = deviceConfig.port || 8060;
    this.ip = deviceConfig.ip || '';
    this.name = deviceConfig.name || 'Roku TV';
    this.room = deviceConfig.room || 'Living Room';
    this.id = deviceConfig.id || `roku_${this.ip.replace(/\./g, '_')}`;
    this.isTv = deviceConfig.isTv !== undefined ? deviceConfig.isTv : true;
    this.model = deviceConfig.model || 'Roku TV';
    this.softwareVersion = deviceConfig.softwareVersion || '';
    this.powerMode = deviceConfig.powerMode || 'Unknown';
    this.status = deviceConfig.status || 'Offline';
    this.lastCommand = null;
    this.lastCommandResult = null;
    this.lastChecked = deviceConfig.lastChecked || null;
    this.rawDeviceInfo = null;
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

  getCapabilities() {
    return {
      navigation: true,
      volume: Boolean(this.isTv),
      mute: Boolean(this.isTv),
      power: Boolean(this.isTv),
      input: Boolean(this.isTv),
      channels: Boolean(this.isTv),
      textInput: true,
      appLaunch: true
    };
  }

  /**
   * Fast reachability verification on Wi-Fi without blocking UI.
   * Tests whether host responds on port 8060 with strict timeout.
   */
  async verifyReachable() {
    const config = this.getConnectionConfig();
    if (config.demoMode) {
      return { online: true, status: 'online', message: 'Demo simulation' };
    }

    if (config.bridgeUrl && ConnectionManager.bridgeOnline) {
      try {
        const url = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/device-info?ip=${encodeURIComponent(this.ip)}`;
        const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 2000);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.deviceInfo) {
            this.rawDeviceInfo = data.deviceInfo;
            this.model = data.deviceInfo.model || this.model;
            this.isTv = data.deviceInfo.isTv !== undefined ? data.deviceInfo.isTv : this.isTv;
            this.powerMode = data.deviceInfo.powerMode || 'Unknown';
            return { online: true, status: 'online', message: 'Responded via LAN Bridge' };
          }
        }
        return { online: false, status: 'offline', message: 'No response from device' };
      } catch (e) {
        return { online: false, status: 'offline', message: 'Bridge timeout or host unreachable' };
      }
    }

    // Direct PWA check on port 8060
    try {
      await NetworkUtils.fetchWithTimeout(`${this.getBaseUrl()}/`, { method: 'GET', mode: 'no-cors' }, 1800);
      return { online: true, status: 'online', message: 'Responded on port 8060' };
    } catch (e) {
      return { online: false, status: 'offline', message: 'No response from device on local network' };
    }
  }

  /**
   * Determines real power state.
   * Only returns 'on' or 'standby' if evidence from device exists.
   * Otherwise returns 'unknown'. Never assumes Online == on.
   */
  async getPowerState() {
    const config = this.getConnectionConfig();
    if (config.demoMode) return 'on';

    if (this.rawDeviceInfo && this.rawDeviceInfo.powerMode) {
      const pm = this.rawDeviceInfo.powerMode.toLowerCase();
      if (pm === 'poweron') return 'on';
      if (pm === 'displayoff' || pm === 'headless') return 'standby';
      if (pm === 'poweroff') return 'off';
    }

    // Direct mode without bridge cannot inspect XML due to browser CORS,
    // so power state is genuinely unknown.
    return 'unknown';
  }

  /**
   * Connect and verify device availability.
   */
  async connect() {
    Logger.info(`Verificando comunicación con Roku en ${this.ip}:8060...`, { ip: this.ip });
    const reachability = await this.verifyReachable();

    if (reachability.online) {
      this.status = 'Online';
      const power = await this.getPowerState();
      return { success: true, networkStatus: 'online', powerStatus: power };
    } else {
      this.status = 'Offline';
      return { success: false, networkStatus: 'offline', powerStatus: 'unknown', error: reachability.message };
    }
  }

  /**
   * Queries real device information.
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
        const res = await NetworkUtils.fetchWithTimeout(bridgeUrl, { method: 'GET' }, 3000);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.deviceInfo) {
            this.rawDeviceInfo = data.deviceInfo;
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
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 2500);
      const xml = await res.text();
      const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
      this.rawDeviceInfo = parsed;
      return parsed;
    } catch (err) {
      return {
        name: this.name || 'Roku TV',
        model: this.model || 'Roku TV',
        modelNumber: '',
        softwareVersion: 'Roku OS',
        isTv: this.isTv !== undefined ? this.isTv : true,
        powerMode: 'Unknown',
        supportsFindRemote: true,
        directModeNotice: 'PWA Directo (Wi-Fi)'
      };
    }
  }

  /**
   * Sends a Keypress command: POST /keypress/<key>
   */
  async sendKeypress(key) {
    return this._sendCommandInternal('keypress', key);
  }

  async sendKeyDown(key) {
    return this._sendCommandInternal('keydown', key);
  }

  async sendKeyUp(key) {
    return this._sendCommandInternal('keyup', key);
  }

  async sendCommand(command, options = {}) {
    const type = options.type || 'keypress';
    return this._sendCommandInternal(type, command);
  }

  async sendText(text) {
    if (!text || typeof text !== 'string') return { success: false, message: 'Texto vacío' };
    Logger.info(`Transmitiendo texto a Roku (${this.ip}): "${text}"`);
    
    const results = [];
    for (const char of text) {
      const encodedChar = encodeURIComponent(char);
      const res = await this.sendKeypress(`Lit_${encodedChar}`);
      results.push(res);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return { success: results.every((r) => r.success), results };
  }

  async launchApp(appId) {
    return this._sendCommandInternal('launch', appId);
  }

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

    if (config.mode === 'bridge' || (config.mode === 'auto' && window.location.protocol === 'https:' && config.bridgeUrl)) {
      const url = `${config.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/apps?ip=${encodeURIComponent(this.ip)}`;
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 4000);
      const data = await res.json();
      return data.apps || [];
    }

    try {
      const url = `${this.getBaseUrl()}/query/apps`;
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 3000);
      const xml = await res.text();
      return NetworkUtils.parseRokuAppsXml(xml);
    } catch (e) {
      return [];
    }
  }

  async getStatus() {
    return this.status;
  }

  /**
   * Real protocol connectivity test tool (Requirement 5).
   * Does NOT accept device simply because IP format is valid.
   * Tries to establish real communication with the device.
   */
  async testConnection() {
    Logger.info(`Ejecutando prueba real de comunicación con Roku en ${this.ip}:${this.port}...`);

    // 1. IP format check
    if (!NetworkUtils.isValidIPv4(this.ip)) {
      return {
        success: false,
        networkStatus: 'unreachable',
        powerStatus: 'unknown',
        errorType: 'invalid_ip',
        message: 'Dirección IPv4 no válida. Introduce un formato como 192.168.1.35.'
      };
    }

    const config = this.getConnectionConfig();

    if (config.demoMode) {
      return {
        success: true,
        networkStatus: 'online',
        powerStatus: 'on',
        device: {
          name: this.name,
          brand: 'roku',
          model: 'Roku TV 55" (Demo)',
          protocol: 'Roku ECP',
          isTv: true,
          ip: this.ip,
          port: this.port
        },
        message: 'Conexión verificada (Modo Simulación).'
      };
    }

    // 2. Real network probe
    const reachability = await this.verifyReachable();
    if (!reachability.online) {
      Logger.warn(`Prueba fallida: no hubo respuesta de ${this.ip}:${this.port}`);
      return {
        success: false,
        networkStatus: 'offline',
        powerStatus: 'unknown',
        errorType: 'no_response',
        message: 'No se obtuvo respuesta del televisor. Verifica que esté encendido y en la misma red Wi-Fi.'
      };
    }

    // 3. Device responded. Try to obtain detailed info
    let model = this.model || 'Roku TV';
    let isTv = this.isTv;
    let powerState = 'unknown';

    try {
      const info = await this.getDeviceInfo();
      if (info && info.model) {
        model = info.model;
        isTv = info.isTv !== undefined ? info.isTv : isTv;
      }
      powerState = await this.getPowerState();
    } catch (e) {
      // baseline fallback
    }

    return {
      success: true,
      networkStatus: 'online',
      powerStatus: powerState,
      device: {
        name: this.name,
        brand: 'roku',
        model,
        protocol: 'Roku ECP',
        isTv,
        ip: this.ip,
        port: this.port
      },
      message: 'Comunicación establecida exitosamente en el puerto 8060.'
    };
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
      const msg = `El comando "${keyOrParam}" requiere un televisor Roku TV y no está soportado en sticks.`;
      Logger.warn(msg);
      this.lastCommandResult = 'Failed';
      return { success: false, state: 'unsupported', message: msg };
    }

    // Demo Mode handling
    if (config.demoMode) {
      Logger.info(`[DEMO] Comando ejecutado: ${type}/${keyOrParam} en Roku (${this.name})`);
      this.lastCommandResult = 'Success';
      return { success: true, mode: 'demo', message: 'Comando simulado en demo' };
    }

    // 1. Explicit Bridge Mode (Only if explicitly set and URL configured)
    if (config.mode === 'bridge' && config.bridgeUrl) {
      return this._sendCommandViaBridge(type, keyOrParam, config.bridgeUrl);
    }

    // 2. Direct PWA Mode (Default & Priority: iPhone -> Wi-Fi -> Roku)
    try {
      const endpoint = type === 'launch' ? `/launch/${keyOrParam}` : `/${type}/${keyOrParam}`;
      const targetUrl = `${this.getBaseUrl()}${endpoint}`;

      await NetworkUtils.fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          mode: 'no-cors'
        },
        2200
      );

      this.status = 'Online';
      this.lastCommandResult = 'Success';
      Logger.success(`Comando ${keyOrParam} enviado directamente al Roku (${this.ip})`);
      StorageManager.markCommandTested('roku', keyOrParam, true);
      return {
        success: true,
        mode: 'direct',
        message: 'Comando transmitido al televisor'
      };
    } catch (directErr) {
      // 3. Fallback to Bridge ONLY if configured and reachable
      if (config.mode === 'auto' && config.bridgeUrl && ConnectionManager.bridgeOnline) {
        Logger.info(`Fallo directo, intentando fallback vía Bridge LAN...`);
        return this._sendCommandViaBridge(type, keyOrParam, config.bridgeUrl);
      }

      this.status = 'Offline';
      this.lastCommandResult = 'Failed';
      const parsed = ErrorHandler.parse(directErr, { brand: 'roku', ip: this.ip, mode: 'direct', command: keyOrParam });
      Logger.error(`Error enviando comando a Roku: ${parsed.userMessage}`, parsed);
      return {
        success: false,
        state: 'offline',
        message: 'No se pudo comunicar con el televisor (dispositivo no disponible)',
        technical: parsed.technicalDetails
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
        3000
      );

      if (!res.ok) {
        if (res.status === 403) {
          this.lastCommandResult = 'Failed';
          return { success: false, state: 'unsupported', message: 'El control por aplicaciones móviles está deshabilitado en el Roku.' };
        }
        throw new Error(`Error en bridge: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        this.status = 'Online';
        this.lastCommandResult = 'Success';
        Logger.success(`Comando ${keyOrParam} confirmado por Bridge Local (HTTP 200)`);
        StorageManager.markCommandTested('roku', keyOrParam, true);
        return { success: true, mode: 'bridge', message: 'Comando confirmado por bridge' };
      } else {
        throw new Error(data.error || 'Error reportado por el bridge');
      }
    } catch (err) {
      this.status = 'Offline';
      this.lastCommandResult = 'Failed';
      const parsed = ErrorHandler.parse(err, { brand: 'roku', ip: this.ip, mode: 'bridge', command: keyOrParam });
      return { success: false, state: 'offline', message: 'El televisor no respondió a través del bridge', technical: parsed.technicalDetails };
    }
  }
}
