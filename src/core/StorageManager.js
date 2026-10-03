/**
 * RemoteOne - StorageManager
 * Local persistence layer using localStorage with schema validation and default seeds.
 */

export class StorageManager {
  static STORAGE_KEYS = {
    DEVICES: 'remoteone_devices',
    LAST_DEVICE: 'remoteone_last_device_id',
    FAVORITES: 'remoteone_favorites',
    MACROS: 'remoteone_macros',
    SETTINGS: 'remoteone_settings',
    COMMAND_MATRIX: 'remoteone_command_matrix'
  };

  /**
   * Initializes storage with defaults if empty.
   */
  static init() {
    if (!localStorage.getItem(StorageManager.STORAGE_KEYS.SETTINGS)) {
      const defaultSettings = {
        connectionMode: 'auto', // 'auto' | 'direct' | 'bridge'
        bridgeUrl: 'http://localhost:3000',
        demoMode: false,
        hapticFeedback: true,
        pollingIntervalSeconds: 30
      };
      StorageManager.saveSettings(defaultSettings);
    }

    if (!localStorage.getItem(StorageManager.STORAGE_KEYS.DEVICES)) {
      // Empty array initially - devices are added by user or demo mode
      localStorage.setItem(StorageManager.STORAGE_KEYS.DEVICES, JSON.stringify([]));
    }

    if (!localStorage.getItem(StorageManager.STORAGE_KEYS.FAVORITES)) {
      // Default common streaming favorites with official Roku App IDs
      const defaultFavorites = [
        { id: '12', name: 'Netflix', brand: 'roku', icon: 'netflix', type: 'app', command: '12' },
        { id: '837', name: 'YouTube', brand: 'roku', icon: 'youtube', type: 'app', command: '837' },
        { id: '13', name: 'Prime Video', brand: 'roku', icon: 'prime', type: 'app', command: '13' },
        { id: '291097', name: 'Disney+', brand: 'roku', icon: 'disney', type: 'app', command: '291097' },
        { id: 'cmd_mute', name: 'Mute', brand: 'all', icon: 'mute', type: 'command', command: 'VolumeMute' },
        { id: 'cmd_home', name: 'Home', brand: 'all', icon: 'home', type: 'command', command: 'Home' }
      ];
      StorageManager.saveFavorites(defaultFavorites);
    }

    if (!localStorage.getItem(StorageManager.STORAGE_KEYS.MACROS)) {
      const defaultMacros = [
        {
          id: 'macro_movie_mode',
          name: 'Modo Película',
          description: 'Enciende, va a Home, entra a HDMI1 y baja el volumen',
          steps: [
            { command: 'PowerOn', delayMs: 1200, requiresTv: true },
            { command: 'Home', delayMs: 600, requiresTv: false },
            { command: 'InputHDMI1', delayMs: 600, requiresTv: true },
            { command: 'VolumeDown', delayMs: 300, requiresTv: true },
            { command: 'VolumeDown', delayMs: 300, requiresTv: true }
          ]
        },
        {
          id: 'macro_night_mute',
          name: 'Silencio Nocturno',
          description: 'Baja el volumen y silencia el televisor',
          steps: [
            { command: 'VolumeMute', delayMs: 300, requiresTv: true }
          ]
        }
      ];
      StorageManager.saveMacros(defaultMacros);
    }
  }

  // --- Devices ---

  static getDevices() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEYS.DEVICES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  static getDevice(id) {
    const list = StorageManager.getDevices();
    return list.find((d) => d.id === id) || null;
  }

  static saveDevice(device) {
    const list = StorageManager.getDevices();
    const idx = list.findIndex((d) => d.id === device.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...device };
    } else {
      list.push(device);
    }
    localStorage.setItem(StorageManager.STORAGE_KEYS.DEVICES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('remoteone:devices_changed', { detail: list }));
    return list;
  }

  static deleteDevice(id) {
    const list = StorageManager.getDevices().filter((d) => d.id !== id);
    localStorage.setItem(StorageManager.STORAGE_KEYS.DEVICES, JSON.stringify(list));
    if (StorageManager.getLastDeviceId() === id) {
      StorageManager.setLastDeviceId(list.length > 0 ? list[0].id : null);
    }
    window.dispatchEvent(new CustomEvent('remoteone:devices_changed', { detail: list }));
    return list;
  }

  // --- Last Active Device ---

  static getLastDeviceId() {
    return localStorage.getItem(StorageManager.STORAGE_KEYS.LAST_DEVICE);
  }

  static setLastDeviceId(id) {
    if (id) {
      localStorage.setItem(StorageManager.STORAGE_KEYS.LAST_DEVICE, id);
    } else {
      localStorage.removeItem(StorageManager.STORAGE_KEYS.LAST_DEVICE);
    }
    window.dispatchEvent(new CustomEvent('remoteone:active_device_changed', { detail: id }));
  }

  // --- Settings ---

  static getSettings() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : { connectionMode: 'auto', bridgeUrl: 'http://localhost:3000', demoMode: false };
    } catch (e) {
      return { connectionMode: 'auto', bridgeUrl: 'http://localhost:3000', demoMode: false };
    }
  }

  static saveSettings(settings) {
    const current = StorageManager.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(StorageManager.STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('remoteone:settings_changed', { detail: updated }));
    return updated;
  }

  // --- Favorites ---

  static getFavorites() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  static saveFavorites(favorites) {
    localStorage.setItem(StorageManager.STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    window.dispatchEvent(new CustomEvent('remoteone:favorites_changed', { detail: favorites }));
  }

  // --- Macros ---

  static getMacros() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEYS.MACROS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  static saveMacros(macros) {
    localStorage.setItem(StorageManager.STORAGE_KEYS.MACROS, JSON.stringify(macros));
    window.dispatchEvent(new CustomEvent('remoteone:macros_changed', { detail: macros }));
  }

  // --- Command Matrix Testing State ---

  static getCommandMatrix() {
    try {
      const raw = localStorage.getItem(StorageManager.STORAGE_KEYS.COMMAND_MATRIX);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  static markCommandTested(brand, command, tested = true) {
    const matrix = StorageManager.getCommandMatrix();
    const key = `${brand}:${command}`;
    matrix[key] = {
      tested,
      lastTested: new Date().toISOString()
    };
    localStorage.setItem(StorageManager.STORAGE_KEYS.COMMAND_MATRIX, JSON.stringify(matrix));
    window.dispatchEvent(new CustomEvent('remoteone:matrix_changed', { detail: matrix }));
  }
}
