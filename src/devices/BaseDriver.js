/**
 * RemoteOne - BaseDriver Interface
 * Abstract base class establishing the contract for all TV manufacturer drivers.
 * Guarantees manufacturer neutrality, explicit capabilities, and decoupled states.
 */

export class BaseDriver {
  constructor(config = {}) {
    this.id = config.id || '';
    this.name = config.name || 'Smart TV';
    this.room = config.room || 'Living Room';
    this.brand = config.brand || 'generic';
    this.protocol = config.protocol || 'Generic Protocol';
    this.ip = config.ip || '';
    this.port = config.port || 80;
    this.model = config.model || 'Unknown Model';
    this.isTv = config.isTv !== undefined ? config.isTv : true;
    this.lastCommand = null;
    this.lastCommandResult = null;
    this.lastChecked = null;
  }

  /**
   * Returns explicit hardware capabilities.
   * Remote control UI dynamically adjusts based on these flags.
   */
  getCapabilities() {
    return {
      navigation: true,   // D-Pad Up/Down/Left/Right, OK
      volume: true,       // Vol+, Vol-
      mute: true,         // Volume Mute
      power: true,        // Power On / Power Off
      input: false,       // Source / HDMI inputs
      channels: false,    // Channel Up/Down
      textInput: false,   // Virtual keyboard string transmission
      appLaunch: false    // Direct channel / app launching
    };
  }

  /**
   * Verifies if the device is currently reachable on the local network.
   * Strictly returns actual response without faking online state.
   * @returns {Promise<{ online: boolean, status: 'online'|'offline'|'unreachable'|'unsupported', message: string, details?: any }>}
   */
  async verifyReachable() {
    throw new Error('verifyReachable() must be implemented by driver');
  }

  /**
   * Queries or determines real power state if supported by protocol.
   * @returns {Promise<'on'|'off'|'standby'|'unknown'|'unsupported'>}
   */
  async getPowerState() {
    return 'unknown';
  }

  /**
   * Queries device details (model, software version, friendly name).
   * @returns {Promise<Object>}
   */
  async getDeviceInfo() {
    return {
      name: this.name,
      model: this.model,
      brand: this.brand,
      protocol: this.protocol,
      isTv: this.isTv
    };
  }

  /**
   * Sends a keypress or action to the device.
   * @param {string} command 
   * @param {Object} options 
   * @returns {Promise<{ success: boolean, message: string, state?: string }>}
   */
  async sendCommand(command, options = {}) {
    throw new Error('sendCommand() must be implemented by driver');
  }

  /**
   * Comprehensive connectivity test tool.
   * Real protocol probe used in Manual Add and Diagnostic views.
   * @returns {Promise<{ success: boolean, networkStatus: string, powerStatus: string, message: string, details?: any }>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by driver');
  }
}
