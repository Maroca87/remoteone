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
   * @param {string} xmlString 
   * @returns {Object}
   */
  static parseRokuDeviceInfoXml(xmlString) {
    const result = {
      rawXml: xmlString,
      isTv: false
    };

    if (!xmlString || typeof xmlString !== 'string') return result;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      const root = doc.querySelector('device-info');
      if (!root) return result;

      // Extract child nodes
      for (const child of root.children) {
        const key = child.tagName;
        const val = child.textContent.trim();
        result[key] = val;
      }

      // Convert common fields to friendly names
      result.name = result['user-device-name'] || result['friendly-device-name'] || result['default-device-name'] || 'Roku Device';
      result.model = result['model-name'] || result['model-number'] || 'Roku';
      result.modelNumber = result['model-number'] || '';
      result.softwareVersion = result['software-version'] || '';
      result.isTv = (result['is-tv'] || '').toLowerCase() === 'true';
      result.isStick = (result['is-stick'] || '').toLowerCase() === 'true';
      result.powerMode = result['power-mode'] || 'Unknown';
      result.supportsFindRemote = (result['supports-find-remote'] || '').toLowerCase() === 'true';
      result.wifiMac = result['wifi-mac'] || '';
      result.ethernetMac = result['ethernet-mac'] || '';
      result.networkType = result['network-type'] || 'wifi';
      result.udn = result['udn'] || '';
      result.serialNumber = result['serial-number'] || '';
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
