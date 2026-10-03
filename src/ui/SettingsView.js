/**
 * RemoteOne - SettingsView
 * Network mode selection, Bridge URL config, Roku configuration guide, Demo mode, and Compatibility.
 */

import { StorageManager } from '../core/StorageManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';

export class SettingsView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const settings = StorageManager.getSettings();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    let html = `
      <div class="view-content">
        <h5 class="fw-bold text-white mb-3">⚙ Ajustes y Configuración</h5>

        <!-- 1. Modo de Conexión -->
        <div class="card p-3 mb-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
          <h6 class="text-white fw-bold mb-2 d-flex align-items-center justify-content-between">
            <span>🌐 Modo de Comunicación</span>
            <span class="badge ${modeInfo.badgeClass}" style="font-size: 0.65rem;">${modeInfo.label}</span>
          </h6>
          <p class="text-muted small mb-3">
            Elige cómo la PWA se comunica con tus televisores en la red Wi-Fi:
          </p>

          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="connModeRadio" id="mode-auto" value="auto" ${settings.connectionMode === 'auto' ? 'checked' : ''}>
            <label class="form-check-label text-white small" for="mode-auto">
              <strong>Automático (Recomendado):</strong> Usa el Bridge local si está activo; si no, prueba conexión directa.
            </label>
          </div>

          <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="connModeRadio" id="mode-bridge" value="bridge" ${settings.connectionMode === 'bridge' ? 'checked' : ''}>
            <label class="form-check-label text-white small" for="mode-bridge">
              <strong>Bridge Local Obligatorio:</strong> Evita restricciones de CORS/PNA del navegador y permite SSDP y lectura completa de XML.
            </label>
          </div>

          <div class="form-check mb-3">
            <input class="form-check-input" type="radio" name="connModeRadio" id="mode-direct" value="direct" ${settings.connectionMode === 'direct' ? 'checked' : ''}>
            <label class="form-check-label text-white small" for="mode-direct">
              <strong>Conexión Directa PWA:</strong> Peticiones directas desde el teléfono. (Puede ser bloqueado por CORS si el TV no emite cabeceras).
            </label>
          </div>

          <!-- Bridge URL Input -->
          <div class="border-top border-secondary pt-3 mt-2">
            <label class="form-label text-white small fw-bold">Dirección del Local Bridge:</label>
            <div class="input-group input-group-sm mb-2">
              <input type="text" class="form-control bg-dark text-white border-secondary" id="input-bridge-url" value="${settings.bridgeUrl || 'http://localhost:3000'}">
              <button class="btn btn-outline-info fw-bold" id="btn-test-bridge">Probar Bridge</button>
            </div>
            <div class="form-text text-muted" style="font-size: 0.72rem;">
              Ejecuta <code>python bridge.py</code> o <code>npm start</code> en la carpeta <code>/bridge</code> de tu PC.
            </div>
            <div id="bridge-test-status" class="mt-2 small"></div>
          </div>
        </div>

        <!-- 2. Guía de Configuración Roku (Requisito 7) -->
        <div class="card p-3 mb-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
          <h6 class="text-white fw-bold mb-2 d-flex align-items-center gap-2">
            <span>🛡️</span> Configuración Segura en tu Roku
          </h6>
          <p class="text-muted small mb-2">
            Para utilizar el control remoto por Wi-Fi, el teléfono y el Roku deben estar en la <strong>misma red local</strong>.
          </p>
          <div class="p-2 rounded mb-2" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); font-size: 0.76rem; color: #fde68a;">
            <strong>Importante:</strong> En versiones recientes de Roku OS, debes autorizar el control externo desde las opciones del televisor:
          </div>
          
          <div class="p-3 rounded-3" style="background: #090d16; border: 1px solid #1e293b; font-size: 0.8rem;">
            <div class="text-muted">Ruta en el menú del Roku:</div>
            <div class="fw-bold text-info my-1">
              Settings (Configuración) ➔ System (Sistema) ➔ Advanced system settings (Configuración avanzada del sistema) ➔ Control by mobile apps (Control por aplicaciones móviles)
            </div>
            <div class="text-muted mt-2">
              Selecciona la opción segura: <strong class="text-success">Default (Predeterminada)</strong> o <strong class="text-success">Permitted (Permitida)</strong>.
            </div>
            <div class="text-muted mt-1 small" style="font-size: 0.72rem;">
              <em>* Nota de seguridad: NO es necesario configurar "Permissive". La opción segura para la misma red Wi-Fi es la recomendada.</em>
            </div>
          </div>
        </div>

        <!-- 3. Modo Demostración (Requisito 29) -->
        <div class="card p-3 mb-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-white fw-bold mb-0">🧪 Modo Demostración (Demo)</h6>
              <div class="text-muted small">Permite probar toda la interfaz y botones sin tener un TV físico conectado.</div>
            </div>
            <div class="form-check form-switch fs-5">
              <input class="form-check-input" type="checkbox" id="switch-demo-mode" ${settings.demoMode ? 'checked' : ''}>
            </div>
          </div>
        </div>

        <!-- 4. Enlaces a Diagnóstico y Compatibilidad -->
        <div class="d-grid gap-2 mb-4">
          <button class="btn btn-outline-info text-start p-3 d-flex justify-content-between align-items-center" id="btn-goto-diagnostics" style="background: var(--bg-card); border-radius: 14px;">
            <div>
              <div class="fw-bold text-white">📊 Log de Diagnóstico</div>
              <div class="text-muted small">Inspección de red, comandos y telemetría en vivo</div>
            </div>
            <span>➔</span>
          </button>

          <button class="btn btn-outline-secondary text-start p-3 d-flex justify-content-between align-items-center text-white" id="btn-goto-compatibility" style="background: var(--bg-card); border-radius: 14px;">
            <div>
              <div class="fw-bold text-white">📋 Módulo de Compatibilidad de Marcas</div>
              <div class="text-muted small">Roku, Xiaomi, Samsung, LG, Sony y protocolos</div>
            </div>
            <span>➔</span>
          </button>
        </div>

        <!-- 5. Reset Application Data -->
        <div class="text-center pt-2">
          <button class="btn btn-link text-danger text-decoration-none small" id="btn-reset-storage">
            Restablecer datos locales de la aplicación
          </button>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _attachEvents(container) {
    // Radio mode change
    container.querySelectorAll('input[name="connModeRadio"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        StorageManager.saveSettings({ connectionMode: e.target.value });
        this.app.showToast(`Modo cambiado a: ${e.target.value.toUpperCase()}`, 'info');
      });
    });

    // Test Bridge button
    const testBridgeBtn = container.querySelector('#btn-test-bridge');
    const bridgeUrlInput = container.querySelector('#input-bridge-url');
    const statusEl = container.querySelector('#bridge-test-status');

    testBridgeBtn?.addEventListener('click', async () => {
      const url = bridgeUrlInput.value.trim();
      StorageManager.saveSettings({ bridgeUrl: url });
      testBridgeBtn.disabled = true;
      testBridgeBtn.textContent = 'Probando...';
      statusEl.innerHTML = '<span class="text-info">Conectando con el bridge...</span>';

      const isOnline = await ConnectionManager.checkBridgeHealth();
      testBridgeBtn.disabled = false;
      testBridgeBtn.textContent = 'Probar Bridge';

      if (isOnline) {
        statusEl.innerHTML = '<span class="text-success fw-bold">✓ Bridge conectado exitosamente y disponible en la red local.</span>';
        this.app.showToast('Local Bridge conectado', 'success');
      } else {
        statusEl.innerHTML = '<span class="text-danger fw-bold">✗ No se pudo conectar con el bridge en esa URL. Verifica que server.js o bridge.py esté corriendo.</span>';
        this.app.showToast('Bridge no responde', 'danger');
      }
    });

    // Demo Mode toggle
    container.querySelector('#switch-demo-mode')?.addEventListener('change', (e) => {
      const isDemo = e.target.checked;
      StorageManager.saveSettings({ demoMode: isDemo });
      if (isDemo) {
        this.app.showToast('Modo Demostración activado.', 'warning');
      } else {
        this.app.showToast('Modo Demostración desactivado.', 'info');
      }
      this.app.updateDemoBanner();
    });

    // Navigation links
    container.querySelector('#btn-goto-diagnostics')?.addEventListener('click', () => {
      this.app.navigateTo('diagnostic');
    });

    container.querySelector('#btn-goto-compatibility')?.addEventListener('click', () => {
      this.app.navigateTo('compatibility');
    });

    // Reset storage
    container.querySelector('#btn-reset-storage')?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas borrar todos los televisores y ajustes guardados?')) {
        localStorage.clear();
        StorageManager.init();
        this.app.showToast('Datos locales restablecidos.', 'info');
        this.app.navigateTo('home');
      }
    });
  }
}
