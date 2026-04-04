import Database from 'better-sqlite3'
import type { LocalConfig, LocalConfigInput } from '../src/types/config.js'

interface DbRow {
  api_key: string
  api_endpoint: string
  aws_region: string
  updated_at: string
}

let db: Database.Database | null = null

function validateInput(config: LocalConfigInput): void {
  if (!config.apiKey.trim()) {
    throw new Error('API Key obligatoria.')
  }

  if (!config.awsRegion.trim()) {
    throw new Error('Region AWS obligatoria.')
  }

  let endpoint: URL

  try {
    endpoint = new URL(config.apiEndpoint)
  } catch {
    throw new Error('Endpoint no valido.')
  }

  if (endpoint.protocol !== 'https:') {
    throw new Error('Solo se permite HTTPS en el endpoint.')
  }
}

function requireDb(): Database.Database {
  if (!db) {
    throw new Error('Base de datos local no inicializada.')
  }

  return db
}

export function initializeLocalDb(dbPath: string): void {
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.prepare(
    `
      CREATE TABLE IF NOT EXISTS local_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        api_key TEXT NOT NULL,
        api_endpoint TEXT NOT NULL,
        aws_region TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `,
  ).run()
}

export function getLocalConfig(): LocalConfig | null {
  const row = requireDb()
    .prepare(
      `
        SELECT api_key, api_endpoint, aws_region, updated_at
        FROM local_config
        WHERE id = 1
      `,
    )
    .get() as DbRow | undefined

  if (!row) {
    return null
  }

  return {
    apiKey: row.api_key,
    apiEndpoint: row.api_endpoint,
    awsRegion: row.aws_region,
    updatedAt: row.updated_at,
  }
}

export function saveLocalConfig(config: LocalConfigInput): LocalConfig {
  validateInput(config)

  requireDb()
    .prepare(
      `
        INSERT INTO local_config (id, api_key, api_endpoint, aws_region, updated_at)
        VALUES (1, @apiKey, @apiEndpoint, @awsRegion, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          api_key = excluded.api_key,
          api_endpoint = excluded.api_endpoint,
          aws_region = excluded.aws_region,
          updated_at = datetime('now')
      `,
    )
    .run({
      apiKey: config.apiKey.trim(),
      apiEndpoint: config.apiEndpoint.trim(),
      awsRegion: config.awsRegion.trim(),
    })

  const saved = getLocalConfig()

  if (!saved) {
    throw new Error('No se pudo guardar la configuracion local.')
  }

  return saved
}
