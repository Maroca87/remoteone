/**
 * RemoteOne - HomeView
 * Clean, modern multi-brand device dashboard.
 * Decouples configured devices from live network reachability and power status.
 * Zero emojis, 100% Lucide SVGs, honest technical status.
 */

import { StorageManager } from '../core/StorageManager.js';
import { DeviceManager } from '../core/DeviceManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { DiscoveryManager } from '../core/DiscoveryManager.js';
import { renderIcon } from './Icons.js';

export class HomeView {
  constructor(app) {
    this.app = app;
    this.statusListener = null;
  }

  render(container) {
    const devices = StorageManager.getDevices();
    const activeDriver = DeviceManager.getActiveDriver();
    const modeInfo = ConnectionManager.getCurrentModeInfo();

    // Trigger prudent background check of all configured devices
    DeviceManager.checkAllDevices();

    let html = `
      <div class="view-content">

        <!-- Header: Brand Title & Connection Mode -->
        <div class="device-list-header">
          <div>
            <span class="section-label">Dispositivos configurados (${devices.length})</span>
          </div>
          <span class="status-pill">
            <span class="status-dot ${modeInfo.resolvedMode === 'demo' ? 'connecting' : 'connected'}"></span>
            <span style="color: var(--text-secondary); font-size: 0.72rem;">${modeInfo.label}</span>
          </span>
        </div>

        <!-- Devices List -->
        <div class="device-list" id="device-rows-container">
          ${devices.length === 0 ? this._renderEmptyState() : devices.map((d) => this._renderDeviceRow(d, activeDriver?.id === d.id)).join('')}
        </div>

        <!-- Action Buttons -->
        <div class="action-stack">
          <button class="btn-clean btn-clean-primary" id="btn-home-scan">
            ${renderIcon('scan', 17)}
            <span>Escanear red local</span>
          </button>
          
          <button class="btn-clean btn-clean-secondary" id="btn-home-add-manual">
            ${renderIcon('plus', 17)}
            <span>Agregar dispositivo</span>
          </button>
        </div>

        <!-- Honest Network Context Notice -->
        <div style="margin-top: 24px; padding: 12px 14px; background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); display: flex; align-items: center; gap: 10px;">
          <span style="color: var(--text-muted);">${renderIcon('wifi', 16)}</span>
          <span style="font-size: 0.73rem; color: var(--text-secondary); line-height: 1.4;">
            Control universal en red local. El dispositivo móvil y los televisores deben estar conectados en la misma red Wi-Fi.
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
          Sin dispositivos configurados
        </div>
        <p style="font-size: 0.75rem; color: var(--text-secondary); max-width: 270px; margin: 0 auto 16px;">
          Escanea tu red Wi-Fi en busca de televisores compatibles o introduce manualmente la dirección IP.
        </p>
      </div>
    `;
  }

  _renderDeviceRow(device, isActive) {
    const liveState = DeviceManager.getDeviceState(device.id);
    const networkStatus = liveState.networkStatus || 'unknown';
    const powerStatus = liveState.powerStatus || 'unknown';
    const lastCheckedStr = this._formatTimeAgo(liveState.lastChecked);

    // Network Status formatting
    let netDotClass = 'pending';
    let netLabel = 'Desconocido';
    let netColor = 'var(--text-secondary)';

    if (networkStatus === 'online') {
      netDotClass = 'connected';
      netLabel = 'Online';
      netColor = 'var(--status-connected)';
    } else if (networkStatus === 'cors_blocked') {
      netDotClass = 'connecting';
      netLabel = 'Alcanzable (CORS Blocked)';
      netColor = 'var(--status-connecting)';
    } else if (networkStatus === 'offline') {
      netDotClass = 'disconnected';
      netLabel = 'Offline';
      netColor = 'var(--status-disconnected)';
    } else if (networkStatus === 'checking') {
      netDotClass = 'connecting';
      netLabel = 'Comprobando...';
      netColor = 'var(--status-connecting)';
    } else if (networkStatus === 'unreachable') {
      netDotClass = 'disconnected';
      netLabel = 'Inalcanzable';
      netColor = 'var(--status-disconnected)';
    } else if (networkStatus === 'unsupported') {
      netDotClass = 'pending';
      netLabel = 'No soportado';
      netColor = 'var(--text-muted)';
    }

    // Power Status formatting: strictly unverified unless protocol confirms it
    let powerLabel = 'Energía desconocida';
    if (powerStatus === 'on') {
      powerLabel = 'PowerOn';
    } else if (powerStatus === 'standby') {
      powerLabel = 'Standby';
    } else if (powerStatus === 'off') {
      powerLabel = 'PowerOff';
    } else if (powerStatus === 'unsupported') {
      powerLabel = 'Energía no disponible';
    }

    const brandName = (device.brand || 'tv').toUpperCase();

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
            
            <div class="device-meta-text" style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
              <span>${brandName} ${device.model || ''}</span>
              <span>•</span>
              <span style="font-family: monospace; font-size: 0.72rem;">${device.ip}</span>
            </div>

            <!-- Explicit Separate Network & Power Status Line -->
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 0.70rem;">
              <span class="status-pill">
                <span class="status-dot ${netDotClass}"></span>
                <span style="color: ${netColor}; font-weight: 600;">${netLabel}</span>
              </span>
              <span style="color: var(--border-hairline);">|</span>
              <span style="color: var(--text-muted);">${powerLabel}</span>
              <span style="color: var(--border-hairline);">|</span>
              <span style="color: var(--text-muted); font-size: 0.68rem;">${lastCheckedStr}</span>
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

  _formatTimeAgo(date) {
    if (!date) return 'Sin verificar';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 20) return 'Ahora mismo';
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
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
        if (confirm(`¿Eliminar la configuración de "${dev?.name || 'este televisor'}"?`)) {
          DeviceManager.removeDevice(id);
          this.render(container);
          this.app.showToast('Dispositivo eliminado', 'info');
        }
      });
    });

    // 3. Scan for devices button
    container.querySelector('#btn-home-scan')?.addEventListener('click', () => {
      this._openScanSheet();
    });

    // 4. Add device manual button
    container.querySelector('#btn-home-add-manual')?.addEventListener('click', () => {
      this.app.views.setup.step = 1;
      this.app.navigateTo('setup');
    });

    // 5. Reactive status updates
    if (this.statusListener) {
      window.removeEventListener('remoteone:device_status_changed', this.statusListener);
    }
    this.statusListener = () => {
      // Re-render rows when live check completes
      const rowsContainer = container.querySelector('#device-rows-container');
      if (rowsContainer) {
        const devices = StorageManager.getDevices();
        const activeDriver = DeviceManager.getActiveDriver();
        if (devices.length > 0) {
          rowsContainer.innerHTML = devices.map((d) => this._renderDeviceRow(d, activeDriver?.id === d.id)).join('');
          this._attachRowEvents(container);
        }
      }
    };
    window.addEventListener('remoteone:device_status_changed', this.statusListener);
  }

  _attachRowEvents(container) {
    container.querySelectorAll('.device-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-device')) return;
        const id = row.getAttribute('data-device-id');
        DeviceManager.setActiveDevice(id);
        this.app.navigateTo('remote');
      });
    });

    container.querySelectorAll('.btn-delete-device').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-device-id');
        const dev = StorageManager.getDevice(id);
        if (confirm(`¿Eliminar la configuración de "${dev?.name || 'este televisor'}"?`)) {
          DeviceManager.removeDevice(id);
          this.render(container);
          this.app.showToast('Dispositivo eliminado', 'info');
        }
      });
    });
  }

  /**
   * Scan Sheet / Modal (Requirements 8, 9, 10):
   * Discovered devices are displayed under "Discovered devices" with an [Add] button.
   * They are NEVER added automatically to "My devices" without user clicking [Add].
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
          <div class="sheet-title">Escanear red local</div>
          <button class="btn-clean-subtle" id="btn-close-scan-modal" aria-label="Cerrar">
            ${renderIcon('x', 18)}
          </button>
        </div>

        <p style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 16px;">
          Búsqueda de dispositivos compatibles en la red Wi-Fi mediante protocolos estándar.
        </p>

        <div id="scan-progress-area" style="padding: 18px; background: var(--bg-surface-elevated); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); text-align: center; margin-bottom: 16px;">
          <div style="color: var(--accent); margin-bottom: 8px;">
            ${renderIcon('scan', 28)}
          </div>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);" id="scan-status-text">
            Buscando dispositivos en la red...
          </div>
          <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px;" id="scan-sub-text">
            Consultando servicios disponibles en la subred local
          </div>
        </div>

        <div id="scan-results-container" style="display: none; margin-bottom: 16px;"></div>

        <div id="scan-actions-area" class="action-stack">
          <button class="btn-clean btn-clean-secondary" id="btn-scan-manual-fallback">
            ${renderIcon('keyboard', 16)}
            <span>Agregar dispositivo manualmente</span>
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
      this.app.views.setup.step = 1;
      this.app.navigateTo('setup');
    });

    // Execute scan
    this._executeScan(overlay);
  }

  async _executeScan(overlay) {
    const statusText = overlay.querySelector('#scan-status-text');
    const subText = overlay.querySelector('#scan-sub-text');
    const progressArea = overlay.querySelector('#scan-progress-area');
    const resultsContainer = overlay.querySelector('#scan-results-container');

    try {
      // Execute multi-brand or network discovery
      const discoveryResult = await DiscoveryManager.discoverByBrand('roku');

      if (discoveryResult.success && Array.isArray(discoveryResult.devices) && discoveryResult.devices.length > 0) {
        progressArea.style.display = 'none';
        resultsContainer.style.display = 'block';

        const configuredDevices = StorageManager.getDevices();
        const configuredIps = new Set(configuredDevices.map((d) => d.ip));

        resultsContainer.innerHTML = `
          <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 10px;">
            Dispositivos encontrados en la red (${discoveryResult.devices.length})
          </div>
          <div class="device-list" style="margin-bottom: 0;">
            ${discoveryResult.devices.map((dev) => {
              const alreadyAdded = configuredIps.has(dev.ip);
              return `
                <div class="device-row" style="cursor: default;">
                  <div class="device-row-main">
                    <div class="device-icon-box">${renderIcon('tv', 18)}</div>
                    <div class="device-info">
                      <div class="device-name-title">${dev.name}</div>
                      <div class="device-meta-text">
                        <span style="text-transform: uppercase;">${dev.brand}</span>
                        <span>•</span>
                        <span>${dev.model || 'Smart TV'}</span>
                        <span>•</span>
                        <span style="font-family: monospace;">${dev.ip}</span>
                      </div>
                      <div style="margin-top: 3px;">
                        <span class="status-pill">
                          <span class="status-dot connected"></span>
                          <span style="color: var(--status-connected); font-size: 0.70rem; font-weight: 600;">Online</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    ${alreadyAdded
                      ? `<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; padding: 6px 8px;">Agregado</span>`
                      : `<button class="btn-clean btn-clean-primary btn-add-discovered-device" data-device='${JSON.stringify(dev)}' style="padding: 6px 14px; font-size: 0.76rem; width: auto;">
                          Agregar
                        </button>`
                    }
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        resultsContainer.querySelectorAll('.btn-add-discovered-device').forEach((btn) => {
          btn.addEventListener('click', () => {
            const devData = JSON.parse(btn.getAttribute('data-device'));
            // Explicit user addition
            const added = DeviceManager.addDevice({
              name: devData.name,
              brand: devData.brand || 'roku',
              ip: devData.ip,
              port: devData.port || 8060,
              model: devData.model || 'Smart TV',
              isTv: devData.isTv !== undefined ? devData.isTv : true,
              networkStatus: 'online',
              powerStatus: devData.powerMode === 'PowerOn' ? 'on' : 'unknown'
            });

            DeviceManager.setActiveDevice(added.id);
            overlay.remove();
            this.app.showToast(`"${added.name}" agregado a tus dispositivos`, 'success');
            this.app.navigateTo('home');
          });
        });

      } else {
        // No devices found or browser multicast limitation
        progressArea.style.background = 'var(--bg-surface)';
        statusText.textContent = 'Automatic discovery requires native network access';
        subText.textContent = 'Los navegadores web no tienen acceso a sockets UDP multicast para emitir paquetes SSDP (239.255.255.250:1900). Se requiere la capa de red nativa para descubrir dispositivos automáticamente sin PC. Puedes agregar tu televisor introduciendo su IP:';

        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `
          <div style="text-align: center; padding: 12px 0;">
            <button class="btn-clean btn-clean-primary" id="btn-goto-manual-setup" style="margin: 0 auto; width: auto; padding: 8px 20px;">
              ${renderIcon('plus', 16)}
              <span>Agregar dispositivo por IP</span>
            </button>
          </div>
        `;

        resultsContainer.querySelector('#btn-goto-manual-setup')?.addEventListener('click', () => {
          overlay.remove();
          this.app.views.setup.step = 1;
          this.app.navigateTo('setup');
        });
      }
    } catch (err) {
      statusText.textContent = 'Error al escanear';
      subText.textContent = err.message || 'Verifica que tu Wi-Fi esté activo.';
    }
  }

  destroy() {
    if (this.statusListener) {
      window.removeEventListener('remoteone:device_status_changed', this.statusListener);
      this.statusListener = null;
    }
  }
}
