/**
 * RemoteOne - CompatibilityView
 * Matrix of manufacturers, protocol states, verified capabilities, and technical roadmaps.
 */

export class CompatibilityView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const matrix = [
      {
        brand: 'Roku (Roku TV / Streaming Stick)',
        status: 'Disponible (Prioridad 1)',
        badge: 'bg-success',
        protocol: 'Roku ECP (HTTP 8060)',
        capabilities: [
          { name: 'Descubrimiento SSDP', status: '✓ Soportado (vía Bridge Local)' },
          { name: 'Control remoto (D-Pad, OK, Back, Home)', status: '✓ Soportado (100% ECP)' },
          { name: 'Volumen y Silencio (Roku TV)', status: '✓ Soportado (is-tv="true")' },
          { name: 'Cambio de Canales / Entradas HDMI', status: '✓ Soportado (Roku TV)' },
          { name: 'Lanzamiento de Canales (Apps)', status: '✓ Soportado (/launch/<id>)' },
          { name: 'Transmisión de Texto (Búsqueda)', status: '✓ Soportado (Lit_<char>)' }
        ],
        notes: 'Protocolo abierto y documentado. Requiere autorización en Roku (Control by mobile apps).'
      },
      {
        brand: 'Xiaomi (Android TV / Google TV / PatchWall)',
        status: 'Pendiente de Validar (Prioridad 2)',
        badge: 'bg-warning text-dark',
        protocol: 'Android TV Remote Protocol v2 (TLS 6466/6467) / PatchWall',
        capabilities: [
          { name: 'Descubrimiento mDNS', status: '⚠ En investigación (_androidtvremote2._tcp)' },
          { name: 'Control Remoto', status: '⚠ Requiere emparejamiento PIN + mTLS' },
          { name: 'Volumen / Power', status: '⚠ Requiere sesión cifrada' },
          { name: 'Apps / Canales', status: '⚠ Requiere intents Android' }
        ],
        notes: 'Los modelos globales usan Android TV con certificados mTLS en TCP 6466. No compatible con llamadas HTTP directas desde el navegador. Requiere servicio mTLS en Bridge.'
      },
      {
        brand: 'Samsung (Smart TV)',
        status: 'No Implementado',
        badge: 'bg-secondary',
        protocol: 'Samsung WebSocket API (WSS 8002 / Token Pairing)',
        capabilities: [
          { name: 'Control Remoto', status: '○ No implementado' }
        ],
        notes: 'Requiere WebSocket seguro con handshake de token aprobado en pantalla del TV.'
      },
      {
        brand: 'LG (webOS Smart TV)',
        status: 'No Implementado',
        badge: 'bg-secondary',
        protocol: 'webOS WebSocket (WS/WSS 3000/3001) / SSAP',
        capabilities: [
          { name: 'Control Remoto', status: '○ No implementado' }
        ],
        notes: 'Protocolo SSAP requiere emparejamiento con clave de cliente (Client Key).'
      },
      {
        brand: 'Sony (Bravia)',
        status: 'No Implementado',
        badge: 'bg-secondary',
        protocol: 'Sony Bravia REST API / IRCC-IP (HTTP 80 / PSK)',
        capabilities: [
          { name: 'Control Remoto', status: '○ No implementado' }
        ],
        notes: 'Soporta Pre-Shared Key (PSK) o PIN de emparejamiento para enviar comandos IRCC.'
      }
    ];

    let html = `
      <div class="view-content">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="fw-bold text-white mb-0">📋 Matriz de Compatibilidad</h5>
            <div class="text-muted small">Estado real verificado por fabricante</div>
          </div>
        </div>

        <p class="text-muted small mb-3">
          En RemoteOne nos regimos por la regla de <strong>no simular funciones ficticias</strong>. A continuación se desglosa el estado técnico verificado de cada marca:
        </p>

        <div class="d-grid gap-3">
          ${matrix.map((m) => `
            <div class="card p-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="text-white fw-bold mb-0">${m.brand}</h6>
                <span class="badge ${m.badge}" style="font-size: 0.65rem;">${m.status}</span>
              </div>
              <div class="text-info small mb-2" style="font-size: 0.72rem;">Protocolo: ${m.protocol}</div>
              
              <ul class="list-unstyled mb-2 small">
                ${m.capabilities.map((c) => `
                  <li class="py-1 border-bottom border-dark text-white d-flex justify-content-between">
                    <span class="text-muted">${c.name}:</span>
                    <span class="fw-bold">${c.status}</span>
                  </li>
                `).join('')}
              </ul>

              <div class="text-muted small mt-2" style="font-size: 0.72rem;">
                <em>${m.notes}</em>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="mt-4 text-center">
          <button class="btn btn-outline-secondary btn-sm text-white px-4" id="btn-back-settings-from-compat">
            ← Volver a Ajustes
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
    container.querySelector('#btn-back-settings-from-compat')?.addEventListener('click', () => {
      this.app.navigateTo('settings');
    });
  }
}
