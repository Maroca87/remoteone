/**
 * RemoteOne - Logger Utility
 * Manages structured logging with real-time listeners and diagnostic history.
 */

export class Logger {
  static MAX_LOGS = 150;
  static logs = [];
  static listeners = new Set();

  static log(level, message, data = null) {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString(),
      level: level.toUpperCase(), // 'INFO', 'WARN', 'ERROR', 'SUCCESS', 'DEBUG'
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    };

    Logger.logs.unshift(entry);
    if (Logger.logs.length > Logger.MAX_LOGS) {
      Logger.logs.pop();
    }

    const consoleMethod = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    consoleMethod(`[RemoteOne][${entry.level}] ${message}`, data || '');

    // Notify UI listeners
    Logger.listeners.forEach((fn) => {
      try {
        fn(entry, Logger.logs);
      } catch (err) {
        console.error('Logger listener error:', err);
      }
    });

    return entry;
  }

  static info(message, data) {
    return Logger.log('INFO', message, data);
  }

  static warn(message, data) {
    return Logger.log('WARN', message, data);
  }

  static error(message, data) {
    return Logger.log('ERROR', message, data);
  }

  static success(message, data) {
    return Logger.log('SUCCESS', message, data);
  }

  static debug(message, data) {
    return Logger.log('DEBUG', message, data);
  }

  static subscribe(fn) {
    Logger.listeners.add(fn);
    return () => Logger.listeners.delete(fn);
  }

  static getHistory() {
    return [...Logger.logs];
  }

  static clear() {
    Logger.logs = [];
    Logger.listeners.forEach((fn) => fn(null, []));
  }

  static exportDiagnostics(activeDevice = null, connectionInfo = {}) {
    const lines = [
      '==============================================',
      '      REMOTEONE - DIAGNOSTIC REPORT',
      '==============================================',
      `Fecha/Hora: ${new Date().toLocaleString()}`,
      `Plataforma: ${navigator.userAgent}`,
      `Protocolo PWA: ${window.location.protocol}`,
      `Origen: ${window.location.origin}`,
      `Modo Conexión PWA: ${connectionInfo.mode || 'N/A'}`,
      `Bridge URL: ${connectionInfo.bridgeUrl || 'No configurado'}`,
      '----------------------------------------------',
      'DISPOSITIVO ACTIVO:'
    ];

    if (activeDevice) {
      lines.push(`  Nombre: ${activeDevice.name || 'Sin nombre'}`);
      lines.push(`  Habitación: ${activeDevice.room || 'No asignada'}`);
      lines.push(`  Marca: ${activeDevice.brand || 'N/A'}`);
      lines.push(`  IP: ${activeDevice.ip || 'N/A'}`);
      lines.push(`  Puerto: ${activeDevice.port || 8060}`);
      lines.push(`  Protocolo: ${activeDevice.protocol || 'Roku ECP'}`);
      lines.push(`  Modelo: ${activeDevice.model || 'No identificado'}`);
      lines.push(`  Es TV: ${activeDevice.isTv ? 'Sí (Soporta Volumen/Canales/Power)' : 'No (Stick / Reproductor)'}`);
      lines.push(`  Versión Software: ${activeDevice.softwareVersion || 'Desconocida'}`);
      lines.push(`  Estado Actual: ${activeDevice.status || 'Desconocido'}`);
      lines.push(`  Último Comando: ${activeDevice.lastCommand || 'Ninguno'}`);
      lines.push(`  Último Resultado: ${activeDevice.lastStatus || 'N/A'}`);
    } else {
      lines.push('  Ningún dispositivo seleccionado.');
    }

    lines.push('----------------------------------------------');
    lines.push('HISTORIAL RECIENTE DE ACCIONES Y ERRORES:');

    if (Logger.logs.length === 0) {
      lines.push('  (Sin eventos registrados todavía)');
    } else {
      Logger.logs.slice(0, 50).forEach((l) => {
        const dataStr = l.data ? ` | Datos: ${JSON.stringify(l.data)}` : '';
        lines.push(`[${l.timeFormatted}] [${l.level}] ${l.message}${dataStr}`);
      });
    }

    lines.push('==============================================');
    return lines.join('\n');
  }
}
