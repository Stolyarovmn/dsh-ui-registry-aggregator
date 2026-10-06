import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const client = await readFile(new URL('../client.js', import.meta.url), 'utf8')
const host = await readFile(new URL('../index.js', import.meta.url), 'utf8')
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')

test('targets only DSH 0.2.x', () => {
  assert.equal(pkg.peerDependencies['@deepseek-ai/dsh'], '>=0.2.0-rc.2 <0.3.0')
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-plugin-manager'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-connection'))
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'))
})

test('uses the native bundle slot but binds the Host entry form explicitly', () => {
  assert.match(client, /plugins\.bundle\.config/)
  assert.match(client, /ctx\.configForms\.get\(HOST_ENTRY\)/)
  assert.match(client, /ctx\.configForms\.whileServed\(\[HOST_ENTRY\]/)
  assert.match(client, /sourceConfigForm\.subscribe/)
  assert.match(client, /sourceConfigForm\.mutate/)
  assert.match(host, /export const Config/)
  assert.match(patch, /registry-aggregator/)
})

test('does not runtime-import Harness Client packages', () => {
  assert.doesNotMatch(client, /require\(['"]@deepseek-ai\/dsh-client-/)
  assert.doesNotMatch(client, /require\(['"]@deepseek-ai\/dsh-api-/)
})

test('keeps only Sources, Browse, and Updates top-level views', () => {
  assert.match(client, /sources:\s*'Sources'/)
  assert.match(client, /browse:\s*'Browse'/)
  assert.match(client, /updates:\s*'Updates'/)
  assert.match(client, /const tabs = \[\s*\['sources',[\s\S]*\['browse',[\s\S]*\['updates'/)
  assert.doesNotMatch(client, /const tabs = \[[\s\S]{0,400}\['installed'/i)
})

test('source RPC is Host-owned and client uses the Connection service', () => {
  assert.match(host, /connection\.fetch\.register/)
  assert.match(host, /route\('health'\)/)
  assert.match(host, /route\('counts'\)/)
  assert.match(host, /route\('browse'\)/)
  assert.match(host, /route\('icons'\)/)
  assert.match(host, /route\('metadata'\)/)
  assert.match(host, /route\('download-stats'\)/)
  assert.match(client, /connection\.rpc\.call/)
  assert.match(client, /rpc\('browse'/)
})

test('copies the DSH 0.2 native switch geometry and uses icon actions', () => {
  assert.match(client, /width:36px;height:20px;padding:2px/)
  assert.match(client, /ra-switch-thumb/)
  assert.match(client, /--dsw-alias-brand-primary/)
  assert.match(client, /width:28px;height:28px/)
  assert.match(client, /function IconRefresh/)
  assert.match(client, /function IconCopy/)
})

test('ships source marks, compact Browse filters, multi-sort, and pagination', () => {
  assert.match(client, /SOURCE_MARK_PATHS/)
  assert.match(client, /ra-compact-filter/)
  assert.match(client, /ra-filter-row\{[^}]*flex-wrap:nowrap/)
  assert.match(client, /data-kind=page/)
  assert.match(client, /ra-sort-row/)
  assert.match(client, /const \[sorts, setSorts\] = React\.useState\(\[\]\)/)
  assert.match(client, /cycleSort/)
  assert.match(client, /compositeSortPlugins/)
  assert.match(client, /metricPercentiles/)
  assert.doesNotMatch(client, /ra-sort-priority/)
  assert.match(client, /sortCriterion\('stars'/)
  assert.match(client, /sortCriterion\('downloads'/)
  assert.match(client, /sortCriterion\('freshness'/)
  assert.match(client, /pageSize/)
  assert.match(client, /overflow-x:hidden/)
  assert.match(client, /max-width:100%/)
  assert.doesNotMatch(client, /ra-plugin-card[^']*margin:0 -8px/)
})

test('declares a Plugin Manager icon through the DSH 0.2 manifest contract', () => {
  assert.equal(pkg.icon, './icon.svg')
  assert.ok(pkg.files.includes('icon.svg'))
})

test('styles use DSH theme tokens and no feature gradient', () => {
  assert.match(client, /--dsw-alias-/)
  assert.doesNotMatch(client, /linear-gradient|radial-gradient/i)
})


test('Browse separates statistics from tags and uses the warning token for stars', () => {
  assert.match(client, /ra-plugin-stats/)
  assert.match(client, /ra-plugin-tags/)
  assert.match(client, /ra-star/)
  assert.match(client, /--dsw-alias-state-warn-primary/)
  assert.match(client, /const downloadsLabel = plugin\.packageName/)
  assert.match(client, /\/ 30d'.*\/ total'/s)
})


test('Browse uses theme-colored native options and manifest artwork fallback', () => {
  assert.match(client, /ra-compact-filter select option/)
  assert.match(client, /--dsw-alias-bg-layer-2/)
  assert.match(client, /function PluginArtwork/)
  assert.match(client, /rpc\('icons'/)
  assert.match(client, /plugin\.releasedAt \?\? plugin\.repositoryUpdatedAt/)
})


test('Browse install action delegates to the native DSH Plugin Manager Remote', () => {
  assert.match(client, /remote\.pluginManager\.inspect\(spec, \{ registry: null \}\)/)
  assert.match(client, /remote\.pluginManager\.installBundle\(spec, \{ enabled: true, registry, requestId \}\)/)
  assert.match(client, /remote\.pluginManager\.listBundles\(\)/)
  assert.match(client, /plugin-manager\/changed/)
  assert.match(client, /plugin-manager\/install-state/)
  assert.match(client, /h\(IconButton, \{[\s\S]{0,500}icon,/)
  assert.match(client, /inject: \['slots', 'locale', 'connection', 'configForms', 'remote', 'remote\.pluginManager'\]/)
})


test('Browse uses icon-only install actions and explicit compatibility evidence', () => {
  assert.doesNotMatch(client, /className: 'ra-install-button'/)
  assert.match(client, /h\(IconDownload, \{ size: 16 \}\)/)
  assert.match(client, /h\(IconCheck, \{ size: 16 \}\)/)
  assert.match(client, /rpc\('metadata'/)
  assert.match(client, /ra-compat-status/)
  assert.doesNotMatch(client, /ra-tag ra-compat/)
  assert.match(client, /data-status=compatible/)
  assert.match(client, /data-status=incompatible/)
  assert.match(client, /--dsw-alias-state-success-primary/)
  assert.match(client, /--dsw-alias-state-error-primary/)
  assert.match(client, /'v' \+ displayVersion/)
  assert.doesNotMatch(host, /TARGET_DSH_VERSION/)
  assert.match(host, /runtimeVersionFromContext/)
  assert.match(host, /profileContext\?\.installAnchor/)
})

test('Updates tab checks installed bundles and updates through native Plugin Manager', () => {
  assert.match(client, /function UpdatesView/)
  assert.match(client, /readInstalledBundles\(\)/)
  assert.match(client, /compareSemver\(availableVersion, bundle\.version\)/)
  assert.match(client, /updateInstalledPlugin/)
  assert.match(client, /installBundle\(name \+ '@' \+ version/)
  assert.match(client, /function IconUpdate/)
  assert.match(client, /item\.bundle\?\.meta\?\.icon/)
  assert.match(client, /h\(IconUpdate, \{ size: 16 \}\)/)
})


test('Browse compatibility filter can isolate compatible, incompatible, and unverified packages', () => {
  assert.match(client, /const \[compatibilityFilter, setCompatibilityFilter\] = React\.useState\('all'\)/)
  assert.match(client, /compatibilityOf\(plugin\) !== compatibilityFilter/)
  assert.match(client, /compatibilityCompatible/)
  assert.match(client, /compatibilityIncompatible/)
  assert.match(client, /compatibilityUnverified/)
  assert.match(client, /metadataSource = compatibilityFilter === 'all' \? \[\] : plugins/)
  assert.match(client, /for \(let index = 0; index < metadataItems\.length; index \+= 24\)/)
})

test('known-incompatible Browse and Updates actions are disabled before native Plugin Manager rejects them', () => {
  assert.match(client, /disabled: installed \|\| busy \|\| compatibilityStatus === 'incompatible'/)
  assert.match(client, /disabled: (?:bulkUpdating \|\| )?busy \|\| done \|\| incompatible/)
})


test('Browse uses the native DSH shield contour for the neutral compatibility filter', () => {
  assert.match(client, /function IconShield/)
  assert.match(client, /M6\.80132 2\.14853/)
  assert.match(client, /compactFilter\('compatibility'.*IconShield/s)
  assert.match(client, /compatibilityAll: 'Any'/)
})

test('Browse resolves paired npm 30-day and total download stats lazily for visible rows', () => {
  assert.match(client, /const downloadItems = visible/)
  assert.match(client, /rpc\('download-stats'/)
  assert.match(client, /downloadStats\?\.complete/)
  assert.match(client, /downloadsTotal/)
})


test('freshness and page-size filters reserve enough width for their selected values', () => {
  assert.match(client, /data-kind=freshness\] select\{width:72px\}/)
  assert.match(client, /data-kind=page\] select\{width:58px\}/)
})


test('Updates expose a live tab indicator and sequential Update all action', () => {
  assert.match(client, /function useUpdateDiscovery/)
  assert.match(client, /className: 'ra-update-badge'/)
  assert.match(client, /updateCount > 0/)
  assert.match(client, /state\.items\.length > 0/)
  assert.match(client, /const runUpdateAll = async/)
  assert.match(client, /for \(const item of queue\) await runUpdate\(item, false\)/)
  assert.match(client, /Number\(left\.bundle\.name === PACKAGE\)/)
  assert.match(client, /bulkUpdating/)
  assert.match(client, /updateAll/)
})


test('temporary rc.2 bridge self-embeds after the native Installed group and cleans up', () => {
  assert.match(client, /require\('react-dom\/client'\)/)
  assert.match(client, /function installPluginsPageDomBridge/)
  assert.match(client, /MutationObserver/)
  assert.match(client, /section\[data-plugin-panel\]/)
  assert.match(client, /section\[data-plugin-group="bundles"\]/)
  assert.match(client, /insertAdjacentElement\('afterend', host\)/)
  assert.match(client, /data-registry-aggregator-main-surface/)
  assert.match(client, /root\.unmount\(\)/)
  assert.match(client, /observer\.disconnect\(\)/)
  assert.match(client, /DSH 0\.2\.0-rc\.2 Plugins page DOM bridge/)
})


test('main-page navigation follows native Plugin Manager heading language', () => {
  assert.match(client, /ra-tabs\{display:flex;align-items:center/)
  assert.doesNotMatch(client, /ra-tabs\{display:grid;grid-template-columns/)
  assert.match(client, /ra-update-badge\{display:inline;color:var\(--dsw-alias-label-caption\)/)
})

test('temporary rc.2 bridge adds per-package update actions beside Installed switches', () => {
  assert.match(client, /data-registry-aggregator-installed-update/)
  assert.match(client, /\[data-plugin-package\]/)
  assert.match(client, /card\.querySelector\('\[role="switch"\]'\)/)
  assert.match(client, /actions\.insertBefore\(button, switchControl\)/)
  assert.match(client, /format\(t, 'updateAction', \{ version: 'v' \+ item\.availableVersion \}\)/)
  assert.match(client, /updateInstalledPlugin\(item\.bundle, item\.availableVersion/)
  assert.match(client, /remote\.\$on\('plugin-manager\/changed'/)
})
