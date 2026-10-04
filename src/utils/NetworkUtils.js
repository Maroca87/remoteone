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

  /**
   * Technical diagnostic probe for direct PWA fetch (GET).
   * Strictly records request start, completion, HTTP status, headers, body,
   * TypeError, CORS block, Mixed Content, and Local Network restrictions.
   * Does NOT simulate success or conceal browser security errors.
   * @param {string} targetUrl 
   * @param {number} timeoutMs 
   * @returns {Promise<Object>}
   */
  static async testDirectPwaFetch(targetUrl, timeoutMs = 4000) {
    const startedAt = new Date();
    const startTime = performance.now();
    const runtime = NetworkUtils.getRuntimeContext();

    const report = {
      testType: 'GET (Direct PWA)',
      targetUrl,
      timestampStarted: startedAt.toISOString(),
      timestampCompleted: null,
      durationMs: null,
      runtimeContext: runtime,
      httpStatus: null,
      statusText: null,
      responseHeaders: {},
      responseBody: null,
      isOk: false,
      javascriptError: null,
      classification: null,
      rokuReachable: 'UNKNOWN',
      browserApiAccess: 'UNKNOWN',
      verdict: ''
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);

      report.durationMs = Math.round(performance.now() - startTime);
      report.timestampCompleted = new Date().toISOString();
      report.httpStatus = response.status;
      report.statusText = response.statusText;
      report.isOk = response.ok;

      // Extract response headers if readable
      try {
        response.headers.forEach((value, key) => {
          report.responseHeaders[key] = value;
        });
      } catch (hErr) {
        report.responseHeaders = { error: 'Headers unreadable' };
      }

      // Read response body
      try {
        const text = await response.text();
        report.responseBody = text;
        report.rokuReachable = 'YES';
        report.browserApiAccess = 'ALLOWED';
        report.classification = 'SUCCESS_DIRECT_ACCESS';
        report.verdict = 'Roku responded and browser JavaScript was permitted to read ECP XML.';
      } catch (bodyErr) {
        report.responseBody = null;
        report.rokuReachable = 'YES';
        report.browserApiAccess = 'BLOCKED_BODY_READ';
        report.classification = 'CORS_BODY_RESTRICTION';
        report.verdict = 'HTTP status received, but response body reading was blocked.';
      }

      return report;
    } catch (err) {
      clearTimeout(timer);
      report.durationMs = Math.round(performance.now() - startTime);
      report.timestampCompleted = new Date().toISOString();

      report.javascriptError = {
        name: err.name || 'Error',
        message: err.message || String(err),
        stack: err.stack || null
      };

      // Technical classification of the failure
      if (err.name === 'AbortError') {
        report.classification = 'TIMEOUT';
        report.rokuReachable = 'NO_OR_SLOW';
        report.browserApiAccess = 'TIMEOUT';
        report.verdict = `Request timed out after ${timeoutMs}ms without response.`;
      } else if (runtime.isHttps && targetUrl.startsWith('http:')) {
        report.classification = 'MIXED_CONTENT_BLOCKED';
        report.rokuReachable = 'UNKNOWN';
        report.browserApiAccess = 'BLOCKED_BY_MIXED_CONTENT';
        report.verdict = 'Browser strictly blocked HTTP request from an HTTPS page (Mixed Content security policy).';
      } else if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        report.classification = 'CORS_OR_LOCAL_NETWORK_RESTRICTION';
        report.rokuReachable = 'LIKELY_YES_AT_TCP_LEVEL';
        report.browserApiAccess = 'BLOCKED';
        report.verdict = 'Roku is reachable at network level, but browser JavaScript access to ECP response is BLOCKED by CORS (Roku does not send Access-Control-Allow-Origin headers).';
      } else {
        report.classification = 'NETWORK_ERROR';
        report.rokuReachable = 'UNKNOWN';
        report.browserApiAccess = 'BLOCKED';
        report.verdict = `Network request failed: ${err.message}`;
      }

      return report;
    }
  }

  /**
   * Technical diagnostic probe for direct ECP command (POST /keypress/<KEY> without body).
   * Explicitly separates "Command sent" from "Command confirmed".
   * Never marks opaque responses as "Command successful".
   * @param {string} targetUrl 
   * @param {number} timeoutMs 
   * @returns {Promise<Object>}
   */
  static async testDirectPwaPost(targetUrl, timeoutMs = 3500) {
    const startedAt = new Date();
    const startTime = performance.now();
    const runtime = NetworkUtils.getRuntimeContext();

    const report = {
      testType: 'POST (Direct ECP Command)',
      targetUrl,
      timestampStarted: startedAt.toISOString(),
      timestampCompleted: null,
      durationMs: null,
      runtimeContext: runtime,
      standardFetch: {
        attempted: true,
        httpStatus: null,
        error: null,
        commandSent: false,
        commandConfirmed: false
      },
      noCorsProbe: {
        attempted: false,
        responseType: null,
        commandSent: false,
        commandConfirmed: false,
        note: 'no-cors mode only probes socket dispatch; it CANNOT confirm execution or read response'
      },
      verdict: ''
    };

    // 1. Attempt standard POST
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        signal: controller.signal
      });
      clearTimeout(timer);

      report.durationMs = Math.round(performance.now() - startTime);
      report.timestampCompleted = new Date().toISOString();
      report.standardFetch.httpStatus = res.status;
      report.standardFetch.commandSent = true;
      report.standardFetch.commandConfirmed = res.ok;
      report.verdict = res.ok ? 'Command sent and confirmed (HTTP 200)' : `Command sent, HTTP ${res.status}`;
      return report;
    } catch (err) {
      clearTimeout(timer);
      report.standardFetch.error = {
        name: err.name,
        message: err.message
      };

      if (err.name === 'AbortError') {
        report.durationMs = Math.round(performance.now() - startTime);
        report.timestampCompleted = new Date().toISOString();
        report.verdict = 'Command timed out on port 8060';
        return report;
      }

      // If standard fetch threw TypeError due to missing CORS headers on response:
      // Test if no-cors allows socket dispatch
      report.noCorsProbe.attempted = true;
      const noCorsController = new AbortController();
      const noCorsTimer = setTimeout(() => noCorsController.abort(), 2000);

      try {
        const noCorsRes = await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          signal: noCorsController.signal
        });
        clearTimeout(noCorsTimer);
        report.durationMs = Math.round(performance.now() - startTime);
        report.timestampCompleted = new Date().toISOString();
        report.noCorsProbe.responseType = noCorsRes.type; // 'opaque'
        report.noCorsProbe.commandSent = true;
        report.noCorsProbe.commandConfirmed = false; // Strictly false: cannot verify opaque response!
        report.verdict = 'Command sent (unconfirmed): Browser dispatched POST to socket, but CORS prevented reading response confirmation.';
      } catch (noCorsErr) {
        clearTimeout(noCorsTimer);
        report.durationMs = Math.round(performance.now() - startTime);
        report.timestampCompleted = new Date().toISOString();
        report.noCorsProbe.commandSent = false;
        report.verdict = `Command failed to dispatch: ${noCorsErr.message}`;
      }

      return report;
    }
  }
}

