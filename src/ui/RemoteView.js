/**
 * RemoteOne - RemoteView
 * Tactile, ergonomic, mobile-first TV remote control.
 * Features adaptive buttons (TV vs Stick), large D-pad, rockers, source selector,
 * virtual text typing with Lit_<char>, and haptic feedback.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { CommandManager } from '../core/CommandManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { StorageManager } from '../core/StorageManager.js';

export class RemoteView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const driver = DeviceManager.getActiveDriver();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    if (!driver) {
      container.innerHTML = `
        <div class="view-content text-center py-5">
          <div style="font-size: 3rem;">📺</div>
          <h5 class="fw-bold text-white mt-3">Ningún televisor seleccionado</h5>
          <p class="text-muted small">Selecciona un televisor en la pantalla de inicio o agrega uno nuevo.</p>
          <button class="btn btn-primary mt-2" id="btn-goto-home">Ir a Mis Televisores</button>
        </div>
      `;
      container.querySelector('#btn-goto-home')?.addEventListener('click', () => {
        this.app.navigateTo('home');
      });
      return;
    }

    const isTv = driver.isTv !== false; // If true, supports Power, Volume, Channels, Inputs
    const brand = (driver.brand || 'roku').toUpperCase();

    let html = `
      <div class="view-content" style="padding-top: 8px;">
        <!-- Remote Header with Device Info & Connection Mode -->
        <div class="remote-header-bar mb-3">
          <div>
            <div class="d-flex align-items-center gap-2">
              <span style="font-size: 1.2rem;">📺</span>
              <h6 class="fw-bold text-white mb-0">${driver.name}</h6>
            </div>
            <div class="text-muted small" style="font-size: 0.72rem;">
              ${driver.room} • ${driver.model} (${driver.ip})
            </div>
          </div>
          <div class="text-end">
            <span class="badge ${modeInfo.badgeClass}" style="font-size: 0.65rem;" title="${modeInfo.bridgeUrl}">
              ${modeInfo.label}
            </span>
            <div class="mt-1">
              <span class="badge ${this._getStatusBadgeClass(driver.status)}" style="font-size: 0.62rem;">
                ${driver.status}
              </span>
            </div>
          </div>
        </div>

        <!-- Physical-like Remote Body Frame -->
        <div class="remote-frame">
          
          <!-- Top Row: Power & Virtual Keyboard & Info -->
          <div class="d-flex justify-content-between align-items-center mb-3">
            <button class="remote-btn" id="btn-open-text-modal" style="width: 52px; height: 48px;" title="Escribir texto">
              ⌨️
            </button>

            <!-- Prominent Power Button (Adaptive) -->
            ${isTv ? `
              <button class="remote-btn remote-btn-power" id="btn-cmd-power" data-cmd="PowerOff" title="Encender / Apagar">
                ⏻
              </button>
            ` : `
              <button class="remote-btn" id="btn-cmd-replay" data-cmd="InstantReplay" style="width: 52px; height: 48px;" title="Repetición instantánea">
                ↺
              </button>
            `}

            <button class="remote-btn" id="btn-cmd-info" data-cmd="Info" style="width: 52px; height: 48px;" title="Opciones (*)">
              ✱
            </button>
          </div>

          <!-- D-Pad Directional Navigation -->
          <div class="dpad-container">
            <button class="dpad-dir dpad-up" data-cmd="Up" title="Arriba">▲</button>
            <button class="dpad-dir dpad-down" data-cmd="Down" title="Abajo">▼</button>
            <button class="dpad-dir dpad-left" data-cmd="Left" title="Izquierda">◀</button>
            <button class="dpad-dir dpad-right" data-cmd="Right" title="Derecha">▶</button>
            <button class="dpad-center" data-cmd="Select" title="Aceptar / OK">OK</button>
          </div>

          <!-- Middle Row: Navigation Keys (BACK & HOME) -->
          <div class="d-flex justify-content-between align-items-center my-3 px-3">
            <button class="remote-btn" data-cmd="Back" style="width: 100px; height: 50px; font-size: 0.85rem;" title="Atrás">
              ↩ ATRÁS
            </button>
            <button class="remote-btn btn-primary text-white" data-cmd="Home" style="width: 100px; height: 50px; font-size: 0.85rem; background: #2563eb;" title="Inicio">
              🏠 HOME
            </button>
          </div>

          <!-- Media Controls: Rev, Play/Pause, Fwd -->
          <div class="d-flex justify-content-center gap-2 mb-3">
            <button class="remote-btn flex-fill py-2" data-cmd="Rev" title="Rebobinar">⏪</button>
            <button class="remote-btn flex-fill py-2" data-cmd="Play" title="Play / Pausa">⏯</button>
            <button class="remote-btn flex-fill py-2" data-cmd="Fwd" title="Avanzar">⏩</button>
          </div>

          <!-- Adaptive Rockers Row: Volume & Channels & Mute (TV only) -->
          ${isTv ? `
            <div class="d-flex justify-content-around align-items-center my-3">
              <!-- Volume Rocker -->
              <div class="rocker-box">
                <button class="rocker-btn" data-cmd="VolumeUp" title="Subir volumen">+</button>
                <span class="rocker-label">VOL</span>
                <button class="rocker-btn" data-cmd="VolumeDown" title="Bajar volumen">−</button>
              </div>

              <!-- Center Center: Mute & Source -->
              <div class="d-flex flex-column gap-2">
                <button class="remote-btn px-3 py-2" data-cmd="VolumeMute" style="font-size: 0.8rem; border-radius: 14px;" title="Silenciar">
                  🔇 MUTE
                </button>
                <button class="remote-btn px-3 py-2" id="btn-open-source-modal" style="font-size: 0.8rem; border-radius: 14px;" title="Cambiar entrada HDMI">
                  📺 INPUT
                </button>
              </div>

              <!-- Channel Rocker -->
              <div class="rocker-box">
                <button class="rocker-btn" data-cmd="ChannelUp" title="Subir canal">▲</button>
                <span class="rocker-label">CH</span>
                <button class="rocker-btn" data-cmd="ChannelDown" title="Bajar canal">▼</button>
              </div>
            </div>
          ` : `
            <div class="text-center py-2 mb-2 text-muted small">
              <em>(Controles de volumen y sintonizador no disponibles en dispositivos tipo reproductor/stick)</em>
            </div>
          `}

          <!-- Quick App Launchers Grid (Verified App IDs) -->
          <div class="mt-3">
            <div class="text-muted small fw-bold mb-2 text-uppercase" style="font-size: 0.68rem; letter-spacing: 0.5px;">
              Canales Directos
            </div>
            <div class="app-button-grid">
              <button class="app-btn netflix" data-launch-app="12">
                <span style="color: #e50914; font-weight: 800;">N</span> Netflix
              </button>
              <button class="app-btn youtube" data-launch-app="837">
                <span style="color: #ff0000; font-weight: 800;">▶</span> YouTube
              </button>
              <button class="app-btn prime" data-launch-app="13">
                <span style="color: #00a8e1; font-weight: 800;">prime</span> Video
              </button>
              <button class="app-btn disney" data-launch-app="291097">
                <span style="color: #3b82f6; font-weight: 800;">+</span> Disney+
              </button>
            </div>
          </div>

        </div>

        <!-- Virtual Keyboard Modal / Offcanvas -->
        <div class="modal fade" id="textInputModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px;">
              <div class="modal-header border-bottom border-secondary">
                <h6 class="modal-title text-white fw-bold">⌨️ Transmitir Texto al TV</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p class="text-muted small">Escribe el texto que deseas enviar directamente al campo de búsqueda de tu Roku:</p>
                <div class="input-group mb-3">
                  <input type="text" class="form-control bg-dark text-white border-secondary" id="virtual-text-input" placeholder="Ejemplo: stranger things" autofocus>
                  <button class="btn btn-primary fw-bold" id="btn-send-text">Enviar</button>
                </div>
                <div class="d-flex justify-content-between">
                  <button class="btn btn-sm btn-outline-secondary text-white" id="btn-send-backspace">⌫ Borrar Carácter</button>
                  <button class="btn btn-sm btn-outline-secondary text-white" id="btn-send-enter">↵ Enter</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- HDMI / Source Selector Modal -->
        <div class="modal fade" id="sourceModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px;">
              <div class="modal-header border-bottom border-secondary">
                <h6 class="modal-title text-white fw-bold">📺 Seleccionar Entrada (Input)</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body d-grid gap-2">
                <button class="btn btn-outline-light text-start py-2" data-cmd="InputHDMI1" data-bs-dismiss="modal">📺 HDMI 1</button>
                <button class="btn btn-outline-light text-start py-2" data-cmd="InputHDMI2" data-bs-dismiss="modal">📺 HDMI 2</button>
                <button class="btn btn-outline-light text-start py-2" data-cmd="InputHDMI3" data-bs-dismiss="modal">📺 HDMI 3</button>
                <button class="btn btn-outline-light text-start py-2" data-cmd="InputHDMI4" data-bs-dismiss="modal">📺 HDMI 4</button>
                <button class="btn btn-outline-light text-start py-2" data-cmd="InputTuner" data-bs-dismiss="modal">📡 TV Antena (Tuner)</button>
                <button class="btn btn-outline-light text-start py-2" data-cmd="InputAV1" data-bs-dismiss="modal">📼 Entrada AV</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container, driver);
  }

  _getStatusBadgeClass(status) {
    switch (status) {
      case 'Conectado': return 'bg-success text-white';
      case 'Intentando conectar': return 'bg-warning text-dark';
      case 'Bloqueado por navegador': return 'bg-info text-dark';
      case 'No compatible': return 'bg-secondary text-white';
      default: return 'bg-danger text-white';
    }
  }

  _attachEvents(container, driver) {
    // 1. Remote command buttons
    container.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const cmd = btn.getAttribute('data-cmd');
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 140);

        const res = await CommandManager.executeCommand(cmd);
        if (!res.success) {
          this.app.showToast(res.message || 'Error al enviar comando.', 'danger');
        }
      });
    });

    // 2. App Launchers
    container.querySelectorAll('[data-launch-app]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const appId = btn.getAttribute('data-launch-app');
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 140);

        const res = await CommandManager.executeCommand(appId, { type: 'launch' });
        if (!res.success) {
          this.app.showToast(res.message || 'Error al abrir canal.', 'danger');
        } else {
          this.app.showToast(`Lanzando aplicación (${btn.textContent.trim()})...`, 'info');
        }
      });
    });

    // 3. Virtual Keyboard Modal
    const textModalEl = container.querySelector('#textInputModal');
    const textInput = container.querySelector('#virtual-text-input');
    const sendTextBtn = container.querySelector('#btn-send-text');
    const backspaceBtn = container.querySelector('#btn-send-backspace');
    const enterBtn = container.querySelector('#btn-send-enter');

    container.querySelector('#btn-open-text-modal')?.addEventListener('click', () => {
      if (window.bootstrap?.Modal) {
        new window.bootstrap.Modal(textModalEl).show();
      } else {
        // Fallback simple prompt
        const text = prompt('Escribe el texto para enviar al TV:');
        if (text) {
          CommandManager.executeCommand(text, { type: 'text' });
        }
      }
    });

    sendTextBtn?.addEventListener('click', async () => {
      const val = textInput.value;
      if (!val) return;
      sendTextBtn.disabled = true;
      sendTextBtn.textContent = 'Enviando...';
      const res = await CommandManager.executeCommand(val, { type: 'text' });
      sendTextBtn.disabled = false;
      sendTextBtn.textContent = 'Enviar';
      if (res.success) {
        textInput.value = '';
        this.app.showToast('Texto transmitido al televisor.', 'success');
        const modalInstance = window.bootstrap?.Modal?.getInstance(textModalEl);
        modalInstance?.hide();
      } else {
        this.app.showToast(res.message || 'Error enviando texto.', 'danger');
      }
    });

    backspaceBtn?.addEventListener('click', () => {
      CommandManager.executeCommand('Backspace');
    });

    enterBtn?.addEventListener('click', () => {
      CommandManager.executeCommand('Enter');
    });

    // 4. Source / Input Modal
    const sourceModalEl = container.querySelector('#sourceModal');
    container.querySelector('#btn-open-source-modal')?.addEventListener('click', () => {
      if (window.bootstrap?.Modal) {
        new window.bootstrap.Modal(sourceModalEl).show();
      } else {
        CommandManager.executeCommand('InputHDMI1');
      }
    });
  }
}
