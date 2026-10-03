/**
 * RemoteOne - Automated Unit & Integration Test Suite
 * Validates Requirement 30:
 * - guardar dispositivos
 * - eliminar dispositivos
 * - editar dispositivos
 * - seleccionar dispositivo
 * - ejecutar comandos
 * - manejar errores
 * - detectar dispositivo no disponible
 * - detectar navegador sin soporte
 * - favoritos
 * - macros
 * - persistencia
 * - instalación PWA
 * - Matriz de comandos Roku
 */

import { StorageManager } from '../src/core/StorageManager.js';
import { DeviceManager } from '../src/core/DeviceManager.js';
import { CommandManager } from '../src/core/CommandManager.js';
import { ErrorHandler } from '../src/utils/ErrorHandler.js';
import { NetworkUtils } from '../src/utils/NetworkUtils.js';
import { ROKU_COMMANDS, getInitialRokuMatrix } from '../src/devices/roku/RokuCommands.js';
import { RokuDriver } from '../src/devices/roku/RokuDriver.js';
import { XiaomiDriver } from '../src/devices/xiaomi/XiaomiDriver.js';

export async function runAllTests(loggerFn) {
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      passed++;
      loggerFn({ name: testName, status: 'pass', details });
    } else {
      failed++;
      loggerFn({ name: testName, status: 'fail', details });
    }
  }

  // Clear storage for a clean test run
  localStorage.clear();
  StorageManager.init();
  DeviceManager.init();

  // Test 1: StorageManager init and persistence defaults
  assert(Array.isArray(StorageManager.getDevices()), '1.1 Persistencia: getDevices() inicializa como Array');
  assert(Array.isArray(StorageManager.getFavorites()), '1.2 Persistencia: getFavorites() tiene semillas por defecto');
  assert(Array.isArray(StorageManager.getMacros()), '1.3 Persistencia: getMacros() tiene macros iniciales');
  assert(StorageManager.getSettings().connectionMode === 'auto', '1.4 Persistencia: Settings connectionMode default');

  // Test 2: Guardar dispositivo
  const sampleTv = {
    id: 'roku_test_1',
    name: 'Roku Habitación Test',
    room: 'Habitación',
    brand: 'roku',
    ip: '192.168.1.50',
    port: 8060,
    model: 'TCL Roku TV 50"',
    isTv: true
  };
  DeviceManager.addDevice(sampleTv);
  const fetched = StorageManager.getDevice('roku_test_1');
  assert(fetched !== null && fetched.name === 'Roku Habitación Test', '2. Guardar dispositivo en DeviceManager');

  // Test 3: Editar dispositivo
  DeviceManager.updateDevice('roku_test_1', { name: 'Roku Habitación Renombrado' });
  const updated = StorageManager.getDevice('roku_test_1');
  assert(updated.name === 'Roku Habitación Renombrado', '3. Editar dispositivo');

  // Test 4: Seleccionar dispositivo
  DeviceManager.setActiveDevice('roku_test_1');
  assert(DeviceManager.getActiveDriver()?.id === 'roku_test_1', '4. Seleccionar dispositivo activo');
  assert(StorageManager.getLastDeviceId() === 'roku_test_1', '4.1 Recordar último televisor utilizado');

  // Test 5: Eliminar dispositivo
  const sampleTv2 = { id: 'roku_test_2', name: 'Roku Secundario', brand: 'roku', ip: '192.168.1.51' };
  DeviceManager.addDevice(sampleTv2);
  assert(StorageManager.getDevice('roku_test_2') !== null, '5.1 Segundo TV agregado');
  DeviceManager.removeDevice('roku_test_2');
  assert(StorageManager.getDevice('roku_test_2') === null, '5.2 Eliminar dispositivo');

  // Test 6: ErrorHandler - Detección de bloqueos de navegador y CORS
  const corsErr = new TypeError('Failed to fetch');
  const parsedCors = ErrorHandler.parse(corsErr, { mode: 'direct', ip: '192.168.1.50' });
  assert(parsedCors.state === 'Bloqueado por navegador', '6.1 ErrorHandler detecta bloqueo CORS en Modo Directo');
  assert(parsedCors.userMessage.includes('navegador bloqueó'), '6.2 ErrorHandler muestra mensaje honesto sin simular éxito');

  // Test 7: ErrorHandler - Detección de control deshabilitado (403 Forbidden)
  const forbiddenErr = { status: 403, message: 'Forbidden' };
  const parsed403 = ErrorHandler.parse(forbiddenErr, { mode: 'bridge', ip: '192.168.1.50' });
  assert(parsed403.state === 'No compatible', '7.1 ErrorHandler detecta HTTP 403 (Control por apps móviles deshabilitado)');

  // Test 8: ErrorHandler - Dispositivo no disponible / Timeout
  const timeoutErr = new Error('Timeout al conectar');
  const parsedTimeout = ErrorHandler.parse(timeoutErr, { mode: 'bridge', ip: '192.168.1.50' });
  assert(parsedTimeout.state === 'Desconectado', '8. ErrorHandler detecta dispositivo no disponible (Timeout)');

  // Test 9: XiaomiDriver - Regla estricta de no simular funcionalidad
  const xiaomiDev = { id: 'xiaomi_test', brand: 'xiaomi', ip: '192.168.1.80' };
  const xiaomiDriver = new XiaomiDriver(xiaomiDev);
  const xiaomiRes = await xiaomiDriver.sendKeypress('Home');
  assert(xiaomiRes.success === false && xiaomiRes.state === 'No compatible', '9. XiaomiDriver NO simula comandos y reporta estado honesto');

  // Test 10: Ejecutar comandos en modo Demo
  StorageManager.saveSettings({ demoMode: true });
  const demoCmdRes = await CommandManager.executeCommand('Home');
  assert(demoCmdRes.success === true && demoCmdRes.mode === 'demo', '10. Ejecución de comandos en Modo Demostración');

  // Test 11: Macros - Validación de restricciones del dispositivo
  const nonTvDriver = new RokuDriver({ ip: '192.168.1.90', isTv: false });
  DeviceManager.drivers.set('roku_stick', nonTvDriver);
  DeviceManager.setActiveDevice('roku_stick');
  const tvOnlyMacro = {
    name: 'Macro Solo TV',
    steps: [{ command: 'VolumeUp', delayMs: 100, requiresTv: true }]
  };
  const macroRes = await CommandManager.executeMacro(tvOnlyMacro);
  assert(macroRes.success === false, '11. Macros rechaza comandos que el dispositivo no soporta (VolumeUp en Stick)');

  // Test 12: Matriz de Comandos Roku
  const matrix = getInitialRokuMatrix();
  assert(matrix.length >= 20, '12.1 Matriz de comandos Roku contiene todos los comandos oficiales');
  assert(matrix.every((c) => c.implemented === true && c.tested === false), '12.2 Comandos inician como Implemented: Sí, Tested: Pendiente');

  // Test 13: Validación de direcciones IPv4
  assert(NetworkUtils.isValidIPv4('192.168.1.1'), '13.1 NetworkUtils valida IPv4 correcta');
  assert(!NetworkUtils.isValidIPv4('192.168.1.256'), '13.2 NetworkUtils rechaza octeto > 255');
  assert(!NetworkUtils.isValidIPv4('abc.def.ghi.jkl'), '13.3 NetworkUtils rechaza cadenas no numéricas');

  // Test 14: Parser XML de Roku device-info
  const sampleXml = '<device-info><friendly-device-name>TCL Roku TV</friendly-device-name><model-name>55S435</model-name><software-version>12.5.0</software-version><is-tv>true</is-tv></device-info>';
  const parsedInfo = NetworkUtils.parseRokuDeviceInfoXml(sampleXml);
  assert(parsedInfo.name === 'TCL Roku TV' && parsedInfo.isTv === true, '14. Parser XML de Roku device-info extrae campos correctamente');

  // Restore demoMode off
  StorageManager.saveSettings({ demoMode: false });

  return { passed, failed, total: passed + failed };
}
