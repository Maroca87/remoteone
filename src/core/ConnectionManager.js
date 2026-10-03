/**
 * RemoteOne - ConnectionManager
 * Oversees network communication mode (Direct vs Bridge) and prudent health checking.
 * Strictly avoids excessive polling while keeping status up to date.
 */

import { StorageManager } from './StorageManager.js';
import { DeviceManager } from './DeviceManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { Logger } from '../utils/Logger.js';

export class ConnectionManager {
  static checkIntervalId = null;
  static isChecking = false;
  static bridgeOnline = false;

  static init() {
    // Initial check of bridge availability
    ConnectionManager.checkBridgeHealth();

    // Health check on visibility change (when user returns to the tab/app)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        ConnectionManager.checkCurrentDeviceHealth();
      }
    });

    // Prudent polling interval: 30 seconds
    const settings = StorageManager.getSettings();
    const intervalSec = settings.pollingIntervalSeconds || 30;
    ConnectionManager.startPeriodicHealthCheck(intervalSec * 1000);
  }

  static startPeriodicHealthCheck(intervalMs = 30000) {
    if (ConnectionManager.checkIntervalId) {
      clearInterval(ConnectionManager.checkIntervalId);
    }
    ConnectionManager.checkIntervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        ConnectionManager.checkCurrentDeviceHealth();
      }
    }, intervalMs);
  }

  static stopPeriodicHealthCheck() {
    if (ConnectionManager.checkIntervalId) {
      clearInterval(ConnectionManager.checkIntervalId);
      ConnectionManager.checkIntervalId = null;
    }
  }

  /**
   * Pings the configured Local Bridge endpoint ONLY if a URL is explicitly configured.
   */
  static async checkBridgeHealth() {
    const settings = StorageManager.getSettings();
    const bridgeUrl = (settings.bridgeUrl || '').trim();

    if (!bridgeUrl) {
      ConnectionManager.bridgeOnline = false;
      return false;
    }

    try {
      const res = await NetworkUtils.fetchWithTimeout(`${bridgeUrl.replace(/\/$/, '')}/api/status`, { method: 'GET' }, 2000);
      if (res.ok) {
        const data = await res.json();
        ConnectionManager.bridgeOnline = true;
        Logger.info(`Local Bridge en línea (${bridgeUrl})`);
        window.dispatchEvent(new CustomEvent('remoteone:bridge_status', { detail: { online: true, url: bridgeUrl, data } }));
        return true;
      }
    } catch (e) {
      ConnectionManager.bridgeOnline = false;
      window.dispatchEvent(new CustomEvent('remoteone:bridge_status', { detail: { online: false, url: bridgeUrl } }));
      return false;
    }
    ConnectionManager.bridgeOnline = false;
    return false;
  }

  /**
   * Performs an honest health check of the active device.
   */
  static async checkCurrentDeviceHealth() {
    const driver = DeviceManager.getActiveDriver();
    if (!driver || ConnectionManager.isChecking) return;

    ConnectionManager.isChecking = true;
    const oldStatus = driver.status;

    try {
      if (driver.brand === 'roku') {
        const isReachable = await driver.verifyReachable();
        if (isReachable) {
          driver.status = 'Conectado';
          if (oldStatus !== 'Conectado') {
            Logger.info(`Roku (${driver.name}) disponible en la red local Wi-Fi.`);
          }
        } else {
          driver.status = 'Desconectado';
        }
      } else {
        // Xiaomi pending validation
        driver.status = 'Validación pendiente';
      }
    } catch (err) {
      if (oldStatus === 'Conectado') {
        Logger.warn(`El TV (${driver.name}) no respondió en la red local.`);
        driver.status = 'Desconectado';
      }
    } finally {
      ConnectionManager.isChecking = false;
      DeviceManager.updateDevice(driver.id, { status: driver.status });
      window.dispatchEvent(new CustomEvent('remoteone:device_status_changed', {
        detail: { id: driver.id, status: driver.status }
      }));
    }
  }

  /**
   * Returns current active communication mode descriptor.
   */
  static getCurrentModeInfo() {
    const settings = StorageManager.getSettings();
    const mode = settings.connectionMode || 'auto';
    const hasBridgeUrl = Boolean((settings.bridgeUrl || '').trim());

    let resolvedMode = 'direct';
    let label = 'PWA Directo (Wi-Fi)';
    let badgeClass = 'status-direct';

    if (settings.demoMode) {
      resolvedMode = 'demo';
      label = 'Modo Simulación';
      badgeClass = 'status-demo';
    } else if (mode === 'bridge' && hasBridgeUrl) {
      resolvedMode = 'bridge';
      label = ConnectionManager.bridgeOnline ? 'Bridge LAN Activo' : 'Bridge Configurado';
      badgeClass = 'status-bridge';
    } else if (mode === 'direct') {
      resolvedMode = 'direct';
      label = 'PWA Directo';
      badgeClass = 'status-direct';
    } else {
      // mode === 'auto' (Default)
      // PRIORITY: Direct PWA first!
      if (ConnectionManager.bridgeOnline && hasBridgeUrl) {
        resolvedMode = 'bridge';
        label = 'Automático (Bridge LAN)';
        badgeClass = 'status-bridge';
      } else {
        resolvedMode = 'direct';
        label = 'Directo (Wi-Fi)';
        badgeClass = 'status-direct';
      }
    }

    return {
      configuredMode: mode,
      resolvedMode,
      label,
      badgeClass,
      bridgeOnline: ConnectionManager.bridgeOnline,
      bridgeUrl: settings.bridgeUrl || ''
    };
  }
}
