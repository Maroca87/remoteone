/**
 * RemoteOne - RokuCommands
 * Official Roku External Control Protocol (ECP) Command Specifications.
 * Based purely on official Roku ECP documentation (Port 8060).
 */

export const ROKU_COMMANDS = {
  // Navigation & Playback (Supported on all Roku players & Roku TVs)
  Home: { key: 'Home', name: 'Home', tvOnly: false, category: 'nav', icon: 'house' },
  Rev: { key: 'Rev', name: 'Rebobinar', tvOnly: false, category: 'media', icon: 'rewind' },
  Fwd: { key: 'Fwd', name: 'Avanzar', tvOnly: false, category: 'media', icon: 'fast-forward' },
  Play: { key: 'Play', name: 'Play / Pausa', tvOnly: false, category: 'media', icon: 'play' },
  Select: { key: 'Select', name: 'OK / Select', tvOnly: false, category: 'nav', icon: 'check-circle' },
  Left: { key: 'Left', name: 'Izquierda', tvOnly: false, category: 'nav', icon: 'arrow-left' },
  Right: { key: 'Right', name: 'Derecha', tvOnly: false, category: 'nav', icon: 'arrow-right' },
  Down: { key: 'Down', name: 'Abajo', tvOnly: false, category: 'nav', icon: 'arrow-down' },
  Up: { key: 'Up', name: 'Arriba', tvOnly: false, category: 'nav', icon: 'arrow-up' },
  Back: { key: 'Back', name: 'Atrás', tvOnly: false, category: 'nav', icon: 'arrow-return-left' },
  InstantReplay: { key: 'InstantReplay', name: 'Repetición', tvOnly: false, category: 'media', icon: 'arrow-counterclockwise' },
  Info: { key: 'Info', name: 'Opciones (*)', tvOnly: false, category: 'nav', icon: 'asterisk' },
  Backspace: { key: 'Backspace', name: 'Borrar', tvOnly: false, category: 'input', icon: 'backspace' },
  Search: { key: 'Search', name: 'Buscar', tvOnly: false, category: 'nav', icon: 'search' },
  Enter: { key: 'Enter', name: 'Enter', tvOnly: false, category: 'input', icon: 'arrow-down-left' },

  // Roku TV Only (Requires a physical Roku TV or device reporting is-tv="true")
  VolumeUp: { key: 'VolumeUp', name: 'Volumen +', tvOnly: true, category: 'audio', icon: 'volume-up' },
  VolumeDown: { key: 'VolumeDown', name: 'Volumen −', tvOnly: true, category: 'audio', icon: 'volume-down' },
  VolumeMute: { key: 'VolumeMute', name: 'Silencio', tvOnly: true, category: 'audio', icon: 'volume-mute' },
  PowerOff: { key: 'PowerOff', name: 'Apagar', tvOnly: true, category: 'power', icon: 'power' },
  PowerOn: { key: 'PowerOn', name: 'Encender', tvOnly: true, category: 'power', icon: 'power' },
  ChannelUp: { key: 'ChannelUp', name: 'Canal +', tvOnly: true, category: 'tuner', icon: 'chevron-up' },
  ChannelDown: { key: 'ChannelDown', name: 'Canal −', tvOnly: true, category: 'tuner', icon: 'chevron-down' },
  InputTuner: { key: 'InputTuner', name: 'TV Antena', tvOnly: true, category: 'input_src', icon: 'broadcast' },
  InputHDMI1: { key: 'InputHDMI1', name: 'HDMI 1', tvOnly: true, category: 'input_src', icon: 'display' },
  InputHDMI2: { key: 'InputHDMI2', name: 'HDMI 2', tvOnly: true, category: 'input_src', icon: 'display' },
  InputHDMI3: { key: 'InputHDMI3', name: 'HDMI 3', tvOnly: true, category: 'input_src', icon: 'display' },
  InputHDMI4: { key: 'InputHDMI4', name: 'HDMI 4', tvOnly: true, category: 'input_src', icon: 'display' },
  InputAV1: { key: 'InputAV1', name: 'AV', tvOnly: true, category: 'input_src', icon: 'display' }
};

/**
 * Known official Roku App IDs (obtained via /query/apps on standard Roku devices)
 */
export const ROKU_DEFAULT_APPS = [
  { id: '12', name: 'Netflix' },
  { id: '837', name: 'YouTube' },
  { id: '13', name: 'Prime Video' },
  { id: '291097', name: 'Disney+' },
  { id: '61322', name: 'Max (HBO)' },
  { id: '551012', name: 'Apple TV' },
  { id: '151908', name: 'Spotify' },
  { id: '2285', name: 'Hulu' },
  { id: '14', name: 'The Roku Channel' }
];

/**
 * Returns initial verification matrix for Roku commands.
 */
export function getInitialRokuMatrix() {
  const matrix = [];
  for (const [key, cmd] of Object.entries(ROKU_COMMANDS)) {
    matrix.push({
      command: key,
      name: cmd.name,
      tvOnly: cmd.tvOnly,
      implemented: true, // Implemented in our RokuDriver
      tested: false      // Must be validated by real device test
    });
  }
  return matrix;
}
