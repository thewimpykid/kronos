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
  // More games
  'r5apex':               { name: 'Apex Legends',      emoji: '🎮' },
  dota2:                  { name: 'Dota 2',             emoji: '🎮' },
  'tf_win64':             { name: 'Team Fortress 2',    emoji: '🎮' },
  'worldofwarcraft':      { name: 'World of Warcraft',  emoji: '🎮' },
  hearthstone:            { name: 'Hearthstone',        emoji: '🎮' },
  overwatch:              { name: 'Overwatch',           emoji: '🎮' },
  'overwatch2':           { name: 'Overwatch 2',         emoji: '🎮' },
  'battlenet':            { name: 'Battle.net',          emoji: '🎮' },
  'robloxplayerbeta':     { name: 'Roblox',              emoji: '🎮' },
  'robloxplayer':         { name: 'Roblox',              emoji: '🎮' },
  'minecraftlauncher':    { name: 'Minecraft',           emoji: '🎮' },
  minecraft:              { name: 'Minecraft',           emoji: '🎮' },
  'javaw':                { name: 'Minecraft (Java)',    emoji: '🎮' },
  'gtav':                 { name: 'GTA V',               emoji: '🎮' },
  'fivem':                { name: 'FiveM',               emoji: '🎮' },
  'eldenring':            { name: 'Elden Ring',          emoji: '🎮' },
  'destiny2':             { name: 'Destiny 2',           emoji: '🎮' },
  'cod':                  { name: 'Call of Duty',        emoji: '🎮' },
  'modernwarfare':        { name: 'Call of Duty',        emoji: '🎮' },
  'warzone':              { name: 'Warzone',             emoji: '🎮' },
  'fortnite':             { name: 'Fortnite',            emoji: '🎮' },
  'rocketleague':         { name: 'Rocket League',       emoji: '🎮' },
  // Windows system processes
  lockapp:                { name: 'Lock Screen',         emoji: '🔒' },
  searchhost:             { name: 'Windows Search',      emoji: '🔍' },
  searchapp:              { name: 'Windows Search',      emoji: '🔍' },
  startmenuexperiencehost:{ name: 'Start Menu',          emoji: '🪟' },
  shellexperiencehost:    { name: 'Windows Shell',       emoji: '🪟' },
  applicationframehost:   { name: 'App Host',            emoji: '🪟' },
  systemsettings:         { name: 'Windows Settings',   emoji: '⚙️' },
  'ms-settings':          { name: 'Windows Settings',   emoji: '⚙️' },
  textinputhost:          { name: 'Text Input',          emoji: '⌨️' },
  runtimebroker:          { name: 'Windows Runtime',    emoji: '⚙️' },
  gamebar:                { name: 'Xbox Game Bar',       emoji: '🎮' },
  gamebarpresencewriter:  { name: 'Xbox Game Bar',       emoji: '🎮' },
  'xbox':                 { name: 'Xbox',                emoji: '🎮' },
  'xboxapp':              { name: 'Xbox',                emoji: '🎮' },
  phonelink:              { name: 'Phone Link',          emoji: '📱' },
  yourphone:              { name: 'Phone Link',          emoji: '📱' },
  'winstore.app':         { name: 'Microsoft Store',     emoji: '🛍️' },
  calculator:             { name: 'Calculator',          emoji: '🔢' },
  mspaint:                { name: 'Paint',               emoji: '🎨' },
  snippingtool:           { name: 'Snipping Tool',       emoji: '✂️' },
  screenclip:             { name: 'Snipping Tool',       emoji: '✂️' },
  'screensketch':         { name: 'Snipping Tool',       emoji: '✂️' },
  // Utilities
  taskmgr:                { name: 'Task Manager',        emoji: '⚙️' },
  regedit:                { name: 'Registry Editor',     emoji: '⚙️' },
  mmc:                    { name: 'Management Console',  emoji: '⚙️' },
  electron:               { name: 'Kronos',              emoji: '⏱' },
  // More dev tools
  'sublime_text':         { name: 'Sublime Text',        emoji: '💻' },
  'sublime_text_4':       { name: 'Sublime Text',        emoji: '💻' },
  nvim:                   { name: 'Neovim',              emoji: '💻' },
  vim:                    { name: 'Vim',                 emoji: '💻' },
  postman:                { name: 'Postman',             emoji: '🔧' },
  insomnia:               { name: 'Insomnia',            emoji: '🔧' },
  'docker desktop':       { name: 'Docker',              emoji: '🐳' },
  gitkraken:              { name: 'GitKraken',           emoji: '🐙' },
  fork:                   { name: 'Fork',                emoji: '🔀' },
  sourcetree:             { name: 'Sourcetree',          emoji: '🔀' },
  // Media & creative
  'obs64':                { name: 'OBS Studio',          emoji: '🎬' },
  'obs32':                { name: 'OBS Studio',          emoji: '🎬' },
  audacity:               { name: 'Audacity',            emoji: '🎵' },
  'gimp-2.10':            { name: 'GIMP',                emoji: '🎨' },
  gimp:                   { name: 'GIMP',                emoji: '🎨' },
  inkscape:               { name: 'Inkscape',            emoji: '🎨' },
  // Other common apps
  acrobat:                { name: 'Adobe Acrobat',       emoji: '📄' },
  acrord32:               { name: 'Adobe Acrobat',       emoji: '📄' },
  winrar:                 { name: 'WinRAR',              emoji: '📦' },
  '7zfm':                 { name: '7-Zip',               emoji: '📦' },
  itunes:                 { name: 'iTunes',              emoji: '🎵' },
  'music.ui':             { name: 'Apple Music',         emoji: '🎵' },
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
