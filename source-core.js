import { Buffer } from 'node:buffer'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'
import semver from 'semver'
import { Agent } from 'undici'

const DEFAULT_TIMEOUT_MS = 10000
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const DEFAULT_MAX_PLUGINS = 500
const DEFAULT_MAX_REDIRECTS = 3
const GITHUB_MAX_ATTEMPTS = 3
const GITHUB_RETRY_BASE_DELAY_MS = 250
const GITHUB_RETRY_TIMEOUT_MS = 5000
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504])
const BROWSE_CACHE_TTL_MS = 60_000
const ICON_CACHE_TTL_MS = 30 * 60_000
const METADATA_CACHE_TTL_MS = 10 * 60_000
const DOWNLOAD_STATS_CACHE_TTL_MS = 60 * 60_000
const NPM_DOWNLOAD_EARLIEST = '2015-01-10'
const NPM_DOWNLOAD_CHUNK_DAYS = 540
const NPM_DOWNLOAD_RETRY_ATTEMPTS = 3
const MAX_ICON_BYTES = 256 * 1024
const browseCache = new Map()
const iconCache = new Map()
const metadataCache = new Map()
const downloadStatsCache = new Map()

export const SOURCE_TYPES = Object.freeze(['npm', 'github', 'custom-json', 'corporate'])
export const NPM_DISCOVERY_KEYWORDS = Object.freeze(['dsh-plugin', 'deepseek-harness', 'deepseek-harness-plugin', 'dsh-plugins'])
export const GITHUB_DISCOVERY_QUERIES = Object.freeze([
  'topic:deepseek-harness topic:dsh-plugin',
  'topic:deepseek-harness-plugin',
  'topic:deepseek-harness topic:dsh-plugins',
])

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function cachedBrowse(key) {
  const entry = browseCache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    browseCache.delete(key)
    return undefined
  }
  return entry.value
}

function cacheBrowse(key, value) {
  browseCache.set(key, { value, expiresAt: Date.now() + BROWSE_CACHE_TTL_MS })
  if (browseCache.size <= 64) return
  const first = browseCache.keys().next().value
  if (first !== undefined) browseCache.delete(first)
}

function cachedIcon(key) {
  const entry = iconCache.get(key)
  if (!entry) return { hit: false }
  if (entry.expiresAt <= Date.now()) {
    iconCache.delete(key)
    return { hit: false }
  }
  return { hit: true, value: entry.value }
}

function cacheIcon(key, value) {
  iconCache.set(key, { value, expiresAt: Date.now() + ICON_CACHE_TTL_MS })
  if (iconCache.size <= 128) return
  const first = iconCache.keys().next().value
  if (first !== undefined) iconCache.delete(first)
}

function cachedMetadata(key) {
  const entry = metadataCache.get(key)
  if (!entry) return { hit: false }
  if (entry.expiresAt <= Date.now()) {
    metadataCache.delete(key)
    return { hit: false }
  }
  return { hit: true, value: entry.value }
}

function cacheMetadata(key, value) {
  metadataCache.set(key, { value, expiresAt: Date.now() + METADATA_CACHE_TTL_MS })
  if (metadataCache.size <= 256) return
  const first = metadataCache.keys().next().value
  if (first !== undefined) metadataCache.delete(first)
}

function cachedDownloadStats(key) {
  const entry = downloadStatsCache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    downloadStatsCache.delete(key)
    return undefined
  }
  return entry.value
}

function cacheDownloadStats(key, value) {
  downloadStatsCache.set(key, { value, expiresAt: Date.now() + DOWNLOAD_STATS_CACHE_TTL_MS })
  if (downloadStatsCache.size <= 256) return
  const first = downloadStatsCache.keys().next().value
  if (first !== undefined) downloadStatsCache.delete(first)
}

function isoDay(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : undefined
}

function addUtcDays(day, amount) {
  const date = new Date(day + 'T00:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + amount)
  return isoDay(date)
}

function laterDay(left, right) {
  return String(left) > String(right) ? left : right
}

function earlierDay(left, right) {
  return String(left) < String(right) ? left : right
}

function npmDownloadPeriods(start, end) {
  const periods = []
  let cursor = start
  while (cursor <= end) {
    const chunkEnd = earlierDay(addUtcDays(cursor, NPM_DOWNLOAD_CHUNK_DAYS - 1), end)
    periods.push([cursor, chunkEnd])
    cursor = addUtcDays(chunkEnd, 1)
  }
  return periods
}

function laterDate(...values) {
  return values
    .filter(value => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
}

function releaseChannel(version) {
  const value = text(version)
  return value && value.includes('-') ? 'prerelease' : 'stable'
}

export function normalizeSource(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const id = text(value.id)
  const type = text(value.type)
  const url = text(value.url)
  if (!id || id.length > 64 || !/^[a-z0-9][a-z0-9._~-]*$/i.test(id)) return undefined
  if (!type || !SOURCE_TYPES.includes(type)) return undefined
  if (url && url.length > 2048) return undefined
  return {
    id,
    name: (text(value.name) ?? id).slice(0, 120),
    type,
    ...(url ? { url } : {}),
    enabled: value.enabled !== false,
  }
}

export function isPrivateAddress(address) {
  try {
    return ipaddr.process(address).range() !== 'unicast'
  } catch {
    return true
  }
}

function abortable(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('source request aborted'))
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error('source request aborted'))
    signal.addEventListener('abort', abort, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

async function defaultResolveHost(hostname) {
  if (isIP(hostname)) return [{ address: hostname, family: isIP(hostname) }]
  return dnsLookup(hostname, { all: true, verbatim: true })
}

async function assertSafeUrl(url, options, authenticated) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('only http(s) source URLs are supported')
  if (url.username || url.password) throw new Error('credentials in source URLs are not allowed')
  if (authenticated && url.protocol !== 'https:') throw new Error('authenticated sources require HTTPS')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw new Error('private network destinations are blocked')

  const resolveHost = options.resolveHost ?? defaultResolveHost
  const resolved = await abortable(Promise.resolve(resolveHost(hostname)), options.signal)
  const addresses = resolved
    .map(row => typeof row === 'string' ? { address: row, family: isIP(row) } : row)
    .filter(row => typeof row?.address === 'string' && (row.family === 4 || row.family === 6))

  if (!addresses.length) throw new Error('source hostname resolved to no usable address')
  if (options.allowPrivateNetwork !== true && addresses.some(row => isPrivateAddress(row.address))) {
    throw new Error('private network destinations are blocked')
  }
  return addresses[0]
}

function pinnedDispatcher(address, factory) {
  if (factory) return factory(address)
  return new Agent({
    connect: {
      lookup(_hostname, options, callback) {
        if (options?.all) callback(null, [address])
        else callback(null, address.address, address.family)
      },
    },
  })
}

async function readResponseBytes(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('source response exceeds ' + maxBytes + ' bytes')
  if (!response.body?.getReader) {
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength > maxBytes) throw new Error('source response exceeds ' + maxBytes + ' bytes')
    return bytes
  }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error('source response exceeds ' + maxBytes + ' bytes')
    }
    chunks.push(value)
  }
  const joined = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return joined
}

function retryableSourceError(message, details = {}) {
  const error = new Error(message)
  error.retryable = true
  if (details.status !== undefined) error.status = details.status
  if (details.retryAfterMs !== undefined) error.retryAfterMs = details.retryAfterMs
  return error
}

function githubRateLimitRetryMs(response) {
  if (response.status !== 403) return undefined
  const retryAfterHeader = response.headers.get('retry-after')
  if (retryAfterHeader !== null) {
    const retryAfter = Number(retryAfterHeader)
    if (Number.isFinite(retryAfter) && retryAfter >= 0) return Math.min(retryAfter * 1000, GITHUB_RETRY_TIMEOUT_MS)
  }
  if (response.headers.get('x-ratelimit-remaining') !== '0') return undefined
  const resetHeader = response.headers.get('x-ratelimit-reset')
  if (resetHeader === null) return undefined
  const resetSeconds = Number(resetHeader)
  if (!Number.isFinite(resetSeconds)) return undefined
  const delayMs = Math.max(0, resetSeconds * 1000 - Date.now())
  return delayMs <= GITHUB_RETRY_TIMEOUT_MS ? delayMs : undefined
}

function waitForRetry(delayMs, signal) {
  if (delayMs <= 0) return Promise.resolve()
  if (signal?.aborted) return Promise.reject(new Error('source request aborted'))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, delayMs)
    function done() {
      signal?.removeEventListener('abort', aborted)
      resolve()
    }
    function aborted() {
      clearTimeout(timer)
      signal?.removeEventListener('abort', aborted)
      reject(new Error('source request aborted'))
    }
    signal?.addEventListener('abort', aborted, { once: true })
  })
}

async function fetchJsonAttempt(urlInput, source, options, timeoutMs) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') throw new Error('Host fetch is unavailable')
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const authToken = text(options.authToken)
  const headers = {
    accept: 'application/json',
    'user-agent': 'dsh-registry-aggregator/0.5',
    ...(authToken ? { authorization: 'Bearer ' + authToken } : {}),
  }

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', forwardAbort, { once: true })

  let url = new URL(urlInput)
  try {
    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      let dispatcher
      try {
        const address = await assertSafeUrl(url, { ...options, signal: controller.signal }, Boolean(authToken))
        dispatcher = options.fetchImpl && !options.dispatcherFactory ? undefined : pinnedDispatcher(address, options.dispatcherFactory)

        let response
        try {
          response = await fetchImpl(url, {
            method: 'GET',
            headers,
            redirect: 'manual',
            signal: controller.signal,
            ...(dispatcher ? { dispatcher } : {}),
          })
        } catch (error) {
          if (timedOut) throw retryableSourceError('source request timed out')
          if (options.signal?.aborted) throw new Error('source request aborted')
          throw retryableSourceError('source request failed: ' + String(error?.message ?? error))
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location')
          await response.body?.cancel?.()
          if (!location) throw new Error('source redirect ' + response.status + ' has no Location header')
          if (redirects === maxRedirects) throw new Error('source redirected too many times')
          const next = new URL(location, url)
          if (authToken && next.origin !== url.origin) throw new Error('authenticated source cannot redirect to another origin')
          url = next
          continue
        }

        if (!response.ok) {
          const retryAfterMs = source?.type === 'github' ? githubRateLimitRetryMs(response) : undefined
          await response.body?.cancel?.()
          const message = 'source returned HTTP ' + response.status
          if (RETRYABLE_HTTP_STATUSES.has(response.status) || retryAfterMs !== undefined) {
            throw retryableSourceError(message, { status: response.status, retryAfterMs })
          }
          throw new Error(message)
        }

        const bytes = await readResponseBytes(response, maxBytes)
        try {
          return JSON.parse(new TextDecoder().decode(bytes))
        } catch {
          throw new Error('source returned malformed JSON')
        }
      } finally {
        await dispatcher?.close?.()
      }
    }
    throw new Error('source redirected too many times')
  } catch (error) {
    if (timedOut) throw retryableSourceError('source request timed out')
    if (options.signal?.aborted) throw new Error('source request aborted')
    throw error
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}

export async function fetchJson(urlInput, source, options = {}) {
  const attempts = source?.type === 'github'
    ? Math.min(Math.max(1, options.githubRetryAttempts ?? GITHUB_MAX_ATTEMPTS), GITHUB_MAX_ATTEMPTS)
    : 1
  const firstTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retryTimeoutMs = Math.min(firstTimeoutMs, options.githubRetryTimeoutMs ?? GITHUB_RETRY_TIMEOUT_MS)
  const baseDelayMs = Number.isFinite(options.githubRetryDelayMs)
    ? Math.max(0, options.githubRetryDelayMs)
    : GITHUB_RETRY_BASE_DELAY_MS

  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchJsonAttempt(urlInput, source, options, attempt === 0 ? firstTimeoutMs : retryTimeoutMs)
    } catch (error) {
      lastError = error
      if (options.signal?.aborted || error?.retryable !== true || attempt + 1 >= attempts) throw error
      const delayMs = Math.max(baseDelayMs * (2 ** attempt), Number(error?.retryAfterMs) || 0)
      await waitForRetry(Math.min(delayMs, GITHUB_RETRY_TIMEOUT_MS), options.signal)
    }
  }
  throw lastError
}

async function fetchBinary(urlInput, source, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') throw new Error('Host fetch is unavailable')
  const maxBytes = Math.min(options.maxBytes ?? MAX_ICON_BYTES, MAX_ICON_BYTES)
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const forwardAbort = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', forwardAbort, { once: true })
  let url = new URL(urlInput)

  try {
    for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
      let dispatcher
      try {
        const address = await assertSafeUrl(url, { ...options, signal: controller.signal }, false)
        dispatcher = options.fetchImpl && !options.dispatcherFactory ? undefined : pinnedDispatcher(address, options.dispatcherFactory)
        const response = await fetchImpl(url, {
          method: 'GET',
          headers: { accept: 'image/svg+xml,image/png,image/jpeg,image/webp,*/*;q=0.1', 'user-agent': 'dsh-registry-aggregator/0.5' },
          redirect: 'manual',
          signal: controller.signal,
          ...(dispatcher ? { dispatcher } : {}),
        })

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location')
          await response.body?.cancel?.()
          if (!location) throw new Error('icon redirect ' + response.status + ' has no Location header')
          if (redirects === maxRedirects) throw new Error('icon redirected too many times')
          url = new URL(location, url)
          continue
        }
        if (!response.ok) {
          await response.body?.cancel?.()
          throw new Error('icon returned HTTP ' + response.status)
        }
        return await readResponseBytes(response, maxBytes)
      } finally {
        await dispatcher?.close?.()
      }
    }
    throw new Error('icon redirected too many times')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', forwardAbort)
  }
}

function npmSearchUrl(source) {
  if (source.url) {
    const configured = new URL(source.url)
    if (/\/-\/v1\/search\/?$/u.test(configured.pathname)) return configured
    if (!configured.pathname.endsWith('/')) configured.pathname += '/'
    return new URL('-/v1/search', configured)
  }
  return new URL('https://registry.npmjs.org/-/v1/search')
}

function githubSearchUrl(source) {
  return new URL(source.url ?? 'https://api.github.com/search/repositories')
}

function githubHealthUrl(source) {
  const url = githubSearchUrl(source)
  url.search = ''
  url.hash = ''
  url.pathname = url.pathname.replace(/\/search\/repositories\/?$/u, '/rate_limit')
  return url
}

function catalogRows(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    for (const key of ['plugins', 'items', 'results']) {
      if (Array.isArray(value[key])) return value[key]
    }
  }
  throw new Error('catalog JSON must be an array or contain plugins/items/results')
}

function npmRows(value) {
  if (!value || !Array.isArray(value.objects)) throw new Error('npm search returned an invalid response')
  return value.objects.map(entry => entry?.package?.name).filter(name => typeof name === 'string' && name.trim())
}

function githubRows(value) {
  if (!value || !Array.isArray(value.items)) throw new Error('GitHub search returned an invalid response')
  return value.items.map(entry => entry?.full_name ?? entry?.name).filter(name => typeof name === 'string' && name.trim())
}

function cleanUrl(value) {
  const candidate = text(value)
  if (!candidate) return undefined
  try {
    const url = new URL(candidate.replace(/^git\+/, '').replace(/\.git$/u, ''))
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return url.toString().replace(/\/$/u, '')
  } catch {
    return undefined
  }
}

function manifestRepositoryUrl(manifest) {
  const repository = manifest?.repository
  if (typeof repository === 'string') return cleanUrl(repository)
  if (repository && typeof repository === 'object' && !Array.isArray(repository)) return cleanUrl(repository.url)
  return undefined
}

function npmPlugin(entry, source) {
  const pkg = entry?.package
  const name = text(pkg?.name)
  if (!name) return undefined
  const repository = cleanUrl(pkg?.links?.repository)
  const npmUrl = cleanUrl(pkg?.links?.npm)
  return {
    key: repository ? 'repo:' + repository.toLowerCase() : 'npm:' + name.toLowerCase(),
    name,
    packageName: name,
    ...(text(pkg?.version) ? { version: text(pkg.version) } : {}),
    ...(text(pkg?.description) ? { description: text(pkg.description) } : {}),
    ...(repository ? { repository } : {}),
    ...(npmUrl ? { npmUrl } : {}),
    ...(text(pkg?.date) ? { releasedAt: text(pkg.date), updatedAt: text(pkg.date) } : {}),
    ...(Array.isArray(pkg?.keywords) ? { tags: pkg.keywords.filter(item => typeof item === 'string').map(item => item.toLowerCase()).slice(0, 8) } : {}),
    ...(Number.isFinite(entry?.score?.final) ? { score: entry.score.final } : {}),
    channel: releaseChannel(pkg?.version),
    installSpec: name,
    sources: [{ id: source.id, name: source.name, type: source.type }],
  }
}

function githubPlugin(entry, source) {
  const fullName = text(entry?.full_name)
  if (!fullName) return undefined
  const repository = cleanUrl(entry?.html_url) ?? ('https://github.com/' + fullName)
  return {
    key: 'repo:' + repository.toLowerCase(),
    name: text(entry?.name) ?? fullName,
    fullName,
    ...(text(entry?.description) ? { description: text(entry.description) } : {}),
    repository,
    ...(Number.isFinite(entry?.stargazers_count) ? { stars: entry.stargazers_count } : {}),
    ...(text(entry?.pushed_at ?? entry?.updated_at) ? { repositoryUpdatedAt: text(entry.pushed_at ?? entry.updated_at), updatedAt: text(entry.pushed_at ?? entry.updated_at) } : {}),
    ...(Array.isArray(entry?.topics) ? { tags: entry.topics.filter(item => typeof item === 'string').map(item => item.toLowerCase()).slice(0, 12) } : {}),
    channel: 'stable',
    installSpec: 'github:' + fullName,
    sources: [{ id: source.id, name: source.name, type: source.type }],
  }
}

function catalogPlugin(entry, source, index) {
  if (typeof entry === 'string') {
    const name = text(entry)
    if (!name) return undefined
    return {
      key: source.id + ':' + name.toLowerCase(),
      name,
      packageName: name,
      installSpec: name,
      sources: [{ id: source.id, name: source.name, type: source.type }],
    }
  }
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return undefined
  const name = text(entry.name ?? entry.package ?? entry.packageName ?? entry.id)
  if (!name) return undefined
  const repository = cleanUrl(entry.repository ?? entry.repo ?? entry.github)
  const installSpec = text(entry.installSpec ?? entry.spec ?? entry.packageName ?? entry.package ?? name)
  return {
    key: repository ? 'repo:' + repository.toLowerCase() : source.id + ':' + name.toLowerCase() + ':' + index,
    name,
    ...(text(entry.packageName ?? entry.package) ? { packageName: text(entry.packageName ?? entry.package) } : {}),
    ...(text(entry.version) ? { version: text(entry.version) } : {}),
    ...(text(entry.description ?? entry.summary) ? { description: text(entry.description ?? entry.summary) } : {}),
    ...(repository ? { repository } : {}),
    ...(Number.isFinite(entry.stars) ? { stars: entry.stars } : {}),
    ...(Number.isFinite(entry.downloads30d) ? { downloads30d: entry.downloads30d } : {}),
    ...(text(entry.releasedAt ?? entry.released_at ?? entry.releaseDate ?? entry.date) ? { releasedAt: text(entry.releasedAt ?? entry.released_at ?? entry.releaseDate ?? entry.date) } : {}),
    ...(text(entry.repositoryUpdatedAt ?? entry.repository_updated_at) ? { repositoryUpdatedAt: text(entry.repositoryUpdatedAt ?? entry.repository_updated_at) } : {}),
    ...(text(entry.releasedAt ?? entry.released_at ?? entry.releaseDate ?? entry.date ?? entry.repositoryUpdatedAt ?? entry.repository_updated_at ?? entry.updatedAt ?? entry.updated_at) ? { updatedAt: text(entry.releasedAt ?? entry.released_at ?? entry.releaseDate ?? entry.date ?? entry.repositoryUpdatedAt ?? entry.repository_updated_at ?? entry.updatedAt ?? entry.updated_at) } : {}),
    ...(Array.isArray(entry.tags) ? { tags: entry.tags.filter(item => typeof item === 'string').slice(0, 12) } : {}),
    ...(installSpec ? { installSpec } : {}),
    sources: [{ id: source.id, name: source.name, type: source.type }],
  }
}

function pluginSearchText(plugin) {
  return [
    plugin.name,
    plugin.packageName,
    plugin.fullName,
    plugin.description,
    plugin.repository,
    ...(plugin.tags ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
}

function mergeBrowsePlugins(plugins) {
  const merged = new Map()
  for (const plugin of plugins) {
    if (!plugin?.key) continue
    const existing = merged.get(plugin.key)
    if (!existing) {
      merged.set(plugin.key, plugin)
      continue
    }
    const sources = [...(existing.sources ?? [])]
    for (const source of plugin.sources ?? []) {
      if (!sources.some(item => item.id === source.id)) sources.push(source)
    }
    const packageBearing = existing.packageName ? existing : plugin.packageName ? plugin : undefined
    const releasedAt = laterDate(existing.releasedAt, plugin.releasedAt)
    const repositoryUpdatedAt = laterDate(existing.repositoryUpdatedAt, plugin.repositoryUpdatedAt)
    const updatedAt = releasedAt ?? repositoryUpdatedAt ?? laterDate(existing.updatedAt, plugin.updatedAt)
    const tags = [...new Set([...(existing.tags ?? []), ...(plugin.tags ?? [])])].slice(0, 12)
    merged.set(plugin.key, {
      ...existing,
      ...plugin,
      name: packageBearing?.name ?? plugin.name,
      ...(packageBearing?.packageName ? { packageName: packageBearing.packageName } : {}),
      ...(packageBearing?.version ? { version: packageBearing.version } : {}),
      ...(packageBearing?.channel ? { channel: packageBearing.channel } : {}),
      ...(existing.description ? { description: existing.description } : {}),
      ...(existing.repository ? { repository: existing.repository } : {}),
      ...(packageBearing?.installSpec ? { installSpec: packageBearing.installSpec } : {}),
      ...(releasedAt ? { releasedAt } : {}),
      ...(repositoryUpdatedAt ? { repositoryUpdatedAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
      ...(tags.length ? { tags } : {}),
      stars: Math.max(existing.stars ?? 0, plugin.stars ?? 0) || undefined,
      downloads30d: Math.max(existing.downloads30d ?? 0, plugin.downloads30d ?? 0) || undefined,
      score: Math.max(existing.score ?? 0, plugin.score ?? 0) || undefined,
      sources,
    })
  }
  return [...merged.values()]
}

async function enrichNpmDownloads(plugins, options = {}) {
  const enabled = options.enrichDownloads === true || (options.enrichDownloads !== false && options.fetchImpl === undefined)
  if (!enabled) return plugins
  const packages = [...new Set(plugins.map(plugin => plugin.packageName).filter(Boolean))]
    .slice(0, Math.max(1, Math.min(options.maxEvidencePackages ?? 60, 100)))
  if (!packages.length) return plugins

  const source = { id: 'npm-downloads', name: 'npm downloads', type: 'npm', enabled: true }
  const requestOptions = { ...options, authToken: undefined, allowPrivateNetwork: false }
  const counts = new Map()
  const unscoped = packages.filter(name => !name.startsWith('@'))
  const scoped = packages.filter(name => name.startsWith('@'))
  const tasks = []
  for (let index = 0; index < unscoped.length; index += 64) tasks.push(unscoped.slice(index, index + 64))
  for (const name of scoped) tasks.push([name])

  await mapConcurrent(tasks, Math.min(options.concurrency ?? 4, 6), async chunk => {
    try {
      const encoded = chunk.map(name => encodeURIComponent(name)).join(',')
      const value = await fetchJson('https://api.npmjs.org/downloads/point/last-month/' + encoded, source, requestOptions)
      if (chunk.length === 1 && Number.isFinite(value?.downloads)) {
        counts.set(chunk[0], value.downloads)
        return
      }
      for (const name of chunk) {
        const downloads = value?.[name]?.downloads
        if (Number.isFinite(downloads)) counts.set(name, downloads)
      }
    } catch {
      // Popularity evidence is optional; discovery results stay usable without it.
    }
  })

  return plugins.map(plugin => counts.has(plugin.packageName)
    ? { ...plugin, downloads30d: counts.get(plugin.packageName) }
    : plugin)
}

function browseRank(plugin, query) {
  const needle = text(query)?.toLowerCase()
  let rank = 0
  if (needle) {
    const haystack = pluginSearchText(plugin)
    if (plugin.name.toLowerCase() === needle) rank += 10000
    else if (plugin.name.toLowerCase().startsWith(needle)) rank += 5000
    else if (haystack.includes(needle)) rank += 1000
  }
  rank += Math.log10((plugin.stars ?? 0) + 1) * 120
  rank += Math.log10((plugin.downloads30d ?? 0) + 1) * 80
  rank += (plugin.score ?? 0) * 100
  const freshness = Date.parse(plugin.releasedAt ?? plugin.repositoryUpdatedAt ?? plugin.updatedAt ?? '')
  if (Number.isFinite(freshness)) {
    const ageDays = Math.max(0, (Date.now() - freshness) / 86400000)
    rank += Math.max(0, 50 - Math.min(50, ageDays / 30))
  }
  return rank
}

function githubRepositoryParts(repository) {
  const raw = cleanUrl(repository)
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.hostname.toLowerCase() !== 'github.com') return undefined
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) return undefined
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, '') }
  } catch {
    return undefined
  }
}

function safeIconPath(value) {
  const raw = text(value)
  if (!raw || raw.length > 512 || raw.includes('\\') || raw.startsWith('/')) return undefined
  if (/^[A-Za-z][A-Za-z\d+.-]*:/u.test(raw)) return undefined
  const clean = raw.replace(/^\.\//, '')
  const parts = clean.split('/')
  if (!parts.length || parts.some(part => !part || part === '.' || part === '..')) return undefined
  const match = clean.toLowerCase().match(/\.(svg|png|jpe?g|webp)$/u)
  if (!match) return undefined
  const mediaType = match[1] === 'svg' ? 'image/svg+xml'
    : match[1] === 'png' ? 'image/png'
      : match[1] === 'webp' ? 'image/webp'
        : 'image/jpeg'
  return { path: clean, mediaType }
}

function readmeIconPath(markdown) {
  const source = String(markdown ?? '')
  const candidates = []
  const add = (raw, label = '') => {
    const candidate = text(raw)?.replace(/^<|>$/g, '').split(/[?#]/u)[0]
    const icon = safeIconPath(candidate)
    if (!icon) return
    const signal = (String(label) + ' ' + icon.path).toLowerCase()
    if (!/(^|[\/_.\s-])(icon|logo|avatar|brand|mark)([\/_.\s-]|$)/u.test(signal)) return
    const lowerPath = icon.path.toLowerCase()
    const basename = lowerPath.split('/').pop() ?? ''
    const score = /^(icon|logo)([._-]|$)/u.test(basename)
      ? 3
      : /(^|\/)(assets?|images?|img|media)\//u.test(lowerPath)
        ? 2
        : 1
    candidates.push({ ...icon, score })
  }

  const htmlImage = /<img\b([^>]*?)>/giu
  let match
  while ((match = htmlImage.exec(source))) {
    const attrs = match[1]
    const src = /\bsrc\s*=\s*["']([^"']+)["']/iu.exec(attrs)?.[1]
    const alt = /\balt\s*=\s*["']([^"']*)["']/iu.exec(attrs)?.[1] ?? ''
    add(src, alt)
  }

  const markdownImage = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu
  while ((match = markdownImage.exec(source))) add(match[2], match[1])

  candidates.sort((left, right) => right.score - left.score)
  return candidates[0]
}

function encodedPath(path) {
  return path.split('/').map(part => encodeURIComponent(part)).join('/')
}

async function iconDataFromUrl(url, mediaType, options) {
  const bytes = await fetchBinary(url, { id: 'plugin-icon', name: 'plugin icon', type: 'github', enabled: true }, {
    ...options,
    authToken: undefined,
    allowPrivateNetwork: false,
    maxBytes: MAX_ICON_BYTES,
  })
  return 'data:' + mediaType + ';base64,' + Buffer.from(bytes).toString('base64')
}

function validPackageName(value) {
  const packageName = text(value)
  if (!packageName || packageName.length > 214) return undefined
  return /^(?:@[a-z0-9][a-z0-9._~-]*\/[a-z0-9][a-z0-9._~-]*|[a-z0-9][a-z0-9._~-]*)$/iu.test(packageName)
    ? packageName
    : undefined
}

async function fetchNpmDownloadJson(url, options = {}) {
  const source = { id: 'npm-download-stats', name: 'npm downloads', type: 'npm', enabled: true }
  const requestOptions = { ...options, authToken: undefined, allowPrivateNetwork: false }
  let lastError
  for (let attempt = 0; attempt < NPM_DOWNLOAD_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fetchJson(url, source, requestOptions)
    } catch (error) {
      lastError = error
      if (requestOptions.signal?.aborted || error?.retryable !== true || attempt + 1 >= NPM_DOWNLOAD_RETRY_ATTEMPTS) throw error
      await waitForRetry(Math.min(1000, 200 * (2 ** attempt)), requestOptions.signal)
    }
  }
  throw lastError
}

async function npmPackageCreatedDay(packageName, options) {
  const value = await fetchJson(
    'https://registry.npmjs.org/' + encodeURIComponent(packageName),
    { id: 'npm-package-metadata', name: 'npm', type: 'npm', enabled: true },
    { ...options, authToken: undefined, allowPrivateNetwork: false },
  )
  return isoDay(value?.time?.created)
}

async function npmMonthlyDownloads(packageName, options) {
  const encoded = encodeURIComponent(packageName)
  const value = await fetchNpmDownloadJson(
    'https://api.npmjs.org/downloads/point/last-month/' + encoded,
    options,
  )
  return Number.isFinite(value?.downloads) ? value.downloads : undefined
}

async function npmLifetimeDownloads(packageName, options) {
  const created = await npmPackageCreatedDay(packageName, options)
  if (!created) return undefined
  const end = isoDay(new Date())
  if (!end) return undefined
  const start = laterDay(created, NPM_DOWNLOAD_EARLIEST)
  if (start > end) return 0
  const encoded = encodeURIComponent(packageName)
  const periods = npmDownloadPeriods(start, end)
  const counts = await mapConcurrent(periods, Math.min(2, Math.max(1, periods.length)), async ([periodStart, periodEnd]) => {
    const value = await fetchNpmDownloadJson(
      'https://api.npmjs.org/downloads/point/' + periodStart + ':' + periodEnd + '/' + encoded,
      options,
    )
    if (!Number.isFinite(value?.downloads)) throw new Error('npm downloads API returned no count')
    return value.downloads
  })
  return counts.reduce((sum, value) => sum + value, 0)
}

export async function resolveNpmDownloadStats(items, options = {}) {
  const values = Array.isArray(items) ? items.slice(0, 24) : []
  return mapConcurrent(values, Math.min(options.concurrency ?? 3, 3), async item => {
    const key = text(item?.key)?.slice(0, 500)
    const packageName = validPackageName(item?.packageName)
    if (!key || !packageName) return undefined

    const cached = cachedDownloadStats(packageName)
    if (cached !== undefined) return { key, packageName, ...cached, complete: true }

    try {
      const supplied30d = Number.isFinite(item?.downloads30d) ? item.downloads30d : undefined
      const downloads30dPromise = supplied30d === undefined
        ? npmMonthlyDownloads(packageName, options)
        : Promise.resolve(supplied30d)
      const downloadsTotalPromise = npmLifetimeDownloads(packageName, options)
      const [downloads30d, downloadsTotal] = await Promise.all([downloads30dPromise, downloadsTotalPromise])
      if (!Number.isFinite(downloads30d) || !Number.isFinite(downloadsTotal)) {
        return { key, packageName, complete: false }
      }
      const value = { downloads30d, downloadsTotal }
      cacheDownloadStats(packageName, value)
      return { key, packageName, ...value, complete: true }
    } catch {
      // Never expose a partial lifetime sum as a real total.
      return { key, packageName, complete: false }
    }
  }).then(rows => rows.filter(Boolean))
}

async function npmManifest(item, options) {
  const packageName = validPackageName(item?.packageName)
  if (!packageName) return undefined
  const version = text(item?.version)
  if (version && !/^[0-9A-Za-z][0-9A-Za-z._+~-]*$/u.test(version)) return undefined
  const target = version ? encodeURIComponent(version) : 'latest'
  return fetchJson('https://registry.npmjs.org/' + encodeURIComponent(packageName) + '/' + target,
    { id: 'npm-plugin-manifest', name: 'npm', type: 'npm', enabled: true }, {
      ...options,
      authToken: undefined,
      allowPrivateNetwork: false,
    })
}

async function githubManifest(item, options) {
  const parts = githubRepositoryParts(item?.repository)
  if (!parts) return undefined
  const url = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/package.json'
  return fetchJson(url, { id: 'github-plugin-manifest', name: 'GitHub', type: 'github', enabled: true }, {
    ...options,
    authToken: undefined,
    allowPrivateNetwork: false,
    githubRetryAttempts: 1,
  })
}

function dshCompatibility(manifest, runtimeVersion) {
  const runtime = text(runtimeVersion)
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || !runtime || semver.valid(runtime) === null) {
    return { status: 'unchecked', peers: [] }
  }
  const peerDependencies = manifest.peerDependencies
  if (!peerDependencies || typeof peerDependencies !== 'object' || Array.isArray(peerDependencies)) {
    return { status: 'unchecked', peers: [] }
  }
  const peers = Object.entries(peerDependencies)
    .filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
    .map(([dependency, range]) => {
      const declared = typeof range === 'string' ? range : ''
      const requirement = ['workspace:^', 'workspace:~', 'workspace:*'].includes(declared) ? runtime : declared
      const compatible = Boolean(requirement
        && semver.validRange(requirement, { includePrerelease: true }) !== null
        && semver.satisfies(runtime, requirement, { includePrerelease: true }))
      return { dependency, range: declared, compatible }
    })
  if (!peers.length) return { status: 'unchecked', peers: [] }
  return { status: peers.every(peer => peer.compatible) ? 'compatible' : 'unsupported', peers }
}

export async function resolvePluginMetadata(items, options = {}) {
  const values = Array.isArray(items) ? items.slice(0, 24) : []
  return mapConcurrent(values, Math.min(options.concurrency ?? 4, 6), async item => {
    const key = text(item?.key)?.slice(0, 500)
    if (!key) return undefined
    const cacheKey = [
      text(item?.packageName) ?? '',
      text(item?.version) ?? 'latest',
      cleanUrl(item?.repository) ?? '',
      text(options.runtimeVersion) ?? '',
    ].join('|')
    const cached = cachedMetadata(cacheKey)
    if (cached.hit) return { key, ...cached.value }

    let manifest
    try {
      if (item?.packageName) manifest = await npmManifest(item, options)
      if (!manifest && item?.repository) manifest = await githubManifest(item, options)
    } catch {
      manifest = undefined
    }

    const compatibility = dshCompatibility(manifest, options.runtimeVersion)
    const repository = manifestRepositoryUrl(manifest) ?? cleanUrl(item?.repository)
    const value = {
      ...(text(manifest?.version) ? { version: text(manifest.version) } : {}),
      ...(repository ? { repository } : {}),
      compatibility: compatibility.status,
      ...(compatibility.peers.length ? { dshPeers: compatibility.peers } : {}),
      runtimeVersion: text(options.runtimeVersion),
    }
    cacheMetadata(cacheKey, value)
    return { key, ...value }
  }).then(rows => rows.filter(Boolean))
}

async function resolveNpmIcon(item, options) {
  const packageName = validPackageName(item?.packageName)
  const version = text(item?.version)
  if (!packageName || !version) return undefined
  const manifest = await npmManifest(item, options)
  const icon = safeIconPath(manifest?.icon)
  if (!icon) return undefined
  const packagePath = packageName.startsWith('@')
    ? packageName.split('/').map(part => encodeURIComponent(part)).join('/')
    : encodeURIComponent(packageName)
  const iconUrl = 'https://unpkg.com/' + packagePath + '@' + encodeURIComponent(version) + '/' + encodedPath(icon.path)
  return iconDataFromUrl(iconUrl, icon.mediaType, options)
}

async function githubReadmeIcon(parts, options) {
  const source = { id: 'plugin-readme-icon', name: 'plugin README icon', type: 'github', enabled: true }
  for (const filename of ['README.md', 'readme.md']) {
    try {
      const readmeUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + filename
      const bytes = await fetchBinary(readmeUrl, source, {
        ...options,
        authToken: undefined,
        allowPrivateNetwork: false,
        maxBytes: Math.min(options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, 512 * 1024),
      })
      const icon = readmeIconPath(new TextDecoder().decode(bytes))
      if (!icon) continue
      const iconUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + encodedPath(icon.path)
      return await iconDataFromUrl(iconUrl, icon.mediaType, options)
    } catch {
      // README artwork is optional evidence; try the next conventional filename.
    }
  }
  return undefined
}

async function resolveGithubIcon(item, options) {
  const parts = githubRepositoryParts(item?.repository)
  if (!parts) return undefined
  const manifest = await githubManifest(item, options)
  const icon = safeIconPath(manifest?.icon)
  if (icon) {
    const iconUrl = 'https://raw.githubusercontent.com/' + encodeURIComponent(parts.owner) + '/' + encodeURIComponent(parts.repo) + '/HEAD/' + encodedPath(icon.path)
    return iconDataFromUrl(iconUrl, icon.mediaType, options)
  }
  return githubReadmeIcon(parts, options)
}

export async function resolvePluginIcons(items, options = {}) {
  const values = Array.isArray(items) ? items.slice(0, 8) : []
  return mapConcurrent(values, Math.min(options.concurrency ?? 4, 4), async item => {
    const key = text(item?.key)?.slice(0, 500)
    if (!key) return undefined
    const cacheKey = [text(item?.packageName) ?? '', text(item?.version) ?? '', cleanUrl(item?.repository) ?? ''].join('|')
    const cached = cachedIcon(cacheKey)
    if (cached.hit) return { key, ...(cached.value ? { icon: cached.value } : {}) }
    let icon
    try {
      if (item?.packageName && item?.version) icon = await resolveNpmIcon(item, options)
      if (!icon && item?.repository) icon = await resolveGithubIcon(item, options)
    } catch {
      icon = undefined
    }
    cacheIcon(cacheKey, icon ?? null)
    return { key, ...(icon ? { icon } : {}) }
  }).then(rows => rows.filter(Boolean))
}

function uniqueCount(values) {
  return new Set(values.map(value => String(value).toLowerCase())).size
}

function sourceRequestOptions(source, options) {
  const authToken = options.resolveAuthToken?.(source)
  const allowPrivateNetwork = options.resolveAllowPrivateNetwork?.(source) === true
  return { ...options, ...(authToken ? { authToken } : {}), allowPrivateNetwork }
}

export function createSourceAdapter(sourceInput, options = {}) {
  const source = normalizeSource(sourceInput)
  if (!source) throw new Error('invalid plugin source configuration')
  const requestOptions = sourceRequestOptions(source, options)
  const request = url => fetchJson(url, source, requestOptions)
  const maxPlugins = Math.max(1, Math.min(options.maxPlugins ?? DEFAULT_MAX_PLUGINS, 2000))

  async function npmDiscover() {
    const batches = await Promise.all(NPM_DISCOVERY_KEYWORDS.map(async keyword => {
      const url = npmSearchUrl(source)
      url.searchParams.set('text', 'keywords:' + keyword)
      url.searchParams.set('size', String(Math.min(maxPlugins, 250)))
      const value = await request(url)
      const names = npmRows(value)
      return { names, truncated: Number(value?.total) > names.length }
    }))
    return {
      count: uniqueCount(batches.flatMap(batch => batch.names)),
      truncated: batches.some(batch => batch.truncated),
    }
  }

  async function githubDiscover() {
    const batches = await Promise.all(GITHUB_DISCOVERY_QUERIES.map(async discoveryQuery => {
      const url = githubSearchUrl(source)
      url.searchParams.set('q', discoveryQuery)
      url.searchParams.set('per_page', String(Math.min(maxPlugins, 100)))
      const value = await request(url)
      const names = githubRows(value)
      return { names, truncated: Number(value?.total_count) > names.length }
    }))
    return {
      count: uniqueCount(batches.flatMap(batch => batch.names)),
      truncated: batches.some(batch => batch.truncated),
    }
  }

  async function catalogDiscover() {
    if (!source.url) throw new Error(source.type + ' source requires a catalog URL')
    const rows = catalogRows(await request(source.url))
    return { count: Math.min(rows.length, maxPlugins), truncated: rows.length > maxPlugins }
  }

  async function count() {
    if (source.type === 'npm') return npmDiscover()
    if (source.type === 'github') return githubDiscover()
    return catalogDiscover()
  }

  async function health() {
    const started = Date.now()
    try {
      if (source.type === 'npm') {
        const url = npmSearchUrl(source)
        url.searchParams.set('text', 'keywords:' + NPM_DISCOVERY_KEYWORDS[0])
        url.searchParams.set('size', '1')
        npmRows(await request(url))
      } else if (source.type === 'github') {
        const value = await request(githubHealthUrl(source))
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('GitHub health response is malformed')
      } else {
        await catalogDiscover()
      }
      return { ok: true, latencyMs: Date.now() - started }
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: String(error?.message ?? error) }
    }
  }

  async function browse(query = '') {
    const needle = text(query)
    const cacheKey = [source.id, source.type, source.url ?? '', needle ?? ''].join('|')
    const cached = cachedBrowse(cacheKey)
    if (cached !== undefined) return cached

    let result
    if (source.type === 'npm') {
      const search = needle ? needle + ' keywords:' + NPM_DISCOVERY_KEYWORDS[0] : 'keywords:' + NPM_DISCOVERY_KEYWORDS[0]
      const url = npmSearchUrl(source)
      url.searchParams.set('text', search)
      url.searchParams.set('size', String(Math.min(maxPlugins, needle ? 100 : 100)))
      const value = await request(url)
      if (!value || !Array.isArray(value.objects)) throw new Error('npm search returned an invalid response')
      result = mergeBrowsePlugins(value.objects.map(entry => npmPlugin(entry, source)).filter(Boolean))
    } else if (source.type === 'github') {
      // One GitHub Search request per query avoids exhausting unauthenticated search quota while typing.
      const search = needle ? needle + ' topic:deepseek-harness' : 'topic:deepseek-harness'
      const url = githubSearchUrl(source)
      url.searchParams.set('q', search)
      url.searchParams.set('sort', 'stars')
      url.searchParams.set('order', 'desc')
      url.searchParams.set('per_page', String(Math.min(maxPlugins, 100)))
      const value = await request(url)
      if (!value || !Array.isArray(value.items)) throw new Error('GitHub search returned an invalid response')
      result = mergeBrowsePlugins(value.items.map(entry => githubPlugin(entry, source)).filter(Boolean))
    } else {
      if (!source.url) throw new Error(source.type + ' source requires a catalog URL')
      const rows = catalogRows(await request(source.url))
        .map((entry, index) => catalogPlugin(entry, source, index))
        .filter(Boolean)
      if (!needle) result = rows
      else {
        const lower = needle.toLowerCase()
        result = rows.filter(plugin => pluginSearchText(plugin).includes(lower))
      }
    }

    cacheBrowse(cacheKey, result)
    return result
  }

  return { source, health, count, browse }
}

function validateSources(sourceInputs, options) {
  const maxSources = Math.max(1, Math.min(options.maxSources ?? 20, 100))
  if (!Array.isArray(sourceInputs) || sourceInputs.length > maxSources) {
    throw new Error('at most ' + maxSources + ' plugin sources are allowed')
  }
  const sources = sourceInputs.map(normalizeSource)
  if (sources.some(source => !source)) throw new Error('invalid plugin source configuration')
  if (new Set(sources.map(source => source.id)).size !== sources.length) throw new Error('plugin source ids must be unique')
  return sources
}

async function mapConcurrent(items, concurrency, worker) {
  const output = new Array(items.length)
  let cursor = 0
  async function run() {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      output[index] = await worker(items[index], index)
    }
  }
  const workers = Math.min(Math.max(1, concurrency), Math.max(1, items.length))
  await Promise.all(Array.from({ length: workers }, run))
  return output
}

export async function healthSources(sourceInputs, options = {}) {
  const sources = validateSources(sourceInputs, options)
  return mapConcurrent(sources, options.concurrency ?? 4, async source => ({
    source: { id: source.id, name: source.name, type: source.type, ...(source.url ? { url: source.url } : {}) },
    health: source.enabled ? await createSourceAdapter(source, options).health() : { ok: false, disabled: true },
  }))
}

export async function countSources(sourceInputs, options = {}) {
  const sources = validateSources(sourceInputs, options)
  return mapConcurrent(sources, options.concurrency ?? 4, async source => {
    const attribution = { id: source.id, name: source.name, type: source.type, ...(source.url ? { url: source.url } : {}) }
    if (!source.enabled) return { source: attribution, disabled: true }
    try {
      return { source: attribution, ...(await createSourceAdapter(source, options).count()) }
    } catch (error) {
      return { source: attribution, error: String(error?.message ?? error) }
    }
  })
}

export async function browseSources(sourceInputs, query = '', options = {}) {
  const sources = validateSources(sourceInputs, options).filter(source => source.enabled)
  const limit = Math.max(1, Math.min(Number(options.limit) || 60, 100))
  const rows = await mapConcurrent(sources, options.concurrency ?? 4, async source => {
    const attribution = { id: source.id, name: source.name, type: source.type, ...(source.url ? { url: source.url } : {}) }
    try {
      return {
        source: attribution,
        ok: true,
        plugins: await createSourceAdapter(source, options).browse(query),
      }
    } catch (error) {
      return {
        source: attribution,
        ok: false,
        error: String(error?.message ?? error),
        plugins: [],
      }
    }
  })

  const merged = mergeBrowsePlugins(rows.flatMap(row => row.plugins))
    .map(plugin => ({ ...plugin, rank: browseRank(plugin, query) }))
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))

  const enriched = await enrichNpmDownloads(merged.slice(0, Math.max(limit, 60)), options)
  const byKey = new Map(enriched.map(plugin => [plugin.key, plugin]))
  const plugins = merged
    .map(plugin => byKey.get(plugin.key) ?? plugin)
    .map(plugin => ({ ...plugin, rank: browseRank(plugin, query) }))
    .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name))

  return {
    plugins: plugins.slice(0, limit).map(({ rank: _rank, ...plugin }) => plugin),
    total: plugins.length,
    sources: rows.map(({ plugins: _plugins, ...row }) => row),
  }
}
