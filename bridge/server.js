/**
 * RemoteOne - Local Network Bridge (Node.js)
 * 
 * Provides:
 * 1. Native UDP Multicast SSDP M-SEARCH discovery for Roku ECP (239.255.255.250:1900)
 * 2. HTTP Relay for Roku ECP commands with full CORS support (bypassing browser PNA/CORS blocks)
 * 3. Static HTTP server to serve the RemoteOne PWA directly on the local network (http://<your-ip>:3000)
 * 4. Strict local-only security guard: refuses connections or proxying to public internet IPs.
 */

const http = require('http');
const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PWA_ROOT = path.resolve(__dirname, '..');

// Helper to check if an IP is private LAN
function isPrivateIp(ip) {
  if (!ip) return false;
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('127.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
}

// Minimal XML element extractor for device-info
function extractXmlTags(xml, tags) {
  const result = {};
  tags.forEach((tag) => {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    result[tag] = match ? match[1].trim() : '';
  });
  return result;
}

// Real SSDP M-SEARCH via UDP Multicast
function performSsdpDiscovery(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const discovered = new Map();
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    const message = Buffer.from(
      'M-SEARCH * HTTP/1.1\r\n' +
      'HOST: 239.255.255.250:1900\r\n' +
      'MAN: "ssdp:discover"\r\n' +
      'MX: 3\r\n' +
      'ST: roku:ecp\r\n\r\n'
    );

    socket.on('message', (msg, rinfo) => {
      const response = msg.toString();
      if (response.includes('roku:ecp') || response.includes(':8060')) {
        const ip = rinfo.address;
        if (!discovered.has(ip)) {
          // Extract Location header if present
          const locMatch = response.match(/location:\s*(http:\/\/[^\r\n]+)/i);
          const location = locMatch ? locMatch[1].trim() : `http://${ip}:8060/`;
          discovered.set(ip, {
            ip,
            port: 8060,
            location,
            brand: 'roku'
          });
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[SSDP] Socket error:', err.message);
      try { socket.close(); } catch (e) {}
      resolve(Array.from(discovered.values()));
    });

    try {
      socket.bind(() => {
        socket.send(message, 0, message.length, 1900, '239.255.255.250', (err) => {
          if (err) {
            console.error('[SSDP] Send error:', err.message);
          }
        });
      });
    } catch (e) {
      resolve([]);
      return;
    }

    setTimeout(() => {
      try { socket.close(); } catch (e) {}
      resolve(Array.from(discovered.values()));
    }, timeoutMs);
  });
}

// HTTP request helper to local Roku
function rokuHttpRequest(targetIp, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    if (!isPrivateIp(targetIp)) {
      return reject(new Error('Seguridad: El bridge solo permite comunicarse con direcciones IP privadas locales.'));
    }

    const options = {
      hostname: targetIp,
      port: 8060,
      path: path,
      method: method,
      timeout: 4000
    };

    if (body) {
      options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      };
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout al conectar con ${targetIp}:8060`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) req.write(body);
    req.end();
  });
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers for PWA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // --- API: Status ---
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      version: '1.0.0',
      service: 'RemoteOne Local Bridge',
      time: new Date().toISOString()
    }));
    return;
  }

  // --- API: SSDP Discover ---
  if (pathname === '/api/discover') {
    try {
      const timeout = parseInt(parsedUrl.query.timeout, 10) || 3000;
      const rawDevices = await performSsdpDiscovery(timeout);
      
      // Enrich with device-info
      const enriched = await Promise.all(
        rawDevices.map(async (dev) => {
          try {
            const infoRes = await rokuHttpRequest(dev.ip, '/query/device-info');
            if (infoRes.statusCode === 200) {
              const tags = extractXmlTags(infoRes.body, [
                'user-device-name', 'friendly-device-name', 'default-device-name',
                'model-name', 'model-number', 'software-version', 'is-tv', 'power-mode', 'udn'
              ]);
              return {
                ...dev,
                name: tags['user-device-name'] || tags['friendly-device-name'] || tags['default-device-name'] || 'Roku TV',
                model: tags['model-name'] || 'Roku',
                modelNumber: tags['model-number'],
                softwareVersion: tags['software-version'],
                isTv: (tags['is-tv'] || '').toLowerCase() === 'true',
                powerMode: tags['power-mode'],
                udn: tags['udn']
              };
            }
          } catch (e) {
            // Keep basic entry if device-info fails
          }
          return dev;
        })
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: enriched.length, devices: enriched }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // --- API: Roku Device Info ---
  if (pathname === '/api/proxy/roku/device-info') {
    const targetIp = parsedUrl.query.ip;
    if (!targetIp) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Parámetro IP requerido' }));
      return;
    }

    try {
      const response = await rokuHttpRequest(targetIp, '/query/device-info');
      const tags = extractXmlTags(response.body, [
        'user-device-name', 'friendly-device-name', 'default-device-name',
        'model-name', 'model-number', 'software-version', 'is-tv', 'is-stick',
        'power-mode', 'supports-find-remote', 'wifi-mac', 'ethernet-mac', 'udn'
      ]);

      const deviceInfo = {
        name: tags['user-device-name'] || tags['friendly-device-name'] || tags['default-device-name'] || 'Roku TV',
        model: tags['model-name'] || 'Roku',
        modelNumber: tags['model-number'],
        softwareVersion: tags['software-version'],
        isTv: (tags['is-tv'] || '').toLowerCase() === 'true',
        isStick: (tags['is-stick'] || '').toLowerCase() === 'true',
        powerMode: tags['power-mode'],
        supportsFindRemote: (tags['supports-find-remote'] || '').toLowerCase() === 'true',
        udn: tags['udn'],
        rawXml: response.body
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deviceInfo }));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // --- API: Roku Apps List ---
  if (pathname === '/api/proxy/roku/apps') {
    const targetIp = parsedUrl.query.ip;
    try {
      const response = await rokuHttpRequest(targetIp, '/query/apps');
      const appMatches = [...response.body.matchAll(/<app id="([^"]+)"[^>]*>([^<]+)<\/app>/g)];
      const apps = appMatches.map((m) => ({ id: m[1], name: m[2] }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, apps }));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // --- API: Roku Command (Keypress, Keydown, Keyup, Launch) ---
  if (pathname === '/api/proxy/roku/command' || pathname === '/api/devices/roku/command') {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Método no permitido. Use POST.' }));
      return;
    }

    let rawBody = '';
    req.on('data', (chunk) => { rawBody += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(rawBody || '{}');
        const { ip, command, type = 'keypress' } = payload;

        if (!ip || !command) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Faltan parámetros obligatorios (ip, command)' }));
          return;
        }

        const endpoint = type === 'launch' ? `/launch/${command}` : `/${type}/${command}`;
        const rokuRes = await rokuHttpRequest(ip, endpoint, 'POST');

        res.writeHead(rokuRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: rokuRes.statusCode >= 200 && rokuRes.statusCode < 300,
          statusCode: rokuRes.statusCode,
          command,
          type
        }));
      } catch (err) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // --- Static File Server for PWA ---
  let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const filePath = path.join(PWA_ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found - RemoteOne PWA');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`  RemoteOne Local Bridge activo en el puerto ${PORT}`);
  console.log(`  URL local:   http://localhost:${PORT}`);
  console.log(`  Para móvil:  http://<IP-DE-ESTE-PC>:${PORT}`);
  console.log('====================================================');
});
