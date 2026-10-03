/**
 * RemoteOne - RemoteView
 * Flagship screen: Minimalist, ergonomic, one-handed digital TV remote console.
 * Strictly zero emojis, 100% Lucide SVGs, tactile haptics, responsive touch areas.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { CommandManager } from '../core/CommandManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { StorageManager } from '../core/StorageManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { renderIcon } from './Icons.js';

export class RemoteView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const driver = DeviceManager.getActiveDriver();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    if (!driver) {
      container.innerHTML = `
        <div class="view-content" style="align-items: center; justify-content: center; text-align: center; padding-top: 60px;">
          <div class="empty-icon-wrap" style="width: 56px; height: 56px;">
            ${renderIcon('tv', 28)}
          </div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-top: 12px;">
            Ningún televisor seleccionado
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

    const isTv = driver.isTv !== false;
    const isConnected = driver.status === 'Conectado';

    let html = `
      <div class="view-content" style="padding-top: 10px; justify-content: space-between;">
        
        <!-- Remote Header: Device Name & Verified Connection State -->
        <div class="remote-device-header">
          <div class="remote-device-info-left">
            <div class="remote-device-title">
              <span>${driver.name}</span>
            </div>
            <div class="remote-device-subtitle">
              <span>${driver.model || 'Roku TV'}</span>
              <span>•</span>
              <span style="font-family: monospace;">${driver.ip}</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="remote-device-status-badge">
              <span class="status-dot ${isConnected ? 'connected' : 'disconnected'}"></span>
              <span style="color: ${isConnected ? 'var(--status-connected)' : 'var(--text-secondary)'};">
                ${isConnected ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>
            <button class="btn-clean-subtle" id="btn-switch-device" aria-label="Cambiar televisor" style="padding: 6px;">
              ${renderIcon('tv', 16)}
            </button>
          </div>
        </div>

        <!-- Upper Utilities: Virtual Keyboard, Info (*), Power -->
        <div class="remote-top-utilities">
          <button class="btn-remote-utility" id="btn-open-text-modal" aria-label="Escribir texto" title="Teclado">
            ${renderIcon('keyboard', 18)}
          </button>

          <button class="btn-remote-utility" data-cmd="Info" aria-label="Opciones (*)" title="Opciones">
            ${renderIcon('sparkles', 18)}
          </button>

          <button class="btn-remote-utility btn-remote-power" data-cmd="${isTv ? 'PowerOff' : 'Home'}" aria-label="Encendido / Apagado" title="Power">
            ${renderIcon('power', 20)}
          </button>
        </div>

        <!-- The Centerpiece: Ergonomic D-Pad Console -->
        <div class="dpad-wrapper" aria-label="Pad de navegación">
          <!-- Directional Up -->
          <button class="dpad-direction-btn up" data-cmd="Up" aria-label="Navegar hacia arriba">
            ${renderIcon('arrowUp', 26)}
          </button>

          <!-- Directional Left -->
          <button class="dpad-direction-btn left" data-cmd="Left" aria-label="Navegar hacia la izquierda">
            ${renderIcon('arrowLeft', 26)}
          </button>

          <!-- Center SELECT / OK -->
          <button class="dpad-center-ok" data-cmd="Select" aria-label="Seleccionar / OK">
            <span>OK</span>
          </button>

          <!-- Directional Right -->
          <button class="dpad-direction-btn right" data-cmd="Right" aria-label="Navegar hacia la derecha">
            ${renderIcon('arrowRight', 26)}
          </button>

          <!-- Directional Down -->
          <button class="dpad-direction-btn down" data-cmd="Down" aria-label="Navegar hacia abajo">
            ${renderIcon('arrowDown', 26)}
          </button>
        </div>

        <!-- Fast Actions (Directly below D-Pad within natural thumb radius) -->
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

        <!-- Lower Ergonomic Zone: Volume Rocker & Mute / Input -->
        <div class="remote-volume-zone">
          <!-- Volume Column -->
          <div class="volume-column">
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
            <button class="utility-column-btn" data-cmd="VolumeMute" aria-label="Silenciar">
              ${renderIcon('volumeMute', 18)}
              <span>Mute</span>
            </button>

            <button class="utility-column-btn" id="btn-open-input-modal" aria-label="Cambiar entrada HDMI">
              ${renderIcon('input', 18)}
              <span>Entrada</span>
            </button>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _attachEvents(container) {
    // 1. Device command clicks
    container.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        NetworkUtils.triggerHaptic(30);

        // Visual press state
        btn.style.transform = 'scale(0.92)';
        setTimeout(() => { btn.style.transform = ''; }, 120);

        const res = await CommandManager.executeCommand(cmd);
        if (!res.success) {
          this.app.showToast(res.message || 'No se pudo enviar el comando al Roku', 'danger');
        }
      });
    });

    // 2. Switch device
    container.querySelector('#btn-switch-device')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    // 3. Virtual keyboard modal
    container.querySelector('#btn-open-text-modal')?.addEventListener('click', () => {
      this._openKeyboardModal();
    });

    // 4. Input selection modal
    container.querySelector('#btn-open-input-modal')?.addEventListener('click', () => {
      this._openInputModal();
    });
  }

  _openKeyboardModal() {
    const existing = document.getElementById('keyboard-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'keyboard-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title">Escribir en el Roku</div>
          <button class="btn-clean-subtle" id="btn-close-kb-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 14px;">
          Transmite caracteres directamente al campo de búsqueda activo en tu televisor.
        </p>

        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <input type="text" id="input-roku-text" class="text-input-field" placeholder="Buscar título o canal..." autofocus />
          <button class="btn-clean btn-clean-primary" id="btn-send-roku-text" style="width: auto; padding: 0 16px;">
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
      const input = overlay.querySelector('#input-roku-text');
      const val = input.value;
      if (!val) return;
      const driver = DeviceManager.getActiveDriver();
      if (driver && driver.sendText) {
        overlay.remove();
        this.app.showToast(`Enviando "${val}" al Roku...`, 'info');
        await driver.sendText(val);
      }
    };

    overlay.querySelector('#btn-send-roku-text').addEventListener('click', sendAction);
    overlay.querySelector('#input-roku-text').addEventListener('keydown', (e) => {
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

  _openInputModal() {
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
          Cambia la fuente de video en tu televisor Roku TV:
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
        this.app.showToast(`Cambiando entrada a ${btn.textContent.trim()}...`, 'info');
        await CommandManager.executeCommand(inpCmd);
      });
    });
  }
}
