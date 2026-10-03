/**
 * RemoteOne - HomeView
 * Main dashboard: My TVs, connection status, quick resume, add/search TV.
 */

import { StorageManager } from '../core/StorageManager.js';
import { DeviceManager } from '../core/DeviceManager.js';
import { ConnectionManager } from '../core/ConnectionManager.js';
import { DiscoveryManager } from '../core/DiscoveryManager.js';

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
        <!-- Wi-Fi Tip Banner -->
        <div class="p-3 mb-3 rounded-3" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25);">
          <div class="d-flex align-items-center gap-2">
            <span style="font-size: 1.2rem;">📶</span>
            <div style="font-size: 0.82rem; color: #cbd5e1;">
              <strong>Red Wi-Fi:</strong> Asegúrate de que tu teléfono y tus televisores estén conectados a la <strong>misma red Wi-Fi local</strong>.
            </div>
          </div>
        </div>

        <!-- Last Active Device Banner (Resume) -->
        ${activeDriver ? `
          <div class="card mb-4 border-0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <span class="badge bg-primary mb-1" style="font-size: 0.65rem;">ÚLTIMO DISPOSITIVO</span>
                  <h5 class="card-title mb-0 fw-bold text-white d-flex align-items-center gap-2">
                    📺 ${activeDriver.name}
                  </h5>
                  <div class="text-muted small mt-1">
                    ${activeDriver.room} • ${activeDriver.model} (${activeDriver.ip})
                  </div>
                </div>
                <span class="badge ${this._getStatusBadgeClass(activeDriver.status)}">
                  ${activeDriver.status}
                </span>
              </div>
              <button class="btn btn-primary w-100 mt-2 py-2 fw-bold d-flex align-items-center justify-content-center gap-2" id="btn-resume-control" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(59,130,246,0.4);">
                <span>Abrir Control Remoto</span>
                <span>➔</span>
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Section: Mis Televisores -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="text-uppercase fw-bold text-muted mb-0" style="letter-spacing: 1px; font-size: 0.78rem;">
            Mis Televisores (${devices.length})
          </h6>
          <span class="badge ${modeInfo.badgeClass}" style="font-size: 0.68rem;">
            ${modeInfo.label}
          </span>
        </div>

        <!-- TV Devices List -->
        <div id="device-list-container">
          ${devices.length === 0 ? `
            <div class="text-center py-5 px-3 rounded-3" style="background: var(--bg-card); border: 1px dashed var(--border-color);">
              <div style="font-size: 2.8rem; margin-bottom: 10px;">📺</div>
              <h6 class="fw-bold text-white">No tienes televisores registrados</h6>
              <p class="text-muted small mb-3">Agrega tu televisor Roku o Xiaomi por su IP local o utiliza la búsqueda automática.</p>
              <button class="btn btn-outline-primary btn-sm px-3" id="btn-add-first-tv">
                + Agregar Televisor
              </button>
            </div>
          ` : devices.map((d) => this._renderDeviceCard(d, activeDriver?.id === d.id)).join('')}
        </div>

        <!-- Action Buttons -->
        <div class="row g-2 mt-3">
          <div class="col-6">
            <button class="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2" id="btn-home-add-tv" style="border-radius: 14px;">
              <span>+</span>
              <span>AGREGAR TV</span>
            </button>
          </div>
          <div class="col-6">
            <button class="btn btn-outline-secondary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 text-white" id="btn-home-search-tv" style="border-radius: 14px; background: var(--bg-card); border-color: var(--border-color);">
              <span>🔍</span>
              <span>BUSCAR TVs</span>
            </button>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _renderDeviceCard(device, isActive) {
    const statusClass = this._getStatusIndicatorClass(device.status);
    const brandName = (device.brand || 'roku').toUpperCase();

    return `
      <div class="tv-card ${isActive ? 'active-device' : ''}" data-device-id="${device.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-3">
            <div style="font-size: 1.8rem;">📺</div>
            <div>
              <div class="fw-bold text-white fs-6 d-flex align-items-center gap-2">
                ${device.name}
                ${isActive ? '<span class="badge bg-primary" style="font-size: 0.6rem;">ACTIVO</span>' : ''}
              </div>
              <div class="text-muted small mt-1 d-flex align-items-center">
                <span class="status-indicator ${statusClass}"></span>
                <span>${device.status || 'Desconectado'}</span>
                <span class="mx-2">•</span>
                <span>${device.room || 'Habitación'}</span>
                <span class="mx-2">•</span>
                <span>${brandName}</span>
              </div>
            </div>
          </div>
          <div class="text-end">
            <button class="btn btn-sm btn-outline-light border-0 text-muted p-1 btn-device-menu" data-device-id="${device.id}" title="Opciones">
              ⋮
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _getStatusIndicatorClass(status) {
    switch (status) {
      case 'Conectado': return 'status-online';
      case 'Intentando conectar': return 'status-connecting';
      case 'Bloqueado por navegador': return 'status-blocked';
      case 'No compatible': return 'status-unsupported';
      default: return 'status-offline';
    }
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

  _attachEvents(container) {
    // Resume remote button
    const resumeBtn = container.querySelector('#btn-resume-control');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.app.navigateTo('remote');
      });
    }

    // Add first TV / Add TV
    const addTvBtn = container.querySelector('#btn-home-add-tv');
    if (addTvBtn) {
      addTvBtn.addEventListener('click', () => {
        this.app.navigateTo('setup');
      });
    }
    const addFirstTvBtn = container.querySelector('#btn-add-first-tv');
    if (addFirstTvBtn) {
      addFirstTvBtn.addEventListener('click', () => {
        this.app.navigateTo('setup');
      });
    }

    // Search TVs button
    const searchTvBtn = container.querySelector('#btn-home-search-tv');
    if (searchTvBtn) {
      searchTvBtn.addEventListener('click', async () => {
        searchTvBtn.disabled = true;
        searchTvBtn.innerHTML = '<span>⏳</span><span>Buscando...</span>';
        try {
          const res = await DiscoveryManager.discoverByBrand('roku');
          if (res.success && res.devices.length > 0) {
            let addedCount = 0;
            res.devices.forEach((dev) => {
              if (!StorageManager.getDevice(dev.id)) {
                DeviceManager.addDevice(dev);
                addedCount++;
              }
            });
            this.app.showToast(`Se encontraron ${res.devices.length} TV(s) (${addedCount} nuevos agregados).`, 'success');
            this.render(container);
          } else {
            this.app.showToast(res.message || 'No se encontraron nuevos televisores en la red local.', 'warning');
          }
        } catch (e) {
          this.app.showToast('Error en la búsqueda de dispositivos.', 'danger');
        } finally {
          searchTvBtn.disabled = false;
          searchTvBtn.innerHTML = '<span>🔍</span><span>BUSCAR TVs</span>';
        }
      });
    }

    // Device cards click to activate and open remote
    container.querySelectorAll('.tv-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-device-menu')) return;
        const id = card.getAttribute('data-device-id');
        DeviceManager.setActiveDevice(id);
        this.app.navigateTo('remote');
      });
    });

    // Device menu options (delete / rename)
    container.querySelectorAll('.btn-device-menu').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-device-id');
        const dev = StorageManager.getDevice(id);
        if (!dev) return;

        const action = confirm(`¿Deseas eliminar el televisor "${dev.name}"?`);
        if (action) {
          DeviceManager.removeDevice(id);
          this.app.showToast(`Televisor "${dev.name}" eliminado.`, 'info');
          this.render(container);
        }
      });
    });
  }
}
