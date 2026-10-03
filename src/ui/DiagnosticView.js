/**
 * RemoteOne - DiagnosticView
 * Real-time diagnostic monitor and log exporter for technical debugging.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { Logger } from '../utils/Logger.js';

export class DiagnosticView {
  constructor(app) {
    this.app = app;
    this.unsubscribeLogger = null;
  }

  render(container) {
    const driver = DeviceManager.getActiveDriver();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    let html = `
      <div class="view-content">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="fw-bold text-white mb-0">📊 Log de Diagnóstico</h5>
            <div class="text-muted small">Telemetría en tiempo real y estado técnico</div>
          </div>
          <button class="btn btn-primary btn-sm fw-bold px-3" id="btn-copy-diagnostics" style="border-radius: 10px;">
            📋 Copiar diagnóstico
          </button>
        </div>

        <!-- Diagnostic Summary Card (Requirement 22) -->
        <div class="card p-3 mb-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
          <h6 class="text-white fw-bold mb-3 d-flex align-items-center gap-2">
            <span>📺</span> Resumen del Dispositivo Activo
          </h6>

          <div class="row g-2 small">
            <div class="col-6">
              <span class="text-muted">Device:</span>
              <div class="fw-bold text-white">${driver ? driver.name : '(Ninguno)'}</div>
            </div>
            <div class="col-6">
              <span class="text-muted">IP:</span>
              <div class="fw-bold text-white">${driver ? driver.ip : 'N/A'}</div>
            </div>
            <div class="col-6">
              <span class="text-muted">Protocol:</span>
              <div class="fw-bold text-white">${driver ? driver.protocol : 'N/A'}</div>
            </div>
            <div class="col-6">
              <span class="text-muted">Port:</span>
              <div class="fw-bold text-white">${driver ? driver.port : 'N/A'}</div>
            </div>
            <div class="col-6">
              <span class="text-muted">Connection:</span>
              <div>
                <span class="badge ${driver?.status === 'Conectado' ? 'bg-success' : 'bg-danger'}">
                  ${driver ? driver.status : 'Disconnected'}
                </span>
              </div>
            </div>
            <div class="col-6">
              <span class="text-muted">Mode:</span>
              <div class="fw-bold text-info">${modeInfo.label}</div>
            </div>
            <div class="col-6">
              <span class="text-muted">Last command:</span>
              <div class="fw-bold text-warning">${driver?.lastCommand || 'None'}</div>
            </div>
            <div class="col-6">
              <span class="text-muted">Status:</span>
              <div class="fw-bold text-white">${driver?.lastStatus || 'Ready'}</div>
            </div>
          </div>
        </div>

        <!-- Live Events Terminal -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-muted small fw-bold text-uppercase">Registro de Eventos en Vivo</span>
          <button class="btn btn-link btn-sm text-muted text-decoration-none p-0" id="btn-clear-logs">
            Limpiar registro
          </button>
        </div>

        <div class="diagnostic-terminal" id="diagnostic-log-terminal">
          ${this._renderLogEntries()}
        </div>

        <div class="mt-3 text-center">
          <button class="btn btn-outline-secondary btn-sm text-white px-4" id="btn-back-to-settings">
            ← Volver a Ajustes
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container, driver, modeInfo);
  }

  _renderLogEntries() {
    const logs = Logger.getHistory();
    if (logs.length === 0) {
      return '<div class="text-muted text-center py-4">No hay eventos registrados todavía.</div>';
    }
    return logs.map((l) => {
      let color = '#94a3b8';
      if (l.level === 'SUCCESS') color = '#10b981';
      else if (l.level === 'WARN') color = '#f59e0b';
      else if (l.level === 'ERROR') color = '#ef4444';
      else if (l.level === 'DEBUG') color = '#38bdf8';

      const dataStr = l.data ? `\n   ↳ ${JSON.stringify(l.data)}` : '';
      return `<div style="margin-bottom: 4px;"><span style="color: #64748b;">[${l.timeFormatted}]</span> <strong style="color: ${color};">[${l.level}]</strong> ${l.message}${dataStr}</div>`;
    }).join('');
  }

  _attachEvents(container, driver, modeInfo) {
    // Real-time subscriber
    if (this.unsubscribeLogger) this.unsubscribeLogger();
    this.unsubscribeLogger = Logger.subscribe(() => {
      const term = container.querySelector('#diagnostic-log-terminal');
      if (term) term.innerHTML = this._renderLogEntries();
    });

    // Copy Diagnostics
    container.querySelector('#btn-copy-diagnostics')?.addEventListener('click', async () => {
      const report = Logger.exportDiagnostics(driver, modeInfo);
      try {
        await navigator.clipboard.writeText(report);
        this.app.showToast('¡Diagnóstico copiado al portapapeles!', 'success');
      } catch (err) {
        // Fallback
        prompt('Copia el reporte de diagnóstico:', report);
      }
    });

    // Clear logs
    container.querySelector('#btn-clear-logs')?.addEventListener('click', () => {
      Logger.clear();
      this.app.showToast('Registro de logs limpiado.', 'info');
    });

    // Back to settings
    container.querySelector('#btn-back-to-settings')?.addEventListener('click', () => {
      this.app.navigateTo('settings');
    });
  }

  destroy() {
    if (this.unsubscribeLogger) {
      this.unsubscribeLogger();
      this.unsubscribeLogger = null;
    }
  }
}
