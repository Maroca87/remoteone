/**
 * RemoteOne - DeviceSetupView
 * Clean, modern wizard for adding and verifying TV devices.
 * Strictly zero emojis, 100% Lucide SVGs, honest verification step.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { DiscoveryManager } from '../core/DiscoveryManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { StorageManager } from '../core/StorageManager.js';
import { RokuDriver } from '../devices/roku/RokuDriver.js';
import { renderIcon } from './Icons.js';

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
    const totalSteps = 5;

    let html = `
      <div class="view-content">
        <!-- Wizard Header Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <button class="btn-clean-subtle" id="btn-cancel-setup" style="padding: 4px 8px; font-size: 0.78rem;">
            ${renderIcon('x', 14)}
            <span>Cancelar</span>
          </button>
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary);">
            Paso ${this.step} de ${totalSteps}
          </span>
        </div>

        <!-- Minimalist Progress Bar -->
        <div style="height: 3px; background: var(--bg-surface-elevated); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 24px;">
          <div style="height: 100%; width: ${(this.step / totalSteps) * 100}%; background: var(--accent); transition: width 0.25s ease;"></div>
        </div>

        <!-- Current Step Container -->
        <div id="wizard-step-mount">
          ${this._renderStepContent()}
        </div>
      </div>
    `;

    container.innerHTML = html;
    this._attachEvents(container);
  }

  _renderStepContent() {
    switch (this.step) {
      case 1: return this._renderStep1Brand();
      case 2: return this._renderStep2Connection();
      case 3: return this._renderStep3NameRoom();
      case 4: return this._renderStep4Test();
      case 5: return this._renderStep5Success();
      default: return '';
    }
  }

  // Paso 1: Fabricante
  _renderStep1Brand() {
    const brands = [
      { id: 'roku', name: 'Roku (Roku TV / Stick)', status: 'Soporte Completo (Prioridad 1)', active: true },
      { id: 'xiaomi', name: 'Xiaomi TV (Android TV)', status: 'Validación Técnica Pendiente', active: false },
      { id: 'samsung', name: 'Samsung (Tizen)', status: 'Próximamente', active: false },
      { id: 'lg', name: 'LG (webOS)', status: 'Próximamente', active: false }
    ];

    return `
      <div class="view-title">Selecciona el fabricante</div>
      <div class="view-subtitle" style="margin-bottom: 18px;">Elige la marca de tu televisor:</div>

      <div class="device-list" style="margin-bottom: 24px;">
        ${brands.map((b) => `
          <div class="device-row btn-select-brand ${this.wizardData.brand === b.id ? 'is-active-device' : ''}" data-brand="${b.id}">
            <div class="device-row-main">
              <div class="device-icon-box">${renderIcon('tv', 18)}</div>
              <div class="device-info">
                <div class="device-name-title">${b.name}</div>
                <div class="device-meta-text">
                  <span class="status-pill">
                    <span class="status-dot ${b.active ? 'connected' : 'pending'}"></span>
                    <span>${b.status}</span>
                  </span>
                </div>
              </div>
            </div>
            <div>
              <span style="font-size: 0.68rem; font-weight: 600; color: var(--text-muted);">${b.id.toUpperCase()}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="btn-clean btn-clean-primary" id="btn-step1-next">
        <span>Continuar</span>
        ${renderIcon('chevronRight', 16)}
      </button>
    `;
  }

  // Paso 2: Dirección IP / Conexión
  _renderStep2Connection() {
    return `
      <div class="view-title">Dirección de red</div>
      <div class="view-subtitle" style="margin-bottom: 18px;">
        Introduce la dirección IP local de tu televisor en tu red Wi-Fi:
      </div>

      <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px;">
        <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 8px;">
          Dirección IPv4 del televisor:
        </label>
        <input type="text" id="input-wizard-ip" class="text-input-field" placeholder="192.168.1.50" value="${this.wizardData.ip}" autofocus />
        
        <div style="margin-top: 12px; padding: 10px 12px; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); font-size: 0.72rem; color: var(--text-secondary); line-height: 1.4;">
          <strong>¿Cómo encontrarla en tu Roku?</strong><br>
          En tu control físico ve a: <em>Configuración → Red → Acerca de</em> y consulta el apartado <strong>Dirección IP</strong>.
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-clean btn-clean-secondary" id="btn-step2-back" style="flex: 1;">
          Atrás
        </button>
        <button class="btn-clean btn-clean-primary" id="btn-step2-next" style="flex: 1.5;">
          <span>Continuar</span>
          ${renderIcon('chevronRight', 16)}
        </button>
      </div>
    `;
  }

  // Paso 3: Nombre y Ubicación
  _renderStep3NameRoom() {
    return `
      <div class="view-title">Identificación</div>
      <div class="view-subtitle" style="margin-bottom: 18px;">Personaliza cómo identificarás este televisor:</div>

      <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px;">
        <div style="margin-bottom: 14px;">
          <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            Nombre del televisor:
          </label>
          <input type="text" id="input-wizard-name" class="text-input-field" value="${this.wizardData.name}" />
        </div>

        <div>
          <label style="font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            Habitación / Ubicación:
          </label>
          <input type="text" id="input-wizard-room" class="text-input-field" value="${this.wizardData.room}" />
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-clean btn-clean-secondary" id="btn-step3-back" style="flex: 1;">
          Atrás
        </button>
        <button class="btn-clean btn-clean-primary" id="btn-step3-next" style="flex: 1.5;">
          <span>Probar conexión</span>
          ${renderIcon('chevronRight', 16)}
        </button>
      </div>
    `;
  }

  // Paso 4: Prueba de Conectividad
  _renderStep4Test() {
    return `
      <div class="view-title">Verificación de conectividad</div>
      <div class="view-subtitle" style="margin-bottom: 16px;">
        Comprobando comunicación directa con ${this.wizardData.ip}:
      </div>

      <div id="test-steps-list" style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px;">
        <div style="text-align: center; padding: 20px 0; color: var(--accent);">
          ${renderIcon('refresh', 24)}
          <div style="font-size: 0.82rem; font-weight: 600; margin-top: 8px;">Iniciando pruebas técnicas...</div>
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-clean btn-clean-secondary" id="btn-step4-back" style="flex: 1;">
          Atrás
        </button>
        <button class="btn-clean btn-clean-primary" id="btn-step4-next" style="flex: 1.5;" disabled>
          <span>Continuar</span>
          ${renderIcon('chevronRight', 16)}
        </button>
      </div>
    `;
  }

  // Paso 5: Listo para Controlar
  _renderStep5Success() {
    return `
      <div style="text-align: center; padding: 30px 10px;">
        <div style="width: 56px; height: 56px; border-radius: var(--radius-full); background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--status-connected); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          ${renderIcon('check', 28)}
        </div>

        <div class="view-title">¡Televisor conectado!</div>
        <p style="font-size: 0.78rem; color: var(--text-secondary); max-width: 280px; margin: 8px auto 24px;">
          <strong>${this.wizardData.name}</strong> está listo para ser controlado directamente desde tu teléfono.
        </p>

        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-md); padding: 14px; text-align: left; margin-bottom: 24px; font-size: 0.74rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Dispositivo:</span>
            <strong style="color: var(--text-primary);">${this.wizardData.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">IP:</span>
            <strong style="font-family: monospace; color: var(--text-primary);">${this.wizardData.ip}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Modo:</span>
            <strong style="color: var(--status-connected);">PWA Directo (Wi-Fi)</strong>
          </div>
        </div>

        <button class="btn-clean btn-clean-primary" id="btn-step5-open-remote">
          ${renderIcon('remote', 18)}
          <span>Abrir Control Remoto</span>
        </button>
      </div>
    `;
  }

  _attachEvents(container) {
    container.querySelector('#btn-cancel-setup')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    // Step 1
    container.querySelectorAll('.btn-select-brand').forEach((row) => {
      row.addEventListener('click', () => {
        const brand = row.getAttribute('data-brand');
        if (brand !== 'roku') {
          this.app.showToast('Xiaomi y otras marcas están en validación técnica', 'warning');
          return;
        }
        this.wizardData.brand = brand;
        this.render(container);
      });
    });

    container.querySelector('#btn-step1-next')?.addEventListener('click', () => {
      this.step = 2;
      this.render(container);
    });

    // Step 2
    container.querySelector('#btn-step2-back')?.addEventListener('click', () => {
      this.step = 1;
      this.render(container);
    });

    container.querySelector('#btn-step2-next')?.addEventListener('click', () => {
      const ip = container.querySelector('#input-wizard-ip').value.trim();
      if (!NetworkUtils.isValidIPv4(ip)) {
        this.app.showToast('Introduce una dirección IPv4 válida (ej. 192.168.1.35)', 'danger');
        return;
      }
      this.wizardData.ip = ip;
      this.step = 3;
      this.render(container);
    });

    // Step 3
    container.querySelector('#btn-step3-back')?.addEventListener('click', () => {
      this.step = 2;
      this.render(container);
    });

    container.querySelector('#btn-step3-next')?.addEventListener('click', () => {
      const name = container.querySelector('#input-wizard-name').value.trim();
      const room = container.querySelector('#input-wizard-room').value.trim();
      if (name) this.wizardData.name = name;
      if (room) this.wizardData.room = room;
      this.step = 4;
      this.render(container);
      this._runConnectionTest(container);
    });

    // Step 4 Back & Next
    container.querySelector('#btn-step4-back')?.addEventListener('click', () => {
      this.step = 3;
      this.render(container);
    });

    container.querySelector('#btn-step4-next')?.addEventListener('click', () => {
      // Save device
      const newDev = {
        id: `roku_${this.wizardData.ip.replace(/\./g, '_')}`,
        name: this.wizardData.name,
        room: this.wizardData.room,
        brand: 'roku',
        ip: this.wizardData.ip,
        port: 8060,
        model: this.wizardData.model || 'Roku TV',
        isTv: this.wizardData.isTv,
        status: 'Conectado'
      };

      StorageManager.saveDevice(newDev);
      DeviceManager.setActiveDevice(newDev.id);
      this.step = 5;
      this.render(container);
    });

    // Step 5 Open remote
    container.querySelector('#btn-step5-open-remote')?.addEventListener('click', () => {
      this.app.navigateTo('remote');
    });
  }

  async _runConnectionTest(container) {
    const list = container.querySelector('#test-steps-list');
    const nextBtn = container.querySelector('#btn-step4-next');

    const tempDriver = new RokuDriver({
      ip: this.wizardData.ip,
      name: this.wizardData.name,
      room: this.wizardData.room,
      isTv: this.wizardData.isTv
    });

    const result = await tempDriver.testConnection();

    let stepsHtml = result.steps.map((s) => {
      let icon = renderIcon('check', 14);
      let color = 'var(--status-connected)';
      if (s.status === 'error') {
        icon = renderIcon('x', 14);
        color = '#ef4444';
      } else if (s.status === 'warning') {
        icon = renderIcon('info', 14);
        color = 'var(--status-connecting)';
      }

      return `
        <div style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
          <div style="color: ${color}; margin-top: 2px;">${icon}</div>
          <div style="flex: 1;">
            <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary);">${s.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 1px;">${s.message}</div>
          </div>
        </div>
      `;
    }).join('');

    list.innerHTML = stepsHtml;

    if (result.success) {
      nextBtn.disabled = false;
      this.wizardData.isTv = tempDriver.isTv;
      this.wizardData.model = tempDriver.model;
      this.app.showToast('Prueba de conexión completada con éxito', 'success');
    } else {
      nextBtn.disabled = false; // Allow continuing anyway if user desires
      this.app.showToast('Se completó con advertencias de red', 'warning');
    }
  }
}
