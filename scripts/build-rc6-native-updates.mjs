import fs from 'node:fs'

const clientPath = 'client.js'
const packagePath = 'package.json'
const testPath = 'test/skeleton.test.js'

let client = fs.readFileSync(clientPath, 'utf8')
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
let test = fs.readFileSync(testPath, 'utf8')

if (client.includes('function PluginsPageBridgeSurface')) {
  console.log('rc6 bridge already applied')
  process.exit(0)
}

const bridgeStart = '\n\n    // Temporary DSH 0.2.0-rc.2 compatibility bridge.'
const bridgeEnd = "\n    return {\n      inject: ['slots', 'locale', 'connection', 'configForms', 'remote', 'remote.pluginManager'],"
const start = client.indexOf(bridgeStart)
const end = client.indexOf(bridgeEnd, start)
if (start < 0 || end < 0) throw new Error('rc5 bridge anchors not found')

const replacement = String.raw`

    // Temporary DSH 0.2.0-rc.2 compatibility surface.
    // Stock rc.2 has no supported list-level Plugin Manager slot, so this bridge
    // is deliberately version-pinned and mounts only after the native Installed
    // group exists. It never observes React DOM mutations and removes itself as
    // soon as the Plugin Manager navigates to a detail page.
    function PluginsPageBridgeSurface({ t, installed, cards }) {
      const [tab, setTab] = React.useState('installed')
      const discovery = useUpdateDiscovery(true)
      const [operations, setOperations] = React.useState({})
      const [bulkUpdating, setBulkUpdating] = React.useState(false)
      const formState = React.useSyncExternalStore(
        listener => sourceConfigForm.subscribe(listener),
        () => sourceConfigForm.getSnapshot(),
        () => sourceConfigForm.getSnapshot(),
      )
      const form = React.useMemo(() => ({
        state: formState,
        mutate: (operations, expectedRevision) => sourceConfigForm.mutate(operations, expectedRevision),
      }), [formState])

      const installedCount = installed.querySelector('[data-plugin-count]')?.textContent
        ?? String(installed.querySelectorAll('[data-plugin-package]').length)
      const updateCount = discovery.state.items.length
      const updatableCount = discovery.state.items.filter(item => item.metadata?.compatibility !== 'unsupported').length

      const runUpdate = async (item, refreshAfter = true) => {
        const key = item.bundle.name
        const current = operations[key]
        if (['starting', 'installing', 'applying'].includes(current?.phase)) return false
        setOperations(value => ({ ...value, [key]: { phase: 'starting', error: '' } }))
        try {
          await updateInstalledPlugin(item.bundle, item.availableVersion, progress => {
            setOperations(value => ({ ...value, [key]: { ...(value[key] ?? {}), ...progress, error: '' } }))
          })
          setOperations(value => ({ ...value, [key]: { phase: 'done', error: '' } }))
          if (refreshAfter) discovery.refresh()
          return true
        } catch (error) {
          setOperations(value => ({ ...value, [key]: { phase: 'failed', error: String(error?.message ?? error) } }))
          return false
        }
      }

      const runUpdateAll = async () => {
        if (bulkUpdating || discovery.state.loading) return
        const queue = discovery.state.items
          .filter(item => item.metadata?.compatibility !== 'unsupported')
          .sort((left, right) => Number(left.bundle.name === PACKAGE) - Number(right.bundle.name === PACKAGE))
        if (!queue.length) return
        setBulkUpdating(true)
        try {
          for (const item of queue) await runUpdate(item, false)
        } finally {
          setBulkUpdating(false)
          discovery.refresh()
        }
      }

      React.useEffect(() => {
        cards.style.display = tab === 'installed' ? '' : 'none'
        return () => { cards.style.display = '' }
      }, [cards, tab])

      const updateSignature = discovery.state.items
        .map(item => [item.bundle?.name, item.bundle?.version, item.availableVersion, item.metadata?.compatibility].join(':'))
        .join('|')
      const operationSignature = Object.entries(operations)
        .map(([key, value]) => [key, value?.phase, value?.error].join(':'))
        .join('|')

      React.useEffect(() => {
        const updateByName = new Map(discovery.state.items.map(item => [item.bundle?.name, item]))
        const created = []
        for (const card of installed.querySelectorAll('[data-plugin-package]')) {
          const packageName = card.getAttribute('data-plugin-package')
          const item = updateByName.get(packageName)
          const old = card.querySelector('[data-ra-installed-update]')
          if (old) old.remove()
          if (!item?.availableVersion) continue

          const toggle = card.querySelector('[role="switch"]')
          const actionHost = toggle?.parentElement
          if (!actionHost) continue

          const operation = operations[packageName] ?? {}
          const busy = bulkUpdating || ['starting', 'installing', 'applying'].includes(operation.phase)
          const incompatible = item.metadata?.compatibility === 'unsupported'
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'ra-installed-update'
          button.setAttribute('data-ra-installed-update', '')
          button.setAttribute('data-state', operation.phase === 'failed' ? 'error' : busy ? 'busy' : 'ready')
          button.textContent = 'Update → v' + item.availableVersion
          button.title = operation.error || (incompatible
            ? format(t, 'incompatibleTitle', { version: item.metadata?.runtimeVersion ?? '?' })
            : format(t, 'updateAction', { version: 'v' + item.availableVersion }))
          button.disabled = busy || incompatible
          button.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()
            void runUpdate(item)
          })
          actionHost.insertBefore(button, toggle)
          created.push(button)
        }
        return () => {
          for (const button of created) button.remove()
        }
      }, [installed, updateSignature, operationSignature, bulkUpdating])

      const bridgeTabs = [
        ['installed', t('installed'), installedCount],
        ['sources', t('sources'), ''],
        ['browse', t('browse'), ''],
        ['updates', t('updates'), updateCount > 0 ? String(updateCount) : ''],
      ]
      const selectRelative = delta => {
        const index = bridgeTabs.findIndex(item => item[0] === tab)
        setTab(bridgeTabs[(index + delta + bridgeTabs.length) % bridgeTabs.length][0])
      }
      const body = tab === 'sources'
        ? h(SourcesView, { t, form })
        : tab === 'browse'
          ? h(BrowseView, { t })
          : tab === 'updates'
            ? h(UpdatesView, { t, discovery })
            : null

      return h('div', { className: 'ra-native-surface' },
        h('div', { className: 'ra-native-nav-row' },
          h('div', { className: 'ra-native-tabs', role: 'tablist', 'aria-label': 'Plugin Manager views' },
            ...bridgeTabs.flatMap(([id, label, count], index) => [
              index === 0 ? null : h('span', { key: id + '-separator', className: 'ra-native-separator', 'aria-hidden': true }, '|'),
              h('button', {
                key: id,
                type: 'button',
                role: 'tab',
                className: 'ra-native-tab',
                'aria-selected': tab === id,
                tabIndex: tab === id ? 0 : -1,
                onClick: () => setTab(id),
                onKeyDown: event => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault()
                    selectRelative(1)
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault()
                    selectRelative(-1)
                  }
                },
              },
                h('span', null, label),
                count ? h('span', { className: 'ra-native-count' }, count) : null,
              ),
            ].filter(Boolean)),
          ),
          tab === 'installed' && updateCount > 0
            ? h('button', {
              type: 'button',
              className: 'ra-native-update-all',
              disabled: discovery.state.loading || bulkUpdating || updatableCount === 0,
              onClick: () => { void runUpdateAll() },
            },
              h(IconUpdate, { size: 14 }),
              h('span', null, bulkUpdating ? t('updatingAll') : t('updateAll')),
            )
            : null,
        ),
        body ? h('div', { className: 'ra-native-body' }, body) : null,
      )
    }

    function installPluginsPagePollingBridge(ctx) {
      const doc = window.document
      if (!doc?.querySelector) return () => {}

      const HOST_ATTR = 'data-registry-aggregator-main-surface'
      const bridgeCss = [
        '[' + HOST_ATTR + ']{box-sizing:border-box;min-width:0;width:100%}',
        '[' + HOST_ATTR + '] .ra-native-surface{min-width:0;width:100%}',
        '[' + HOST_ATTR + '] .ra-native-nav-row{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:22px}',
        '[' + HOST_ATTR + '] .ra-native-tabs{display:flex;align-items:baseline;min-width:0;flex-wrap:wrap}',
        '[' + HOST_ATTR + '] .ra-native-tab{display:inline-flex;align-items:baseline;gap:8px;margin:0;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;line-height:22px;font-weight:500;cursor:pointer}',
        '[' + HOST_ATTR + '] .ra-native-tab[aria-selected=true]{color:var(--dsw-alias-label-primary)}',
        '[' + HOST_ATTR + '] .ra-native-tab:hover{color:var(--dsw-alias-label-primary)}',
        '[' + HOST_ATTR + '] .ra-native-tab:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:var(--dsw-radius-xs)}',
        '[' + HOST_ATTR + '] .ra-native-count{color:var(--dsw-alias-label-caption);font-weight:400;font-variant-numeric:tabular-nums}',
        '[' + HOST_ATTR + '] .ra-native-separator{padding:0 10px;color:var(--dsw-alias-label-caption);font-size:12px;line-height:22px}',
        '[' + HOST_ATTR + '] .ra-native-update-all{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:none;height:30px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}',
        '[' + HOST_ATTR + '] .ra-native-update-all:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
        '[' + HOST_ATTR + '] .ra-native-update-all:disabled{opacity:.5;cursor:default}',
        '[' + HOST_ATTR + '] .ra-native-body{padding-top:16px}',
        '.ra-installed-update{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 9px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}',
        '.ra-installed-update:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
        '.ra-installed-update:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
        '.ra-installed-update:disabled{opacity:.5;cursor:default}',
        '.ra-installed-update[data-state=error]{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}',
      ].join('')
      let host
      let root
      let createRoot
      let installedGroup
      let installedHead
      let cardsList
      let headDisplay = ''
      let cardsDisplay = ''
      let disposed = false

      const disposeRoot = () => {
        if (root) {
          try { root.unmount() } catch {}
          root = undefined
        }
        if (installedHead?.isConnected) installedHead.style.display = headDisplay
        if (cardsList?.isConnected) cardsList.style.display = cardsDisplay
        if (installedGroup?.querySelectorAll) {
          for (const button of installedGroup.querySelectorAll('[data-ra-installed-update]')) button.remove()
        }
        if (host?.isConnected) host.remove()
        host = undefined
        installedGroup = undefined
        installedHead = undefined
        cardsList = undefined
      }

      const reconcile = () => {
        if (disposed) return
        const panel = doc.querySelector('section[data-plugin-panel]')
        if (!panel) {
          disposeRoot()
          return
        }
        if (panel.querySelector('[data-plugin-loading]')) return

        const installed = panel.querySelector('section[data-plugin-group="bundles"]')
        if (!installed) {
          // Detail pages intentionally have no Installed group. Removing the
          // bridge here prevents the duplicate UI shown above bundle details.
          disposeRoot()
          return
        }
        const head = installed.firstElementChild
        const cards = Array.from(installed.children).find(element => element.tagName === 'UL')
        if (!head || !cards) return
        if (host?.isConnected && installedGroup === installed && host.parentElement === installed && head.nextElementSibling === host) return

        disposeRoot()
        installedGroup = installed
        installedHead = head
        cardsList = cards
        headDisplay = head.style.display
        cardsDisplay = cards.style.display
        head.style.display = 'none'

        host = doc.createElement('div')
        host.setAttribute(HOST_ATTR, '')
        host.setAttribute('aria-label', 'Registry Aggregator')
        head.insertAdjacentElement('afterend', host)

        try {
          if (!createRoot) ({ createRoot } = require('react-dom/client'))
          if (typeof createRoot !== 'function') throw new Error('react-dom/client createRoot is unavailable')
          root = createRoot(host)
          root.render(h(React.Fragment, null,
            h('style', null, css + '\n' + bridgeCss),
            h(PluginsPageBridgeSurface, { t: ctx.locale.bind(NS), installed, cards }),
          ))
        } catch {
          disposeRoot()
        }
      }

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

client = client.slice(0, start) + replacement + client.slice(end)
pkg.version = '0.5.2-rc.6'

const oldBridgeTestStart = "test('temporary rc.2 bridge waits for native inventory and polls without MutationObserver feedback'"
const oldIndex = test.indexOf(oldBridgeTestStart)
if (oldIndex >= 0) {
  const blockStart = test.lastIndexOf('\n\n', oldIndex)
  const blockEnd = test.indexOf('\n})', oldIndex)
  if (blockStart < 0 || blockEnd < 0) throw new Error('old bridge test block not found')
  test = test.slice(0, blockStart) + test.slice(blockEnd + 3)
}

const testBlock = String.raw`

test('rc.2 main Plugin Manager bridge becomes a native-style Installed/Sources/Browse/Updates surface', () => {
  assert.ok(client.includes('function PluginsPageBridgeSurface'))
  assert.ok(client.includes("['installed', t('installed'), installedCount]"))
  assert.ok(client.includes("['sources', t('sources'), '']"))
  assert.ok(client.includes("['browse', t('browse'), '']"))
  assert.ok(client.includes("['updates', t('updates'), updateCount > 0 ? String(updateCount) : '']"))
  assert.ok(client.includes('ra-native-tab'))
  assert.ok(client.includes('font-size:14px;line-height:22px;font-weight:500'))
  assert.ok(client.includes("tab === 'installed' && updateCount > 0"))
  assert.ok(client.includes("t('updateAll')"))
})

test('Installed cards expose target-version update buttons backed by the native Plugin Manager', () => {
  assert.ok(client.includes('data-ra-installed-update'))
  assert.ok(client.includes("button.textContent = 'Update → v' + item.availableVersion"))
  assert.ok(client.includes('void runUpdate(item)'))
  assert.ok(client.includes('updateInstalledPlugin(item.bundle, item.availableVersion'))
  assert.ok(client.includes("Number(left.bundle.name === PACKAGE)"))
})

test('rc.2 bridge is removed on detail pages and never observes native React DOM mutations', () => {
  assert.ok(client.includes('function installPluginsPagePollingBridge'))
  assert.ok(client.includes('data-plugin-loading'))
  assert.ok(client.includes("if (!installed) {"))
  assert.ok(client.includes('disposeRoot()'))
  assert.ok(client.includes("head.insertAdjacentElement('afterend', host)"))
  assert.ok(client.includes('installedHead.style.display = headDisplay'))
  assert.ok(client.includes('cardsList.style.display = cardsDisplay'))
  assert.ok(client.includes('window.setInterval(reconcile, 750)'))
  assert.equal(client.includes('MutationObserver'), false)
})
`
if (!test.includes('native-style Installed/Sources/Browse/Updates surface')) test += testBlock

fs.writeFileSync(clientPath, client)
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
fs.writeFileSync(testPath, test)
console.log('built rc6 native Installed updates surface')
