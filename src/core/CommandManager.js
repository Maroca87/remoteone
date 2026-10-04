/**
 * RemoteOne - CommandManager
 * Central dispatcher for user-initiated remote commands and macro sequences.
 * Enforces strict device capability validation and faithful error reporting.
 */

import { DeviceManager } from './DeviceManager.js';
import { StorageManager } from './StorageManager.js';
import { Logger } from '../utils/Logger.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';

export class CommandManager {
  /**
   * Executes a single command on the currently active device.
   * @param {string} commandName - e.g. 'Home', 'VolumeUp', 'PowerOff', 'Select'
   * @param {Object} options - e.g. { type: 'keypress', param: null }
   */
  static async executeCommand(commandName, options = {}) {
    const driver = DeviceManager.getActiveDriver();
    if (!driver) {
      const msg = 'No hay ningún televisor seleccionado para enviar el comando.';
      Logger.warn(msg);
      return { success: false, state: 'Desconectado', message: msg };
    }

    // Trigger tactile haptic feedback
    const settings = StorageManager.getSettings();
    if (settings.hapticFeedback !== false) {
      NetworkUtils.triggerHaptic(30);
    }

    Logger.info(`Ejecutando comando: [${commandName}] en "${driver.name}" (${driver.brand})`);

    let result;
    const type = options.type || 'keypress';

    switch (type) {
      case 'keypress':
        result = await driver.sendKeypress(commandName);
        break;
      case 'keydown':
        result = await driver.sendKeyDown(commandName);
        break;
      case 'keyup':
        result = await driver.sendKeyUp(commandName);
        break;
      case 'launch':
        result = await driver.launchApp(commandName);
        break;
      case 'text':
        result = await driver.sendText(commandName);
        break;
      default:
        result = await driver.sendKeypress(commandName);
    }

    // Record telemetry on driver
    driver.lastCommand = commandName;
    if (result.commandConfirmed) {
      driver.lastCommandResult = 'Confirmed (HTTP 200)';
    } else if (result.commandSent && !result.commandConfirmed) {
      driver.lastCommandResult = 'Sent (Unconfirmed)';
    } else {
      driver.lastCommandResult = result.success ? 'Success' : 'Failed';
    }
    driver.lastChecked = new Date();

    // Update runtime state strictly without false claims
    if (result.commandConfirmed) {
      DeviceManager.updateDeviceRuntimeState(driver.id, {
        networkStatus: 'online',
        lastChecked: new Date()
      });
    } else if (result.commandSent) {
      DeviceManager.updateDeviceRuntimeState(driver.id, {
        networkStatus: 'cors_blocked',
        lastChecked: new Date(),
        details: 'Command sent, response unconfirmed by browser CORS'
      });
    } else if (!result.success && (result.state === 'offline' || result.state === 'unreachable')) {
      DeviceManager.updateDeviceRuntimeState(driver.id, {
        networkStatus: 'offline',
        lastChecked: new Date(),
        details: result.message || 'No response to command'
      });
    }

    // Broadcast event for UI toast / feedback
    window.dispatchEvent(new CustomEvent('remoteone:command_executed', {
      detail: {
        command: commandName,
        type,
        device: driver.name,
        result
      }
    }));

    return result;
  }

  /**
   * Executes a Macro sequence with capability checks and configurable delays.
   * @param {Object} macro - { id, name, steps: [{ command, delayMs, requiresTv }] }
   * @param {Function} onStepProgress - callback(stepIndex, totalSteps, stepObj, status)
   */
  static async executeMacro(macro, onStepProgress = null) {
    const driver = DeviceManager.getActiveDriver();
    if (!driver) {
      throw new Error('No hay televisor seleccionado para ejecutar la macro.');
    }

    Logger.info(`Iniciando Macro "${macro.name}" en ${driver.name}...`, macro);

    // 1. Pre-validation of steps: check TV-only constraints
    for (let i = 0; i < macro.steps.length; i++) {
      const step = macro.steps[i];
      if (step.requiresTv && !driver.isTv) {
        const errorMsg = `La macro no puede ejecutarse: el paso "${step.command}" requiere un televisor (Roku TV) y el dispositivo activo es un reproductor/stick.`;
        Logger.error(errorMsg);
        return {
          success: false,
          failedStep: i,
          command: step.command,
          message: errorMsg
        };
      }
    }

    // 2. Sequential execution
    const total = macro.steps.length;
    for (let i = 0; i < total; i++) {
      const step = macro.steps[i];
      if (onStepProgress) onStepProgress(i + 1, total, step, 'running');

      const result = await CommandManager.executeCommand(step.command);

      if (!result.success) {
        const errMsg = `Fallo en el paso ${i + 1} (${step.command}): ${result.message || 'Error de comunicación'}`;
        Logger.error(errMsg);
        if (onStepProgress) onStepProgress(i + 1, total, step, 'error');
        return {
          success: false,
          failedStep: i + 1,
          command: step.command,
          message: errMsg,
          details: result
        };
      }

      if (onStepProgress) onStepProgress(i + 1, total, step, 'completed');

      // Inter-step delay
      const delay = step.delayMs || 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    Logger.success(`Macro "${macro.name}" completada con éxito.`);
    return { success: true, message: `Macro "${macro.name}" ejecutada con éxito.` };
  }
}
