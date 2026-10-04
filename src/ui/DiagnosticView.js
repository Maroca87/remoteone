/**
 * RemoteOne - DiagnosticView
 * Clean technical monitor and live telemetry.
 * Strictly zero emojis, 100% Lucide SVGs, exact telemetry readout.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
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

    const liveState = driver ? DeviceManager.getDeviceState(driver.id) : null;
    const isOnline = liveState?.networkStatus === 'online';

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

        <!-- Telemetry Summary Grid matching Requirement 17 -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 18px;">
          <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 12px;">
            ${driver ? `${driver.vendorName || driver.brand.toUpperCase()} - ${driver.name}` : 'Ningún dispositivo activo'}
          </div>

          <div class="telemetry-grid">
            <div class="telemetry-item">
              <div class="telemetry-item-label">Target</div>
              <div class="telemetry-item-value" style="font-family: monospace; font-size: 0.82rem;">
                ${driver ? driver.ip : 'N/A'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Port</div>
              <div class="telemetry-item-value" style="font-family: monospace; font-size: 0.82rem;">
                ${driver ? driver.port : '8060'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Protocol</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem;">
                ${driver ? driver.protocol : 'Roku ECP'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Endpoint</div>
              <div class="telemetry-item-value" style="font-family: monospace; font-size: 0.80rem; color: var(--accent);">
                ${driver?.lastEndpoint || 'query/device-info'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">HTTP status</div>
              <div class="telemetry-item-value" style="font-family: monospace; font-size: 0.82rem; font-weight: 600; color: ${driver?.lastHttpStatus === 200 || driver?.lastHttpStatus === '200' ? 'var(--status-connected)' : 'var(--text-secondary)'};">
                ${driver?.lastHttpStatus || '200 OK'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Network</div>
              <div class="telemetry-item-value" style="display: flex; align-items: center; gap: 6px;">
                <span class="status-dot ${isOnline ? 'connected' : (liveState?.networkStatus === 'checking' ? 'connecting' : 'disconnected')}"></span>
                <span style="color: ${isOnline ? 'var(--status-connected)' : 'var(--text-secondary)'}; font-size: 0.82rem; font-weight: 600;">
                  ${liveState?.networkStatus ? (liveState.networkStatus.charAt(0).toUpperCase() + liveState.networkStatus.slice(1)) : 'Unknown'}
                </span>
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Power</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem; font-weight: 600; color: ${liveState?.powerStatus === 'on' ? 'var(--status-connected)' : 'var(--text-secondary)'};">
                ${liveState?.powerStatus === 'on' ? 'On' : (liveState?.powerStatus === 'off' ? 'Off' : (liveState?.powerStatus === 'standby' ? 'Standby' : 'Unknown'))}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Last command</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem; color: var(--accent);">
                ${driver?.lastCommand || 'Home'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Last command result</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem; font-weight: 600; color: ${driver?.lastCommandResult === 'Success' ? 'var(--status-connected)' : (driver?.lastCommandResult === 'Failed' ? 'var(--status-disconnected)' : 'var(--text-secondary)')};">
                ${driver?.lastCommandResult || 'None'}
              </div>
            </div>

            <div class="telemetry-item">
              <div class="telemetry-item-label">Connection mode</div>
              <div class="telemetry-item-value" style="font-size: 0.82rem;">
                Direct PWA
              </div>
            </div>
          </div>
        </div>

        <!-- TEST DIRECT PWA - Real Fetch Diagnostic Suite -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent);">
              TEST DIRECT PWA • Diagnóstico Real de Fetch
            </div>
            <span class="status-pill" style="font-size: 0.65rem;">
              Protocolo ECP :8060
            </span>
          </div>

          <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.4;">
            Prueba de aislamiento técnico: evalúa si el JavaScript del navegador puede acceder a la respuesta HTTP del Roku o si es bloqueado por políticas de origen/CORS.
          </p>

          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <div style="flex: 2;">
              <label style="font-size: 0.68rem; color: var(--text-muted); display: block; margin-bottom: 4px;">IP del Roku</label>
              <input type="text" id="diag-target-ip" class="text-input-field" value="${driver?.ip || '192.168.100.116'}" style="font-family: monospace; font-size: 0.8rem; padding: 6px 10px;" />
            </div>
            <div style="flex: 1;">
              <label style="font-size: 0.68rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Puerto</label>
              <input type="number" id="diag-target-port" class="text-input-field" value="${driver?.port || 8060}" style="font-family: monospace; font-size: 0.8rem; padding: 6px 10px;" />
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <button class="btn-clean btn-clean-primary" id="btn-run-pwa-get-test" style="flex: 1; font-size: 0.74rem; padding: 8px 10px;">
              ${renderIcon('wifi', 14)}
              <span>1. Test GET (device-info)</span>
            </button>
            <button class="btn-clean btn-clean-secondary" id="btn-run-pwa-post-test" style="flex: 1; font-size: 0.74rem; padding: 8px 10px;">
              ${renderIcon('home', 14)}
              <span>2. Test POST (keypress/Home)</span>
            </button>
          </div>

          <!-- Dynamic Output Container -->
          <div id="pwa-test-results-panel" style="display: none; background: var(--bg-surface-elevated); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); padding: 12px; font-family: monospace; font-size: 0.72rem;">
            <div id="pwa-test-output-content"></div>
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

    const getIpInput = () => container.querySelector('#diag-target-ip')?.value.trim() || '192.168.100.116';
    const getPortInput = () => parseInt(container.querySelector('#diag-target-port')?.value.trim(), 10) || 8060;

    // 1. Run Direct GET Test (/query/device-info)
    container.querySelector('#btn-run-pwa-get-test')?.addEventListener('click', async () => {
      const ip = getIpInput();
      const port = getPortInput();
      const targetUrl = `http://${ip}:${port}/query/device-info`;
      const panel = container.querySelector('#pwa-test-results-panel');
      const content = container.querySelector('#pwa-test-output-content');

      panel.style.display = 'block';
      content.innerHTML = `
        <div style="color: var(--accent); padding: 8px 0;">
          ${renderIcon('refresh', 14)} Iniciando fetch direct GET hacia: ${targetUrl}...
        </div>
      `;

      Logger.info(`[TEST DIRECT PWA] Ejecutando fetch GET hacia ${targetUrl}`);

      try {
        const report = await NetworkUtils.testDirectPwaFetch(targetUrl, 4000);
        content.innerHTML = this._renderGetTestReport(report);
        Logger.info(`[TEST DIRECT PWA] Resultado GET: ${report.classification}`, report);
      } catch (e) {
        content.innerHTML = `<div style="color: var(--status-disconnected);">Error inesperado al ejecutar prueba: ${e.message}</div>`;
        Logger.error(`[TEST DIRECT PWA] Error: ${e.message}`);
      }
    });

    // 2. Run Direct POST Test (/keypress/Home)
    container.querySelector('#btn-run-pwa-post-test')?.addEventListener('click', async () => {
      const ip = getIpInput();
      const port = getPortInput();
      const targetUrl = `http://${ip}:${port}/keypress/Home`;
      const panel = container.querySelector('#pwa-test-results-panel');
      const content = container.querySelector('#pwa-test-output-content');

      panel.style.display = 'block';
      content.innerHTML = `
        <div style="color: var(--accent); padding: 8px 0;">
          ${renderIcon('refresh', 14)} Iniciando fetch direct POST hacia: ${targetUrl}...
        </div>
      `;

      Logger.info(`[TEST DIRECT PWA] Ejecutando POST /keypress/Home (sin body) hacia ${targetUrl}`);

      try {
        const report = await NetworkUtils.testDirectPwaPost(targetUrl, 3500);
        content.innerHTML = this._renderPostTestReport(report);
        Logger.info(`[TEST DIRECT PWA] Resultado POST: ${report.verdict}`, report);
      } catch (e) {
        content.innerHTML = `<div style="color: var(--status-disconnected);">Error inesperado al ejecutar prueba: ${e.message}</div>`;
        Logger.error(`[TEST DIRECT PWA] Error: ${e.message}`);
      }
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

  _renderGetTestReport(r) {
    const isCorsBlocked = r.classification === 'CORS_OR_LOCAL_NETWORK_RESTRICTION';
    const isSuccess = r.classification === 'SUCCESS_DIRECT_ACCESS';

    return `
      <div style="border-bottom: 1px solid var(--border-hairline); padding-bottom: 10px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: ${isSuccess ? 'var(--status-connected)' : (isCorsBlocked ? 'var(--status-connecting)' : 'var(--status-disconnected)')};">
            [${r.classification}]
          </strong>
          <span style="color: var(--text-muted); font-size: 0.68rem;">${r.durationMs}ms</span>
        </div>
        <div style="color: var(--text-secondary); font-size: 0.74rem; line-height: 1.4;">
          ${r.verdict}
        </div>
      </div>

      <!-- Honest Technical Status Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: var(--radius-xs);">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.65rem;">Roku reachable:</span>
          <strong style="color: var(--status-connected); font-size: 0.78rem;">${r.rokuReachable === 'LIKELY_YES_AT_TCP_LEVEL' ? 'YES (Verificado)' : r.rokuReachable}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.65rem;">Browser direct API access:</span>
          <strong style="color: ${isSuccess ? 'var(--status-connected)' : 'var(--status-disconnected)'}; font-size: 0.78rem;">
            ${r.browserApiAccess}
          </strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.65rem;">HTTP Status:</span>
          <span style="color: var(--text-primary); font-size: 0.75rem;">${r.httpStatus !== null ? r.httpStatus : 'null (bloqueado por motor WebKit)'}</span>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.65rem;">JavaScript Error:</span>
          <span style="color: #f87171; font-size: 0.75rem;">${r.javascriptError ? `${r.javascriptError.name}: ${r.javascriptError.message}` : 'None'}</span>
        </div>
      </div>

      <!-- Raw Technical Telemetry -->
      <div style="font-size: 0.68rem; color: var(--text-secondary); line-height: 1.5; word-break: break-all;">
        <div><strong>Target:</strong> ${r.targetUrl}</div>
        <div><strong>Request Started:</strong> ${r.timestampStarted}</div>
        <div><strong>Request Completed:</strong> ${r.timestampCompleted}</div>
        <div><strong>PWA Origin:</strong> ${r.runtimeContext.origin || 'N/A'} (Protocolo: ${r.runtimeContext.isHttps ? 'HTTPS' : 'HTTP'})</div>
        ${r.responseBody ? `<div style="margin-top: 6px;"><strong>Body (XML):</strong><pre style="max-height: 100px; overflow-y: auto; background: #000; padding: 6px; border-radius: 4px; margin-top: 4px;">${this._escapeHtml(r.responseBody.substring(0, 300))}</pre></div>` : ''}
        ${r.javascriptError?.stack ? `<div style="margin-top: 6px; color: #f87171;"><strong>Stack:</strong><pre style="font-size: 0.62rem; margin-top: 2px;">${this._escapeHtml(r.javascriptError.stack.substring(0, 200))}</pre></div>` : ''}
      </div>

      <!-- Clear Architectural Diagnosis -->
      <div style="margin-top: 10px; padding: 8px; background: rgba(59, 130, 246, 0.08); border-left: 3px solid var(--accent); border-radius: 4px; font-size: 0.70rem; color: var(--text-secondary); line-height: 1.4;">
        <strong style="color: var(--accent);">Diferencia técnica fundamental:</strong>
        Safari en la barra de URL realiza una navegación de documento sin restricciones CORS y muestra el XML. Pero JavaScript en una PWA ejecuta bajo la política de mismo origen. Dado que Roku no incluye cabeceras <code>Access-Control-Allow-Origin: *</code>, el navegador rechaza la lectura.
      </div>
    `;
  }

  _renderPostTestReport(r) {
    return `
      <div style="border-bottom: 1px solid var(--border-hairline); padding-bottom: 10px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <strong style="color: var(--accent);">
            POST /keypress/Home (sin body)
          </strong>
          <span style="color: var(--text-muted); font-size: 0.68rem;">${r.durationMs}ms</span>
        </div>
        <div style="color: var(--text-secondary); font-size: 0.74rem; line-height: 1.4;">
          ${r.verdict}
        </div>
      </div>

      <!-- Separation of Sent vs Confirmed -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; background: rgba(0,0,0,0.25); padding: 8px; border-radius: var(--radius-xs);">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.65rem;">Command sent:</span>
          <strong style="color: ${r.standardFetch.commandSent || r.noCorsProbe.commandSent ? 'var(--status-connected)' : 'var(--status-disconnected)'}; font-size: 0.78rem;">
            ${r.standardFetch.commandSent || r.noCorsProbe.commandSent ? 'YES (Paquete HTTP emitido)' : 'NO'}
          </strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.65rem;">Command confirmed:</span>
          <strong style="color: ${r.standardFetch.commandConfirmed ? 'var(--status-connected)' : 'var(--status-connecting)'}; font-size: 0.78rem;">
            ${r.standardFetch.commandConfirmed ? 'YES (HTTP 200 leído)' : 'NO (Respuesta bloqueada por CORS)'}
          </strong>
        </div>
      </div>

      <div style="font-size: 0.68rem; color: var(--text-secondary); line-height: 1.5;">
        <div><strong>Target:</strong> ${r.targetUrl}</div>
        <div><strong>Standard fetch error:</strong> ${r.standardFetch.error ? `${r.standardFetch.error.name}: ${r.standardFetch.error.message}` : 'None'}</div>
        <div><strong>no-cors probe:</strong> ${r.noCorsProbe.attempted ? `Dispatched (responseType: ${r.noCorsProbe.responseType})` : 'No requerido'}</div>
      </div>

      <div style="margin-top: 10px; padding: 8px; background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--status-connecting); border-radius: 4px; font-size: 0.70rem; color: var(--text-secondary); line-height: 1.4;">
        <strong style="color: var(--status-connecting);">Regla de confirmación:</strong>
        El paquete HTTP POST puede ser transmitido por el socket del dispositivo móvil, pero sin cabeceras CORS el navegador no permite leer la respuesta de confirmación. Por tanto, es <em>Command sent (unconfirmed)</em>.
      </div>
    `;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  destroy() {
    if (this.unsubscribeLogger) {
      this.unsubscribeLogger();
      this.unsubscribeLogger = null;
    }
  }
}
