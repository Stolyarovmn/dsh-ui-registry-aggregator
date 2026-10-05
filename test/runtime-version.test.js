import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import semver from 'semver'
import { runtimeVersionFromContext } from '../index.js'

test('compatibility uses the active DSH installation version instead of a hardcoded release', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'registry-aggregator-runtime-'))
  try {
    const anchor = join(dir, 'package.json')
    await writeFile(anchor, JSON.stringify({ name: '@deepseek-ai/dsh', version: '0.2.1-alpha.1' }))
    assert.equal(runtimeVersionFromContext({ profileContext: { installAnchor: anchor } }), '0.2.1-alpha.1')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('package peer range explicitly accepts the validated DSH 0.2.1 alpha baseline', async () => {
  const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const range = manifest.peerDependencies['@deepseek-ai/dsh']
  assert.equal(semver.satisfies('0.2.1-alpha.1', range), true)
  assert.equal(semver.satisfies('0.2.0-rc.2', range), false)
})
