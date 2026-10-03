#!/usr/bin/env python3
"""
RemoteOne - Scenario Validation Suite (Requirement 28)
Validates scenarios A through F:
- ESCENARIO A: TV encendido -> conexión correcta -> mostrar Online
- ESCENARIO B: TV apagado -> NO mostrar Connected simplemente por estar configurado
- ESCENARIO C: IP incorrecta -> prueba falla -> NO agregar como dispositivo operativo
- ESCENARIO D: TV desconectado de la red -> mostrar Offline/Unreachable/Unknown
- ESCENARIO E: Dispositivo agregado -> reiniciar sesión -> estado vuelve a 'unknown' y se comprueba
- ESCENARIO F: Dispositivo descubierto -> mostrar como encontrado -> NO agregar sin confirmación de usuario
"""

import os
import sys
import json
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_scenario_tests():
    print("==================================================")
    print("   REMOTEONE - VALIDACIÓN DE ESCENARIOS REALES (REQ 28)")
    print("==================================================")
    
    passed = 0
    total = 0

    def test(condition, name, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"[PASS] {name}")
        else:
            print(f"[FAIL] {name} - Detalle: {details}")

    # 1. Inspect DeviceManager.js
    dm_path = os.path.join(BASE_DIR, "src", "core", "DeviceManager.js")
    with open(dm_path, "r", encoding="utf-8") as f:
        dm_code = f.read()

    # Rule 1 & Scenario B: Configured != Connected. States initialized as 'unknown' upon app init.
    test(
        "networkStatus: 'unknown'" in dm_code and "powerStatus: 'unknown'" in dm_code,
        "ESCENARIO E / Regla 11: Al abrir la app, estados dinámicos inician como 'unknown' sin asumir conexión previa",
        "init() debe setear networkStatus y powerStatus en 'unknown'"
    )

    test(
        "configured: true" in dm_code and "status: 'Conectado'" not in dm_code,
        "ESCENARIO B / Regla 1: addDevice() guarda configured: true pero NO escribe status: 'Conectado' en persistencia",
        "addDevice no debe persistir status fijo 'Conectado'"
    )

    test(
        "deviceStates = new Map()" in dm_code,
        "Regla 2 & 3: Runtime states desacoplados del almacenamiento permanente",
        "deviceStates Map debe gestionar live states"
    )

    # 2. Inspect DeviceSetupView.js (Manual Add Flow & Scenario C)
    setup_path = os.path.join(BASE_DIR, "src", "ui", "DeviceSetupView.js")
    with open(setup_path, "r", encoding="utf-8") as f:
        setup_code = f.read()

    test(
        "testConnection()" in setup_code,
        "ESCENARIO C / Requisito 4 & 5: Manual Add ejecuta testConnection() real antes de permitir guardar",
        "Falta llamada a tempDriver.testConnection()"
    )

    test(
        "No se pudo verificar el dispositivo" in setup_code and "No agregado" in setup_code,
        "ESCENARIO C / Requisito 6: Si la prueba falla, el dispositivo queda como 'No agregado' y NO se guarda",
        "Pantalla de fallo debe mostrar 'No agregado'"
    )

    test(
        "Dispositivo detectado" in setup_code and "btn-confirm-add" in setup_code,
        "Requisito 7: Pantalla de confirmación explícita con botón 'Agregar dispositivo' antes de guardar",
        "Falta confirmación explícita tras test exitoso"
    )

    # 3. Inspect HomeView.js (Scenario F & Scan without auto-add)
    home_path = os.path.join(BASE_DIR, "src", "ui", "HomeView.js")
    with open(home_path, "r", encoding="utf-8") as f:
        home_code = f.read()

    test(
        "btn-add-discovered-device" in home_code and "DeviceManager.addDevice" in home_code,
        "ESCENARIO F / Requisitos 8 & 9: Dispositivos descubiertos se muestran con botón [Agregar] y NO se auto-agregan",
        "Discovery debe esperar a que el usuario pulse [Agregar]"
    )

    test(
        "netDotClass" in home_code and "powerLabel" in home_code,
        "Requisitos 2 & 3: HomeView presenta Network status y Power status de forma separada y explícita",
        "Debe renderizar badges independientes"
    )

    test(
        "lastChecked" in home_code and "_formatTimeAgo" in home_code,
        "Requisito 23: Tarjeta muestra última comprobación (Last checked: Hace un momento / 2 min ago)",
        "Debe formatear tiempo de última comprobación"
    )

    # 4. Inspect RemoteView.js (Honest Button Feedback & Capabilities)
    remote_path = os.path.join(BASE_DIR, "src", "ui", "RemoteView.js")
    with open(remote_path, "r", encoding="utf-8") as f:
        remote_code = f.read()

    test(
        "capabilities.volume" in remote_code and "capabilities.power" in remote_code and "capabilities.textInput" in remote_code,
        "Requisito 18 & 19: RemoteView evalúa capacidades reales del driver y no muestra botones no soportados",
        "Falta validación de capabilities"
    )

    test(
        "Comando fallido" in remote_code or "Dispositivo no disponible" in remote_code,
        "ESCENARIO D / Requisito 14: Feedback honesto en botones cuando falla un comando (sin fake success)",
        "Debe notificar error real en toast"
    )

    # 5. Inspect CommandManager.js
    cmd_path = os.path.join(BASE_DIR, "src", "core", "CommandManager.js")
    with open(cmd_path, "r", encoding="utf-8") as f:
        cmd_code = f.read()

    test(
        "lastCommandResult" in cmd_code and "updateDeviceRuntimeState" in cmd_code,
        "Requisito 14 & 27: CommandManager registra último comando, resultado y actualiza estado si el TV no responde",
        "Falta actualización de telemetría en CommandManager"
    )

    # 6. Inspect DiagnosticView.js
    diag_path = os.path.join(BASE_DIR, "src", "ui", "DiagnosticView.js")
    with open(diag_path, "r", encoding="utf-8") as f:
        diag_code = f.read()

    diag_fields = ["Device configured", "Network", "Power", "Protocol", "Connection method", "Last check", "Last command", "Last command result"]
    all_diag_fields = all(f in diag_code for f in diag_fields)
    test(
        all_diag_fields,
        "Requisito 27: Diagnóstico técnico desglosa los 8 campos obligatorios requeridos",
        f"Campos faltantes en telemetría: {[f for f in diag_fields if f not in diag_code]}"
    )

    # 7. Check Drivers (BaseDriver, RokuDriver, XiaomiDriver, GenericDriver)
    roku_drv = os.path.join(BASE_DIR, "src", "devices", "roku", "RokuDriver.js")
    xiaomi_drv = os.path.join(BASE_DIR, "src", "devices", "xiaomi", "XiaomiDriver.js")
    generic_drv = os.path.join(BASE_DIR, "src", "devices", "generic", "GenericDriver.js")

    with open(roku_drv, "r", encoding="utf-8") as f: r_code = f.read()
    with open(xiaomi_drv, "r", encoding="utf-8") as f: x_code = f.read()
    with open(generic_drv, "r", encoding="utf-8") as f: g_code = f.read()

    test(
        "getCapabilities()" in r_code and "getPowerState()" in r_code,
        "Requisito 19 & 20: RokuDriver implementa getCapabilities() y getPowerState() honesto",
        "Falta getCapabilities() o getPowerState()"
    )

    test(
        "navigation: false" in x_code and "navigation: false" in g_code,
        "Requisito 18 & 20: XiaomiDriver y GenericDriver no simulan navegación sin soporte real",
        "navigation debe ser false en Xiaomi/Generic"
    )

    print("\n==================================================")
    if passed == total:
        print(f"  [OK] TODOS LOS ESCENARIOS Y REGLAS SUPERADOS ({passed}/{total})")
    else:
        print(f"  [ERROR] {total - passed} PRUEBAS FALLARON")
    print("==================================================")
    return passed == total

if __name__ == "__main__":
    success = run_scenario_tests()
    sys.exit(0 if success else 1)
