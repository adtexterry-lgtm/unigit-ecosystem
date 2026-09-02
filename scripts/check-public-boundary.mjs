import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)

const forbiddenPaths = [
  /(^|\/)\.agents\//i,
  /(^|\/)(apps|packages)\/(admin|server|desktop|mobile)(\/|$)/i,
  /(^|\/)(infra|migrations|operations|worktrees)(\/|$)/i,
  /(^|\/)\.env(\.|$)/i,
]

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
]

const textExtensions = new Set([
  '.css', '.html', '.js', '.json', '.jsx', '.md', '.mjs', '.svg', '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
])

const violations = []

for (const file of tracked) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    violations.push(`forbidden path: ${file}`)
  }

  const dot = file.lastIndexOf('.')
  const extension = dot >= 0 ? file.slice(dot).toLowerCase() : ''
  if (!textExtensions.has(extension) && file !== 'LICENSE') continue

  const content = readFileSync(file, 'utf8')
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) violations.push(`possible secret in: ${file}`)
  }
}

if (violations.length > 0) {
  console.error('Public boundary check failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log(`Public boundary check passed for ${tracked.length} tracked files.`)
