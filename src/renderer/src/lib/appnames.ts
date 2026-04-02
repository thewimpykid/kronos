// Maps process names (lowercase, no .exe) to { name, emoji }
const MAP: Record<string, { name: string; emoji: string }> = {
  // Browsers
  chrome:          { name: 'Google Chrome',     emoji: '🌐' },
  msedge:          { name: 'Microsoft Edge',    emoji: '🌐' },
  firefox:         { name: 'Firefox',           emoji: '🦊' },
  brave:           { name: 'Brave',             emoji: '🦁' },
  opera:           { name: 'Opera',             emoji: '🌐' },
  vivaldi:         { name: 'Vivaldi',           emoji: '🌐' },
  arc:             { name: 'Arc',               emoji: '🌐' },
  // Communication
  discord:         { name: 'Discord',           emoji: '💬' },
  slack:           { name: 'Slack',             emoji: '💬' },
  teams:           { name: 'Microsoft Teams',   emoji: '💬' },
  zoom:            { name: 'Zoom',              emoji: '📹' },
  telegram:        { name: 'Telegram',          emoji: '💬' },
  whatsapp:        { name: 'WhatsApp',          emoji: '💬' },
  signal:          { name: 'Signal',            emoji: '💬' },
  // Dev tools
  code:            { name: 'VS Code',           emoji: '💻' },
  cursor:          { name: 'Cursor',            emoji: '💻' },
  'windowsterminal': { name: 'Terminal',        emoji: '⚡' },
  powershell:      { name: 'PowerShell',        emoji: '⚡' },
  cmd:             { name: 'Command Prompt',    emoji: '⚡' },
  devenv:          { name: 'Visual Studio',     emoji: '💻' },
  'idea64':        { name: 'IntelliJ IDEA',     emoji: '💻' },
  'pycharm64':     { name: 'PyCharm',           emoji: '🐍' },
  'webstorm64':    { name: 'WebStorm',          emoji: '💻' },
  'datagrip64':    { name: 'DataGrip',          emoji: '🗄️' },
  'rider64':       { name: 'Rider',             emoji: '💻' },
  'clion64':       { name: 'CLion',             emoji: '💻' },
  // Productivity
  explorer:        { name: 'File Explorer',     emoji: '📁' },
  notepad:         { name: 'Notepad',           emoji: '📝' },
  'notepad++':     { name: 'Notepad++',         emoji: '📝' },
  winword:         { name: 'Microsoft Word',    emoji: '📄' },
  excel:           { name: 'Microsoft Excel',   emoji: '📊' },
  powerpnt:        { name: 'PowerPoint',        emoji: '📊' },
  onenote:         { name: 'OneNote',           emoji: '📓' },
  outlook:         { name: 'Outlook',           emoji: '📧' },
  thunderbird:     { name: 'Thunderbird',       emoji: '📧' },
  notion:          { name: 'Notion',            emoji: '📓' },
  obsidian:        { name: 'Obsidian',          emoji: '📓' },
  // Creative
  'photoshop':     { name: 'Photoshop',         emoji: '🎨' },
  'illustrator':   { name: 'Illustrator',       emoji: '🎨' },
  figma:           { name: 'Figma',             emoji: '🎨' },
  'premiere pro':  { name: 'Premiere Pro',      emoji: '🎬' },
  'after effects': { name: 'After Effects',     emoji: '🎬' },
  'blender':       { name: 'Blender',           emoji: '🎨' },
  // Media
  spotify:         { name: 'Spotify',           emoji: '🎵' },
  vlc:             { name: 'VLC',               emoji: '🎬' },
  'movies & tv':   { name: 'Movies & TV',       emoji: '🎬' },
  // Gaming
  steam:           { name: 'Steam',             emoji: '🎮' },
  epicgameslauncher: { name: 'Epic Games',      emoji: '🎮' },
  leagueclient:    { name: 'League of Legends', emoji: '🎮' },
  'valorant-win64-shipping': { name: 'Valorant',emoji: '🎮' },
  riotclientservices: { name: 'Riot Client',    emoji: '🎮' },
  'cs2':           { name: 'CS2',               emoji: '🎮' },
  'csgo':          { name: 'CS:GO',             emoji: '🎮' },
  genshinimpact:   { name: 'Genshin Impact',    emoji: '🎮' },
  // Utilities
  taskmgr:         { name: 'Task Manager',      emoji: '⚙️' },
  regedit:         { name: 'Registry Editor',   emoji: '⚙️' },
  mmc:             { name: 'Management Console',emoji: '⚙️' },
  electron:        { name: 'Kronos',            emoji: '⏱' },
}

export interface AppInfo {
  name: string
  emoji: string
  processName: string  // original
}

export function resolveApp(processName: string): AppInfo {
  // Normalize: lowercase, strip .exe
  const key = processName.toLowerCase().replace(/\.exe$/i, '')
  const found = MAP[key]
  if (found) return { ...found, processName }

  // Fallback: title-case the key, strip .exe
  const friendly = key
    .split(/[-_\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return { name: friendly, emoji: '🖥️', processName }
}
