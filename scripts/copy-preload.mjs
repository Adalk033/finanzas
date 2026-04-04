import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const sourcePath = path.join(rootDir, 'electron', 'preload.cjs')
const outputDir = path.join(rootDir, 'dist-electron')
const outputPath = path.join(outputDir, 'preload.cjs')

fs.mkdirSync(outputDir, { recursive: true })
fs.copyFileSync(sourcePath, outputPath)

console.log(`Copied preload bridge to ${outputPath}`)
