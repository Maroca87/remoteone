/**
 * RemoteOne - NetworkUtils Utility
 * Helpers for IP validation, timeouts, XML parsing, and device feedback.
 */

export class NetworkUtils {
  /**
   * Validates if a string is a valid IPv4 address.
   * @param {string} ip
   * @returns {boolean}
   */
  static isValidIPv4(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return false;
    return parts.every((p) => {
      if (!/^\d+$/.test(p)) return false;
      const num = parseInt(p, 10);
      return num >= 0 && num <= 255 && (p === '0' || !p.startsWith('0'));
    });
  }

  /**
   * Safe fetch with timeout controller.
   * @param {string} url 
   * @param {RequestInit} options 
   * @param {number} timeoutMs 
   * @returns {Promise<Response>}
   */
  static async fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Triggers haptic feedback if supported by browser/device.
   * @param {number|number[]} pattern 
   */
  static triggerHaptic(pattern = 35) {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Haptics not allowed or not supported in this context
    }
  }

  /**
   * Inspects current browser runtime context.
   */
  static getRuntimeContext() {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.')
    );
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );

    return {
      isHttps,
      isLocalhost,
      isStandalone,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };
  }

  /**
   * Helper to parse XML string into a key-value object (for Roku device-info).
   * Extracts vendor-name, model-number, model-name, user-device-name, software-version,
   * software-build, network-type, wifi-mac, power-mode, supports-tv-power-control,
   * supports-audio-volume-control, and supports-find-remote.
   * @param {string} xmlString 
   * @returns {Object}
   */
  static parseRokuDeviceInfoXml(xmlString) {
    const result = {
      rawXml: xmlString,
      isTv: true,
      powerMode: 'Unknown'
    };

    if (!xmlString || typeof xmlString !== 'string') return result;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      const root = doc.querySelector('device-info');
      if (!root) return result;

      // Extract all child tags
      for (const child of root.children) {
        const key = child.tagName;
        const val = child.textContent.trim();
        result[key] = val;
      }

      // Explicitly extract the required fields (Requirement 3)
      result.vendorName = result['vendor-name'] || result['custom-device-name'] || '';
      result.modelNumber = result['model-number'] || '';
      result.modelName = result['model-name'] || '';
      result.userDeviceName = result['user-device-name'] || result['friendly-device-name'] || result['default-device-name'] || '';
      result.softwareVersion = result['software-version'] || '';
      result.softwareBuild = result['software-build'] || '';
      result.networkType = result['network-type'] || 'wifi';
      result.wifiMac = result['wifi-mac'] || '';
      result.powerMode = result['power-mode'] || 'Unknown';
      result.supportsTvPowerControl = (result['supports-tv-power-control'] || '').toLowerCase() === 'true';
      result.supportsAudioVolumeControl = (result['supports-audio-volume-control'] || '').toLowerCase() === 'true';
      result.supportsFindRemote = (result['supports-find-remote'] || '').toLowerCase() === 'true';

      // Computed convenience properties
      result.manufacturer = result.vendorName || 'Roku';
      result.name = result.userDeviceName || result['friendly-device-name'] || 'Roku TV';
      result.model = result.modelName || result.modelNumber || 'Roku';
      result.isTv = result.supportsTvPowerControl || (result['is-tv'] || '').toLowerCase() === 'true';
      result.isStick = (result['is-stick'] || '').toLowerCase() === 'true';

      // Power state translation
      const pm = (result.powerMode || '').toLowerCase();
      if (pm === 'poweron') {
        result.powerStatus = 'on';
      } else if (pm === 'displayoff' || pm === 'headless') {
        result.powerStatus = 'standby';
      } else if (pm === 'poweroff') {
        result.powerStatus = 'off';
      } else {
        result.powerStatus = 'unknown';
      }
    } catch (err) {
      console.warn('Failed to parse Roku XML:', err);
    }

    return result;
  }

  /**
   * Helper to parse XML string from Roku /query/apps.
   * @param {string} xmlString 
   * @returns {Array<{ id: string, name: string, type: string, version: string }>}
   */
  static parseRokuAppsXml(xmlString) {
    const apps = [];
    if (!xmlString || typeof xmlString !== 'string') return apps;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      const appNodes = doc.querySelectorAll('apps > app');
      appNodes.forEach((node) => {
        apps.push({
          id: node.getAttribute('id') || '',
          name: node.textContent.trim(),
          type: node.getAttribute('type') || 'appl',
          version: node.getAttribute('version') || ''
        });
      });
    } catch (err) {
      console.warn('Failed to parse Roku Apps XML:', err);
    }

    return apps;
  }
}
