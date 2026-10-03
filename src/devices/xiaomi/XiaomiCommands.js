/**
 * RemoteOne - XiaomiCommands
 * Command specifications and Android TV keycodes for Xiaomi Smart TVs.
 * 
 * IMPORTANT: Xiaomi TVs run either Android TV / Google TV or PatchWall.
 * Real control requires Android TV Remote Protocol v2 (mTLS on ports 6466/6467)
 * with protobuf messages and cryptographic PIN pairing.
 * None of these commands will be faked.
 */

export const XIAOMI_PROTOCOLS = {
  ANDROID_TV_V2: {
    name: 'Android TV Remote Control Protocol v2',
    portTls: 6466,
    portControl: 6467,
    authRequired: true,
    authType: 'mTLS Client Certificate + PIN Pairing',
    encoding: 'Protocol Buffers (Google Protobuf)',
    browserPwaSupported: false, // Cannot do raw mTLS TCP sockets in web browser
    bridgeRequired: true,
    status: 'Pendiente de implementación de servicio mTLS en Bridge'
  },
  PATCHWALL_LEGACY: {
    name: 'Xiaomi PatchWall HTTP/UDP (Modelos China)',
    portHttp: 6095,
    portUdp: 6096,
    authRequired: true,
    authType: 'Token / Sign',
    browserPwaSupported: false,
    bridgeRequired: true,
    status: 'No oficial / No disponible en modelos globales'
  }
};

export const XIAOMI_ANDROID_KEYCODES = {
  Home: { code: 3, name: 'Home (KEYCODE_HOME)', implemented: false, validated: false },
  Back: { code: 4, name: 'Back (KEYCODE_BACK)', implemented: false, validated: false },
  DpadUp: { code: 19, name: 'Arriba (KEYCODE_DPAD_UP)', implemented: false, validated: false },
  DpadDown: { code: 20, name: 'Abajo (KEYCODE_DPAD_DOWN)', implemented: false, validated: false },
  DpadLeft: { code: 21, name: 'Izquierda (KEYCODE_DPAD_LEFT)', implemented: false, validated: false },
  DpadRight: { code: 22, name: 'Derecha (KEYCODE_DPAD_RIGHT)', implemented: false, validated: false },
  DpadCenter: { code: 23, name: 'Select/OK (KEYCODE_DPAD_CENTER)', implemented: false, validated: false },
  VolumeUp: { code: 24, name: 'Volumen + (KEYCODE_VOLUME_UP)', implemented: false, validated: false },
  VolumeDown: { code: 25, name: 'Volumen − (KEYCODE_VOLUME_DOWN)', implemented: false, validated: false },
  VolumeMute: { code: 164, name: 'Silencio (KEYCODE_VOLUME_MUTE)', implemented: false, validated: false },
  Power: { code: 26, name: 'Encendido (KEYCODE_POWER)', implemented: false, validated: false }
};
