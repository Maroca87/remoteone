/**
 * RemoteOne - DeviceSetupView
 * Manual device setup workflow with real technical verification.
 * Follows strict rules:
 * - Device configured != Device connected
 * - Test connection performs real protocol probe
 * - Failed test does NOT save or activate device
 * - Explicit confirmation required before saving
 * - Zero emojis, 100% Lucide SVGs, neutral to manufacturers.
 */

import { DeviceManager } from '../core/DeviceManager.js';
import { NetworkUtils } from '../utils/NetworkUtils.js';
import { renderIcon } from './Icons.js';

export class DeviceSetupView {
  constructor(app) {
    this.app = app;
    this.step = 1; // 1: Brand, 2: Form, 3: Testing, 4: Confirmation / Failure
    this.formData = {
      brand: 'roku',
      name: '',
      ip: '',
      port: 8060,
      model: ''
    };
    this.testResult = null;
    this.isTesting = false;
  }

  render(container) {
    let contentHtml = '';
    switch (this.step) {
      case 1:
        contentHtml = this._renderStep1Brand();
        break;
      case 2:
        contentHtml = this._renderStep2Form();
        break;
      case 3:
        contentHtml = this._renderStep3Testing();
        break;
      case 4:
        contentHtml = this.testResult?.success
          ? this._renderStep4Success()
          : this._renderStep4Failure();
        break;
      default:
        contentHtml = this._renderStep1Brand();
    }

    container.innerHTML = `
      <div class="view-content">
        <!-- Wizard Navigation Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <button class="btn-clean-subtle" id="btn-cancel-setup" style="padding: 4px 8px; font-size: 0.78rem;">
            ${renderIcon('x', 14)}
            <span>Cancelar</span>
          </button>
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
            ${this._getStepLabel()}
          </span>
        </div>

        ${contentHtml}
      </div>
    `;

    this._attachEvents(container);
  }

  _getStepLabel() {
    switch (this.step) {
      case 1: return 'Paso 1: Fabricante';
      case 2: return 'Paso 2: Datos de red';
      case 3: return 'Paso 3: Verificación';
      case 4: return this.testResult?.success ? 'Confirmación' : 'Resultado';
      default: return '';
    }
  }

  // 1. Selector de Fabricante / Protocolo (Neutralidad, no solo Roku)
  _renderStep1Brand() {
    const brands = [
      { id: 'roku', name: 'Roku', protocol: 'Roku ECP (HTTP)', defaultPort: 8060, status: 'Driver verificado' },
      { id: 'xiaomi', name: 'Xiaomi TV', protocol: 'Android TV v2 (mTLS)', defaultPort: 6466, status: 'Validación técnica pendiente' },
      { id: 'samsung', name: 'Samsung Smart TV', protocol: 'Tizen WebSocket', defaultPort: 8001, status: 'Próximamente' },
      { id: 'lg', name: 'LG webOS TV', protocol: 'webOS WebSocket', defaultPort: 3000, status: 'Próximamente' },
      { id: 'sony', name: 'Sony BRAVIA', protocol: 'Sony IRCC / REST', defaultPort: 80, status: 'Próximamente' },
      { id: 'generic', name: 'Otro / Genérico', protocol: 'Protocolo de red local', defaultPort: 80, status: 'Manual' }
    ];

    return `
      <div class="view-title">Seleccionar fabricante</div>
      <div class="view-subtitle" style="margin-bottom: 18px;">
        Elige el fabricante o protocolo del dispositivo:
      </div>

      <div class="device-list" style="margin-bottom: 24px;">
        ${brands.map((b) => `
          <div class="device-row btn-select-brand ${this.formData.brand === b.id ? 'is-active-device' : ''}" data-brand="${b.id}" data-port="${b.defaultPort}">
            <div class="device-row-main">
              <div class="device-icon-box">${renderIcon('tv', 18)}</div>
              <div class="device-info">
                <div class="device-name-title">${b.name}</div>
                <div class="device-meta-text">
                  <span>${b.protocol}</span>
                  <span>•</span>
                  <span style="color: var(--text-muted);">${b.status}</span>
                </div>
              </div>
            </div>
            <div>
              <span style="font-size: 0.68rem; font-weight: 600; color: var(--text-muted); font-family: monospace;">:${b.defaultPort}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="btn-clean btn-clean-primary" id="btn-brand-continue">
        <span>Continuar</span>
        ${renderIcon('chevronRight', 16)}
      </button>
    `;
  }

  // 2. Formulario: Nombre, IP/Hostname, Puerto, Modelo opcional
  _renderStep2Form() {
    const brandLabel = this.formData.brand.charAt(0).toUpperCase() + this.formData.brand.slice(1);
    const defaultName = this.formData.name || `${brandLabel} TV`;

    return `
      <div class="view-title">Configuración del dispositivo</div>
      <div class="view-subtitle" style="margin-bottom: 18px;">
        Introduce los parámetros de red para ${brandLabel}:
      </div>

      <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px;">
        
        <!-- Nombre -->
        <div style="margin-bottom: 14px;">
          <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            Nombre del dispositivo
          </label>
          <input type="text" id="input-setup-name" class="text-input-field" placeholder="Living Room TV" value="${defaultName}" />
        </div>

        <!-- IP / Hostname -->
        <div style="margin-bottom: 14px;">
          <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            Dirección IP / Hostname local
          </label>
          <input type="text" id="input-setup-ip" class="text-input-field" placeholder="192.168.1.50" value="${this.formData.ip}" autofocus />
          <div style="font-size: 0.70rem; color: var(--text-muted); margin-top: 4px;">
            El dispositivo debe encontrarse en la misma subred Wi-Fi.
          </div>
        </div>

        <!-- Puerto -->
        <div style="margin-bottom: 14px;">
          <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            Puerto de control
          </label>
          <input type="number" id="input-setup-port" class="text-input-field" value="${this.formData.port}" />
        </div>

        <!-- Modelo (Opcional) -->
        <div>
          <label style="font-size: 0.74rem; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 6px;">
            Modelo (Opcional)
          </label>
          <input type="text" id="input-setup-model" class="text-input-field" placeholder="Ej. TCL 55S435 o Smart TV" value="${this.formData.model}" />
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-clean btn-clean-secondary" id="btn-form-back" style="flex: 1;">
          Atrás
        </button>
        <button class="btn-clean btn-clean-primary" id="btn-form-test" style="flex: 1.6;">
          ${renderIcon('wifi', 16)}
          <span>Probar conexión</span>
        </button>
      </div>
    `;
  }

  // 3. Probando conexión en vivo
  _renderStep3Testing() {
    return `
      <div style="text-align: center; padding: 40px 16px;">
        <div style="width: 52px; height: 52px; border-radius: var(--radius-full); background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); color: var(--accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          ${renderIcon('refresh', 24)}
        </div>
        <div class="view-title" style="margin-bottom: 6px;">Probando conexión real</div>
        <p style="font-size: 0.78rem; color: var(--text-secondary); max-width: 290px; margin: 0 auto 20px;">
          Intentando establecer comunicación con <strong>${this.formData.ip}:${this.formData.port}</strong> mediante el protocolo seleccionado...
        </p>
        <div style="font-size: 0.72rem; color: var(--text-muted);">
          No asumimos que el televisor está disponible sin respuesta técnica.
        </div>
      </div>
    `;
  }

  // 4A. Confirmación Explícita tras Prueba Exitosa (Requisito 7 & 21)
  _renderStep4Success() {
    const res = this.testResult;
    const devInfo = res?.device || {};
    const model = devInfo.model || this.formData.model || 'Smart TV';
    const protocol = devInfo.protocol || 'Protocolo local';
    const network = res?.networkStatus || 'Online';
    const power = res?.powerStatus ? (res.powerStatus === 'on' ? 'Powered On' : (res.powerStatus === 'standby' ? 'Standby' : (res.powerStatus === 'off' ? 'Powered Off' : 'Unknown'))) : 'Unknown';

    return `
      <div style="text-align: center; padding-top: 10px;">
        <div style="width: 52px; height: 52px; border-radius: var(--radius-full); background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--status-connected); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
          ${renderIcon('check', 26)}
        </div>

        <div class="view-title" style="margin-bottom: 4px;">Dispositivo detectado</div>
        <p style="font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 20px;">
          El televisor respondió correctamente a la prueba técnica.
        </p>

        <!-- Spec Sheet -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 16px; text-align: left; margin-bottom: 24px; font-size: 0.76rem;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-hairline);">
            <span style="color: var(--text-secondary);">Nombre:</span>
            <strong style="color: var(--text-primary);">${this.formData.name}</strong>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-hairline);">
            <span style="color: var(--text-secondary);">Fabricante:</span>
            <strong style="color: var(--text-primary); text-transform: uppercase;">${this.formData.brand}</strong>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-hairline);">
            <span style="color: var(--text-secondary);">Modelo:</span>
            <span style="color: var(--text-primary);">${model}</span>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-hairline);">
            <span style="color: var(--text-secondary);">Protocolo:</span>
            <span style="color: var(--text-primary);">${protocol}</span>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-hairline);">
            <span style="color: var(--text-secondary);">Estado de red:</span>
            <span class="status-pill">
              <span class="status-dot connected"></span>
              <span style="color: var(--status-connected); font-weight: 600;">${network}</span>
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; padding: 6px 0;">
            <span style="color: var(--text-secondary);">Estado de energía:</span>
            <span style="color: var(--text-secondary);">${power}</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn-clean btn-clean-secondary" id="btn-confirm-cancel" style="flex: 1;">
            Cancelar
          </button>
          <button class="btn-clean btn-clean-primary" id="btn-confirm-add" style="flex: 1.6;">
            ${renderIcon('plus', 16)}
            <span>Agregar dispositivo</span>
          </button>
        </div>
      </div>
    `;
  }

  // 4B. Pantalla de Prueba Fallida (Requisito 6)
  _renderStep4Failure() {
    const res = this.testResult;
    const message = res?.message || 'No se obtuvo respuesta del televisor.';
    const details = res?.errorType || 'no_response';

    return `
      <div style="text-align: center; padding-top: 10px;">
        <div style="width: 52px; height: 52px; border-radius: var(--radius-full); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-disconnected); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
          ${renderIcon('alertCircle', 26)}
        </div>

        <div class="view-title" style="margin-bottom: 4px;">No se pudo verificar el dispositivo</div>
        <p style="font-size: 0.76rem; color: var(--text-secondary); max-width: 300px; margin: 0 auto 20px;">
          ${message}
        </p>

        <!-- Technical status box -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 14px; text-align: left; margin-bottom: 24px; font-size: 0.74rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Destino:</span>
            <span style="font-family: monospace; color: var(--text-primary);">${this.formData.ip}:${this.formData.port}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Estado de guardado:</span>
            <strong style="color: var(--status-disconnected);">No agregado</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-secondary);">Red:</span>
            <span style="color: var(--text-secondary);">Offline / Inalcanzable</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn-clean btn-clean-secondary" id="btn-failure-cancel" style="flex: 1;">
            Cancelar
          </button>
          <button class="btn-clean btn-clean-primary" id="btn-failure-retry" style="flex: 1.6;">
            ${renderIcon('refresh', 16)}
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    `;
  }

  _attachEvents(container) {
    // Cancel button in top bar
    container.querySelector('#btn-cancel-setup')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    // Step 1: Select Brand
    container.querySelectorAll('.btn-select-brand').forEach((el) => {
      el.addEventListener('click', () => {
        const brand = el.getAttribute('data-brand');
        const port = parseInt(el.getAttribute('data-port'), 10) || 80;
        this.formData.brand = brand;
        this.formData.port = port;
        this.render(container);
      });
    });

    container.querySelector('#btn-brand-continue')?.addEventListener('click', () => {
      this.step = 2;
      this.render(container);
    });

    // Step 2: Form
    container.querySelector('#btn-form-back')?.addEventListener('click', () => {
      this.step = 1;
      this.render(container);
    });

    container.querySelector('#btn-form-test')?.addEventListener('click', async () => {
      const nameInput = container.querySelector('#input-setup-name')?.value.trim();
      const ipInput = container.querySelector('#input-setup-ip')?.value.trim();
      const portInput = parseInt(container.querySelector('#input-setup-port')?.value.trim(), 10);
      const modelInput = container.querySelector('#input-setup-model')?.value.trim();

      if (!ipInput) {
        this.app.showToast('Introduce una dirección IP o hostname válido', 'danger');
        return;
      }

      this.formData.name = nameInput || `${this.formData.brand.toUpperCase()} TV`;
      this.formData.ip = ipInput;
      this.formData.port = isNaN(portInput) ? 8060 : portInput;
      this.formData.model = modelInput;

      // Transition to Step 3 (Testing)
      this.step = 3;
      this.render(container);

      // Perform real test
      await this._executeRealTest(container);
    });

    // Step 4A: Confirmation Success
    container.querySelector('#btn-confirm-cancel')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    container.querySelector('#btn-confirm-add')?.addEventListener('click', () => {
      // Requisito 7 & 21: Solo después de pulsar Add device se guarda
      const devData = {
        name: this.formData.name,
        brand: this.formData.brand,
        ip: this.formData.ip,
        port: this.formData.port,
        model: this.testResult?.device?.model || this.formData.model || 'Smart TV',
        isTv: this.testResult?.device?.isTv !== undefined ? this.testResult.device.isTv : true,
        networkStatus: this.testResult?.networkStatus || 'online',
        powerStatus: this.testResult?.powerStatus || 'unknown'
      };

      const added = DeviceManager.addDevice(devData);
      DeviceManager.setActiveDevice(added.id);

      this.app.showToast('Dispositivo agregado', 'success');
      this.app.navigateTo('home');
    });

    // Step 4B: Failure
    container.querySelector('#btn-failure-cancel')?.addEventListener('click', () => {
      this.app.navigateTo('home');
    });

    container.querySelector('#btn-failure-retry')?.addEventListener('click', () => {
      // Preserve form data and return to form step
      this.step = 2;
      this.render(container);
    });
  }

  async _executeRealTest(container) {
    // Instantiate temporary driver for probe without adding to storage
    const tempDriver = DeviceManager.createDriver({
      name: this.formData.name,
      brand: this.formData.brand,
      ip: this.formData.ip,
      port: this.formData.port,
      model: this.formData.model
    });

    try {
      const result = await tempDriver.testConnection();
      this.testResult = result;
      this.step = 4;
      this.render(container);

      if (result.success) {
        this.app.showToast('Dispositivo verificado', 'success');
      } else {
        this.app.showToast('No se pudo verificar el dispositivo', 'warning');
      }
    } catch (err) {
      this.testResult = {
        success: false,
        networkStatus: 'offline',
        powerStatus: 'unknown',
        message: err.message || 'Error de comunicación durante la prueba'
      };
      this.step = 4;
      this.render(container);
      this.app.showToast('No se pudo verificar el dispositivo', 'danger');
    }
  }
}
