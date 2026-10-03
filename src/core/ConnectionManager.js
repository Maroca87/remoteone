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
   * Pings the configured Local Bridge endpoint.
   */
  static async checkBridgeHealth() {
    const settings = StorageManager.getSettings();
    const bridgeUrl = settings.bridgeUrl || 'http://localhost:3000';

    try {
      const res = await NetworkUtils.fetchWithTimeout(`${bridgeUrl.replace(/\/$/, '')}/api/status`, { method: 'GET' }, 2500);
      if (res.ok) {
        const data = await res.json();
        ConnectionManager.bridgeOnline = true;
        Logger.info(`Local Bridge en línea (${bridgeUrl}): v${data.version || '1.0'}`);
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
        const info = await driver.getDeviceInfo();
        if (info) {
          driver.status = 'Conectado';
          if (oldStatus !== 'Conectado') {
            Logger.info(`Roku (${driver.name}) disponible en la red local.`);
          }
        }
      } else {
        // Xiaomi or other pending
        driver.status = 'No compatible';
      }
    } catch (err) {
      if (oldStatus === 'Conectado') {
        Logger.warn(`El TV (${driver.name}) ya no responde en la red local.`);
        driver.status = 'Desconectado';
      }
    } finally {
      ConnectionManager.isChecking = false;
      // Update stored device status
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
    const isHttps = window.location.protocol === 'https:';

    let resolvedMode = 'direct';
    let label = 'Conexión directa';
    let badgeClass = 'bg-primary';

    if (settings.demoMode) {
      resolvedMode = 'demo';
      label = 'Modo Demostración';
      badgeClass = 'bg-warning text-dark';
    } else if (mode === 'bridge') {
      resolvedMode = 'bridge';
      label = 'Bridge local';
      badgeClass = 'bg-info text-dark';
    } else if (mode === 'auto') {
      if (isHttps) {
        resolvedMode = 'bridge';
        label = 'Bridge local (HTTPS activo)';
        badgeClass = 'bg-info text-dark';
      } else {
        resolvedMode = ConnectionManager.bridgeOnline ? 'bridge' : 'direct';
        label = ConnectionManager.bridgeOnline ? 'Bridge local' : 'Conexión directa';
        badgeClass = ConnectionManager.bridgeOnline ? 'bg-info text-dark' : 'bg-primary';
      }
    }

    return {
      configuredMode: mode,
      resolvedMode,
      label,
      badgeClass,
      bridgeOnline: ConnectionManager.bridgeOnline,
      bridgeUrl: settings.bridgeUrl
    };
  }
}
