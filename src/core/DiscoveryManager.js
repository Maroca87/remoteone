/**
 * RemoteOne - DiscoveryManager
 * Coordinates discovery across drivers.
 */

import { RokuDiscovery } from '../devices/roku/RokuDiscovery.js';
import { XiaomiDiscovery } from '../devices/xiaomi/XiaomiDiscovery.js';
import { Logger } from '../utils/Logger.js';

export class DiscoveryManager {
  static async discoverByBrand(brand = 'roku') {
    Logger.info(`Iniciando descubrimiento para marca: ${brand}`);
    switch (brand.toLowerCase()) {
      case 'roku':
        return await RokuDiscovery.discover();
      case 'xiaomi':
        return await XiaomiDiscovery.discover();
      default:
        return {
          success: false,
          devices: [],
          message: `El fabricante ${brand} no cuenta aún con descubrimiento automático implementado.`
        };
    }
  }

  static async inspectIp(brand, ip) {
    if (brand.toLowerCase() === 'roku') {
      return await RokuDiscovery.inspectTargetIp(ip);
    }
    return {
      ip,
      brand,
      name: `${brand.toUpperCase()} TV`,
      room: 'Sala',
      isTv: true,
      lastDiscovered: new Date().toISOString()
    };
  }
}
