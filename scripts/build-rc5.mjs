import fs from 'node:fs'

const clientPath = 'client.js'
const packagePath = 'package.json'
const testPath = 'test/skeleton.test.js'

let client = fs.readFileSync(clientPath, 'utf8')
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
let test = fs.readFileSync(testPath, 'utf8')

if (client.includes('installPluginsPagePollingBridge')) {
  console.log('rc5 bridge already applied')
  process.exit(0)
}

const anchor = "    return {\n      inject: ['slots', 'locale', 'connection', 'configForms', 'remote', 'remote.pluginManager'],"
if (!client.includes(anchor)) throw new Error('client return anchor not found')

const bridge = `
    // Temporary DSH 0.2.0-rc.2 compatibility bridge.
    // Stock rc.2 exposes no list-level Plugin Manager slot, so wait until the
    // native inventory has fully loaded before mounting a second React surface.
    // Polling is deliberate here: observing the entire document can feed back
    // into the Plugin Manager render cycle while listBundles/listPlugins settle.
    function installPluginsPagePollingBridge(ctx) {
      const doc = window.document
      if (!doc?.querySelector) return () => {}

      const HOST_ATTR = 'data-registry-aggregator-main-surface'
      const bridgeCss = \\`
        [\\${HOST_ATTR}]{box-sizing:border-box;width:100%;max-width:960px;padding-top:24px;border-top:.5px solid var(--dsw-alias-border-l4)}
        [\\${HOST_ATTR}] .ra-root{padding:0 0 8px}
        [\\${HOST_ATTR}] .ra-tabs{margin-top:0}
      \\`
      let host
      let root
      let createRoot
      let disposed = false

      const disposeRoot = () => {
        if (root) {
          try { root.unmount() } catch {}
          root = undefined
        }
        if (host?.isConnected) host.remove()
        host = undefined
      }

      const reconcile = () => {
        if (disposed) return
        const panel = doc.querySelector('section[data-plugin-panel]')
        if (!panel) {
          disposeRoot()
          return
        }

        // Never touch the Plugin Manager while its own listBundles/listPlugins
        // first-read skeleton is active. This is the critical rc.2 safeguard.
        if (panel.querySelector('[data-plugin-loading]')) return

        const installed = panel.querySelector('section[data-plugin-group="bundles"]')
        if (!installed) return
        if (host?.isConnected && host.parentElement === panel && installed.nextElementSibling === host) return

        disposeRoot()
        host = doc.createElement('section')
        host.setAttribute(HOST_ATTR, '')
        host.setAttribute('aria-label', 'Registry Aggregator')
        installed.insertAdjacentElement('afterend', host)

        try {
          if (!createRoot) ({ createRoot } = require('react-dom/client'))
          if (typeof createRoot !== 'function') throw new Error('react-dom/client createRoot is unavailable')
          root = createRoot(host)
          root.render(h(React.Fragment, null,
            h('style', null, bridgeCss),
            h(RegistryAggregator, { t: ctx.locale.bind(NS), view: 'page' }),
          ))
        } catch {
          disposeRoot()
        }
      }

      // Let the native Plugin Manager finish its initial remote inventory read
      // before the first probe; then reconcile slowly enough to handle route
      // navigation without observing React's own DOM mutations.
      const timer = window.setInterval(reconcile, 750)
      const initial = window.setTimeout(reconcile, 900)

      return () => {
        disposed = true
        window.clearInterval(timer)
        window.clearTimeout(initial)
        disposeRoot()
      }
    }

`

client = client.replace(anchor, bridge + anchor)

const localeEffect = "        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'registry-aggregator: locale')\n"
if (!client.includes(localeEffect)) throw new Error('locale effect anchor not found')
client = client.replace(localeEffect, localeEffect + "        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () => installPluginsPagePollingBridge(ctx)), 'registry-aggregator: DSH 0.2.0-rc.2 Plugins page polling bridge')\n")

pkg.version = '0.5.2-rc.5'

const testBlock = `

test('temporary rc.2 bridge waits for native inventory and polls without MutationObserver feedback', () => {
  assert.match(client, /function installPluginsPagePollingBridge/)
  assert.match(client, /panel\.querySelector\('\[data-plugin-loading\]'\)/)
  assert.match(client, /window\.setInterval\(reconcile, 750\)/)
  assert.match(client, /window\.setTimeout\(reconcile, 900\)/)
  assert.match(client, /require\('react-dom\\/client'\)/)
  assert.match(client, /section\[data-plugin-panel\]/)
  assert.match(client, /section\[data-plugin-group="bundles"\]/)
  assert.match(client, /insertAdjacentElement\('afterend', host\)/)
  assert.match(client, /data-registry-aggregator-main-surface/)
  assert.match(client, /root\.unmount\(\)/)
  assert.doesNotMatch(client, /MutationObserver/)
})
`
if (!test.includes("temporary rc.2 bridge waits for native inventory")) test += testBlock

fs.writeFileSync(clientPath, client)
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
fs.writeFileSync(testPath, test)
console.log('built rc5 polling bridge')
