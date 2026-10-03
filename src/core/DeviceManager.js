/**
 * RemoteOne - DeviceManager
 * Orchestrates registered devices, driver lifecycles, explicit capabilities,
 * and completely decouples device records from dynamic live status (online/offline/power).
 */

import { StorageManager } from './StorageManager.js';
import { RokuDriver } from '../devices/roku/RokuDriver.js';
import { XiaomiDriver } from '../devices/xiaomi/XiaomiDriver.js';
import { GenericDriver } from '../devices/generic/GenericDriver.js';
import { Logger } from '../utils/Logger.js';

export class DeviceManager {
  static drivers = new Map(); // id -> Driver instance
  static activeDriver = null;
  static deviceStates = new Map(); // id -> { networkStatus, powerStatus, lastChecked, details }
  static lastGlobalCheck = 0;

  static init() {
    const lastId = StorageManager.getLastDeviceId();
    const devices = StorageManager.getDevices();

    // Initialize all device runtime states as 'unknown' (never assume previous session's connection)
    devices.forEach((d) => {
      DeviceManager.deviceStates.set(d.id, {
        networkStatus: 'unknown',
        powerStatus: 'unknown',
        lastChecked: null,
        details: 'Not checked in current session'
      });
    });

    if (lastId && devices.some((d) => d.id === lastId)) {
      DeviceManager.setActiveDevice(lastId);
    } else if (devices.length > 0) {
      DeviceManager.setActiveDevice(devices[0].id);
    }

    // Single prudent check of active device after app load
    setTimeout(() => {
      const active = DeviceManager.getActiveDriver();
      if (active) {
        DeviceManager.checkDeviceState(active.id);
      }
    }, 600);
  }

  /**
   * Instantiates the appropriate driver based on manufacturer/protocol.
   * @param {Object} deviceData 
   * @returns {RokuDriver|XiaomiDriver|GenericDriver}
   */
  static createDriver(deviceData) {
    const brand = (deviceData.brand || '').toLowerCase();
    switch (brand) {
      case 'roku':
        return new RokuDriver(deviceData);
      case 'xiaomi':
        return new XiaomiDriver(deviceData);
      case 'samsung':
      case 'lg':
      case 'sony':
      case 'generic':
      default:
        return new GenericDriver(deviceData);
    }
  }

  /**
   * Gets or instantiates driver for a device ID.
   * @param {string} id 
   */
  static getDriver(id) {
    if (DeviceManager.drivers.has(id)) {
      return DeviceManager.drivers.get(id);
    }
    const data = StorageManager.getDevice(id);
    if (!data) return null;
    const driver = DeviceManager.createDriver(data);
    DeviceManager.drivers.set(id, driver);
    return driver;
  }

  /**
   * Sets the active device by ID.
   * @param {string} id 
   */
  static setActiveDevice(id) {
    const device = StorageManager.getDevice(id);
    if (!device) {
      DeviceManager.activeDriver = null;
      StorageManager.setLastDeviceId(null);
      return null;
    }

    const driver = DeviceManager.getDriver(id);
    DeviceManager.activeDriver = driver;
    StorageManager.setLastDeviceId(id);
    Logger.info(`Dispositivo activo: ${device.name} (${device.brand.toUpperCase()}) en ${device.ip}`);

    window.dispatchEvent(new CustomEvent('remoteone:active_device_changed', {
      detail: { device, driver }
    }));

    // Trigger check for the newly activated device
    DeviceManager.checkDeviceState(id);

    return driver;
  }

  static getActiveDriver() {
    if (!DeviceManager.activeDriver) {
      const lastId = StorageManager.getLastDeviceId();
      if (lastId) {
        DeviceManager.setActiveDevice(lastId);
      }
    }
    return DeviceManager.activeDriver;
  }

  static getActiveDevice() {
    const driver = DeviceManager.getActiveDriver();
    if (!driver) return null;
    const record = StorageManager.getDevice(driver.id) || {
      id: driver.id,
      name: driver.name,
      room: driver.room,
      brand: driver.brand,
      ip: driver.ip,
      isTv: driver.isTv,
      model: driver.model
    };
    const runtimeState = DeviceManager.getDeviceState(driver.id);
    return {
      ...record,
      ...runtimeState
    };
  }

  /**
   * Returns live dynamic state for a device ID.
   * Explicitly separates networkStatus from powerStatus.
   * @param {string} id 
   */
  static getDeviceState(id) {
    if (DeviceManager.deviceStates.has(id)) {
      return DeviceManager.deviceStates.get(id);
    }
    const defaultState = {
      networkStatus: 'unknown',
      powerStatus: 'unknown',
      lastChecked: null,
      details: 'Sin verificar'
    };
    DeviceManager.deviceStates.set(id, defaultState);
    return defaultState;
  }

  /**
   * Updates in-memory runtime state.
   * Never modifies persistent storage configuration.
   */
  static updateDeviceRuntimeState(id, patch) {
    const current = DeviceManager.getDeviceState(id);
    const updated = { ...current, ...patch };
    DeviceManager.deviceStates.set(id, updated);

    window.dispatchEvent(new CustomEvent('remoteone:device_status_changed', {
      detail: { id, state: updated }
    }));

    return updated;
  }

  /**
   * Performs an honest real check of a device's network reachability and power status.
   * @param {string} id 
   * @param {boolean} force 
   */
  static async checkDeviceState(id, force = false) {
    const driver = DeviceManager.getDriver(id);
    if (!driver) return null;

    // Check throttle (avoid checking same device multiple times within 5 seconds)
    const currentState = DeviceManager.getDeviceState(id);
    if (!force && currentState.lastChecked && (Date.now() - currentState.lastChecked.getTime() < 5000)) {
      return currentState;
    }

    DeviceManager.updateDeviceRuntimeState(id, { networkStatus: 'checking' });

    try {
      const reachability = await driver.verifyReachable();
      let power = 'unknown';

      if (reachability.online) {
        power = await driver.getPowerState();
      }

      const newState = {
        networkStatus: reachability.online ? 'online' : (reachability.status || 'offline'),
        powerStatus: power,
        lastChecked: new Date(),
        details: reachability.message || ''
      };

      DeviceManager.updateDeviceRuntimeState(id, newState);
      return newState;
    } catch (err) {
      const errorState = {
        networkStatus: 'offline',
        powerStatus: 'unknown',
        lastChecked: new Date(),
        details: err.message || 'Error al contactar el televisor'
      };
      DeviceManager.updateDeviceRuntimeState(id, errorState);
      return errorState;
    }
  }

  /**
   * Prudent refresh of all configured devices (e.g. when entering Home view).
   * Throttled to 15 seconds to avoid excessive polling.
   */
  static async checkAllDevices(force = false) {
    const now = Date.now();
    if (!force && (now - DeviceManager.lastGlobalCheck < 15000)) {
      return;
    }
    DeviceManager.lastGlobalCheck = now;

    const devices = StorageManager.getDevices();
    for (const d of devices) {
      DeviceManager.checkDeviceState(d.id, force);
    }
  }

  /**
   * Adds a newly verified and explicitly confirmed device.
   * Does NOT write 'connected' to storage.
   */
  static addDevice(deviceData) {
    const id = deviceData.id || `${deviceData.brand}_${deviceData.ip.replace(/\./g, '_')}`;
    const newDevice = {
      id,
      name: deviceData.name || `${deviceData.brand.toUpperCase()} TV`,
      room: deviceData.room || 'Habitación',
      brand: deviceData.brand || 'roku',
      vendorName: deviceData.vendorName || deviceData.manufacturer || '',
      ip: deviceData.ip,
      port: deviceData.port || (deviceData.brand === 'roku' ? 8060 : 6466),
      model: deviceData.model || 'Smart TV',
      modelNumber: deviceData.modelNumber || '',
      softwareVersion: deviceData.softwareVersion || '',
      softwareBuild: deviceData.softwareBuild || '',
      networkType: deviceData.networkType || 'wifi',
      wifiMac: deviceData.wifiMac || '',
      powerMode: deviceData.powerMode || 'Unknown',
      supportsTvPowerControl: deviceData.supportsTvPowerControl !== undefined ? deviceData.supportsTvPowerControl : true,
      supportsAudioVolumeControl: deviceData.supportsAudioVolumeControl !== undefined ? deviceData.supportsAudioVolumeControl : true,
      supportsFindRemote: deviceData.supportsFindRemote || false,
      isTv: deviceData.isTv !== undefined ? deviceData.isTv : true,
      configured: true,
      createdAt: new Date().toISOString()
    };

    StorageManager.saveDevice(newDevice);

    // Initialize driver and runtime state
    const driver = DeviceManager.createDriver(newDevice);
    DeviceManager.drivers.set(id, driver);
    DeviceManager.deviceStates.set(id, {
      networkStatus: deviceData.networkStatus || 'unknown',
      powerStatus: deviceData.powerStatus || 'unknown',
      lastChecked: new Date(),
      details: 'Device added'
    });

    if (!DeviceManager.activeDriver) {
      DeviceManager.setActiveDevice(id);
    }

    return newDevice;
  }

  static updateDevice(id, patch) {
    const existing = StorageManager.getDevice(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    StorageManager.saveDevice(updated);

    if (DeviceManager.drivers.has(id)) {
      const drv = DeviceManager.drivers.get(id);
      Object.assign(drv, patch);
    }

    return updated;
  }

  static removeDevice(id) {
    DeviceManager.drivers.delete(id);
    DeviceManager.deviceStates.delete(id);
    if (DeviceManager.activeDriver?.id === id) {
      DeviceManager.activeDriver = null;
    }
    return StorageManager.deleteDevice(id);
  }
}
