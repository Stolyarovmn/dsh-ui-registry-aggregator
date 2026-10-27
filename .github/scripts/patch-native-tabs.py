from pathlib import Path

client_path = Path('client.js')
source = client_path.read_text()

old_apply = """      apply(ctx) {
        connection = ctx.connection
        remote = ctx.remote
        sourceConfigForm = ctx.configForms.get(HOST_ENTRY)
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'registry-aggregator: locale')
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () => installPluginsPagePollingBridge(ctx)), 'registry-aggregator: DSH 0.2.0-rc.2 Plugins page polling bridge')
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
"""

new_apply = """      apply(ctx) {
        connection = ctx.connection
        remote = ctx.remote
        sourceConfigForm = ctx.configForms.get(HOST_ENTRY)
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'registry-aggregator: locale')
        const t = ctx.locale.bind(NS)
        let nativePluginTabsServed = false

        const NativeSourcesTab = () => {
          const formState = React.useSyncExternalStore(
            listener => sourceConfigForm.subscribe(listener),
            () => sourceConfigForm.getSnapshot(),
            () => sourceConfigForm.getSnapshot(),
          )
          const form = React.useMemo(() => ({
            state: formState,
            mutate: (operations, expectedRevision) => sourceConfigForm.mutate(operations, expectedRevision),
          }), [formState])
          return h('div', { className: 'ra-root' }, h('style', null, css), h(SourcesView, { t, form }))
        }
        const NativeBrowseTab = () =>
          h('div', { className: 'ra-root' }, h('style', null, css), h(BrowseView, { t }))
        const NativeUpdatesTab = () => {
          const discovery = useUpdateDiscovery(true)
          return h('div', { className: 'ra-root' }, h('style', null, css), h(UpdatesView, { t, discovery }))
        }
        const registerNativeTab = (id, order, label, component) =>
          ctx.configForms.whileServed([HOST_ENTRY], () => ctx.slots.inject('plugins.tab', () => {
            nativePluginTabsServed = true
            return ctx.slots.register({
              name: 'plugins.tab', id, order, label: () => label(), locale: NS,
            }, component)
          }))

        ctx.effect(() => registerNativeTab('registry-sources', 10, () => t('sources'), NativeSourcesTab), 'registry-aggregator: native Sources tab')
        ctx.effect(() => registerNativeTab('registry-browse', 20, () => t('browse'), NativeBrowseTab), 'registry-aggregator: native Browse tab')
        ctx.effect(() => registerNativeTab('registry-updates', 30, () => t('updates'), NativeUpdatesTab), 'registry-aggregator: native Updates tab')

        // DSH 0.2.1 exposes plugins.tab and is the current architecture. Keep the
        // old DOM bridge only as a compatibility fallback for 0.2.0-rc.2, which
        // had no list-level Plugin Manager slot.
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () => {
          let disposeBridge
          const timer = window.setTimeout(() => {
            if (!nativePluginTabsServed) disposeBridge = installPluginsPagePollingBridge(ctx)
          }, 1500)
          return () => {
            window.clearTimeout(timer)
            disposeBridge?.()
          }
        }), 'registry-aggregator: legacy DSH 0.2.0-rc.2 Plugins page fallback')
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
"""

if old_apply not in source:
    raise SystemExit('apply anchor changed')
source = source.replace(old_apply, new_apply, 1)
client_path.write_text(source)

test_path = Path('test/skeleton.test.js')
tests = test_path.read_text()
anchor = "test('rc.2 main Plugin Manager bridge becomes a native-style Installed/Sources/Browse/Updates surface', () => {\n"
if anchor not in tests:
    raise SystemExit('test insertion anchor changed')
native_test = """test('DSH 0.2.1 uses the official Plugin Manager tab slot for Registry views', () => {
  assert.match(client, /ctx\\.slots\\.inject\\('plugins\\.tab'/)
  assert.match(client, /registerNativeTab\\('registry-sources', 10/)
  assert.match(client, /registerNativeTab\\('registry-browse', 20/)
  assert.match(client, /registerNativeTab\\('registry-updates', 30/)
  assert.match(client, /nativePluginTabsServed = true/)
  assert.match(client, /legacy DSH 0\\.2\\.0-rc\\.2 Plugins page fallback/)
})

"""
tests = tests.replace(anchor, native_test + anchor, 1)
test_path.write_text(tests)
