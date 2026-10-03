/**
 * RemoteOne - XiaomiDiscovery
 * Discovery logic for Xiaomi / Android TV devices.
 * Android TV advertises via mDNS service: _androidtvremote2._tcp.local
 */

import { Logger } from '../../utils/Logger.js';

export class XiaomiDiscovery {
  static async discover() {
    Logger.info('Descubrimiento de Xiaomi TV solicitado.');
    return {
      success: false,
      devices: [],
      reason: 'xiaomi_discovery_mdns_pending',
      message: 'Los televisores Xiaomi con Android TV se anuncian en la red mediante mDNS (_androidtvremote2._tcp.local). El descubrimiento automático requiere el bridge local con soporte DNS-SD/mDNS.'
    };
  }
}
