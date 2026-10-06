# Changelog

All notable changes to Registry Aggregator are documented here.

## [0.5.2] - 2026-10-06

### Added

- Added `Installed | Sources | Browse | Updates` navigation directly to the main DSH Plugins page while preserving the native Installed package cards.
- Added `Update → vX.Y.Z` actions directly to native Installed package cards when a newer eligible version is discovered.
- Added a main-page **Update all** action for eligible installed updates, with Registry Aggregator updated last.
- Added a live update count beside **Updates** on the main Plugins page.

### Changed

- Sources, Browse, and Updates can now be used without first opening the Registry Aggregator detail page.
- Main-page navigation follows the native Installed heading/count typography rather than the previous standalone segmented-control treatment.
- The supported `plugins.bundle.config` view remains available as the fallback/detail UI.
- Update discovery is shared by the main Installed actions and the Updates view.

### Fixed

- Prevented the DSH `0.2.0-rc.2` main-page compatibility bridge from mounting while the native Plugin Manager inventory skeleton is still active, avoiding the observed `pluginManager/listBundles` loading hang.
- Removed the MutationObserver-based bridge behavior and replaced it with slow reconciliation after native inventory is ready.
- Fixed duplicate Registry Aggregator UI above plugin detail pages by removing the main-page compatibility surface when the native Installed group disappears.
- Restored native Installed DOM state when the compatibility surface is disposed.

### Compatibility

- DSH peer range remains `>=0.2.0-rc.2 <0.3.0`.
- The main Plugins-list integration is intentionally version-pinned to DSH `0.2.0-rc.2` because stock rc.2 exposes no supported list-level Plugin Manager slot. The native `plugins.bundle.config` integration remains the supported fallback.

### Validation

- Promoted the manually verified `0.5.2-rc.6` line.
- JavaScript syntax checks, repository tests, npm package dry-run validation, and the isolated DSH `0.2.0-rc.2` install smoke test passed.
- Real Harness UI verification covered the main Plugins-page Browse integration, native-style navigation, compatibility evidence, and package search results.

## [0.5.1] - 2026-10-05

### Changed

- Browse artwork discovery now recovers a GitHub repository from npm manifest metadata before trying the safe repository-local README artwork fallback.
- Installed update rows reuse the native Plugin Manager `BundleInfo.meta.icon` instead of showing a generic plugin glyph when native artwork is already available.
- Package update actions now use a distinct two-arrow Update glyph, while content/list refresh keeps the single-arrow Refresh glyph.

### Fixed

- Fixed missing artwork for npm-discovered plugins that omit the official top-level `icon` field but expose a GitHub repository with a local README logo/icon.
- Fixed GitHub artwork fallback so a missing or unreadable repository `package.json` no longer prevents safe README artwork discovery.
- Kept artwork loading bounded to repository-local SVG/PNG/JPEG/WebP files under the existing 256 KiB limit.

### Validation

- Promoted the manually verified `0.5.1-rc.1` line.
- Repository tests, JavaScript syntax checks, npm package dry-run validation, and isolated DSH `0.2.0-rc.2` install smoke tests passed before release.
- Real Harness UI verification covered Browse artwork and the visual distinction between Refresh and package Update actions.

## [0.5.0] - 2026-10-05

### Added

- Clean DSH 0.2.x implementation line with native `plugins.bundle.config` integration and no carried 0.1.x compatibility layer.
- `Sources | Browse | Updates` navigation integrated into the native Plugin Manager detail page.
- Federated discovery across npm, GitHub, custom JSON, and corporate catalog sources.
- Source management with enable/disable, add/remove, refresh, copy-address, health, count, and error state.
- Fast Browse search with compact source/release/freshness/tag/compatibility/page-size filters and combinable relevance/stars/downloads/freshness/name sorting.
- Native Plugin Manager install flow from Browse through `remote.pluginManager.inspect()` and `installBundle()`.
- Installed bundle synchronization through `listBundles()` and `plugin-manager/changed`.
- Per-package update discovery for npm-backed installed bundles and updates through the native Plugin Manager.
- Runtime DSH compatibility evidence with `Compatible`, `Incompatible`, and `Not verified` states plus a compatibility filter.
- Package versions, GitHub stars, release/repository freshness, package artwork, npm 30-day downloads, and lazy lifetime npm download totals.
- Host-side RPC hardening with bounded responses, timeouts, redirect validation, DNS pinning, and private-network blocking.

### Changed

- Package compatibility is now `>=0.2.0-rc.2 <0.3.0`.
- Compatibility checks use the DSH version from the active installation manifest rather than a hardcoded RC value.
- Registry UI was rebuilt to follow DSH 0.2.x Plugin Manager layout, theme tokens, switch geometry, icon actions, hairlines, and compact filter behavior.
- Install actions are icon-only and known-incompatible packages are disabled before they reach the native Plugin Manager.
- Combined sorting uses equal-weight percentile-normalized ranking so every active criterion can influence the result.
- npm lifetime download totals are resolved lazily for visible rows and are never exposed as partial totals.

### Fixed

- Corrected package freshness so GitHub repository metadata updates do not make npm releases appear to have been published today.
- Corrected combined Browse sorting so secondary active criteria materially affect ranking.
- Corrected npm download presentation so `30d` and `total` evidence remain paired and partial lifetime sums are not shown as final totals.
- Corrected compact-filter layout, selected-value clipping, horizontal overflow, and page-size/freshness control widths.
- Corrected source health/checking state handling and restored native-style source controls and icons.

### Known limitations

- Build-script approval remains in the native **Add plugin** dialog.
- Bulk **Update all** / cancellation is not yet part of the DSH 0.2.x line.
- GitHub-only installed packages without npm package identity are not yet included in automatic update discovery.

## [0.4.17] - 2026-10-01

### Added

- Native plugin update actions for installed bundles and Registry **Updates** cards.
- **Update all** workflow with sequential updates and cancellation of the active/remaining queue.
- Cancel support for individual update operations through the DSH Plugin Manager request id.
- Compact **Add a new source** layout with icon-only cancel/add actions on desktop.

### Changed

- Registry UI controls were aligned more closely with the DSH 0.1.7-rc.2 visual language, including native primitives, semantic theme tokens, DSH radius roles, and 0.5px neutral hairlines.
- Browse cards and artifact links were aligned with native Plugin Manager presentation.
- DSH runtime/client dependencies and CI smoke validation were moved to `0.1.7-rc.2`.
- Package compatibility floor became `>=0.1.7-rc.2 <0.2.0`.

## [0.4.16] - 2026-09-30

- Integrated Registry Aggregator directly below native **Installed** on the DSH Plugins page.
- Added expandable Installed registry metadata and advisory update badges.
- Added exact installed-package metadata lookup, GitHub star enrichment, compatibility evidence, persisted Browse state, and bounded caches.

Full release details are also kept under [`.github/release-notes/`](.github/release-notes/).
