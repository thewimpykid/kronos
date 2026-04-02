import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'kronos.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    migrate(db)
    closeOrphanedSessions(db)
  }
  return db
}

// Close any sessions left open from a previous run (crash / hot-reload / forced quit).
// We don't know when they ended, so give them 0 duration to avoid polluting stats.
function closeOrphanedSessions(db: Database.Database) {
  db.prepare(`UPDATE app_sessions SET end_time = start_time, duration_ms = 0 WHERE end_time IS NULL`).run()
  db.prepare(`UPDATE web_sessions SET end_time = start_time, duration_ms = 0 WHERE end_time IS NULL`).run()
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      process_name TEXT NOT NULL,
      window_title TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS web_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      title TEXT,
      browser TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target TEXT NOT NULL UNIQUE,
      target_type TEXT NOT NULL,
      daily_limit_ms INTEGER NOT NULL,
      enabled INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_app_start ON app_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_web_start ON web_sessions(start_time);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS focus_sessions_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      blocked_apps TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logged_at INTEGER NOT NULL
    );
  `)
}

// ── App sessions ─────────────────────────────────────────────

export function openAppSession(processName: string, windowTitle: string): number {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO app_sessions (process_name, window_title, start_time)
       VALUES (?, ?, ?)`
    )
    .run(processName, windowTitle, Date.now())
  return info.lastInsertRowid as number
}

export function closeAppSession(id: number) {
  const db = getDb()
  const row = db.prepare(`SELECT start_time FROM app_sessions WHERE id = ?`).get(id) as
    | { start_time: number }
    | undefined
  if (!row) return
  const now = Date.now()
  db.prepare(
    `UPDATE app_sessions SET end_time = ?, duration_ms = ? WHERE id = ?`
  ).run(now, now - row.start_time, id)
}

// ── Web sessions ─────────────────────────────────────────────

export function openWebSession(
  url: string,
  domain: string,
  title: string,
  browser: string
): number {
  const db = getDb()
  const info = db
    .prepare(
      `INSERT INTO web_sessions (url, domain, title, browser, start_time)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(url, domain, title, browser, Date.now())
  return info.lastInsertRowid as number
}

export function closeWebSession(id: number) {
  const db = getDb()
  const row = db.prepare(`SELECT start_time FROM web_sessions WHERE id = ?`).get(id) as
    | { start_time: number }
    | undefined
  if (!row) return
  const now = Date.now()
  db.prepare(
    `UPDATE web_sessions SET end_time = ?, duration_ms = ? WHERE id = ?`
  ).run(now, now - row.start_time, id)
}

// ── Stats queries ─────────────────────────────────────────────

export interface AppStat {
  process_name: string
  total_ms: number
}

export interface WebStat {
  domain: string
  total_ms: number
}

export function getAppStatsForRange(startMs: number, endMs: number): AppStat[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT process_name,
              SUM(COALESCE(duration_ms, ? - start_time)) AS total_ms
       FROM app_sessions
       WHERE start_time >= ? AND start_time < ?
       GROUP BY process_name
       ORDER BY total_ms DESC`
    )
    .all(Date.now(), startMs, endMs) as AppStat[]
}

export function getWebStatsForRange(startMs: number, endMs: number): WebStat[] {
  const db = getDb()
  return db
    .prepare(
      `SELECT domain,
              SUM(COALESCE(duration_ms, ? - start_time)) AS total_ms
       FROM web_sessions
       WHERE start_time >= ? AND start_time < ?
       GROUP BY domain
       ORDER BY total_ms DESC`
    )
    .all(Date.now(), startMs, endMs) as WebStat[]
}

export interface HourBucket {
  hour: number
  total_ms: number
}

export function getAppHourlyToday(): HourBucket[] {
  const db = getDb()
  const dayStart = todayStart()
  return db
    .prepare(
      `SELECT CAST((start_time - ?) / 3600000 AS INTEGER) AS hour,
              SUM(COALESCE(duration_ms, ? - start_time)) AS total_ms
       FROM app_sessions
       WHERE start_time >= ?
       GROUP BY hour
       ORDER BY hour`
    )
    .all(dayStart, Date.now(), dayStart) as HourBucket[]
}

// ── Limits ────────────────────────────────────────────────────

export interface Limit {
  id: number
  target: string
  target_type: string
  daily_limit_ms: number
  enabled: number
}

export function getLimits(): Limit[] {
  return getDb().prepare(`SELECT * FROM limits`).all() as Limit[]
}

export function upsertLimit(target: string, targetType: string, dailyLimitMs: number) {
  getDb()
    .prepare(
      `INSERT INTO limits (target, target_type, daily_limit_ms)
       VALUES (?, ?, ?)
       ON CONFLICT(target) DO UPDATE SET daily_limit_ms = excluded.daily_limit_ms, enabled = 1`
    )
    .run(target, targetType, dailyLimitMs)
}

export function deleteLimit(id: number) {
  getDb().prepare(`DELETE FROM limits WHERE id = ?`).run(id)
}

export function getTodayTotalFor(target: string, targetType: string): number {
  const db = getDb()
  const start = todayStart()
  const now = Date.now()
  if (targetType === 'app') {
    const row = db
      .prepare(
        `SELECT SUM(COALESCE(duration_ms, ? - start_time)) AS total
         FROM app_sessions WHERE process_name = ? AND start_time >= ?`
      )
      .get(now, target, start) as { total: number | null }
    return row.total ?? 0
  } else {
    const row = db
      .prepare(
        `SELECT SUM(COALESCE(duration_ms, ? - start_time)) AS total
         FROM web_sessions WHERE domain = ? AND start_time >= ?`
      )
      .get(now, target, start) as { total: number | null }
    return row.total ?? 0
  }
}

export function todayStart(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ── Settings ──────────────────────────────────────────────────

export function getSetting(key: string, fallback: string): string {
  const row = getDb()
    .prepare(`SELECT value FROM settings WHERE key = ?`)
    .get(key) as { value: string } | undefined
  return row ? row.value : fallback
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value)
}

// ── Tracked today (for quick-add in limits) ───────────────────

export interface TrackedToday {
  process_name: string
  total_ms: number
}

export function getTrackedAppsToday(): TrackedToday[] {
  const db = getDb()
  const start = todayStart()
  const now = Date.now()
  return db
    .prepare(
      `SELECT process_name,
              SUM(COALESCE(duration_ms, ? - start_time)) AS total_ms
       FROM app_sessions
       WHERE start_time >= ?
       GROUP BY process_name
       ORDER BY total_ms DESC`
    )
    .all(now, start) as TrackedToday[]
}

export function getTrackedSitesToday(): { domain: string; total_ms: number }[] {
  const db = getDb()
  const start = todayStart()
  const now = Date.now()
  return db
    .prepare(
      `SELECT domain,
              SUM(COALESCE(duration_ms, ? - start_time)) AS total_ms
       FROM web_sessions
       WHERE start_time >= ?
       GROUP BY domain
       ORDER BY total_ms DESC`
    )
    .all(now, start) as { domain: string; total_ms: number }[]
}

// ── Focus session log ─────────────────────────────────────────

export function logFocusSession(
  label: string,
  startTime: number,
  endTime: number,
  blockedApps: string[]
): void {
  getDb()
    .prepare(
      `INSERT INTO focus_sessions_log (label, start_time, end_time, duration_ms, blocked_apps)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(label, startTime, endTime, endTime - startTime, JSON.stringify(blockedApps))
}

// ── Water log ─────────────────────────────────────────────────

export function logGlass(): void {
  getDb().prepare(`INSERT INTO water_log (logged_at) VALUES (?)`).run(Date.now())
}

export function getTodayGlasses(): number[] {
  const db = getDb()
  const start = todayStart()
  const rows = db
    .prepare(`SELECT logged_at FROM water_log WHERE logged_at >= ? ORDER BY logged_at`)
    .all(start) as { logged_at: number }[]
  return rows.map((r) => r.logged_at)
}
