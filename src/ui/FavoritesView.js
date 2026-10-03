/**
 * RemoteOne - FavoritesView
 * Quick action shortcuts and sequential macros.
 * Strictly zero emojis, 100% Lucide SVGs, verified Roku ECP compatibility.
 */

import { StorageManager } from '../core/StorageManager.js';
import { DeviceManager } from '../core/DeviceManager.js';
import { CommandManager } from '../core/CommandManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { renderIcon } from './Icons.js';

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
        <!-- View Header -->
        <div class="view-header">
          <div class="view-title">Favoritos y Accesos Rápidos</div>
          <div class="view-subtitle">
            ${activeDriver ? `Controlando: ${activeDriver.name}` : 'Sin televisor activo'}
          </div>
        </div>

        <!-- Section 1: Quick Actions Grid -->
        <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary); margin-bottom: 12px;">
          Canales y Acciones Principales
        </div>

        <div class="favorites-grid">
          ${favorites.map((fav) => `
            <div class="favorite-tile btn-favorite-item" data-type="${fav.type}" data-command="${fav.command}" data-name="${fav.name}">
              <div class="favorite-tile-icon">
                ${this._getFavIcon(fav)}
              </div>
              <div>
                <div class="favorite-tile-title">${fav.name}</div>
                <div class="favorite-tile-meta">${fav.type === 'app' ? 'Canal Streaming' : 'Comando Directo'}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Section 2: Automated Sequences / Macros -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-secondary);">
            Secuencias Rápidas (Macros)
          </div>
          <span style="font-size: 0.68rem; color: var(--text-muted);">Automatización</span>
        </div>

        <div style="margin-bottom: 24px;">
          ${macros.map((m) => `
            <div class="macro-card">
              <div class="macro-card-header">
                <div class="macro-title">${m.name}</div>
              </div>
              <div class="macro-desc">${m.description}</div>

              <div class="macro-steps-row">
                ${m.steps.map((s, idx) => `
                  <span class="macro-step-pill">${idx + 1}. ${s.command} (${s.delayMs}ms)</span>
                `).join('')}
              </div>

              <div id="macro-status-${m.id}" style="font-size: 0.72rem; color: var(--accent); margin-bottom: 8px; display: none;"></div>

              <button class="btn-clean btn-clean-secondary btn-run-macro" data-macro-id="${m.id}">
                ${renderIcon('play', 15)}
                <span>Ejecutar secuencia</span>
              </button>
            </div>
          `).join('')}
        </div>

        <!-- Section 3: Real Installed Channels Query (/query/apps) -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px;">
          <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
            Consultar canales en el televisor
          </div>
          <p style="font-size: 0.74rem; color: var(--text-secondary); margin-bottom: 12px;">
            Lee la lista oficial de aplicaciones instaladas en tu Roku mediante ECP.
          </p>

          <button class="btn-clean btn-clean-secondary" id="btn-scan-apps" style="width: 100%;">
            ${renderIcon('search', 16)}
            <span>Leer canales instalados</span>
          </button>

          <div id="installed-apps-output" style="margin-top: 14px;"></div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _getFavIcon(fav) {
    if (fav.command === 'VolumeMute') return renderIcon('volumeMute', 18);
    if (fav.command === 'Home') return renderIcon('home', 18);
    if (fav.name === 'Netflix' || fav.name === 'YouTube' || fav.name === 'Prime Video' || fav.name === 'Disney+') {
      return renderIcon('tv', 18);
    }
    return renderIcon('sparkles', 18);
  }

  _attachEvents(container) {
    // 1. Favorites clicks
    container.querySelectorAll('.btn-favorite-item').forEach((tile) => {
      tile.addEventListener('click', async () => {
        const type = tile.getAttribute('data-type');
        const cmd = tile.getAttribute('data-command');
        const name = tile.getAttribute('data-name');

        NetworkUtils.triggerHaptic(35);
        this.app.showToast(`Lanzando ${name}...`, 'info');

        const res = await CommandManager.executeCommand(cmd, { type });
        if (!res.success) {
          this.app.showToast(res.message || `No se pudo iniciar ${name}`, 'danger');
        } else {
          this.app.showToast(`${name} ejecutado`, 'success');
        }
      });
    });

    // 2. Macro execution
    container.querySelectorAll('.btn-run-macro').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const macroId = btn.getAttribute('data-macro-id');
        const macro = StorageManager.getMacros().find((m) => m.id === macroId);
        if (!macro) return;

        const statusEl = container.querySelector(`#macro-status-${macroId}`);
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.textContent = 'Iniciando secuencia...';
        }

        btn.disabled = true;
        btn.style.opacity = '0.5';

        try {
          for (let i = 0; i < macro.steps.length; i++) {
            const step = macro.steps[i];
            if (statusEl) {
              statusEl.textContent = `Paso ${i + 1}/${macro.steps.length}: ${step.command}...`;
            }
            await CommandManager.executeCommand(step.command);
            if (step.delayMs) {
              await new Promise((r) => setTimeout(r, step.delayMs));
            }
          }
          if (statusEl) {
            statusEl.textContent = 'Secuencia completada con éxito';
            statusEl.style.color = 'var(--status-connected)';
          }
          this.app.showToast(`Secuencia "${macro.name}" completada`, 'success');
        } catch (e) {
          if (statusEl) {
            statusEl.textContent = 'Error durante la ejecución';
            statusEl.style.color = 'var(--status-connecting)';
          }
        } finally {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    });

    // 3. Scan installed apps
    container.querySelector('#btn-scan-apps')?.addEventListener('click', async () => {
      const output = container.querySelector('#installed-apps-output');
      const driver = DeviceManager.getActiveDriver();

      if (!driver) {
        this.app.showToast('Selecciona primero un televisor', 'warning');
        return;
      }

      output.innerHTML = `
        <div style="font-size: 0.75rem; color: var(--accent); padding: 8px 0;">
          Consultando canales al Roku (${driver.ip})...
        </div>
      `;

      try {
        const apps = await driver.getInstalledApps();
        if (!apps || apps.length === 0) {
          output.innerHTML = `
            <div style="font-size: 0.74rem; color: var(--text-secondary); padding: 10px; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
              En conexión directa PWA sin bridge, la lectura del XML completo está restringida por la política CORS del navegador. Puedes lanzar los canales principales directamente desde los accesos rápidos.
            </div>
          `;
          return;
        }

        output.innerHTML = `
          <div class="device-list" style="margin-top: 8px;">
            ${apps.map((app) => `
              <div class="device-row btn-launch-app" data-app-id="${app.id}">
                <div class="device-row-main">
                  <div class="device-icon-box">${renderIcon('tv', 16)}</div>
                  <div class="device-info">
                    <div class="device-name-title">${app.name}</div>
                    <div class="device-meta-text">ID: ${app.id}</div>
                  </div>
                </div>
                <div>
                  <button class="btn-clean btn-clean-secondary" style="padding: 4px 10px; font-size: 0.72rem; width: auto;">
                    Abrir
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;

        output.querySelectorAll('.btn-launch-app').forEach((row) => {
          row.addEventListener('click', async () => {
            const appId = row.getAttribute('data-app-id');
            await driver.launchApp(appId);
            this.app.showToast('Canal abierto en el Roku', 'success');
          });
        });

      } catch (err) {
        output.innerHTML = `
          <div style="font-size: 0.74rem; color: var(--text-secondary); padding: 10px; background: var(--bg-surface-elevated); border-radius: var(--radius-md);">
            ${err.message || 'No se pudo leer la lista de canales.'}
          </div>
        `;
      }
    });
  }
}
