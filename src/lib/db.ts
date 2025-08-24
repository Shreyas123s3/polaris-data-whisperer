// Database connection for server-side operations
// Note: This will be used in a Node.js environment, not in the browser

import { Pool } from 'pg'

let pgPool: Pool | null = null

export function getDbPool(): Pool {
  if (!pgPool) {
    const dbUrl = process.env.SUPABASE_DB_URL
    
    if (!dbUrl) {
      throw new Error('Missing SUPABASE_DB_URL environment variable')
    }

    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  return pgPool
}

export function closeDbPool(): void {
  if (pgPool) {
    pgPool.end()
    pgPool = null
  }
}
