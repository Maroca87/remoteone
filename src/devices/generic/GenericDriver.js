/**
 * RemoteOne - GenericDriver
 * Fallback driver for unverified or unsupported manufacturers (Samsung, LG, Sony, Generic).
 * Strictly reports 'unsupported' and does not simulate false connectivity.
 */

import { BaseDriver } from '../BaseDriver.js';

export class GenericDriver extends BaseDriver {
  constructor(config = {}) {
    super(config);
    this.brand = config.brand || 'generic';
    this.protocol = config.protocol || `${this.brand.toUpperCase()} Protocol`;
    this.port = config.port || 80;
  }

  getCapabilities() {
    return {
      navigation: false,
      volume: false,
      mute: false,
      power: false,
      input: false,
      channels: false,
      textInput: false,
      appLaunch: false
    };
  }

  async verifyReachable() {
    return {
      online: false,
      status: 'unsupported',
      message: `El protocolo para ${this.brand.toUpperCase()} requiere validación previa o servicio de puente.`
    };
  }

  async getPowerState() {
    return 'unsupported';
  }

  async sendCommand(command, options = {}) {
    return {
      success: false,
      state: 'unsupported',
      message: `El fabricante ${this.brand.toUpperCase()} no tiene comandos implementados directamente en la PWA.`
    };
  }

  async sendKeypress(key) {
    return this.sendCommand(key);
  }

  async sendKeyDown(key) {
    return this.sendCommand(key);
  }

  async sendKeyUp(key) {
    return this.sendCommand(key);
  }

  async sendText(text) {
    return this.sendCommand(text);
  }

  async launchApp(appId) {
    return this.sendCommand(appId);
  }

  async getStatus() {
    return 'No compatible';
  }

  async testConnection() {
    return {
      success: false,
      networkStatus: 'unsupported',
      powerStatus: 'unsupported',
      device: {
        name: this.name,
        brand: this.brand,
        model: this.model,
        protocol: this.protocol
      },
      message: `Control directo no disponible para ${this.brand.toUpperCase()} en esta fase.`
    };
  }
}
