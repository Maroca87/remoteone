/**
 * RemoteOne - RemoteView
 * Flagship screen: Minimalist, ergonomic, one-handed digital TV remote console.
 * Strictly respects driver capabilities, separate Network/Power states,
 * and reports genuine command execution results without fake feedback.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { CommandManager } from '../core/CommandManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { renderIcon } from './Icons.js';

export class RemoteView {
  constructor(app) {
    this.app = app;
    this.statusListener = null;
  }

  render(container) {
    const driver = DeviceManager.getActiveDriver();

    if (!driver) {
      container.innerHTML = `
        <div class="view-content" style="align-items: center; justify-content: center; text-align: center; padding-top: 60px;">
          <div class="empty-icon-wrap" style="width: 56px; height: 56px;">
            ${renderIcon('tv', 28)}
          </div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 12px;">
            Ningún dispositivo seleccionado
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); max-width: 260px; margin: 8px auto 20px;">
            Selecciona un televisor en la lista de dispositivos o escanea tu red Wi-Fi.
          </p>
          <button class="btn-clean btn-clean-primary" id="btn-goto-home-devices" style="width: auto; padding: 10px 24px;">
            ${renderIcon('home', 16)}
            <span>Ver mis dispositivos</span>
          </button>
        </div>
      `;
      container.querySelector('#btn-goto-home-devices')?.addEventListener('click', () => {
        this.app.navigateTo('home');
      });
      return;
    }

    // Prudent refresh of active device status on entering remote
    DeviceManager.checkDeviceState(driver.id, false);

    const liveState = DeviceManager.getDeviceState(driver.id);
    const capabilities = driver.getCapabilities ? driver.getCapabilities() : {
      navigation: true,
      volume: true,
      mute: true,
      power: true,
      input: true,
      textInput: true,
      appLaunch: true
    };

    let html = `
      <div class="view-content" style="padding-top: 10px; justify-content: space-between;">
        
        <!-- Remote Header: Device Info & Decoupled Network / Power Badges -->
        <div class="remote-device-header" id="remote-header-mount">
          ${this._renderHeaderContent(driver, liveState)}
        </div>

        ${capabilities.navigation ? this._renderControlsArea(driver, capabilities) : this._renderUnsupportedBanner(driver)}

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container, driver, capabilities);
  }

  _renderHeaderContent(driver, liveState) {
    const network = liveState.networkStatus || 'unknown';
    const power = liveState.powerStatus || 'unknown';
    const lastCheckedStr = this._formatTimeAgo(liveState.lastChecked);

    let netDotClass = 'pending';
    let netLabel = 'Desconocido';
    let netColor = 'var(--text-secondary)';

    if (network === 'online') {
      netDotClass = 'connected';
      netLabel = 'Online';
      netColor = 'var(--status-connected)';
    } else if (network === 'offline') {
      netDotClass = 'disconnected';
      netLabel = 'Offline';
      netColor = 'var(--status-disconnected)';
    } else if (network === 'checking') {
      netDotClass = 'connecting';
      netLabel = 'Comprobando...';
      netColor = 'var(--status-connecting)';
    } else if (network === 'unreachable') {
      netDotClass = 'disconnected';
      netLabel = 'Inalcanzable';
      netColor = 'var(--status-disconnected)';
    } else if (network === 'unsupported') {
      netDotClass = 'pending';
      netLabel = 'No soportado';
      netColor = 'var(--text-muted)';
    }

    let powerLabel = 'Energía: Desconocida';
    if (power === 'on') {
      powerLabel = 'Powered On';
    } else if (power === 'standby') {
      powerLabel = 'Standby';
    } else if (power === 'off') {
      powerLabel = 'Powered Off';
    } else if (power === 'unsupported') {
      powerLabel = 'Energía no disponible';
    }

    const brandName = (driver.brand || 'TV').toUpperCase();

    return `
      <div class="remote-device-info-left">
        <div class="remote-device-title">
          <span>${driver.name}</span>
        </div>
        <div class="remote-device-subtitle">
          <span>${brandName} ${driver.model || ''}</span>
          <span>•</span>
          <span style="font-family: monospace;">${driver.ip}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.68rem; margin-top: 3px; color: var(--text-muted);">
          <span class="status-pill" style="padding: 1px 6px;">
            <span class="status-dot ${netDotClass}"></span>
            <span style="color: ${netColor}; font-weight: 600;">${netLabel}</span>
          </span>
          <span>•</span>
          <span>${powerLabel}</span>
          <span>•</span>
          <span>${lastCheckedStr}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="btn-clean-subtle" id="btn-switch-device" aria-label="Cambiar dispositivo" style="padding: 6px;" title="Cambiar dispositivo">
          ${renderIcon('tv', 16)}
        </button>
      </div>
    `;
  }

  _renderControlsArea(driver, capabilities) {
    const hasVolumeZone = capabilities.volume || capabilities.mute || capabilities.input;

    return `
      <!-- Upper Utilities: Virtual Keyboard, Options (*), Power -->
      <div class="remote-top-utilities">
        ${capabilities.textInput ? `
          <button class="btn-remote-utility" id="btn-open-text-modal" aria-label="Escribir texto" title="Teclado">
            ${renderIcon('keyboard', 18)}
          </button>
        ` : `
          <div style="width: 44px; height: 44px;"></div>
        `}

        <button class="btn-remote-utility" data-cmd="Info" aria-label="Opciones (*)" title="Opciones">
          ${renderIcon('sparkles', 18)}
        </button>

        ${capabilities.power ? `
          <button class="btn-remote-utility btn-remote-power" data-cmd="${driver.isTv ? 'PowerOff' : 'Home'}" aria-label="Encendido / Apagado" title="Power">
            ${renderIcon('power', 20)}
          </button>
        ` : `
          <div style="width: 44px; height: 44px;"></div>
        `}
      </div>

      <!-- Centerpiece: Ergonomic D-Pad Console -->
      <div class="dpad-wrapper" aria-label="Pad de navegación">
        <button class="dpad-direction-btn up" data-cmd="Up" aria-label="Navegar hacia arriba">
          ${renderIcon('arrowUp', 26)}
        </button>
        <button class="dpad-direction-btn left" data-cmd="Left" aria-label="Navegar hacia la izquierda">
          ${renderIcon('arrowLeft', 26)}
        </button>
        <button class="dpad-center-ok" data-cmd="Select" aria-label="Seleccionar / OK">
          <span>OK</span>
        </button>
        <button class="dpad-direction-btn right" data-cmd="Right" aria-label="Navegar hacia la derecha">
          ${renderIcon('arrowRight', 26)}
        </button>
        <button class="dpad-direction-btn down" data-cmd="Down" aria-label="Navegar hacia abajo">
          ${renderIcon('arrowDown', 26)}
        </button>
      </div>

      <!-- Fast Actions (Back & Home) -->
      <div class="remote-primary-nav">
        <button class="btn-primary-action" data-cmd="Back" aria-label="Atrás">
          ${renderIcon('back', 18)}
          <span>Atrás</span>
        </button>
        <button class="btn-primary-action home-btn" data-cmd="Home" aria-label="Inicio">
          ${renderIcon('home', 18)}
          <span>Inicio</span>
        </button>
      </div>

      <!-- Media Playback Row -->
      <div class="remote-media-row">
        <button class="btn-media" data-cmd="Rev" aria-label="Rebobinar">
          ${renderIcon('rewind', 18)}
        </button>
        <button class="btn-media play-pause" data-cmd="Play" aria-label="Reproducir o pausar">
          ${renderIcon('playPause', 20)}
        </button>
        <button class="btn-media" data-cmd="Fwd" aria-label="Avanzar rápido">
          ${renderIcon('fastForward', 18)}
        </button>
      </div>

      <!-- Volume & Inputs Zone (Shown conditionally by capability) -->
      ${hasVolumeZone ? `
        <div class="remote-volume-zone">
          <!-- Volume Column -->
          <div class="volume-column" style="${capabilities.volume ? '' : 'visibility: hidden;'}">
            <button class="volume-btn" data-cmd="VolumeUp" aria-label="Subir volumen">
              ${renderIcon('plus', 20)}
            </button>
            <span class="volume-label">VOL</span>
            <button class="volume-btn" data-cmd="VolumeDown" aria-label="Bajar volumen">
              ${renderIcon('minus', 20)}
            </button>
          </div>

          <!-- Utility Column: Mute & Input -->
          <div class="utility-column">
            ${capabilities.mute ? `
              <button class="utility-column-btn" data-cmd="VolumeMute" aria-label="Silenciar">
                ${renderIcon('volumeMute', 18)}
                <span>Mute</span>
              </button>
            ` : ''}

            ${capabilities.input ? `
              <button class="utility-column-btn" id="btn-open-input-modal" aria-label="Cambiar entrada HDMI">
                ${renderIcon('input', 18)}
                <span>Entrada</span>
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}
    `;
  }

  _renderUnsupportedBanner(driver) {
    return `
      <div style="padding: 24px 16px; background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); text-align: center; margin: 30px 0;">
        <div style="color: var(--status-connecting); margin-bottom: 10px;">
          ${renderIcon('info', 28)}
        </div>
        <div style="font-size: 0.92rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
          Controles directos no disponibles
        </div>
        <p style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.5; max-width: 300px; margin: 0 auto 16px;">
          El fabricante <strong>${(driver.brand || '').toUpperCase()}</strong> requiere autenticación previa por certificados TLS o un driver complementario en esta versión.
        </p>
        <button class="btn-clean btn-clean-secondary" id="btn-switch-device-banner" style="width: auto; margin: 0 auto; padding: 8px 16px;">
          ${renderIcon('tv', 16)}
          <span>Cambiar a otro televisor</span>
        </button>
      </div>
    `;
  }

  _formatTimeAgo(date) {
    if (!date) return 'Sin verificar';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 20) return 'Ahora mismo';
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  }

  _attachEvents(container, driver, capabilities) {
    // 1. Device command clicks with REAL feedback (Requirement 14)
    container.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        NetworkUtils.triggerHaptic(30);

        // Tactile press animation
        btn.style.transform = 'scale(0.92)';
        setTimeout(() => { btn.style.transform = ''; }, 120);

        const res = await CommandManager.executeCommand(cmd);

        if (!res.success) {
          if (res.commandSent && !res.commandConfirmed) {
            // Honest unconfirmed feedback: command packet was sent to the network socket, but browser cannot read confirmation
            this.app.showToast(`Comando "${cmd}" emitido (sin confirmación por CORS)`, 'warning');
          } else {
            // Honest failure feedback
            this.app.showToast(res.message || 'Comando no transmitido', 'danger');
          }
        } else {
          this.app.showToast(`Comando "${cmd}" confirmado`, 'success');
        }
      });
    });

    // 2. Switch device
    container.querySelectorAll('#btn-switch-device, #btn-switch-device-banner').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.app.navigateTo('home');
      });
    });

    // 3. Virtual keyboard modal
    container.querySelector('#btn-open-text-modal')?.addEventListener('click', () => {
      this._openKeyboardModal(driver);
    });

    // 4. Input selection modal
    container.querySelector('#btn-open-input-modal')?.addEventListener('click', () => {
      this._openInputModal(driver);
    });

    // 5. Reactive status updates
    if (this.statusListener) {
      window.removeEventListener('remoteone:device_status_changed', this.statusListener);
    }
    this.statusListener = (e) => {
      if (e.detail?.id === driver.id) {
        const headerEl = container.querySelector('#remote-header-mount');
        if (headerEl) {
          const liveState = DeviceManager.getDeviceState(driver.id);
          headerEl.innerHTML = this._renderHeaderContent(driver, liveState);
          headerEl.querySelector('#btn-switch-device')?.addEventListener('click', () => {
            this.app.navigateTo('home');
          });
        }
      }
    };
    window.addEventListener('remoteone:device_status_changed', this.statusListener);
  }

  _openKeyboardModal(driver) {
    const existing = document.getElementById('keyboard-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'keyboard-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title">Escribir en el dispositivo</div>
          <button class="btn-clean-subtle" id="btn-close-kb-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 14px;">
          Transmite texto directamente al campo activo en ${driver.name}:
        </p>

        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input type="text" id="input-device-text" class="text-input-field" placeholder="Buscar título o canal..." autofocus />
          <button class="btn-clean btn-clean-primary" id="btn-send-device-text" style="width: auto; padding: 0 16px;">
            Enviar
          </button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-clean btn-clean-secondary" data-kb-cmd="Backspace" style="flex: 1;">
            ${renderIcon('back', 16)}
            <span>Borrar (⌫)</span>
          </button>
          <button class="btn-clean btn-clean-secondary" data-kb-cmd="Enter" style="flex: 1;">
            ${renderIcon('check', 16)}
            <span>Intro (↵)</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-kb-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    const sendAction = async () => {
      const input = overlay.querySelector('#input-device-text');
      const val = input.value;
      if (!val) return;
      if (driver && driver.sendText) {
        overlay.remove();
        const res = await driver.sendText(val);
        if (!res.success) {
          this.app.showToast(res.message || 'No se pudo transmitir el texto al dispositivo', 'danger');
        }
      }
    };

    overlay.querySelector('#btn-send-device-text').addEventListener('click', sendAction);
    overlay.querySelector('#input-device-text').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendAction();
    });

    overlay.querySelectorAll('[data-kb-cmd]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const cmd = btn.getAttribute('data-kb-cmd');
        NetworkUtils.triggerHaptic(30);
        await CommandManager.executeCommand(cmd);
      });
    });
  }

  _openInputModal(driver) {
    const existing = document.getElementById('input-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'input-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title">Entradas de video (HDMI)</div>
          <button class="btn-clean-subtle" id="btn-close-input-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 16px;">
          Cambia la fuente de video en tu televisor:
        </p>

        <div class="action-stack">
          <button class="btn-clean btn-clean-secondary btn-hdmi-select" data-input="InputHDMI1">
            ${renderIcon('input', 16)}
            <span>HDMI 1</span>
          </button>
          <button class="btn-clean btn-clean-secondary btn-hdmi-select" data-input="InputHDMI2">
            ${renderIcon('input', 16)}
            <span>HDMI 2</span>
          </button>
          <button class="btn-clean btn-clean-secondary btn-hdmi-select" data-input="InputHDMI3">
            ${renderIcon('input', 16)}
            <span>HDMI 3</span>
          </button>
          <button class="btn-clean btn-clean-secondary btn-hdmi-select" data-input="InputTuner">
            ${renderIcon('tv', 16)}
            <span>Antena / TV en vivo</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-input-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelectorAll('.btn-hdmi-select').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const inpCmd = btn.getAttribute('data-input');
        overlay.remove();
        NetworkUtils.triggerHaptic(35);
        const res = await CommandManager.executeCommand(inpCmd);
        if (!res.success) {
          this.app.showToast(res.message || 'No se pudo cambiar la entrada', 'danger');
        }
      });
    });
  }

  destroy() {
    if (this.statusListener) {
      window.removeEventListener('remoteone:device_status_changed', this.statusListener);
      this.statusListener = null;
    }
  }
}
