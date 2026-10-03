/**
 * RemoteOne - DiagnosticView
 * Clean technical monitor and live telemetry.
 * Strictly zero emojis, 100% Lucide SVGs, exact telemetry readout.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { Logger } from '../utils/Logger.js';
import { renderIcon } from './Icons.js';

export class DiagnosticView {
  constructor(app) {
    this.app = app;
    this.unsubscribeLogger = null;
  }

  render(container) {
    const driver = DeviceManager.getActiveDriver();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    const isConnected = driver?.status === 'Conectado';

    let html = `
      <div class="view-content">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <div class="view-title">Diagnóstico Técnico</div>
            <div class="view-subtitle">Telemetría de conexión y registro de eventos</div>
          </div>
          <button class="btn-clean btn-clean-secondary" id="btn-copy-diagnostics" style="width: auto; padding: 6px 12px; font-size: 0.74rem;">
            ${renderIcon('copy', 14)}
            <span>Copiar</span>
          </button>
        </div>

        <!-- Telemetry Summary Grid matching Requirement 24 -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 18px;">
          <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 12px;">
            ${driver ? driver.name : 'Ningún dispositivo activo'}
          </div>

          <div class="telemetry-grid">
            <div class="telemetry-item">
              <div class="telemetry-item-label">Conexión</div>
              <div class="telemetry-item-value" style="display: flex; align-items: center; gap: 6px;">
                <span class="status-dot ${isConnected ? 'connected' : 'disconnected'}"></span>
                <span style="color: ${isConnected ? 'var(--status-connected)' : 'var(--text-secondary)'}; font-size: 0.82rem;">
                  ${driver ? driver.status : 'Desconectado'}
                </span>
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Dirección IP</div>
              <div class="telemetry-item-value" style="font-family: monospace; font-size: 0.82rem;">
                ${driver ? driver.ip : 'N/A'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Protocolo</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem;">
                ${driver ? driver.protocol : 'Roku ECP'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Puerto</div>
              <div class="telemetry-item-value" style="font-family: monospace; font-size: 0.82rem;">
                ${driver ? driver.port : '8060'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Último comando</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem; color: var(--accent);">
                ${driver?.lastCommand || 'Ninguno'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Última respuesta</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem;">
                ${driver?.lastStatus || 'En espera'}
              </div>
            </div>
          </div>

          <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <span>Modo activo:</span>
            <strong style="color: var(--text-secondary);">${modeInfo.label}</strong>
          </div>
        </div>

        <!-- Live Technical Events Terminal -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);">
            Registro de eventos en vivo
          </span>
          <button class="btn-clean-subtle" id="btn-clear-logs" style="font-size: 0.7rem; padding: 2px 6px;">
            Limpiar
          </button>
        </div>

        <div class="terminal-box" id="diagnostic-log-terminal">
          ${this._renderLogEntries()}
        </div>

        <div style="text-align: center; margin-top: 10px;">
          <button class="btn-clean btn-clean-secondary" id="btn-back-to-settings" style="width: auto; padding: 8px 18px; margin: 0 auto;">
            ${renderIcon('arrowLeft', 16)}
            <span>Volver a Ajustes</span>
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
      return '<div style="color: var(--text-muted); text-align: center; padding: 20px 0;">No hay eventos registrados en la sesión.</div>';
    }
    return logs.map((l) => {
      let color = '#8b9bb4';
      if (l.level === 'SUCCESS') color = '#10b981';
      else if (l.level === 'WARN') color = '#f59e0b';
      else if (l.level === 'ERROR') color = '#ef4444';
      else if (l.level === 'DEBUG') color = '#38bdf8';

      const dataStr = l.data ? `\n  ↳ ${JSON.stringify(l.data)}` : '';
      return `<div style="margin-bottom: 4px;"><span style="color: #4b586e;">[${l.timeFormatted}]</span> <strong style="color: ${color};">[${l.level}]</strong> ${l.message}${dataStr}</div>`;
    }).join('');
  }

  _attachEvents(container, driver, modeInfo) {
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
        this.app.showToast('Diagnóstico copiado al portapapeles', 'success');
      } catch (err) {
        prompt('Reporte de diagnóstico:', report);
      }
    });

    // Clear logs
    container.querySelector('#btn-clear-logs')?.addEventListener('click', () => {
      Logger.clear();
      const term = container.querySelector('#diagnostic-log-terminal');
      if (term) term.innerHTML = this._renderLogEntries();
      this.app.showToast('Registro de eventos limpiado', 'info');
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
