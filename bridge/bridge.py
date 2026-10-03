#!/usr/bin/env python3
"""
RemoteOne - Local Network Bridge (Python 3 Zero-Dependency)
Implements the exact same REST API and static PWA hosting as server.js:
- SSDP M-SEARCH discovery (UDP multicast 239.255.255.250:1900)
- HTTP proxy for Roku ECP with full CORS headers
- Serves the RemoteOne PWA files to mobile phones
- Safe local-only communication
"""

import http.server
import socketserver
import socket
import urllib.request
import urllib.error
import urllib.parse
import json
import os
import re
import sys
import mimetypes

PORT = int(os.environ.get("PORT", 3000))
PWA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def is_private_ip(ip):
    if not ip:
        return False
    return (
        ip.startswith("192.168.") or
        ip.startswith("10.") or
        ip.startswith("127.") or
        re.match(r"^172\.(1[6-9]|2[0-9]|3[0-1])\.", ip) is not None
    )

def perform_ssdp_discovery(timeout=3.0):
    discovered = {}
    msg = (
        'M-SEARCH * HTTP/1.1\r\n'
        'HOST: 239.255.255.250:1900\r\n'
        'MAN: "ssdp:discover"\r\n'
        'MX: 3\r\n'
        'ST: roku:ecp\r\n\r\n'
    ).encode('utf-8')

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.settimeout(timeout)
        # Multicast TTL
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.sendto(msg, ('239.255.255.250', 1900))

        while True:
            try:
                data, addr = sock.recvfrom(2048)
                ip = addr[0]
                text = data.decode('utf-8', errors='ignore')
                if 'roku:ecp' in text.lower() or ':8060' in text:
                    loc_match = re.search(r'location:\s*(http://[^\r\n]+)', text, re.IGNORECASE)
                    loc = loc_match.group(1).strip() if loc_match else f"http://{ip}:8060/"
                    if ip not in discovered:
                        discovered[ip] = {
                            "ip": ip,
                            "port": 8060,
                            "location": loc,
                            "brand": "roku"
                        }
            except socket.timeout:
                break
            except Exception as e:
                break
    except Exception as e:
        print(f"[SSDP] Socket error: {e}")
    finally:
        try:
            sock.close()
        except Exception:
            pass

    return list(discovered.values())

def extract_xml_tag(xml, tag):
    m = re.search(rf"<{tag}>(.*?)</{tag}>", xml, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else ""

def roku_http_request(ip, path, method="GET", data=None):
    if not is_private_ip(ip):
        raise ValueError("Seguridad: solo se permiten IPs privadas locales.")
    url = f"http://{ip}:8060{path}"
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=4.0) as resp:
        return resp.getcode(), resp.read().decode('utf-8', errors='replace')

class BridgeHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PWA_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "online",
                "version": "1.0.0",
                "service": "RemoteOne Local Bridge (Python)"
            }).encode('utf-8'))
            return

        if path == '/api/discover':
            raw_devices = perform_ssdp_discovery(3.0)
            enriched = []
            for dev in raw_devices:
                try:
                    code, xml = roku_http_request(dev['ip'], '/query/device-info')
                    if code == 200:
                        name = (extract_xml_tag(xml, 'user-device-name') or
                                extract_xml_tag(xml, 'friendly-device-name') or
                                extract_xml_tag(xml, 'default-device-name') or 'Roku TV')
                        model = extract_xml_tag(xml, 'model-name') or 'Roku'
                        is_tv = extract_xml_tag(xml, 'is-tv').lower() == 'true'
                        power_mode = extract_xml_tag(xml, 'power-mode')
                        version = extract_xml_tag(xml, 'software-version')
                        dev.update({
                            "name": name,
                            "model": model,
                            "isTv": is_tv,
                            "powerMode": power_mode,
                            "softwareVersion": version
                        })
                except Exception:
                    pass
                enriched.append(dev)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "count": len(enriched), "devices": enriched}).encode('utf-8'))
            return

        if path == '/api/proxy/roku/device-info':
            ip = query.get('ip', [None])[0]
            if not ip:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "Falta parámetro ip"}).encode('utf-8'))
                return

            try:
                code, xml = roku_http_request(ip, '/query/device-info')
                info = {
                    "name": (extract_xml_tag(xml, 'user-device-name') or
                             extract_xml_tag(xml, 'friendly-device-name') or
                             extract_xml_tag(xml, 'default-device-name') or 'Roku TV'),
                    "model": extract_xml_tag(xml, 'model-name') or 'Roku',
                    "modelNumber": extract_xml_tag(xml, 'model-number'),
                    "softwareVersion": extract_xml_tag(xml, 'software-version'),
                    "isTv": extract_xml_tag(xml, 'is-tv').lower() == 'true',
                    "isStick": extract_xml_tag(xml, 'is-stick').lower() == 'true',
                    "powerMode": extract_xml_tag(xml, 'power-mode'),
                    "supportsFindRemote": extract_xml_tag(xml, 'supports-find-remote').lower() == 'true',
                    "rawXml": xml
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "deviceInfo": info}).encode('utf-8'))
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return

        if path == '/api/proxy/roku/apps':
            ip = query.get('ip', [None])[0]
            try:
                code, xml = roku_http_request(ip, '/query/apps')
                apps = [{"id": m.group(1), "name": m.group(2)}
                        for m in re.finditer(r'<app id="([^"]+)"[^>]*>([^<]+)</app>', xml)]
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "apps": apps}).encode('utf-8'))
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))
            return

        # Serve static PWA
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ['/api/proxy/roku/command', '/api/devices/roku/command']:
            length = int(self.headers.get('Content-Length', 0))
            raw = self.rfile.read(length).decode('utf-8')
            try:
                payload = json.loads(raw or '{}')
                ip = payload.get('ip')
                command = payload.get('command')
                cmd_type = payload.get('type', 'keypress')

                if not ip or not command:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Parámetros incompletos"}).encode('utf-8'))
                    return

                endpoint = f"/launch/{command}" if cmd_type == 'launch' else f"/{cmd_type}/{command}"
                code, _ = roku_http_request(ip, endpoint, method="POST", data=b"")
                
                self.send_response(code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": 200 <= code < 300,
                    "statusCode": code,
                    "command": command
                }).encode('utf-8'))
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": f"Roku HTTP {e.code}"}).encode('utf-8'))
            except Exception as err:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(err)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('0.0.0.0', PORT), BridgeHandler) as httpd:
        print('====================================================')
        print(f'  RemoteOne Local Bridge (Python) activo en puerto {PORT}')
        print(f'  URL local:   http://localhost:{PORT}')
        print(f'  Para móvil:  http://<IP-DE-ESTE-PC>:{PORT}')
        print('====================================================')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nDeteniendo bridge...')
