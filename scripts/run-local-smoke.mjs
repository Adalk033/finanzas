import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const electronPath = require('electron')
const projectRoot = path.resolve(import.meta.dirname, '..')
const outputPath = path.join(projectRoot, '.local-smoke.mjs')

try {
  await build({
    entryPoints: [path.join(projectRoot, 'scripts', 'local-smoke.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outputPath,
    external: ['better-sqlite3'],
    logLevel: 'silent',
  })

  const result = spawnSync(electronPath, [outputPath], {
    cwd: projectRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }
  process.exitCode = result.status ?? 1
} finally {
  fs.rmSync(outputPath, { force: true })
}
