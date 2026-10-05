import { readFile, writeFile } from 'node:fs/promises'

async function read(path) { return readFile(path, 'utf8') }
async function write(path, value) { return writeFile(path, value) }

function replaceOnce(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`patch marker not found: ${label}`)
  const next = source.replace(before, after)
  if (next === source) throw new Error(`patch did not change file: ${label}`)
  return next
}

// package.json: next test build only; publishing remains a separate reviewed step.
{
  const path = 'package.json'
  const pkg = JSON.parse(await read(path))
  if (pkg.version !== '0.5.0') throw new Error(`unexpected package version: ${pkg.version}`)
  pkg.version = '0.5.1-rc.1'
  await write(path, JSON.stringify(pkg, null, 2) + '\n')
}

// README: keep stable 0.5.0, document the RC and the improved artwork policy.
{
  const path = 'README.md'
  let source = await read(path)
  source = replaceOnce(
    source,
    'Current stable version: `0.5.0`  \nCurrent validation baseline:',
    'Current stable version: `0.5.0`  \nCurrent test version: `0.5.1-rc.1`  \nCurrent validation baseline:',
    'README test version',
  )
  source = replaceOnce(
    source,
    '- best-effort package artwork discovery from the DSH top-level manifest `icon` field, returned to the Client as bounded data URLs with the same SVG/PNG/JPEG/WebP and 256 KiB policy as native DSH metadata;',
    '- best-effort package artwork discovery prefers the official DSH top-level manifest `icon`; when it is absent and a GitHub repository is known, Browse may lazily use a safe repository-local README logo/icon image. Installed Updates reuse the native Plugin Manager `BundleInfo.meta.icon`. All fetched artwork remains limited to SVG/PNG/JPEG/WebP and 256 KiB;',
    'README artwork policy',
  )
  await write(path, source)
}

// Client: distinguish content refresh from package update and reuse native installed artwork in Updates.
{
  const path = 'client.js'
  let source = await read(path)
  source = replaceOnce(
    source,
    "\n    function IconPlus({ size = 16 }) {",
    `\n    function IconUpdate({ size = 16 }) {\n      return h(SvgIcon, { size, children: [\n        h('path', { d: 'M13.5 5.5C12.6 3.2 10.5 1.75 8 1.75C5.9 1.75 4.05 2.75 2.9 4.3L1.75 5.75', stroke: 'currentColor' }),\n        h('path', { d: 'M1.75 2.75V5.75H4.75', stroke: 'currentColor' }),\n        h('path', { d: 'M2.5 10.5C3.4 12.8 5.5 14.25 8 14.25C10.1 14.25 11.95 13.25 13.1 11.7L14.25 10.25', stroke: 'currentColor' }),\n        h('path', { d: 'M14.25 13.25V10.25H11.25', stroke: 'currentColor' }),\n      ] })\n    }\n\n    function IconPlus({ size = 16 }) {`,
    'IconUpdate insertion',
  )
  source = replaceOnce(
    source,
    "h('span', { className: 'ra-plugin-icon', 'aria-hidden': true }, h(IconPlugin, { size: 16 })),",
    "h('span', { className: 'ra-plugin-icon', 'aria-hidden': true }, h(PluginArtwork, { src: item.bundle?.meta?.icon })),",
    'Updates native bundle artwork',
  )
  source = replaceOnce(
    source,
    `                      icon: done\n                        ? h(IconCheck, { size: 16 })\n                        : busy\n                          ? h(IconRefresh, { size: 16, className: 'ra-spin' })\n                          : h(IconRefresh, { size: 16 }),`,
    `                      icon: done\n                        ? h(IconCheck, { size: 16 })\n                        : busy\n                          ? h(IconRefresh, { size: 16, className: 'ra-spin' })\n                          : h(IconUpdate, { size: 16 }),`,
    'Updates action icon',
  )
  await write(path, source)
}

// Host discovery: preserve the official icon contract first, then safely recover repository-local README logos.
{
  const path = 'source-core.js'
  let source = await read(path)

  source = replaceOnce(
    source,
    `function npmPlugin(entry, source) {`,
    `function manifestRepositoryUrl(manifest) {\n  const repository = manifest?.repository\n  if (typeof repository === 'string') return cleanUrl(repository)\n  if (repository && typeof repository === 'object' && !Array.isArray(repository)) return cleanUrl(repository.url)\n  return undefined\n}\n\nfunction npmPlugin(entry, source) {`,
    'manifest repository helper',
  )

  source = replaceOnce(
    source,
    `function encodedPath(path) {\n  return path.split('/').map(part => encodeURIComponent(part)).join('/')\n}\n`,
    `function readmeIconPath(markdown) {\n  const source = String(markdown ?? '')\n  const candidates = []\n  const add = (raw, label = '') => {\n    const candidate = text(raw)?.replace(/^<|>$/g, '').split(/[?#]/u)[0]\n    const icon = safeIconPath(candidate)\n    if (!icon) return\n    const signal = (String(label) + ' ' + icon.path).toLowerCase()\n    if (!/(^|[\\/_.\\s-])(icon|logo|avatar|brand|mark)([\\/_.\\s-]|$)/u.test(signal)) return\n    const lowerPath = icon.path.toLowerCase()\n    const basename = lowerPath.split('/').pop() ?? ''\n    const score = /^(icon|logo)([._-]|$)/u.test(basename)\n      ? 3\n      : /(^|\\/)(assets?|images?|img|media)\\//u.test(lowerPath)\n        ? 2\n        : 1\n    candidates.push({ ...icon, score })\n  }\n\n  const htmlImage = /<img\\b([^>]*?)>/giu\n  let match\n  while ((match = htmlImage.exec(source))) {\n    const attrs = match[1]\n    const src = /\\bsrc\\s*=\\s*[\"']([^\"']+)[\"']/iu.exec(attrs)?.[1]\n    const alt = /\\balt\\s*=\\s*[\"']([^\"']*)[\"']/iu.exec(attrs)?.[1] ?? ''\n    add(src, alt)\n  }\n\n  const markdownImage = /!\\[([^\\]]*)\\]\\(([^)\\s]+)(?:\\s+[\"'][^\"']*[\"'])?\\)/gu\n  while ((match = markdownImage.exec(source))) add(match[2], match[1])\n\n  candidates.sort((left, right) => right.score - left.score)\n  return candidates[0]\n}\n\nfunction encodedPath(path) {\n  return path.split('/').map(part => encodeURIComponent(part)).join('/')\n}\n`,
    'README artwork parser',
  )

  source = replaceOnce(
    source,
    `    const compatibility = dshCompatibility(manifest, options.runtimeVersion)\n    const value = {\n      ...(text(manifest?.version) ? { version: text(manifest.version) } : {}),\n      compatibility: compatibility.status,`,
    `    const compatibility = dshCompatibility(manifest, options.runtimeVersion)\n    const repository = manifestRepositoryUrl(manifest) ?? cleanUrl(item?.repository)\n    const value = {\n      ...(text(manifest?.version) ? { version: text(manifest.version) } : {}),\n      ...(repository ? { repository } : {}),\n      compatibility: compatibility.status,`,
    'metadata repository evidence',
  )

  source = replaceOnce(
    source,
    `async function resolveGithubIcon(item, options) {\n  const parts = githubRepositoryParts(item?.repository)\n  if (!parts) return undefined\n  const manifest = await githubManifest(item, options)\n  const icon = safeIconPath(manifest?.icon)\n  if (!icon) return undefined\n  const iconUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + encodedPath(icon.path)\n  return iconDataFromUrl(iconUrl, icon.mediaType, options)\n}\n`,
    `async function githubReadmeIcon(parts, options) {\n  const source = { id: 'plugin-readme-icon', name: 'plugin README icon', type: 'github', enabled: true }\n  for (const filename of ['README.md', 'readme.md']) {\n    try {\n      const readmeUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + filename\n      const bytes = await fetchBinary(readmeUrl, source, {\n        ...options,\n        authToken: undefined,\n        allowPrivateNetwork: false,\n        maxBytes: Math.min(options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, 512 * 1024),\n      })\n      const icon = readmeIconPath(new TextDecoder().decode(bytes))\n      if (!icon) continue\n      const iconUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + encodedPath(icon.path)\n      return await iconDataFromUrl(iconUrl, icon.mediaType, options)\n    } catch {\n      // README artwork is optional evidence; try the next conventional filename.\n    }\n  }\n  return undefined\n}\n\nasync function resolveGithubIcon(item, options) {\n  const parts = githubRepositoryParts(item?.repository)\n  if (!parts) return undefined\n  const manifest = await githubManifest(item, options)\n  const icon = safeIconPath(manifest?.icon)\n  if (icon) {\n    const iconUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + encodedPath(icon.path)\n    return iconDataFromUrl(iconUrl, icon.mediaType, options)\n  }\n  return githubReadmeIcon(parts, options)\n}\n`,
    'GitHub README icon fallback',
  )

  await write(path, source)
}

// Tests: lock in the exact regressions reported from the real UI.
{
  const path = 'test/source-core.test.js'
  let source = await read(path)
  source = replaceOnce(
    source,
    `test('plugin icon resolution rejects URL icon declarations', async () => {`,
    `test('plugin icons use a safe repository-local README logo when the manifest has no icon', async () => {\n  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M1 1h14v14H1z"/></svg>'\n  const fetchImpl = async input => {\n    const url = new URL(input)\n    if (url.hostname === 'registry.npmjs.org') {\n      return Response.json({ name: '@acme/dsh-readme-icon', version: '1.2.5' })\n    }\n    if (url.hostname === 'raw.githubusercontent.com' && url.pathname.endsWith('/package.json')) {\n      return Response.json({ name: '@acme/dsh-readme-icon', version: '1.2.5' })\n    }\n    if (url.hostname === 'raw.githubusercontent.com' && /\\/(README|readme)\\.md$/u.test(url.pathname)) {\n      return new Response('<p align="center"><img src="assets/logo.svg" alt="Acme logo"></p>')\n    }\n    if (url.hostname === 'raw.githubusercontent.com' && url.pathname.endsWith('/assets/logo.svg')) {\n      return new Response(svg, { status: 200, headers: { 'content-type': 'image/svg+xml' } })\n    }\n    throw new Error('unexpected URL ' + url)\n  }\n\n  const rows = await resolvePluginIcons([\n    {\n      key: 'readme-icon',\n      packageName: '@acme/dsh-readme-icon',\n      version: '1.2.5',\n      repository: 'https://github.com/acme/dsh-readme-icon',\n    },\n  ], { fetchImpl, resolveHost: publicResolver })\n\n  assert.equal(rows.length, 1)\n  assert.equal(rows[0].key, 'readme-icon')\n  assert.match(rows[0].icon, /^data:image\\/svg\\+xml;base64,/)\n})\n\ntest('plugin icon resolution rejects URL icon declarations', async () => {`,
    'README icon fallback test',
  )

  source = replaceOnce(
    source,
    `        version: '2.3.4',\n        peerDependencies: {`,
    `        version: '2.3.4',\n        repository: { url: 'git+https://github.com/acme/dsh-plugin.git' },\n        peerDependencies: {`,
    'metadata repository fixture',
  )
  source = replaceOnce(
    source,
    `  assert.equal(rows[0].version, '2.3.4')\n  assert.equal(rows[0].compatibility, 'compatible')`,
    `  assert.equal(rows[0].version, '2.3.4')\n  assert.equal(rows[0].repository, 'https://github.com/acme/dsh-plugin')\n  assert.equal(rows[0].compatibility, 'compatible')`,
    'metadata repository assertion',
  )
  await write(path, source)
}

{
  const path = 'test/skeleton.test.js'
  let source = await read(path)
  source = replaceOnce(
    source,
    `  assert.match(client, /installBundle\\(name \\+ '@' \\+ version/)\n})`,
    `  assert.match(client, /installBundle\\(name \\+ '@' \\+ version/)\n  assert.match(client, /function IconUpdate/)\n  assert.match(client, /item\\.bundle\\?\\.meta\\?\\.icon/)\n  assert.match(client, /h\\(IconUpdate, \\{ size: 16 \\}\\)/)\n})`,
    'Updates UI contract tests',
  )
  await write(path, source)
}

console.log('Applied v0.5.1-rc.1 patch')
