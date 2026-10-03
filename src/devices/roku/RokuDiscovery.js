/**
 * RemoteOne - RokuDiscovery
 * Official Roku SSDP Discovery implementation.
 * Transparently handles browser UDP constraints by delegating multicast SSDP to Local Bridge,
 * and provides targeted device verification when entering IPs.
 */

import { NetworkUtils } from '../../utils/NetworkUtils.js';
import { Logger } from '../../utils/Logger.js';
import { StorageManager } from '../../core/StorageManager.js';

export class RokuDiscovery {
  /**
   * Performs SSDP discovery for Roku devices.
   * If Local Bridge is available, executes real UDP multicast M-SEARCH (ST: roku:ecp).
   * If running in pure browser without bridge, returns clear explanation of browser UDP limitations.
   */
  static async discover() {
    const settings = StorageManager.getSettings();
    const bridgeUrl = (settings.bridgeUrl || '').trim();

    Logger.info('Iniciando descubrimiento de dispositivos Roku...');

    // 1. Check if Demo Mode is on
    if (settings.demoMode) {
      Logger.info('[DEMO] Dispositivo Roku simulado descubierto.');
      return {
        success: true,
        devices: [
          {
            id: 'roku_demo_living',
            name: 'Roku Sala (Demo)',
            room: 'Sala',
            brand: 'roku',
            ip: '192.168.1.105',
            port: 8060,
            model: 'Roku Streaming Stick 4K',
            softwareVersion: '12.5.0',
            isTv: false,
            powerMode: 'PowerOn',
            lastDiscovered: new Date().toISOString()
          },
          {
            id: 'roku_demo_bedroom',
            name: 'Roku Habitación (Demo)',
            room: 'Habitación',
            brand: 'roku',
            ip: '192.168.1.110',
            port: 8060,
            model: 'TCL Roku TV 50"',
            softwareVersion: '12.5.2',
            isTv: true,
            powerMode: 'PowerOn',
            lastDiscovered: new Date().toISOString()
          }
        ],
        message: 'Dispositivos descubiertos en Modo Demostración'
      };
    }

    // 2. Attempt SSDP via Local Bridge (if configured)
    if (bridgeUrl) {
      try {
        const url = `${bridgeUrl.replace(/\/$/, '')}/api/discover?timeout=3500`;
        Logger.info(`Consultando descubrimiento SSDP al bridge local: ${url}`);
        
        const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 5000);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.devices)) {
            Logger.success(`SSDP Bridge encontró ${data.devices.length} dispositivo(s) Roku`, data.devices);
            return {
              success: true,
              devices: data.devices.map((d) => ({
                id: d.id || `roku_${d.ip.replace(/\./g, '_')}`,
                name: d.name || d.friendlyName || 'Roku TV',
                room: 'Habitación',
                brand: 'roku',
                ip: d.ip,
                port: d.port || 8060,
                model: d.model || 'Roku TV',
                modelNumber: d.modelNumber || '',
                softwareVersion: d.softwareVersion || '',
                isTv: d.isTv !== undefined ? d.isTv : true,
                powerMode: d.powerMode || 'Unknown',
                udn: d.udn || '',
                status: 'Conectado',
                lastDiscovered: new Date().toISOString()
              })),
              source: 'ssdp_bridge'
            };
          }
        }
      } catch (err) {
        Logger.warn('El Bridge local no respondió a la búsqueda SSDP.');
      }
    }

    // 3. Fallback explanation when Bridge is not running
    return {
      success: false,
      devices: [],
      source: 'browser_direct',
      reason: 'browser_udp_limitation',
      message: 'Los navegadores web estándar no tienen acceso a sockets UDP multicast para emitir SSDP (239.255.255.250:1900). Para descubrir dispositivos automáticamente por SSDP ejecuta el Local Bridge (/bridge), o introduce la IP del Roku manualmente.'
    };
  }

  /**
   * Targeted inspection of a specific IP provided by the user.
   * Does NOT sweep 254 IPs, respecting requirement 6.
   * @param {string} ip 
   */
  static async inspectTargetIp(ip) {
    if (!NetworkUtils.isValidIPv4(ip)) {
      throw new Error('Dirección IPv4 no válida');
    }

    Logger.info(`Inspeccionando IP específica de Roku: ${ip}:8060...`);
    const settings = StorageManager.getSettings();

    // If bridge is available, use it to inspect without browser CORS restrictions
    if (settings.bridgeUrl) {
      try {
        const url = `${settings.bridgeUrl.replace(/\/$/, '')}/api/proxy/roku/device-info?ip=${encodeURIComponent(ip)}`;
        const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 4000);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.deviceInfo) {
            return {
              ip,
              name: data.deviceInfo.name || 'Roku TV',
              brand: 'roku',
              port: 8060,
              model: data.deviceInfo.model || 'Roku TV',
              modelNumber: data.deviceInfo.modelNumber || '',
              softwareVersion: data.deviceInfo.softwareVersion || '',
              isTv: data.deviceInfo.isTv,
              powerMode: data.deviceInfo.powerMode || 'Unknown',
              udn: data.deviceInfo.udn || '',
              lastDiscovered: new Date().toISOString()
            };
          }
        }
      } catch (e) {
        // Bridge not reachable, continue to direct
      }
    }

    // Direct mode inspection (iPhone -> Wi-Fi -> Roku)
    try {
      const url = `http://${ip}:8060/query/device-info`;
      const res = await NetworkUtils.fetchWithTimeout(url, { method: 'GET' }, 3000);
      const xml = await res.text();
      const parsed = NetworkUtils.parseRokuDeviceInfoXml(xml);
      return {
        ip,
        name: parsed.name || 'Roku TV',
        brand: 'roku',
        port: 8060,
        model: parsed.model || 'Roku TV',
        modelNumber: parsed.modelNumber || '',
        softwareVersion: parsed.softwareVersion || '',
        isTv: parsed.isTv !== undefined ? parsed.isTv : true,
        powerMode: parsed.powerMode || 'Unknown',
        udn: parsed.udn || '',
        status: 'Conectado',
        lastDiscovered: new Date().toISOString()
      };
    } catch (err) {
      // Direct browser fetch cannot read XML body if CORS headers are missing,
      // but probe checks if host is active on Wi-Fi port 8060:
      try {
        await NetworkUtils.fetchWithTimeout(`http://${ip}:8060/`, { method: 'GET', mode: 'no-cors' }, 2500);
        return {
          ip,
          name: 'Roku Habitación',
          brand: 'roku',
          port: 8060,
          model: 'Roku TV',
          isTv: true,
          status: 'Conectado',
          lastDiscovered: new Date().toISOString()
        };
      } catch (directErr) {
        throw new Error(`No se pudo comunicar con el Roku en ${ip}:8060. Asegúrate de que el televisor esté encendido y en la misma red Wi-Fi.`);
      }
    }
  }
}
