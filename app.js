/**
 * RemoteOne - Main Application Entrypoint
 * Coordinates navigation, lifecycle, PWA installation, and reactive toast feedback.
 */

import { StorageManager } from './src/core/StorageManager.js';
import { DeviceManager } from './src/core/DeviceManager.js';
import { ConnectionManager } from './src/core/ConnectionManager.js';
import { Logger } from './src/utils/Logger.js';

import { HomeView } from './src/ui/HomeView.js';
import { RemoteView } from './src/ui/RemoteView.js';
import { DeviceSetupView } from './src/ui/DeviceSetupView.js';
import { FavoritesView } from './src/ui/FavoritesView.js';
import { SettingsView } from './src/ui/SettingsView.js';
import { DiagnosticView } from './src/ui/DiagnosticView.js';
import { CompatibilityView } from './src/ui/CompatibilityView.js';

class RemoteOneApp {
  constructor() {
    this.currentView = 'home';
    this.views = {
      home: new HomeView(this),
      remote: new RemoteView(this),
      setup: new DeviceSetupView(this),
      favorites: new FavoritesView(this),
      settings: new SettingsView(this),
      diagnostic: new DiagnosticView(this),
      compatibility: new CompatibilityView(this)
    };
    this.deferredPrompt = null;
  }

  init() {
    Logger.info('Iniciando RemoteOne PWA...');
    
    // 1. Initialize persistent storage and seed defaults
    StorageManager.init();

    // 2. Initialize device manager and restore last active device
    DeviceManager.init();

    // 3. Initialize connection manager
    ConnectionManager.init();

    // 4. Register Service Worker if supported
    this._registerServiceWorker();

    // 5. Setup PWA install prompt capture
    this._setupInstallPrompt();

    // 6. Setup Global Listeners
    this._setupGlobalListeners();

    // 7. Update Demo Mode banner
    this.updateDemoBanner();

    // 8. Render default view (or remote if last device exists)
    const lastId = StorageManager.getLastDeviceId();
    const initialRoute = lastId ? 'remote' : 'home';
    this.navigateTo(initialRoute);
  }

  navigateTo(viewName) {
    if (!this.views[viewName]) {
      console.warn(`Vista desconocida: ${viewName}`);
      return;
    }

    // Cleanup previous view if needed
    if (this.views[this.currentView]?.destroy) {
      this.views[this.currentView].destroy();
    }

    this.currentView = viewName;
    const container = document.getElementById('view-mount-point');
    if (container) {
      this.views[viewName].render(container);
    }

    // Update bottom nav highlighting
    document.querySelectorAll('.nav-item-btn').forEach((btn) => {
      const target = btn.getAttribute('data-view');
      btn.classList.toggle('active', target === viewName || (viewName === 'setup' && target === 'home'));
    });

    window.scrollTo(0, 0);
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-mount-point');
    if (!toastContainer) return;

    let icon = 'ℹ️';
    let borderColor = '#3b82f6';
    if (type === 'success') { icon = '✓'; borderColor = '#10b981'; }
    else if (type === 'danger') { icon = '✗'; borderColor = '#ef4444'; }
    else if (type === 'warning') { icon = '⚠'; borderColor = '#f59e0b'; }

    const toast = document.createElement('div');
    toast.className = 'toast-feedback';
    toast.style.borderColor = borderColor;
    toast.innerHTML = `
      <span class="fs-5">${icon}</span>
      <div class="small text-white flex-fill">${message}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  updateDemoBanner() {
    const banner = document.getElementById('demo-mode-banner');
    const settings = StorageManager.getSettings();
    if (banner) {
      if (settings.demoMode) {
        banner.classList.remove('d-none');
      } else {
        banner.classList.add('d-none');
      }
    }
  }

  _setupGlobalListeners() {
    // Bottom Nav clicks
    document.querySelectorAll('.nav-item-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.navigateTo(view);
      });
    });

    // Reactive refresh when devices or settings change
    window.addEventListener('remoteone:devices_changed', () => {
      if (this.currentView === 'home') {
        this.views.home.render(document.getElementById('view-mount-point'));
      }
    });

    window.addEventListener('remoteone:active_device_changed', () => {
      if (this.currentView === 'remote') {
        this.views.remote.render(document.getElementById('view-mount-point'));
      }
    });

    window.addEventListener('remoteone:settings_changed', () => {
      this.updateDemoBanner();
    });
  }

  _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            Logger.info('Service Worker registrado correctamente.', { scope: reg.scope });
          })
          .catch((err) => {
            Logger.warn('Fallo al registrar Service Worker (posible contexto no HTTPS):', err.message);
          });
      });
    }
  }

  _setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) {
        installBtn.classList.remove('d-none');
        installBtn.addEventListener('click', async () => {
          if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            Logger.info(`Resultado de instalación PWA: ${outcome}`);
            this.deferredPrompt = null;
            installBtn.classList.add('d-none');
          }
        });
      }
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new RemoteOneApp();
  window.app.init();
});
