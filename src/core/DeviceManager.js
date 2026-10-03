/**
 * RemoteOne - DeviceManager
 * Orchestrates registered devices and driver lifecycles.
 */

import { StorageManager } from './StorageManager.js';
import { RokuDriver } from '../devices/roku/RokuDriver.js';
import { XiaomiDriver } from '../devices/xiaomi/XiaomiDriver.js';
import { Logger } from '../utils/Logger.js';

export class DeviceManager {
  static drivers = new Map(); // id -> Driver instance
  static activeDriver = null;

  static init() {
    // Restore or select initial active device
    const lastId = StorageManager.getLastDeviceId();
    const devices = StorageManager.getDevices();

    if (lastId && devices.some((d) => d.id === lastId)) {
      DeviceManager.setActiveDevice(lastId);
    } else if (devices.length > 0) {
      DeviceManager.setActiveDevice(devices[0].id);
    }
  }

  /**
   * Instantiates the appropriate driver for a brand.
   * @param {Object} deviceData 
   * @returns {RokuDriver|XiaomiDriver}
   */
  static createDriver(deviceData) {
    const brand = (deviceData.brand || '').toLowerCase();
    switch (brand) {
      case 'roku':
        return new RokuDriver(deviceData);
      case 'xiaomi':
        return new XiaomiDriver(deviceData);
      default:
        Logger.warn(`Fabricante "${brand}" no tiene driver dedicado. Usando driver genérico.`);
        return new RokuDriver(deviceData); // Fallback
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
    Logger.info(`Dispositivo activo cambiado a: ${device.name} (${device.brand.toUpperCase()}) en ${device.ip}`);

    window.dispatchEvent(new CustomEvent('remoteone:active_device_changed', {
      detail: { device, driver }
    }));

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
    return StorageManager.getDevice(driver.id) || {
      id: driver.id,
      name: driver.name,
      room: driver.room,
      brand: driver.brand,
      ip: driver.ip,
      isTv: driver.isTv,
      model: driver.model,
      status: driver.status
    };
  }

  static addDevice(deviceData) {
    const id = deviceData.id || `${deviceData.brand}_${deviceData.ip.replace(/\./g, '_')}`;
    const newDevice = {
      id,
      name: deviceData.name || `${deviceData.brand.toUpperCase()} TV`,
      room: deviceData.room || 'Habitación',
      brand: deviceData.brand || 'roku',
      ip: deviceData.ip,
      port: deviceData.port || (deviceData.brand === 'roku' ? 8060 : 6466),
      model: deviceData.model || 'Smart TV',
      softwareVersion: deviceData.softwareVersion || '',
      isTv: deviceData.isTv !== undefined ? deviceData.isTv : true,
      status: 'Desconectado',
      createdAt: new Date().toISOString()
    };

    StorageManager.saveDevice(newDevice);
    // Create and cache driver
    const driver = DeviceManager.createDriver(newDevice);
    DeviceManager.drivers.set(id, driver);

    // If it's the only device or no active device, make it active
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

    // Refresh driver instance if cached
    if (DeviceManager.drivers.has(id)) {
      const drv = DeviceManager.drivers.get(id);
      Object.assign(drv, patch);
    }

    return updated;
  }

  static removeDevice(id) {
    DeviceManager.drivers.delete(id);
    if (DeviceManager.activeDriver?.id === id) {
      DeviceManager.activeDriver = null;
    }
    return StorageManager.deleteDevice(id);
  }
}
