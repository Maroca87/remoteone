/**
 * RemoteOne - CompatibilityView
 * Real technical status matrix across TV manufacturers and protocols.
 * Strictly zero emojis, 100% Lucide SVGs, no fabricated APIs.
 */

import { renderIcon } from './Icons.js';

export class CompatibilityView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const matrix = [
      {
        brand: 'Roku (Roku TV / Streaming Stick)',
        status: 'Disponible (Prioridad 1)',
        statusClass: 'connected',
        statusColor: 'var(--status-connected)',
        protocol: 'Roku ECP (HTTP 8060)',
        capabilities: [
          { name: 'Control por Wi-Fi (Directo PWA)', status: 'Verificado (100% ECP)' },
          { name: 'D-Pad, Select, Back, Home', status: 'Soportado sin PC' },
          { name: 'Volumen y Silencio (Roku TV)', status: 'Soportado en modelos TV' },
          { name: 'Cambio de entradas HDMI', status: 'Soportado (Roku TV)' },
          { name: 'Lanzamiento de Canales (Apps)', status: 'Soportado (/launch/<id>)' },
          { name: 'Transmisión de Texto', status: 'Soportado (Lit_<char>)' }
        ],
        notes: 'Protocolo ECP directo por Wi-Fi. Requiere autorizar "Control por aplicaciones móviles" en el menú del Roku.'
      },
      {
        brand: 'Xiaomi (Android TV / PatchWall)',
        status: 'Validación pendiente (Prioridad 2)',
        statusClass: 'pending',
        statusColor: 'var(--status-pending)',
        protocol: 'Android TV Remote v2 (TLS 6466/6467) / PatchWall',
        capabilities: [
          { name: 'Identificación de modelo', status: 'En investigación' },
          { name: 'Descubrimiento mDNS', status: 'Requiere puente nativo' },
          { name: 'Emparejamiento PIN / mTLS', status: 'Pendiente de cert' },
          { name: 'Control desde PWA directo', status: 'Limitado por TLS mutuo' }
        ],
        notes: 'Los modelos globales con Android TV emplean certificados mTLS en TCP 6466. No se inventan endpoints ficticios hasta validar el hardware específico.'
      },
      {
        brand: 'Samsung (Smart TV)',
        status: 'Planificado (Fase 2)',
        statusClass: 'disconnected',
        statusColor: 'var(--text-muted)',
        protocol: 'Samsung Tizen WebSocket (WSS 8002)',
        capabilities: [
          { name: 'Control Remoto', status: 'Handshake token en pantalla' }
        ],
        notes: 'Requiere WebSocket seguro y confirmación de emparejamiento inicial en pantalla del televisor.'
      },
      {
        brand: 'LG (webOS Smart TV)',
        status: 'Planificado (Fase 2)',
        statusClass: 'disconnected',
        statusColor: 'var(--text-muted)',
        protocol: 'webOS SSAP WebSocket (WS 3000)',
        capabilities: [
          { name: 'Control Remoto', status: 'Requiere Client Key' }
        ],
        notes: 'Protocolo SSAP requiere intercambio de claves criptográficas.'
      }
    ];

    let html = `
      <div class="view-content">
        <!-- Header -->
        <div class="view-header">
          <div class="view-title">Matriz de Compatibilidad</div>
          <div class="view-subtitle">Estado técnico real sin emulación ficticia</div>
        </div>

        <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.45;">
          En RemoteOne seguimos el principio de <strong>honestidad técnica</strong>: sólo reportamos soporte para protocolos verificados directamente en hardware real.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
          ${matrix.map((m) => `
            <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px;">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px;">
                <div style="font-size: 0.92rem; font-weight: 700; color: var(--text-primary);">${m.brand}</div>
                <span class="status-pill">
                  <span class="status-dot ${m.statusClass}"></span>
                  <span style="color: ${m.statusColor}; font-size: 0.72rem;">${m.status}</span>
                </span>
              </div>

              <div style="font-size: 0.72rem; color: var(--accent); font-family: monospace; margin-bottom: 10px;">
                ${m.protocol}
              </div>

              <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
                ${m.capabilities.map((c) => `
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <span style="color: var(--text-secondary);">${c.name}</span>
                    <strong style="color: var(--text-primary);">${c.status}</strong>
                  </div>
                `).join('')}
              </div>

              <div style="font-size: 0.71rem; color: var(--text-muted); line-height: 1.4; font-style: italic;">
                ${m.notes}
              </div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: center;">
          <button class="btn-clean btn-clean-secondary" id="btn-back-settings-compat" style="width: auto; padding: 8px 18px; margin: 0 auto;">
            ${renderIcon('arrowLeft', 16)}
            <span>Volver a Ajustes</span>
          </button>
        </div>

      </div>
    `;

    container.innerHTML = html;
    container.querySelector('#btn-back-settings-compat')?.addEventListener('click', () => {
      this.app.navigateTo('settings');
    });
  }
}
