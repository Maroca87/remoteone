/**
 * RemoteOne - DeviceSetupView
 * 6-Step Setup Wizard for adding new TVs with the independent 5-point Connectivity Test.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { DiscoveryManager } from '../core/DiscoveryManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { StorageManager } from '../core/StorageManager.js';

export class DeviceSetupView {
  constructor(app) {
    this.app = app;
    this.step = 1;
    this.wizardData = {
      brand: 'roku',
      method: 'manual', // 'manual' | 'auto'
      ip: '',
      name: 'Roku Habitación',
      room: 'Habitación',
      model: 'Roku TV',
      isTv: true,
      testResults: null
    };
  }

  render(container) {
    let html = `
      <div class="view-content">
        <!-- Wizard Progress Bar -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <button class="btn btn-sm btn-link text-muted text-decoration-none p-0" id="btn-cancel-setup">
            ✕ Cancelar
          </button>
          <span class="badge bg-secondary" style="font-size: 0.72rem;">
            Paso ${this.step} de 6
          </span>
        </div>

        <div class="progress mb-4" style="height: 4px; background: var(--bg-tertiary);">
          <div class="progress-bar bg-primary" role="progressbar" style="width: ${(this.step / 6) * 100}%;"></div>
        </div>

        <!-- Step Views -->
        <div id="wizard-step-container">
          ${this._renderCurrentStep()}
        </div>
      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _renderCurrentStep() {
    switch (this.step) {
      case 1:
        return this._renderStep1Brand();
      case 2:
        return this._renderStep2Method();
      case 3:
        return this._renderStep3Name();
      case 4:
        return this._renderStep4Room();
      case 5:
        return this._renderStep5Test();
      case 6:
        return this._renderStep6Save();
      default:
        return '';
    }
  }

  // Paso 1: Fabricante
  _renderStep1Brand() {
    const brands = [
      { id: 'roku', name: 'Roku TV / Streaming Stick', icon: '📺', status: 'Recomendado (Soporte Completo)', badge: 'bg-success' },
      { id: 'xiaomi', name: 'Xiaomi TV (Android TV)', icon: '📺', status: 'En Preparación (Requiere mTLS)', badge: 'bg-warning text-dark' },
      { id: 'samsung', name: 'Samsung (Tizen)', icon: '📺', status: 'Próximamente', badge: 'bg-secondary' },
      { id: 'lg', name: 'LG (webOS)', icon: '📺', status: 'Próximamente', badge: 'bg-secondary' },
      { id: 'sony', name: 'Sony (Bravia)', icon: '📺', status: 'Próximamente', badge: 'bg-secondary' },
      { id: 'otro', name: 'Otro Fabricante', icon: '📡', status: 'Genérico', badge: 'bg-secondary' }
    ];

    return `
      <h5 class="fw-bold text-white mb-1">Paso 1: Seleccionar Fabricante</h5>
      <p class="text-muted small mb-3">Elige la marca de tu televisor para cargar el controlador correspondiente.</p>
      
      <div class="d-grid gap-2">
        ${brands.map((b) => `
          <button class="btn btn-outline-light text-start p-3 d-flex justify-content-between align-items-center btn-select-brand ${this.wizardData.brand === b.id ? 'active border-primary' : ''}" data-brand="${b.id}" style="background: var(--bg-card); border-color: var(--border-color); border-radius: 14px;">
            <div class="d-flex align-items-center gap-3">
              <span style="font-size: 1.5rem;">${b.icon}</span>
              <div>
                <div class="fw-bold text-white">${b.name}</div>
                <div class="text-muted small">${b.status}</div>
              </div>
            </div>
            <span class="badge ${b.badge}" style="font-size: 0.65rem;">${b.id.toUpperCase()}</span>
          </button>
        `).join('')}
      </div>

      <button class="btn btn-primary w-100 py-2 mt-4 fw-bold" id="btn-step1-next" style="border-radius: 12px;">
        Continuar ➔
      </button>
    `;
  }

  // Paso 2: Método (Buscar vs IP manual)
  _renderStep2Method() {
    return `
      <h5 class="fw-bold text-white mb-1">Paso 2: Método de Conexión</h5>
      <p class="text-muted small mb-3">¿Cómo deseas localizar tu televisor en la red Wi-Fi?</p>

      <div class="row g-2 mb-3">
        <div class="col-6">
          <div class="card p-3 text-center h-100 cursor-pointer method-card ${this.wizardData.method === 'manual' ? 'border-primary' : 'border-secondary'}" data-method="manual" style="background: var(--bg-card); border-radius: 14px; cursor: pointer;">
            <div style="font-size: 2rem;">⌨️</div>
            <div class="fw-bold text-white mt-2">IP Manual</div>
            <div class="text-muted small" style="font-size: 0.72rem;">Introduce la IP del TV</div>
          </div>
        </div>
        <div class="col-6">
          <div class="card p-3 text-center h-100 cursor-pointer method-card ${this.wizardData.method === 'auto' ? 'border-primary' : 'border-secondary'}" data-method="auto" style="background: var(--bg-card); border-radius: 14px; cursor: pointer;">
            <div style="font-size: 2rem;">🔍</div>
            <div class="fw-bold text-white mt-2">Buscar con Bridge</div>
            <div class="text-muted small" style="font-size: 0.72rem;">SSDP automático</div>
          </div>
        </div>
      </div>

      <!-- IP Input Container -->
      <div id="ip-input-section" class="${this.wizardData.method === 'manual' ? '' : 'd-none'}">
        <label class="form-label text-white small fw-bold">Dirección IP del televisor:</label>
        <input type="text" class="form-control bg-dark text-white border-secondary py-2" id="input-tv-ip" placeholder="Ejemplo: 192.168.1.50" value="${this.wizardData.ip}">
        <div class="form-text text-muted" style="font-size: 0.75rem;">
          En tu Roku: <em>Configuración → Red → Acerca de</em> para ver su dirección IP.
        </div>
      </div>

      <!-- Auto Discovery Container -->
      <div id="auto-discovery-section" class="${this.wizardData.method === 'auto' ? '' : 'd-none'}">
        <div class="p-3 rounded-3 mb-2" style="background: var(--bg-tertiary); border: 1px solid var(--border-color);">
          <div class="small text-muted mb-2">Búsqueda SSDP oficial (239.255.255.250:1900):</div>
          <button class="btn btn-outline-info w-100 btn-sm py-2 fw-bold" id="btn-trigger-ssdp">
            🔍 Escanear Red con Bridge
          </button>
          <div id="ssdp-results-list" class="mt-2"></div>
        </div>
      </div>

      <div class="d-flex gap-2 mt-4">
        <button class="btn btn-outline-secondary flex-fill py-2 text-white" id="btn-step2-prev">Atrás</button>
        <button class="btn btn-primary flex-fill py-2 fw-bold" id="btn-step2-next">Continuar ➔</button>
      </div>
    `;
  }

  // Paso 3: Nombre del dispositivo
  _renderStep3Name() {
    return `
      <h5 class="fw-bold text-white mb-1">Paso 3: Nombre del Televisor</h5>
      <p class="text-muted small mb-3">Asigna un nombre fácil de reconocer en la aplicación.</p>

      <div class="mb-3">
        <label class="form-label text-white small fw-bold">Nombre personalizado:</label>
        <input type="text" class="form-control bg-dark text-white border-secondary py-2" id="input-tv-name" placeholder="Ej. Roku Habitación" value="${this.wizardData.name}">
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill py-2 text-white" id="btn-step3-prev">Atrás</button>
        <button class="btn btn-primary flex-fill py-2 fw-bold" id="btn-step3-next">Continuar ➔</button>
      </div>
    `;
  }

  // Paso 4: Habitación
  _renderStep4Room() {
    const rooms = ['Sala', 'Habitación', 'Cuarto', 'Oficina', 'Cocina', 'Estudio'];

    return `
      <h5 class="fw-bold text-white mb-1">Paso 4: Asignar Habitación</h5>
      <p class="text-muted small mb-3">Indica en qué parte de la casa se encuentra este televisor.</p>

      <div class="row g-2 mb-3">
        ${rooms.map((r) => `
          <div class="col-6">
            <button class="btn btn-outline-light w-100 py-3 text-start btn-room-select ${this.wizardData.room === r ? 'active border-primary' : ''}" data-room="${r}" style="background: var(--bg-card); border-color: var(--border-color); border-radius: 12px;">
              🏠 ${r}
            </button>
          </div>
        `).join('')}
      </div>

      <div class="d-flex gap-2 mt-4">
        <button class="btn btn-outline-secondary flex-fill py-2 text-white" id="btn-step4-prev">Atrás</button>
        <button class="btn btn-primary flex-fill py-2 fw-bold" id="btn-step4-next">Continuar ➔</button>
      </div>
    `;
  }

  // Paso 5: Probar Conexión (Requisito 8)
  _renderStep5Test() {
    return `
      <h5 class="fw-bold text-white mb-1">Paso 5: Probar Conexión</h5>
      <p class="text-muted small mb-2">Comprobando comunicación real con ${this.wizardData.name} (${this.wizardData.ip}).</p>

      <div class="card p-3 mb-3" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;">
        <h6 class="text-white fw-bold mb-3 d-flex align-items-center gap-2">
          <span>🔍</span> Resultados de Diagnóstico
        </h6>

        <div id="test-steps-container">
          <div class="text-center py-3 text-muted">
            Presiona el botón de abajo para iniciar las 4 pruebas de conectividad.
          </div>
        </div>
      </div>

      <button class="btn btn-warning text-dark w-100 py-2 fw-bold mb-3" id="btn-run-connection-test" style="border-radius: 12px;">
        ⚡ Ejecutar Prueba de Conexión
      </button>

      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary flex-fill py-2 text-white" id="btn-step5-prev">Atrás</button>
        <button class="btn btn-primary flex-fill py-2 fw-bold" id="btn-step5-next">Continuar al Resumen ➔</button>
      </div>
    `;
  }

  // Paso 6: Guardar
  _renderStep6Save() {
    return `
      <h5 class="fw-bold text-white mb-1">Paso 6: Guardar Dispositivo</h5>
      <p class="text-muted small mb-3">Verifica los datos antes de agregar el televisor a tu lista.</p>

      <div class="card p-3 mb-4" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div style="font-size: 2.2rem;">📺</div>
          <div>
            <h5 class="text-white fw-bold mb-0">${this.wizardData.name}</h5>
            <div class="text-muted small">${this.wizardData.room} • ${this.wizardData.brand.toUpperCase()}</div>
          </div>
        </div>

        <ul class="list-group list-group-flush bg-transparent">
          <li class="list-group-item bg-transparent text-white px-0 py-2 d-flex justify-content-between">
            <span class="text-muted">Dirección IP:</span>
            <span class="fw-bold">${this.wizardData.ip || 'No asignada'}</span>
          </li>
          <li class="list-group-item bg-transparent text-white px-0 py-2 d-flex justify-content-between">
            <span class="text-muted">Puerto:</span>
            <span>${this.wizardData.brand === 'roku' ? '8060 (ECP)' : '6466 (mTLS)'}</span>
          </li>
          <li class="list-group-item bg-transparent text-white px-0 py-2 d-flex justify-content-between">
            <span class="text-muted">Modelo detectado:</span>
            <span>${this.wizardData.model || 'Smart TV'}</span>
          </li>
          <li class="list-group-item bg-transparent text-white px-0 py-2 d-flex justify-content-between">
            <span class="text-muted">Tipo:</span>
            <span>${this.wizardData.isTv ? 'Televisor (Roku TV)' : 'Reproductor / Stick'}</span>
          </li>
        </ul>
      </div>

      <button class="btn btn-success w-100 py-3 fw-bold mb-2" id="btn-save-device-final" style="border-radius: 14px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
        ✓ Guardar y Abrir Control
      </button>

      <button class="btn btn-outline-secondary w-100 py-2 text-white" id="btn-step6-prev">
        Modificar Datos
      </button>
    `;
  }

  _attachEvents(container) {
    // Cancel
    container.querySelector('#btn-cancel-setup')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    // Step 1: Brand
    container.querySelectorAll('.btn-select-brand').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.btn-select-brand').forEach((b) => b.classList.remove('active', 'border-primary'));
        btn.classList.add('active', 'border-primary');
        this.wizardData.brand = btn.getAttribute('data-brand');
        this.wizardData.name = this.wizardData.brand === 'roku' ? 'Roku Habitación' : 'Xiaomi Sala';
      });
    });

    container.querySelector('#btn-step1-next')?.addEventListener('click', () => {
      this.step = 2;
      this.render(container);
    });

    // Step 2: Method
    container.querySelectorAll('.method-card').forEach((card) => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.method-card').forEach((c) => c.classList.remove('border-primary'));
        card.classList.add('border-primary');
        const method = card.getAttribute('data-method');
        this.wizardData.method = method;

        const ipSec = container.querySelector('#ip-input-section');
        const autoSec = container.querySelector('#auto-discovery-section');
        if (method === 'manual') {
          ipSec?.classList.remove('d-none');
          autoSec?.classList.add('d-none');
        } else {
          ipSec?.classList.add('d-none');
          autoSec?.classList.remove('d-none');
        }
      });
    });

    container.querySelector('#btn-trigger-ssdp')?.addEventListener('click', async () => {
      const resultsContainer = container.querySelector('#ssdp-results-list');
      if (!resultsContainer) return;
      resultsContainer.innerHTML = '<div class="text-info small">Buscando mediante SSDP...</div>';
      
      const res = await DiscoveryManager.discoverByBrand(this.wizardData.brand);
      if (res.success && res.devices.length > 0) {
        resultsContainer.innerHTML = res.devices.map((dev) => `
          <div class="p-2 mt-1 rounded bg-dark border border-secondary cursor-pointer btn-select-found-dev" data-ip="${dev.ip}" data-name="${dev.name}" data-model="${dev.model}" style="cursor: pointer;">
            <div class="fw-bold text-white small">${dev.name}</div>
            <div class="text-muted small">${dev.ip} • ${dev.model}</div>
          </div>
        `).join('');

        resultsContainer.querySelectorAll('.btn-select-found-dev').forEach((el) => {
          el.addEventListener('click', () => {
            this.wizardData.ip = el.getAttribute('data-ip');
            this.wizardData.name = el.getAttribute('data-name');
            this.wizardData.model = el.getAttribute('data-model');
            this.app.showToast(`Seleccionado: ${this.wizardData.name} (${this.wizardData.ip})`, 'success');
            this.step = 3;
            this.render(container);
          });
        });
      } else {
        resultsContainer.innerHTML = `<div class="text-warning small mt-2">${res.message}</div>`;
      }
    });

    container.querySelector('#btn-step2-prev')?.addEventListener('click', () => {
      this.step = 1;
      this.render(container);
    });

    container.querySelector('#btn-step2-next')?.addEventListener('click', () => {
      const ipInput = container.querySelector('#input-tv-ip');
      if (ipInput) this.wizardData.ip = ipInput.value.trim();

      if (!NetworkUtils.isValidIPv4(this.wizardData.ip)) {
        this.app.showToast('Por favor introduce una dirección IPv4 válida (ej. 192.168.1.50).', 'warning');
        return;
      }
      this.step = 3;
      this.render(container);
    });

    // Step 3: Name
    container.querySelector('#btn-step3-prev')?.addEventListener('click', () => {
      this.step = 2;
      this.render(container);
    });
    container.querySelector('#btn-step3-next')?.addEventListener('click', () => {
      const nameInput = container.querySelector('#input-tv-name');
      if (nameInput) this.wizardData.name = nameInput.value.trim() || 'Mi TV';
      this.step = 4;
      this.render(container);
    });

    // Step 4: Room
    container.querySelectorAll('.btn-room-select').forEach((btn) => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.btn-room-select').forEach((b) => b.classList.remove('active', 'border-primary'));
        btn.classList.add('active', 'border-primary');
        this.wizardData.room = btn.getAttribute('data-room');
      });
    });
    container.querySelector('#btn-step4-prev')?.addEventListener('click', () => {
      this.step = 3;
      this.render(container);
    });
    container.querySelector('#btn-step4-next')?.addEventListener('click', () => {
      this.step = 5;
      this.render(container);
    });

    // Step 5: Test
    container.querySelector('#btn-step5-prev')?.addEventListener('click', () => {
      this.step = 4;
      this.render(container);
    });

    const runTestBtn = container.querySelector('#btn-run-connection-test');
    if (runTestBtn) {
      runTestBtn.addEventListener('click', async () => {
        runTestBtn.disabled = true;
        runTestBtn.innerHTML = '<span>⏳</span> Probando comunicación...';
        const stepsContainer = container.querySelector('#test-steps-container');

        // Instantiate driver temporary test
        const tempDevice = {
          brand: this.wizardData.brand,
          ip: this.wizardData.ip,
          name: this.wizardData.name,
          room: this.wizardData.room
        };
        const driver = DeviceManager.createDriver(tempDevice);

        const testRes = await driver.testConnection();
        this.wizardData.testResults = testRes;

        if (driver.model) this.wizardData.model = driver.model;
        if (driver.isTv !== undefined) this.wizardData.isTv = driver.isTv;

        // Render test result checklist
        stepsContainer.innerHTML = testRes.steps.map((s) => {
          let icon = '⚪';
          let color = 'text-muted';
          if (s.status === 'success') { icon = '✓'; color = 'text-success'; }
          else if (s.status === 'warning') { icon = '⚠'; color = 'text-warning'; }
          else if (s.status === 'error') { icon = '✗'; color = 'text-danger'; }

          return `
            <div class="d-flex align-items-start gap-2 py-2 border-bottom border-secondary">
              <span class="${color} fw-bold" style="font-size: 1.1rem; width: 20px;">${icon}</span>
              <div>
                <div class="text-white fw-bold small">${s.name}</div>
                <div class="text-muted small" style="font-size: 0.75rem;">${s.message}</div>
              </div>
            </div>
          `;
        }).join('');

        runTestBtn.disabled = false;
        runTestBtn.innerHTML = '⚡ Volver a Probar';
      });
    }

    container.querySelector('#btn-step5-next')?.addEventListener('click', () => {
      this.step = 6;
      this.render(container);
    });

    // Step 6: Final Save
    container.querySelector('#btn-step6-prev')?.addEventListener('click', () => {
      this.step = 5;
      this.render(container);
    });

    container.querySelector('#btn-save-device-final')?.addEventListener('click', () => {
      const added = DeviceManager.addDevice(this.wizardData);
      DeviceManager.setActiveDevice(added.id);
      this.app.showToast(`¡Televisor "${added.name}" guardado exitosamente!`, 'success');
      this.app.navigateTo('remote');
    });
  }
}
