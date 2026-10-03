/**
 * RemoteOne - HomeView
 * Minimalist, uncluttered device list console.
 * Strictly zero emojis, clean typographic rows, direct remote switching.
 */

import { StorageManager } from '../core/StorageManager.js';
import { DeviceManager } from '../core/DeviceManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { DiscoveryManager } from '../core/DiscoveryManager.js';
import { renderIcon } from './Icons.js';

export class HomeView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const devices = StorageManager.getDevices();
    const activeDriver = DeviceManager.getActiveDriver();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    let html = `
      <div class="view-content">

        <!-- Top Section Header -->
        <div class="device-list-header">
          <span class="section-label">Mis dispositivos (${devices.length})</span>
          <span class="status-pill">
            <span class="status-dot ${modeInfo.resolvedMode === 'demo' ? 'connecting' : 'connected'}"></span>
            <span style="color: var(--text-secondary); font-size: 0.72rem;">${modeInfo.label}</span>
          </span>
        </div>

        <!-- Clean Device List -->
        <div class="device-list" id="device-rows-container">
          ${devices.length === 0 ? this._renderEmptyState() : devices.map((d) => this._renderDeviceRow(d, activeDriver?.id === d.id)).join('')}
        </div>

        <!-- Action Stack -->
        <div class="action-stack">
          <button class="btn-clean btn-clean-primary" id="btn-home-scan">
            ${renderIcon('scan', 17)}
            <span>Escanear red Wi-Fi</span>
          </button>
          
          <button class="btn-clean btn-clean-secondary" id="btn-home-add-manual">
            ${renderIcon('plus', 17)}
            <span>Agregar dispositivo por IP</span>
          </button>
        </div>

        <!-- Discreet Wi-Fi Context Hint -->
        <div style="margin-top: 24px; padding: 12px 14px; background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); display: flex; align-items: center; gap: 10px;">
          <span style="color: var(--text-muted);">${renderIcon('wifi', 16)}</span>
          <span style="font-size: 0.73rem; color: var(--text-secondary); line-height: 1.4;">
            Conexión directa: tu iPhone y tu Roku deben estar en la <strong>misma red Wi-Fi</strong>.
          </span>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _renderEmptyState() {
    return `
      <div class="empty-device-box">
        <div class="empty-icon-wrap">
          ${renderIcon('tv', 24)}
        </div>
        <div style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
          Sin dispositivos registrados
        </div>
        <p style="font-size: 0.75rem; color: var(--text-secondary); max-width: 260px; margin: 0 auto 16px;">
          Localiza automáticamente tu televisor Roku en tu red Wi-Fi o introduce su IP local.
        </p>
      </div>
    `;
  }

  _renderDeviceRow(device, isActive) {
    const isRoku = (device.brand || 'roku').toLowerCase() === 'roku';
    const isConnected = device.status === 'Conectado' || isActive;
    const statusClass = !isRoku ? 'pending' : (isConnected ? 'connected' : 'disconnected');
    const statusText = !isRoku ? 'Validación pendiente' : (isConnected ? 'Conectado' : 'Desconectado');

    return `
      <div class="device-row ${isActive ? 'is-active-device' : ''}" data-device-id="${device.id}">
        <div class="device-row-main">
          <div class="device-icon-box">
            ${renderIcon('tv', 18)}
          </div>
          <div class="device-info">
            <div class="device-name-title">
              <span>${device.name}</span>
              ${isActive ? `<span style="font-size: 0.62rem; font-weight: 700; color: var(--accent); background: var(--accent-subtle); padding: 1px 6px; border-radius: var(--radius-xs);">ACTIVO</span>` : ''}
            </div>
            <div class="device-meta-text">
              <span>${device.model || 'Roku TV'}</span>
              <span>•</span>
              <span style="font-family: monospace; font-size: 0.72rem;">${device.ip}</span>
              <span>•</span>
              <span class="status-pill">
                <span class="status-dot ${statusClass}"></span>
                <span>${statusText}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="device-actions-box">
          <button class="device-action-btn btn-delete-device" data-device-id="${device.id}" aria-label="Eliminar ${device.name}">
            ${renderIcon('trash', 15)}
          </button>
          <span style="color: var(--text-muted);">${renderIcon('chevronRight', 16)}</span>
        </div>
      </div>
    `;
  }

  _attachEvents(container) {
    // 1. Click on device row opens remote or activates device
    container.querySelectorAll('.device-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-device')) return;
        const id = row.getAttribute('data-device-id');
        DeviceManager.setActiveDevice(id);
        this.app.navigateTo('remote');
      });
    });

    // 2. Delete device button
    container.querySelectorAll('.btn-delete-device').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-device-id');
        const dev = StorageManager.getDevice(id);
        if (confirm(`¿Eliminar ${dev?.name || 'este televisor'}?`)) {
          StorageManager.deleteDevice(id);
          this.render(container);
          this.app.showToast('Dispositivo eliminado', 'info');
        }
      });
    });

    // 3. Scan for devices button
    container.querySelector('#btn-home-scan')?.addEventListener('click', () => {
      this._openScanSheet();
    });

    // 4. Add device by IP manual button
    container.querySelector('#btn-home-add-manual')?.addEventListener('click', () => {
      this.app.views.setup.wizardData.method = 'manual';
      this.app.views.setup.step = 1;
      this.app.navigateTo('setup');
    });
  }

  /**
   * Quick Scan Modal / Sheet matching Requirement 18:
   * iPhone -> Wi-Fi -> Discovery -> Roku -> Device found
   * Displays: Roku Habitación, Roku TV, 192.168.1.x, Connected, [Add]
   */
  _openScanSheet() {
    const existing = document.getElementById('scan-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'scan-modal-overlay';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title">Escanear red Wi-Fi</div>
          <button class="btn-clean-subtle" id="btn-close-scan-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 16px;">
          Búsqueda de televisores Roku en tu red local por protocolo oficial SSDP / ECP.
        </p>

        <div id="scan-progress-area" style="padding: 16px; background: var(--bg-surface-elevated); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); text-align: center; margin-bottom: 16px;">
          <div style="color: var(--accent); margin-bottom: 8px;">
            ${renderIcon('scan', 28)}
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);" id="scan-status-text">
            Buscando dispositivos Roku...
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px;" id="scan-sub-text">
            Transmitiendo señal en la red local
          </div>
        </div>

        <div id="scan-results-container" style="display: none; margin-bottom: 16px;"></div>

        <div id="scan-actions-area" class="action-stack">
          <button class="btn-clean btn-clean-secondary" id="btn-scan-manual-fallback">
            ${renderIcon('keyboard', 16)}
            <span>Introducir IP manualmente</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-scan-modal').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('#btn-scan-manual-fallback').addEventListener('click', () => {
      overlay.remove();
      this.app.views.setup.wizardData.method = 'manual';
      this.app.views.setup.step = 1;
      this.app.navigateTo('setup');
    });

    // Execute Discovery
    this._executeScan(overlay);
  }

  async _executeScan(overlay) {
    const statusText = overlay.querySelector('#scan-status-text');
    const subText = overlay.querySelector('#scan-sub-text');
    const progressArea = overlay.querySelector('#scan-progress-area');
    const resultsContainer = overlay.querySelector('#scan-results-container');

    try {
      const discoveryResult = await DiscoveryManager.discoverByBrand('roku');

      if (discoveryResult.success && discoveryResult.devices && discoveryResult.devices.length > 0) {
        progressArea.style.display = 'none';
        resultsContainer.style.display = 'block';

        resultsContainer.innerHTML = `
          <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px;">
            Dispositivos encontrados (${discoveryResult.devices.length})
          </div>
          <div class="device-list" style="margin-bottom: 0;">
            ${discoveryResult.devices.map((dev) => `
              <div class="device-row" style="cursor: default;">
                <div class="device-row-main">
                  <div class="device-icon-box">${renderIcon('tv', 18)}</div>
                  <div class="device-info">
                    <div class="device-name-title">${dev.name}</div>
                    <div class="device-meta-text">
                      <span>${dev.model || 'Roku TV'}</span>
                      <span>•</span>
                      <span style="font-family: monospace;">${dev.ip}</span>
                      <span>•</span>
                      <span class="status-pill">
                        <span class="status-dot connected"></span>
                        <span style="color: var(--status-connected);">Conectado</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <button class="btn-clean btn-clean-primary btn-add-discovered-device" data-device='${JSON.stringify(dev)}' style="padding: 6px 12px; font-size: 0.76rem; width: auto;">
                    Agregar
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        resultsContainer.querySelectorAll('.btn-add-discovered-device').forEach((btn) => {
          btn.addEventListener('click', () => {
            const devData = JSON.parse(btn.getAttribute('data-device'));
            StorageManager.saveDevice(devData);
            DeviceManager.setActiveDevice(devData.id);
            overlay.remove();
            this.app.showToast(`${devData.name} agregado exitosamente`, 'success');
            this.app.navigateTo('remote');
          });
        });

      } else {
        // Direct browser mode notice or no devices found
        progressArea.style.background = 'var(--bg-surface)';
        statusText.textContent = 'Búsqueda directa completada';
        subText.textContent = 'En un navegador móvil, la política de red web impide emitir paquetes UDP multicast (SSDP) sin bridge. Introduce la IP de tu Roku para conexión directa inmediata:';

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `
          <div style="padding: 12px; background: var(--bg-surface-elevated); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); margin-bottom: 12px;">
            <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
              IP de tu Roku (ej. 192.168.1.35):
            </label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="input-quick-ip" class="text-input-field" placeholder="192.168.1.X" style="flex: 1;" />
              <button class="btn-clean btn-clean-primary" id="btn-quick-verify" style="width: auto; padding: 0 16px;">
                Conectar
              </button>
            </div>
            <div id="quick-ip-status" style="font-size: 0.72rem; margin-top: 8px; color: var(--text-muted);">
              Consulta en tu TV: Configuración → Red → Acerca de
            </div>
          </div>
        `;

        resultsContainer.querySelector('#btn-quick-verify').addEventListener('click', async () => {
          const ipVal = resultsContainer.querySelector('#input-quick-ip').value.trim();
          const statusEl = resultsContainer.querySelector('#quick-ip-status');
          if (!ipVal) return;

          statusEl.textContent = 'Verificando comunicación con el Roku...';
          statusEl.style.color = 'var(--accent)';

          try {
            const verified = await DiscoveryManager.inspectIp('roku', ipVal);
            if (verified) {
              const newDev = {
                id: `roku_${ipVal.replace(/\./g, '_')}`,
                name: verified.name || 'Roku TV',
                model: verified.model || 'Roku TV',
                ip: ipVal,
                port: 8060,
                brand: 'roku',
                room: 'Habitación',
                isTv: verified.isTv !== undefined ? verified.isTv : true,
                status: 'Conectado'
              };
              StorageManager.saveDevice(newDev);
              DeviceManager.setActiveDevice(newDev.id);
              overlay.remove();
              this.app.showToast('Roku conectado exitosamente', 'success');
              this.app.navigateTo('remote');
            }
          } catch (e) {
            statusEl.textContent = e.message || 'No se pudo conectar con esa dirección IP.';
            statusEl.style.color = 'var(--status-connecting)';
          }
        });
      }
    } catch (err) {
      statusText.textContent = 'Error al escanear';
      subText.textContent = err.message || 'Verifica tu conexión Wi-Fi.';
    }
  }
}
