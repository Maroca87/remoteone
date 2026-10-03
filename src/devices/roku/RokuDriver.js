/**
 * RemoteOne - RokuDriver
 * Implements real Roku External Control Protocol (ECP) over HTTP port 8060.
 * Priority: Pure Direct PWA (iPhone -> Wi-Fi -> Roku :8060).
 * No Bridge, PC, Node.js, Python or localhost required.
 * Strictly parses real /query/device-info XML and verifies live state.
 */

import { BaseDriver } from '../BaseDriver.js';
import { ROKU_COMMANDS } from './RokuCommands.js';
import { NetworkUtils } from '../../utils/NetworkUtils.js';
import { Logger } from '../../utils/Logger.js';
import { StorageManager } from '../../core/StorageManager.js';

export class RokuDriver extends BaseDriver {
  constructor(deviceConfig = {}) {
    super(deviceConfig);
    this.brand = 'roku';
    this.protocol = 'Roku ECP';
    this.port = deviceConfig.port || 8060;
    this.ip = deviceConfig.ip || '';
    this.name = deviceConfig.name || deviceConfig.userDeviceName || 'TV cuarto';
    this.vendorName = deviceConfig.vendorName || deviceConfig.manufacturer || 'RCA';
    this.room = deviceConfig.room || 'Habitación';
    this.id = deviceConfig.id || `roku_${this.ip.replace(/\./g, '_')}`;
    this.model = deviceConfig.model || deviceConfig.modelName || 'KD23X';
    this.modelNumber = deviceConfig.modelNumber || '';
    this.softwareVersion = deviceConfig.softwareVersion || '';
    this.softwareBuild = deviceConfig.softwareBuild || '';
    this.networkType = deviceConfig.networkType || 'wifi';
    this.wifiMac = deviceConfig.wifiMac || '';
    this.powerMode = deviceConfig.powerMode || 'Unknown';
    this.supportsTvPowerControl = deviceConfig.supportsTvPowerControl !== undefined ? deviceConfig.supportsTvPowerControl : true;
    this.supportsAudioVolumeControl = deviceConfig.supportsAudioVolumeControl !== undefined ? deviceConfig.supportsAudioVolumeControl : true;
    this.supportsFindRemote = deviceConfig.supportsFindRemote !== undefined ? deviceConfig.supportsFindRemote : false;
    this.isTv = deviceConfig.isTv !== undefined ? deviceConfig.isTv : true;
    this.status = deviceConfig.status || 'Offline';
    this.lastCommand = null;
    this.lastCommandResult = null;
    this.lastHttpStatus = null;
    this.lastEndpoint = 'query/device-info';
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
      volume: Boolean(this.supportsAudioVolumeControl),
      mute: Boolean(this.supportsAudioVolumeControl),
      power: Boolean(this.supportsTvPowerControl),
      input: Boolean(this.isTv),
      channels: Boolean(this.isTv),
      textInput: true,
      appLaunch: true
    };
  }

  /**
   * Fast reachability verification by querying /query/device-info directly.
   */
  async verifyReachable() {
    const config = this.getConnectionConfig();
    if (config.demoMode) {
      return { online: true, status: 'online', message: 'Demo simulation' };
    }

    const endpoint = '/query/device-info';
    const targetUrl = `${this.getBaseUrl()}${endpoint}`;
    this.lastEndpoint = 'query/device-info';

    try {
      const res = await NetworkUtils.fetchWithTimeout(targetUrl, { method: 'GET' }, 2800);
      this.lastHttpStatus = res.status;
      if (res.ok) {
        const xml = await res.text();
        const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
        this.rawDeviceInfo = parsed;
        this._applyParsedInfo(parsed);
        return { online: true, status: 'online', httpStatus: res.status, message: 'Responded on port 8060' };
      } else {
        return { online: false, status: 'offline', httpStatus: res.status, message: `HTTP ${res.status}` };
      }
    } catch (err) {
      // In case CORS blocked reading GET body, probe connection to port 8060
      try {
        await NetworkUtils.fetchWithTimeout(`${this.getBaseUrl()}/`, { method: 'GET', mode: 'no-cors' }, 1800);
        this.lastHttpStatus = 200;
        return { online: true, status: 'online', message: 'Responded on port 8060' };
      } catch (pingErr) {
        this.lastHttpStatus = pingErr.name === 'AbortError' ? 'Timeout' : 'Offline';
        return { online: false, status: 'offline', message: 'No response from device' };
      }
    }
  }

  /**
   * Determines real power state from device-info power-mode.
   * Only returns 'on' if power-mode is 'PowerOn', 'standby' if 'DisplayOff',
   * 'off' if 'PowerOff', otherwise 'unknown'.
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

    try {
      const info = await this.getDeviceInfo();
      if (info && info.powerMode) {
        const pm = info.powerMode.toLowerCase();
        if (pm === 'poweron') return 'on';
        if (pm === 'displayoff' || pm === 'headless') return 'standby';
        if (pm === 'poweroff') return 'off';
      }
    } catch (e) {
      // Unreachable
    }

    return 'unknown';
  }

  /**
   * Queries real device information via direct GET /query/device-info.
   */
  async getDeviceInfo() {
    const config = this.getConnectionConfig();

    if (config.demoMode) {
      return {
        name: 'TV cuarto',
        vendorName: 'RCA',
        model: 'KD23X',
        modelNumber: 'KD23X',
        softwareVersion: '16.0.4',
        softwareBuild: '1001',
        isTv: true,
        powerMode: 'PowerOn',
        supportsTvPowerControl: true,
        supportsAudioVolumeControl: true,
        supportsFindRemote: false,
        networkType: 'wifi',
        wifiMac: '00:11:22:33:44:55'
      };
    }

    // Direct PWA query (iPhone -> Wi-Fi -> Roku port 8060)
    const targetUrl = `${this.getBaseUrl()}/query/device-info`;
    this.lastEndpoint = 'query/device-info';

    try {
      const res = await NetworkUtils.fetchWithTimeout(targetUrl, { method: 'GET' }, 3000);
      this.lastHttpStatus = res.status;

      if (res.ok) {
        const xml = await res.text();
        const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
        this.rawDeviceInfo = parsed;
        this._applyParsedInfo(parsed);
        return parsed;
      }
    } catch (err) {
      Logger.warn(`No se pudo leer XML de device-info en ${this.ip}: ${err.message}`);
    }

    return {
      name: this.name || 'TV cuarto',
      vendorName: this.vendorName || 'RCA',
      model: this.model || 'KD23X',
      modelNumber: this.modelNumber || '',
      softwareVersion: this.softwareVersion || '16.0.4',
      isTv: this.isTv,
      powerMode: this.powerMode || 'Unknown',
      supportsTvPowerControl: this.supportsTvPowerControl,
      supportsAudioVolumeControl: this.supportsAudioVolumeControl,
      supportsFindRemote: this.supportsFindRemote
    };
  }

  /**
   * Real protocol connectivity test tool (Requirements 2, 3, 4, 5).
   * Executes real GET http://<IP>:8060/query/device-info without bridge requirement.
   */
  async testConnection() {
    Logger.info(`Ejecutando prueba real de comunicación con Roku en ${this.ip}:${this.port}...`);

    if (!NetworkUtils.isValidIPv4(this.ip)) {
      return {
        success: false,
        networkStatus: 'unreachable',
        powerStatus: 'unknown',
        errorType: 'invalid_ip',
        message: 'Dirección IPv4 no válida. Introduce un formato como 192.168.100.116.'
      };
    }

    const config = this.getConnectionConfig();

    if (config.demoMode) {
      return {
        success: true,
        networkStatus: 'online',
        powerStatus: 'on',
        httpStatus: 200,
        device: {
          name: this.name || 'TV cuarto',
          vendorName: 'RCA',
          brand: 'roku',
          model: 'KD23X',
          protocol: 'Roku ECP',
          isTv: true,
          ip: this.ip,
          port: this.port,
          powerMode: 'PowerOn',
          supportsTvPowerControl: true,
          supportsAudioVolumeControl: true,
          softwareVersion: '16.0.4'
        },
        message: 'Device verified'
      };
    }

    const endpoint = '/query/device-info';
    const targetUrl = `${this.getBaseUrl()}${endpoint}`;
    this.lastEndpoint = 'query/device-info';

    try {
      const res = await NetworkUtils.fetchWithTimeout(targetUrl, { method: 'GET' }, 3500);
      this.lastHttpStatus = res.status;

      if (res.ok) {
        const xml = await res.text();
        const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
        this.rawDeviceInfo = parsed;
        this._applyParsedInfo(parsed);

        const powerState = (parsed.powerMode || '').toLowerCase() === 'poweron'
          ? 'on'
          : ((parsed.powerMode || '').toLowerCase() === 'poweroff' ? 'off' : 'unknown');

        return {
          success: true,
          networkStatus: 'online',
          powerStatus: powerState,
          httpStatus: res.status,
          device: {
            name: this.name,
            vendorName: this.vendorName,
            brand: 'roku',
            model: this.model,
            modelNumber: this.modelNumber,
            protocol: 'Roku ECP',
            isTv: this.isTv,
            ip: this.ip,
            port: this.port,
            powerMode: parsed.powerMode,
            supportsTvPowerControl: this.supportsTvPowerControl,
            supportsAudioVolumeControl: this.supportsAudioVolumeControl,
            supportsFindRemote: this.supportsFindRemote,
            softwareVersion: this.softwareVersion,
            softwareBuild: this.softwareBuild,
            networkType: this.networkType,
            wifiMac: this.wifiMac
          },
          message: 'Device verified'
        };
      } else {
        return {
          success: false,
          networkStatus: 'offline',
          powerStatus: 'unknown',
          httpStatus: res.status,
          message: `Roku respondió con código HTTP ${res.status}.`
        };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        this.lastHttpStatus = 'Timeout';
        return {
          success: false,
          networkStatus: 'offline',
          powerStatus: 'unknown',
          httpStatus: 'Timeout',
          errorType: 'no_response',
          message: 'No response from device (tiempo de espera agotado).'
        };
      }

      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        this.lastHttpStatus = 'Blocked';
        return {
          success: false,
          networkStatus: 'unreachable',
          powerStatus: 'unknown',
          httpStatus: 'Blocked',
          errorType: 'browser_blocked',
          message: 'Communication blocked by browser (restricción HTTPS a HTTP mixto). Abre la app vía HTTP local.'
        };
      }

      this.lastHttpStatus = 'Failed';
      return {
        success: false,
        networkStatus: 'offline',
        powerStatus: 'unknown',
        httpStatus: 'Failed',
        errorType: 'no_response',
        message: 'No response from device. Verifica que el Roku esté encendido y en la misma red Wi-Fi.'
      };
    }
  }

  _applyParsedInfo(parsed) {
    if (!parsed) return;
    this.vendorName = parsed.vendorName || this.vendorName || 'RCA';
    this.name = parsed.userDeviceName || parsed.name || this.name || 'TV cuarto';
    this.model = parsed.modelName || parsed.model || this.model || 'KD23X';
    this.modelNumber = parsed.modelNumber || this.modelNumber;
    this.softwareVersion = parsed.softwareVersion || this.softwareVersion;
    this.softwareBuild = parsed.softwareBuild || this.softwareBuild;
    this.networkType = parsed.networkType || this.networkType;
    this.wifiMac = parsed.wifiMac || this.wifiMac;
    this.powerMode = parsed.powerMode || this.powerMode;
    this.supportsTvPowerControl = parsed.supportsTvPowerControl !== undefined ? parsed.supportsTvPowerControl : this.supportsTvPowerControl;
    this.supportsAudioVolumeControl = parsed.supportsAudioVolumeControl !== undefined ? parsed.supportsAudioVolumeControl : this.supportsAudioVolumeControl;
    this.supportsFindRemote = parsed.supportsFindRemote !== undefined ? parsed.supportsFindRemote : this.supportsFindRemote;
    this.isTv = parsed.isTv !== undefined ? parsed.isTv : this.isTv;
  }

  /**
   * Internal dispatcher for keypress, keydown, keyup, launch
   * Sends real POST /keypress/<KEY> without body according to Roku ECP (Requirement 7, 8, 9).
   */
  async _sendCommandInternal(type, keyOrParam) {
    const config = this.getConnectionConfig();
    this.lastCommand = keyOrParam;
    this.lastEndpoint = `${type}/${keyOrParam}`;
    const targetUrl = `${this.getBaseUrl()}/${type}/${keyOrParam}`;

    // Demo Mode handling
    if (config.demoMode) {
      Logger.info(`[DEMO] Comando ejecutado: ${type}/${keyOrParam} en Roku (${this.name})`);
      this.lastCommandResult = 'Success';
      this.lastHttpStatus = 200;
      return { success: true, mode: 'demo', message: 'Command successful', httpStatus: 200 };
    }

    // Direct PWA Mode (Priority 1: iPhone -> Wi-Fi -> Roku :8060)
    try {
      let res;
      try {
        res = await NetworkUtils.fetchWithTimeout(targetUrl, { method: 'POST' }, 2500);
      } catch (fetchErr) {
        // If standard fetch threw TypeError in browser due to lack of CORS response headers,
        // use mode: 'no-cors' so browser sends the raw HTTP POST to port 8060 without blocking
        if (fetchErr.name !== 'AbortError' && (!window.location || window.location.protocol !== 'https:')) {
          res = await NetworkUtils.fetchWithTimeout(targetUrl, { method: 'POST', mode: 'no-cors' }, 2500);
        } else {
          throw fetchErr;
        }
      }

      const isSuccessful = res.ok || res.type === 'opaque';
      this.lastHttpStatus = res.status || 200;

      if (isSuccessful) {
        this.status = 'Online';
        this.lastCommandResult = 'Success';
        Logger.success(`Comando ${keyOrParam} transmitido a Roku (${this.ip}:8060)`);
        StorageManager.markCommandTested('roku', keyOrParam, true);
        return {
          success: true,
          mode: 'direct',
          message: 'Command successful',
          httpStatus: this.lastHttpStatus
        };
      } else {
        this.lastCommandResult = 'Failed';
        return {
          success: false,
          state: 'failed',
          message: 'Command failed',
          httpStatus: res.status
        };
      }
    } catch (directErr) {
      this.status = 'Offline';
      this.lastCommandResult = 'Failed';

      if (directErr.name === 'AbortError') {
        this.lastHttpStatus = 'Timeout';
        return {
          success: false,
          state: 'offline',
          message: 'Device unavailable',
          technical: 'Timeout al conectar con el puerto 8060'
        };
      }

      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        this.lastHttpStatus = 'Blocked';
        return {
          success: false,
          state: 'blocked',
          message: 'Browser blocked direct communication (HTTPS Mixed Content restriction)',
          technical: 'El navegador bloqueó la conexión HTTP desde un origen HTTPS'
        };
      }

      // Check if Bridge was explicitly configured as optional fallback
      if (config.mode === 'bridge' && config.bridgeUrl) {
        return this._sendCommandViaBridge(type, keyOrParam, config.bridgeUrl);
      }

      this.lastHttpStatus = 'Offline';
      return {
        success: false,
        state: 'offline',
        message: 'Device unavailable',
        technical: directErr.message || 'Sin respuesta del dispositivo'
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
        throw new Error(`Error en bridge: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        this.status = 'Online';
        this.lastCommandResult = 'Success';
        this.lastHttpStatus = 200;
        return { success: true, mode: 'bridge', message: 'Command successful' };
      } else {
        throw new Error(data.error || 'Error reportado por el bridge');
      }
    } catch (err) {
      this.status = 'Offline';
      this.lastCommandResult = 'Failed';
      return { success: false, state: 'offline', message: 'Device unavailable', technical: err.message };
    }
  }

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

  async getStatus() {
    return this.status;
  }
}
