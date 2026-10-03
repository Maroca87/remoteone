/**
 * RemoteOne - FavoritesView
 * Quick action shortcuts (Apps, Inputs, Commands) and sequential Macros execution.
 */

import { StorageManager } from '../core/StorageManager.js';
import { DeviceManager } from '../core/DeviceManager.js';
import { CommandManager } from '../core/CommandManager.js';

export class FavoritesView {
  constructor(app) {
    this.app = app;
  }

  render(container) {
    const favorites = StorageManager.getFavorites();
    const macros = StorageManager.getMacros();
    const activeDriver = DeviceManager.getActiveDriver();

    let html = `
      <div class="view-content">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 class="fw-bold text-white mb-0">⭐ Mis Favoritos y Acciones</h5>
            <div class="text-muted small">
              ${activeDriver ? `TV Activo: ${activeDriver.name}` : 'Sin TV activo'}
            </div>
          </div>
        </div>

        <!-- Section 1: Quick Favorites Grid -->
        <h6 class="text-uppercase fw-bold text-muted mb-2" style="font-size: 0.75rem; letter-spacing: 0.5px;">
          Accesos Rápidos
        </h6>
        
        <div class="row g-2 mb-4">
          ${favorites.map((fav) => `
            <div class="col-6">
              <button class="btn btn-outline-light w-100 p-3 text-start d-flex align-items-center gap-2 btn-favorite-item" data-fav-id="${fav.id}" data-type="${fav.type}" data-command="${fav.command}" style="background: var(--bg-card); border-color: var(--border-color); border-radius: 14px;">
                <span style="font-size: 1.4rem;">${this._getFavoriteIcon(fav)}</span>
                <div>
                  <div class="fw-bold text-white small">${fav.name}</div>
                  <div class="text-muted" style="font-size: 0.7rem;">${fav.type === 'app' ? 'Canal Streaming' : 'Comando Rápido'}</div>
                </div>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Section 2: Macros -->
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="text-uppercase fw-bold text-muted mb-0" style="font-size: 0.75rem; letter-spacing: 0.5px;">
            Macros Automatizadas
          </h6>
          <span class="badge bg-secondary" style="font-size: 0.65rem;">Secuencias</span>
        </div>

        <div class="d-grid gap-2 mb-4" id="macros-list-container">
          ${macros.map((m) => `
            <div class="card p-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h6 class="text-white fw-bold mb-1">🎬 ${m.name}</h6>
                  <p class="text-muted small mb-2" style="font-size: 0.78rem;">${m.description}</p>
                  
                  <div class="d-flex flex-wrap gap-1 mb-2">
                    ${m.steps.map((s, i) => `
                      <span class="badge bg-dark border border-secondary text-info" style="font-size: 0.65rem;">
                        ${i + 1}. ${s.command} (${s.delayMs}ms)
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div id="macro-status-${m.id}" class="small text-muted mb-2 d-none"></div>

              <button class="btn btn-outline-primary btn-sm py-2 fw-bold btn-run-macro" data-macro-id="${m.id}" style="border-radius: 10px;">
                ▶ Ejecutar Macro
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Section 3: Scan TV Installed Apps -->
        <div class="card p-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;">
          <h6 class="text-white fw-bold mb-1 d-flex align-items-center gap-2">
            <span>📲</span> Canales Instalados en el TV
          </h6>
          <p class="text-muted small mb-3">Consulta en tiempo real la lista oficial de canales instalados en tu Roku.</p>
          
          <button class="btn btn-outline-info btn-sm py-2 fw-bold" id="btn-scan-installed-apps">
            🔍 Consultar Canales (/query/apps)
          </button>

          <div id="installed-apps-results" class="mt-3"></div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _getFavoriteIcon(fav) {
    if (fav.name === 'Netflix') return '🔴';
    if (fav.name === 'YouTube') return '▶️';
    if (fav.name === 'Prime Video') return '📦';
    if (fav.name === 'Disney+') return '✨';
    if (fav.command === 'VolumeMute') return '🔇';
    if (fav.command === 'Home') return '🏠';
    return '⭐';
  }

  _attachEvents(container) {
    // 1. Favorites click
    container.querySelectorAll('.btn-favorite-item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const type = btn.getAttribute('data-type');
        const cmd = btn.getAttribute('data-command');

        const res = await CommandManager.executeCommand(cmd, { type });
        if (!res.success) {
          this.app.showToast(res.message || 'Error al ejecutar acceso rápido.', 'danger');
        } else {
          this.app.showToast(`Acceso rápido ejecutado (${btn.querySelector('.fw-bold').textContent}).`, 'success');
        }
      });
    });

    // 2. Macros execution
    container.querySelectorAll('.btn-run-macro').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-macro-id');
        const macro = StorageManager.getMacros().find((m) => m.id === id);
        if (!macro) return;

        const statusEl = container.querySelector(`#macro-status-${id}`);
        statusEl?.classList.remove('d-none');
        btn.disabled = true;

        const res = await CommandManager.executeMacro(macro, (stepIndex, total, step, state) => {
          if (statusEl) {
            statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Paso ${stepIndex}/${total}: ${step.command}...`;
          }
        });

        btn.disabled = false;
        if (res.success) {
          if (statusEl) statusEl.innerHTML = '<span class="text-success fw-bold">✓ Macro completada exitosamente</span>';
          this.app.showToast(`Macro "${macro.name}" completada.`, 'success');
        } else {
          if (statusEl) statusEl.innerHTML = `<span class="text-danger fw-bold">✗ ${res.message}</span>`;
          this.app.showToast(res.message, 'danger');
        }
      });
    });

    // 3. Scan installed apps via ECP /query/apps
    const scanBtn = container.querySelector('#btn-scan-installed-apps');
    const resultsContainer = container.querySelector('#installed-apps-results');

    scanBtn?.addEventListener('click', async () => {
      const driver = DeviceManager.getActiveDriver();
      if (!driver) {
        this.app.showToast('Selecciona un TV activo primero.', 'warning');
        return;
      }

      scanBtn.disabled = true;
      scanBtn.textContent = 'Consultando al Roku...';
      resultsContainer.innerHTML = '<div class="text-info small">Consultando /query/apps...</div>';

      try {
        const apps = await driver.getInstalledApps();
        if (apps && apps.length > 0) {
          resultsContainer.innerHTML = `
            <div class="small text-muted mb-2">${apps.length} canales encontrados:</div>
            <div class="row g-2">
              ${apps.map((app) => `
                <div class="col-6">
                  <button class="btn btn-dark w-100 text-start p-2 border border-secondary btn-launch-discovered-app" data-app-id="${app.id}" style="border-radius: 10px;">
                    <div class="fw-bold text-white small text-truncate">${app.name}</div>
                    <div class="text-muted" style="font-size: 0.65rem;">ID: ${app.id}</div>
                  </button>
                </div>
              `).join('')}
            </div>
          `;

          resultsContainer.querySelectorAll('.btn-launch-discovered-app').forEach((b) => {
            b.addEventListener('click', async () => {
              const appId = b.getAttribute('data-app-id');
              const r = await driver.launchApp(appId);
              if (r.success) {
                this.app.showToast(`Lanzando canal ID ${appId}...`, 'success');
              } else {
                this.app.showToast(r.message || 'Error al lanzar canal', 'danger');
              }
            });
          });
        } else {
          resultsContainer.innerHTML = '<div class="text-warning small">No se recibieron canales o el navegador bloqueó la lectura directa (se requiere Bridge).</div>';
        }
      } catch (err) {
        resultsContainer.innerHTML = `<div class="text-danger small">Error: ${err.message}. En modo PWA directo el navegador bloquea la lectura XML sin CORS. Usa el Bridge.</div>`;
      } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = '🔍 Consultar Canales (/query/apps)';
      }
    });
  }
}
