/**
 * RemoteOne - SettingsView
 * Clean, row-based mobile settings.
 * Strictly zero emojis, 100% Lucide SVGs, no localhost defaults, optional bridge.
 */

import { StorageManager } from '../core/StorageManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { renderIcon } from './Icons.js';

export class SettingsView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const settings = StorageManager.getSettings();
    const modeInfo = ConnectionManager.getCurrentModeInfo();
    const devices = StorageManager.getDevices();

    let html = `
      <div class="view-content">
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title">Ajustes</div>
          <div class="view-subtitle">Configuración y estado del sistema</div>
        </div>

        <!-- Group 1: Core Navigation Rows -->
        <div class="settings-group">
          <!-- Communication Row -->
          <div class="settings-row clickable" id="row-open-communication">
            <div>
              <div class="settings-row-label">Modo de comunicación</div>
              <div class="settings-row-desc">Prioridad directa desde el iPhone</div>
            </div>
            <div class="settings-row-value">
              <span style="color: var(--accent); font-weight: 600;">${modeInfo.label}</span>
              ${renderIcon('chevronRight', 16)}
            </div>
          </div>

          <!-- Devices Row -->
          <div class="settings-row clickable" id="row-goto-devices">
            <div>
              <div class="settings-row-label">Dispositivos</div>
              <div class="settings-row-desc">Administrar televisores guardados</div>
            </div>
            <div class="settings-row-value">
              <span>${devices.length} ${devices.length === 1 ? 'dispositivo' : 'dispositivos'}</span>
              ${renderIcon('chevronRight', 16)}
            </div>
          </div>

          <!-- Diagnostics Row -->
          <div class="settings-row clickable" id="row-goto-diagnostics">
            <div>
              <div class="settings-row-label">Diagnóstico</div>
              <div class="settings-row-desc">Telemetría, puertos y eventos en vivo</div>
            </div>
            <div class="settings-row-value">
              <span>Pruebas de red</span>
              ${renderIcon('chevronRight', 16)}
            </div>
          </div>

          <!-- Compatibility Row -->
          <div class="settings-row clickable" id="row-goto-compatibility">
            <div>
              <div class="settings-row-label">Compatibilidad de marcas</div>
              <div class="settings-row-desc">Roku verificado, Xiaomi en validación</div>
            </div>
            <div class="settings-row-value">
              <span>Protocolos</span>
              ${renderIcon('chevronRight', 16)}
            </div>
          </div>
        </div>

        <!-- Group 2: System & Permissions -->
        <div class="settings-group">
          <!-- Roku Guide Row -->
          <div class="settings-row clickable" id="row-open-roku-guide">
            <div>
              <div class="settings-row-label">Permisos en tu Roku</div>
              <div class="settings-row-desc">Autorización de aplicaciones móviles</div>
            </div>
            <div class="settings-row-value">
              <span>Ver ruta</span>
              ${renderIcon('chevronRight', 16)}
            </div>
          </div>

          <!-- Simulation / Demo Switch Row -->
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Modo simulación</div>
              <div class="settings-row-desc">Probar controles sin televisor físico</div>
            </div>
            <div class="settings-row-value">
              <input type="checkbox" id="switch-demo-mode" ${settings.demoMode ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: var(--accent); cursor: pointer;" />
            </div>
          </div>

          <!-- About Row -->
          <div class="settings-row">
            <div>
              <div class="settings-row-label">Acerca de RemoteOne</div>
              <div class="settings-row-desc">Versión 2.0 • Arquitectura Móvil Nativa</div>
            </div>
            <div class="settings-row-value">
              <span style="font-family: monospace; font-size: 0.72rem;">PWA Direct</span>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div style="text-align: center; margin-top: 10px;">
          <button class="btn-clean-subtle" id="btn-reset-storage" style="color: #ef4444; font-size: 0.75rem;">
            Restablecer datos locales
          </button>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container, settings);
  }

  _attachEvents(container, settings) {
    // 1. Open Communication Modal
    container.querySelector('#row-open-communication')?.addEventListener('click', () => {
      this._openCommunicationSheet();
    });

    // 2. Go to Devices (Home)
    container.querySelector('#row-goto-devices')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    // 3. Go to Diagnostics
    container.querySelector('#row-goto-diagnostics')?.addEventListener('click', () => {
      this.app.navigateTo('diagnostic');
    });

    // 4. Go to Compatibility
    container.querySelector('#row-goto-compatibility')?.addEventListener('click', () => {
      this.app.navigateTo('compatibility');
    });

    // 5. Open Roku Guide Sheet
    container.querySelector('#row-open-roku-guide')?.addEventListener('click', () => {
      this._openRokuGuideSheet();
    });

    // 6. Demo mode toggle
    container.querySelector('#switch-demo-mode')?.addEventListener('change', (e) => {
      const isDemo = e.target.checked;
      StorageManager.saveSettings({ demoMode: isDemo });
      this.app.updateDemoBanner();
      this.app.showToast(isDemo ? 'Modo simulación activado' : 'Modo directo activado', 'info');
    });

    // 7. Reset storage
    container.querySelector('#btn-reset-storage')?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de restablecer todos los datos y televisores guardados?')) {
        localStorage.clear();
        StorageManager.init();
        this.app.showToast('Datos locales restablecidos', 'info');
        this.app.navigateTo('home');
      }
    });
  }

  /**
   * Compact Communication Configuration Sheet matching Requirements 14, 15, 16, 17
   */
  _openCommunicationSheet() {
    const existing = document.getElementById('comm-sheet-overlay');
    if (existing) existing.remove();

    const settings = StorageManager.getSettings();
    const overlay = document.createElement('div');
    overlay.id = 'comm-sheet-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title">Modo de comunicación</div>
          <button class="btn-clean-subtle" id="btn-close-comm-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 14px;">
          Define cómo la aplicación envía los comandos a tus televisores en la red local:
        </p>

        <!-- Communication Options -->
        <div class="mode-card-group">
          <!-- Option 1: Direct PWA (iPhone -> Wi-Fi -> Roku) -->
          <div class="mode-card ${settings.connectionMode === 'direct' ? 'active' : ''}" data-mode="direct">
            <div class="mode-radio-circle"></div>
            <div>
              <div class="mode-card-title">Directo PWA (Recomendado)</div>
              <div class="mode-card-desc">
                Comunicación directa desde tu teléfono por Wi-Fi. No requiere computadora ni servidor intermediario.
              </div>
            </div>
          </div>

          <!-- Option 2: Automatic -->
          <div class="mode-card ${settings.connectionMode === 'auto' ? 'active' : ''}" data-mode="auto">
            <div class="mode-radio-circle"></div>
            <div>
              <div class="mode-card-title">Automático</div>
              <div class="mode-card-desc">
                Intenta conexión directa primero; si tienes un bridge configurado en tu red, lo usa como respaldo.
              </div>
            </div>
          </div>

          <!-- Option 3: Bridge Local (Opcional) -->
          <div class="mode-card ${settings.connectionMode === 'bridge' ? 'active' : ''}" data-mode="bridge">
            <div class="mode-radio-circle"></div>
            <div>
              <div class="mode-card-title">Bridge local (Opcional)</div>
              <div class="mode-card-desc">
                Servidor opcional en tu red local (PC o Mac) para descubrimiento SSDP completo y lectura de XML.
              </div>
            </div>
          </div>
        </div>

        <!-- Bridge Configuration (Only shown when configured or bridge mode) -->
        <div id="bridge-config-panel" style="padding: 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); margin-top: 12px;">
          <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px;">
            Dirección LAN del Bridge:
          </label>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-bridge-lan-url" class="text-input-field" placeholder="http://192.168.1.10:3000" value="${settings.bridgeUrl || ''}" style="flex: 1;" />
            <button class="btn-clean btn-clean-secondary" id="btn-test-bridge-action" style="width: auto; padding: 0 14px; font-size: 0.76rem;">
              Probar
            </button>
          </div>
          <div class="input-helper-text">
            Introduce la dirección IP local de la computadora donde se ejecuta el Bridge. No uses <code>localhost</code> si abres la app desde un teléfono.
          </div>
          <div id="bridge-test-feedback" style="font-size: 0.72rem; margin-top: 6px;"></div>
        </div>

        <div style="margin-top: 16px;">
          <button class="btn-clean btn-clean-primary" id="btn-save-comm-settings">
            Guardar cambios
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-comm-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    let selectedMode = settings.connectionMode || 'auto';

    overlay.querySelectorAll('.mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        overlay.querySelectorAll('.mode-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        selectedMode = card.getAttribute('data-mode');
      });
    });

    // Test Bridge Button
    overlay.querySelector('#btn-test-bridge-action').addEventListener('click', async () => {
      const urlInput = overlay.querySelector('#input-bridge-lan-url').value.trim();
      const feedback = overlay.querySelector('#bridge-test-feedback');

      if (!urlInput) {
        feedback.textContent = 'Introduce una URL (ej. http://192.168.1.10:3000)';
        feedback.style.color = 'var(--status-connecting)';
        return;
      }

      feedback.textContent = `Probando conexión con ${urlInput}...`;
      feedback.style.color = 'var(--accent)';

      try {
        const testRes = await NetworkUtils.fetchWithTimeout(`${urlInput.replace(/\/$/, '')}/api/status`, { method: 'GET' }, 2500);
        if (testRes.ok) {
          const data = await testRes.json();
          feedback.textContent = `Bridge alcanzado exitosamente (v${data.version || '1.0'})`;
          feedback.style.color = 'var(--status-connected)';
        } else {
          feedback.textContent = `El servidor respondió con código HTTP ${testRes.status}`;
          feedback.style.color = 'var(--status-connecting)';
        }
      } catch (err) {
        feedback.textContent = `No se pudo conectar a ${urlInput}. Verifica la IP y que el bridge esté encendido.`;
        feedback.style.color = '#ef4444';
      }
    });

    // Save changes
    overlay.querySelector('#btn-save-comm-settings').addEventListener('click', () => {
      const bridgeVal = overlay.querySelector('#input-bridge-lan-url').value.trim();
      StorageManager.saveSettings({
        connectionMode: selectedMode,
        bridgeUrl: bridgeVal
      });
      overlay.remove();
      this.app.showToast('Configuración de comunicación actualizada', 'success');
      this.render(document.getElementById('view-mount-point'));
    });
  }

  /**
   * Roku Permission Guide Sheet matching Requirement 7
   */
  _openRokuGuideSheet() {
    const existing = document.getElementById('roku-guide-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'roku-guide-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title">Configuración en tu Roku</div>
          <button class="btn-clean-subtle" id="btn-close-guide-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 14px;">
          Para permitir el control remoto externo por Wi-Fi, tu televisor Roku requiere activar la opción de control por red:
        </p>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
            Ruta en el menú del televisor:
          </div>
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--accent); line-height: 1.5;">
            Configuración → Sistema → Configuración avanzada del sistema → Control por aplicaciones móviles
          </div>
          <div style="font-size: 0.75rem; color: var(--text-primary); margin-top: 10px;">
            Selecciona: <strong style="color: var(--status-connected);">Permitida (Permitted)</strong> o <strong style="color: var(--status-connected);">Predeterminada (Default)</strong>.
          </div>
        </div>

        <div style="font-size: 0.72rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 16px;">
          <em>Nota: NO es necesario elegir opciones no seguras. Con "Permitida", cualquier dispositivo en tu misma red Wi-Fi autorizada podrá controlar el televisor.</em>
        </div>

        <button class="btn-clean btn-clean-primary" id="btn-guide-got-it">
          Entendido
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-guide-modal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#btn-guide-got-it').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
}
