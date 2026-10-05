import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

if (process.env.GITHUB_ACTIONS !== 'true') {
  throw new Error('This one-shot transformer is only allowed in GitHub Actions')
}

const root = process.cwd()
const dsh = '/tmp/deepseek-harness'
const read = path => readFileSync(join(root, path), 'utf8')
const write = (path, value) => writeFileSync(join(root, path), value)
const run = (command, args, cwd = root, capture = false) => execFileSync(command, args, {
  cwd,
  stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  encoding: capture ? 'utf8' : undefined,
})
const replaceOnce = (value, before, after, label) => {
  if (!value.includes(before)) throw new Error(`${label}: anchor not found`)
  return value.replace(before, after)
}

// Registry Aggregator: render in a native main-page slot when the host provides it,
// while retaining the existing bundle detail surface as a stock-DSH fallback.
let client = read('client.js')
client = replaceOnce(
  client,
  "    function RegistryAggregator({ t, view }) {\n      const [tab, setTab] = React.useState('sources')\n      const updateDiscovery = useUpdateDiscovery(view === 'page')\n",
  "    function RegistryAggregator({ t, view }) {\n      const active = view === undefined || view === 'page'\n      const [tab, setTab] = React.useState('sources')\n      const updateDiscovery = useUpdateDiscovery(active)\n",
  'RegistryAggregator activation',
)
client = replaceOnce(client, "      if (view !== 'page') return null\n", "      if (!active) return null\n", 'RegistryAggregator guard')
client = replaceOnce(
  client,
  `        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: bundle page')
`,
  `        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.main.section', () => ctx.slots.register({
            name: 'plugins.main.section',
            id: 'registry-aggregator',
            order: 100,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: Plugins main page')
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: bundle page fallback')
`,
  'Registry Aggregator slot registration',
)
write('client.js', client)

const pkg = JSON.parse(read('package.json'))
if (pkg.version !== '0.5.2-rc.1') throw new Error(`unexpected package version ${pkg.version}`)
pkg.version = '0.5.2-rc.2'
pkg.scripts.test = 'node --test test/*.test.js'
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`)

let skeleton = read('test/skeleton.test.js')
skeleton = replaceOnce(
  skeleton,
  "test('uses the native bundle slot but binds the Host entry form explicitly', () => {\n  assert.match(client, /plugins\\.bundle\\.config/)\n",
  "test('uses the native main Plugins slot with bundle-detail fallback and binds the Host entry form explicitly', () => {\n  assert.match(client, /plugins\\.main\\.section/)\n  assert.match(client, /name: 'plugins\\.main\\.section'/)\n  assert.match(client, /id: 'registry-aggregator'/)\n  assert.match(client, /order: 100/)\n  assert.match(client, /plugins\\.bundle\\.config/)\n",
  'slot contract test',
)
skeleton += `

test('main Plugins surface and bundle fallback share the same Registry Aggregator view safely', () => {
  assert.match(client, /const active = view === undefined \\|\\| view === 'page'/)
  assert.match(client, /useUpdateDiscovery\\(active\\)/)
  assert.match(client, /if \\(!active\\) return null/)
  assert.match(client, /registry-aggregator: Plugins main page/)
  assert.match(client, /registry-aggregator: bundle page fallback/)
})
`
write('test/skeleton.test.js', skeleton)

let readme = read('README.md')
readme = readme.replace('Current test version: `0.5.2-rc.1`', 'Current test version: `0.5.2-rc.2`')
const readmeSection = `## Native Plugins main-page integration

\`0.5.2-rc.2\` can render Registry Aggregator directly on the native Plugins list through the additive \`plugins.main.section\` slot. Stock DSH \`0.2.0-rc.2\` does not declare that slot, so this repository ships a version-matched host patch at \`docs/dsh-v0.2.0-rc.2-plugins-main-section.patch\`. The existing \`plugins.bundle.config\` registration remains as a fallback on an unpatched Harness.

`
if (!readme.includes(readmeSection)) {
  readme = replaceOnce(readme, '## Installation\n', `${readmeSection}## Installation\n`, 'README Installation')
}
write('README.md', readme)

// Generate the DSH patch from the exact upstream target.
rmSync(dsh, { recursive: true, force: true })
run('git', ['clone', '--depth', '1', '--branch', 'dsh-v0.2.0-rc.2', 'https://github.com/deepseek-ai/deepseek-harness.git', dsh])
const targetSha = run('git', ['rev-parse', 'HEAD'], dsh, true).trim()
if (targetSha !== '639ed015397290b3745d163aafe02ffee4aa3f84') throw new Error(`unexpected DSH target ${targetSha}`)

const dshRead = path => readFileSync(join(dsh, path), 'utf8')
const dshWrite = (path, value) => writeFileSync(join(dsh, path), value)

let value = dshRead('packages/client/ui-plugin-manager/src/client/slot-contract.ts')
value = replaceOnce(
  value,
  `  interface SlotMap {
    /** Optional guidance after the user enables a bundle from the list, keyed by npm package name. */
`,
  `  interface SlotMap {
    /** Additive sections rendered on the Plugins list after the native Official and Installed groups. */
    'plugins.main.section': { kind: 'list'; scope: 'root'; owner: Record<never, never> }
    /** Optional guidance after the user enables a bundle from the list, keyed by npm package name. */
`,
  'DSH slot contract',
)
dshWrite('packages/client/ui-plugin-manager/src/client/slot-contract.ts', value)

value = dshRead('packages/client/ui-plugin-manager/src/client/index.ts')
value = replaceOnce(
  value,
  `      children: {
        'plugins.item': { kind: 'list', scope: 'root' },
`,
  `      children: {
        'plugins.main.section': { kind: 'list', scope: 'root' },
        'plugins.item': { kind: 'list', scope: 'root' },
`,
  'DSH child slot declaration',
)
dshWrite('packages/client/ui-plugin-manager/src/client/index.ts', value)

value = dshRead('packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx')
value = replaceOnce(
  value,
  `  & PropsRenderSlots<
    | 'plugins.item' | 'plugins.bundle.config' | 'plugins.row.config' | 'plugins.bundle.activation'
    | 'plugins.detail.actions' | 'plugins.detail.badge' | 'plugins.detail.section'
  >
`,
  `  & PropsRenderSlots<
    | 'plugins.main.section' | 'plugins.item' | 'plugins.bundle.config' | 'plugins.row.config' | 'plugins.bundle.activation'
    | 'plugins.detail.actions' | 'plugins.detail.badge' | 'plugins.detail.section'
  >
`,
  'DSH PluginManagerPage props',
)
value = replaceOnce(
  value,
  `        : null}
      {showsCards && activated !== undefined && !state.install.open
`,
  `        : null}
      {loaded && showsCards ? renderSlot('plugins.main.section', {}) : null}
      {showsCards && activated !== undefined && !state.install.open
`,
  'DSH PluginManagerPage render point',
)
dshWrite('packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx', value)

value = dshRead('packages/client/ui-plugin-manager/tests/browser-plugin.client.spec.tsx')
value = replaceOnce(
  value,
  "    expect(b.slots.spec('plugins.item')).toMatchObject({ kind: 'list', scope: 'root' })\n",
  "    expect(b.slots.spec('plugins.main.section')).toMatchObject({ kind: 'list', scope: 'root' })\n    expect(b.slots.spec('plugins.item')).toMatchObject({ kind: 'list', scope: 'root' })\n",
  'DSH browser slot assertion',
)
dshWrite('packages/client/ui-plugin-manager/tests/browser-plugin.client.spec.tsx', value)

value = dshRead('docs/subsystems/slots.md')
value = replaceOnce(value, '├─ main\n│  ├─ plugins.item\n', '├─ main\n│  ├─ plugins.main.section\n│  ├─ plugins.item\n', 'DSH slot hierarchy docs')
dshWrite('docs/subsystems/slots.md', value)

value = dshRead('packages/client/ui-plugin-manager/README.md')
const mainSectionDocs = `### Main list extension point

The Plugins list exposes \`plugins.main.section\` as a root-scoped list slot after the native Official and Installed groups. Additive plugin-management surfaces can register a section there without replacing the Plugin Manager page; each entry owns its own section chrome and lifecycle.

`
if (!value.includes(mainSectionDocs)) {
  value = replaceOnce(value, '### Detail page extension points\n', `${mainSectionDocs}### Detail page extension points\n`, 'DSH Plugin Manager docs')
}
dshWrite('packages/client/ui-plugin-manager/README.md', value)

mkdirSync(join(root, 'docs'), { recursive: true })
const diff = run('git', [
  'diff', '--',
  'packages/client/ui-plugin-manager/src/client/slot-contract.ts',
  'packages/client/ui-plugin-manager/src/client/index.ts',
  'packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx',
  'packages/client/ui-plugin-manager/tests/browser-plugin.client.spec.tsx',
  'docs/subsystems/slots.md',
  'packages/client/ui-plugin-manager/README.md',
], dsh, true)
if (!diff.trim()) throw new Error('generated DSH patch is empty')
write('docs/dsh-v0.2.0-rc.2-plugins-main-section.patch', diff)
run('git', ['diff', '--check'], dsh)
run('git', ['reset', '--hard', 'HEAD'], dsh)
run('git', ['apply', '--check', join(root, 'docs/dsh-v0.2.0-rc.2-plugins-main-section.patch')], dsh)

write('docs/DSH_0.2.0_RC2_MAIN_SECTION.md', `# DSH 0.2.0-rc.2 — \`plugins.main.section\`

Registry Aggregator \`0.5.2-rc.2\` can render directly on the native Plugins list when the host declares the additive \`plugins.main.section\` slot.

Stock \`0.2.0-rc.2\` does not declare that slot. \`dsh-v0.2.0-rc.2-plugins-main-section.patch\` is generated and \`git apply --check\` validated against the exact upstream tag \`dsh-v0.2.0-rc.2\` at commit \`639ed015397290b3745d163aafe02ffee4aa3f84\`.

The host patch declares the root-scoped list slot, exposes it from the native Plugin Manager main registration, renders contributions after Official and Installed, updates the slot documentation, and extends the browser contract assertion.

Registry Aggregator keeps \`plugins.bundle.config\` as a fallback on stock DSH, so its existing detail-page UI remains available when the host slot is absent.
`)

// The normal CI syntax check runs before npm test, so validate the transformed client here too.
run('node', ['--check', 'client.js'])

// Return CI/package metadata to their normal post-RC state before committing.
let ci = read('.github/workflows/ci.yml')
ci = replaceOnce(ci, 'permissions:\n  contents: write\n', 'permissions:\n  contents: read\n', 'CI permissions restore')
write('.github/workflows/ci.yml', ci)
unlinkSync(join(root, '.github/apply-main-surface.mjs'))

run('git', ['config', 'user.name', 'github-actions[bot]'])
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'])
run('git', ['add', '-A'])
run('git', ['diff', '--cached', '--check'])
run('git', ['commit', '-m', 'feat: render registry on native Plugins main page'])
run('git', ['push', 'origin', 'HEAD:dsh-0.2.0'])
