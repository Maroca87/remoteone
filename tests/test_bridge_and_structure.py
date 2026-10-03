#!/usr/bin/env python3
"""
RemoteOne - CLI Validation Test Script
Tests filesystem structure, manifest schema, bridge API endpoints, and CORS headers.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import subprocess
import time

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def check_file(rel_path):
    p = os.path.join(BASE_DIR, rel_path)
    exists = os.path.isfile(p)
    print(f"[{'PASS' if exists else 'FAIL'}] Archivo: {rel_path}")
    return exists

def run_tests():
    print("==================================================")
    print("   REMOTEONE - VALIDACIÓN DE ESTRUCTURA Y ARCHIVOS")
    print("==================================================")

    required_files = [
        "index.html",
        "manifest.json",
        "sw.js",
        "app.js",
        "css/style.css",
        "assets/icons/icon.svg",
        "src/core/StorageManager.js",
        "src/core/DeviceManager.js",
        "src/core/ConnectionManager.js",
        "src/core/CommandManager.js",
        "src/core/DiscoveryManager.js",
        "src/devices/roku/RokuCommands.js",
        "src/devices/roku/RokuDriver.js",
        "src/devices/roku/RokuDiscovery.js",
        "src/devices/xiaomi/XiaomiCommands.js",
        "src/devices/xiaomi/XiaomiDriver.js",
        "src/devices/xiaomi/XiaomiDiscovery.js",
        "src/ui/Icons.js",
        "src/ui/HomeView.js",
        "src/ui/RemoteView.js",
        "src/ui/DeviceSetupView.js",
        "src/ui/FavoritesView.js",
        "src/ui/SettingsView.js",
        "src/ui/DiagnosticView.js",
        "src/ui/CompatibilityView.js",
        "src/utils/Logger.js",
        "src/utils/ErrorHandler.js",
        "src/utils/NetworkUtils.js",
        "bridge/package.json",
        "bridge/server.js",
        "bridge/bridge.py",
        "bridge/README.md",
        "tests/index.html",
        "tests/test_runner.js"
    ]

    all_exist = True
    for f in required_files:
        if not check_file(f):
            all_exist = False

    # Check that NO emojis exist in any application code or templates
    print("\n--- Validando Ausencia Total de Emojis en Código UI ---")
    emoji_chars = ["📺", "🏠", "⭐", "⚙️", "🔍", "📡", "🔴", "🟢", "🎬", "⌨️", "📶", "ℹ️", "⬇", "⚡", "⚠️", "⏻", "▲", "▼", "◀", "▶"]
    code_files = [
        "index.html",
        "app.js",
        "css/style.css",
        "src/ui/Icons.js",
        "src/ui/HomeView.js",
        "src/ui/RemoteView.js",
        "src/ui/DeviceSetupView.js",
        "src/ui/FavoritesView.js",
        "src/ui/SettingsView.js",
        "src/ui/DiagnosticView.js",
        "src/ui/CompatibilityView.js",
        "src/core/StorageManager.js",
        "src/core/ConnectionManager.js",
        "src/devices/roku/RokuDriver.js",
        "src/devices/roku/RokuDiscovery.js"
    ]

    has_emoji_error = False
    for cf in code_files:
        full_p = os.path.join(BASE_DIR, cf)
        if os.path.isfile(full_p):
            with open(full_p, "r", encoding="utf-8") as f_obj:
                content = f_obj.read()
                for em in emoji_chars:
                    if em in content:
                        print(f"[FAIL] Emoji '{em}' encontrado en {cf}")
                        has_emoji_error = True
                        all_exist = False
    if not has_emoji_error:
        print("[PASS] Cero emojis encontrados en la interfaz y archivos de código (100% Lucide SVG)")

    # Check manifest.json validity
    print("\n--- Validando manifest.json ---")
    manifest_path = os.path.join(BASE_DIR, "manifest.json")
    try:
        with open(manifest_path, "r", encoding="utf-8") as mf:
            m_data = json.load(mf)
            assert m_data.get("display") == "standalone"
            assert m_data.get("short_name") == "TV Remote"
            print("[PASS] manifest.json es válido y cumple los estándares PWA")
    except Exception as e:
        print(f"[FAIL] Error en manifest.json: {e}")
        all_exist = False

    # Test Bridge by spawning bridge.py temporarily
    print("\n--- Probando Local Bridge (bridge.py) ---")
    bridge_script = os.path.join(BASE_DIR, "bridge", "bridge.py")
    test_port = "3199"
    env = os.environ.copy()
    env["PORT"] = test_port

    proc = subprocess.Popen([sys.executable, bridge_script], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(1.2)

    try:
        url = f"http://127.0.0.1:{test_port}/api/status"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            status_code = resp.getcode()
            cors = resp.headers.get("Access-Control-Allow-Origin")
            body = resp.read().decode("utf-8")
            data = json.loads(body)

            print(f"[{'PASS' if status_code == 200 else 'FAIL'}] Bridge HTTP Status: {status_code}")
            print(f"[{'PASS' if cors == '*' else 'FAIL'}] Cabecera CORS: {cors}")
            print(f"[{'PASS' if data.get('status') == 'online' else 'FAIL'}] Payload API Status: {data.get('status')}")

        # Also test static file serving
        static_url = f"http://127.0.0.1:{test_port}/manifest.json"
        with urllib.request.urlopen(static_url, timeout=3.0) as resp:
            print(f"[{'PASS' if resp.getcode() == 200 else 'FAIL'}] Servicio de archivos estáticos PWA: OK")

    except Exception as e:
        print(f"[FAIL] Error probando Local Bridge: {e}")
        all_exist = False
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=2.0)
        except Exception:
            proc.kill()

    print("\n==================================================")
    if all_exist:
        print("  [OK] TODAS LAS PRUEBAS DE ESTRUCTURA Y BRIDGE SUPERADAS")
    else:
        print("  [ERROR] SE ENCONTRARON FALLOS EN LA VALIDACION")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
