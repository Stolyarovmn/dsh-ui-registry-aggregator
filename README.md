# Registry Aggregator for DeepSeek Harness 0.2.x

This branch is the DSH `0.2.1-alpha.1` compatibility line, forked from `dsh-0.2.0`. It does **not** carry compatibility code or UI workarounds from DSH `0.1.x`.

Current stable version: `0.5.1`  
Current test version: `0.5.2-rc.2`  
Current validation baseline: DSH `v0.2.1-alpha.1`. Compatibility checks use the actual running DSH version from the active installation manifest rather than a hardcoded release.

The compatibility build in this branch is validated from a Git commit first. It is not published to npm merely for testing.

The package declares DSH compatibility as `>=0.2.1-alpha.1 <0.3.0`. This deliberately drops the older `0.2.0-rc.2` floor on this branch and does not claim compatibility with unverified future prereleases whose core version changes.

## Current milestone

The native Plugin Manager remains responsible for package lifecycle. Registry Aggregator adds discovery capabilities around it.

Implemented in this milestone:

- native `plugins.bundle.config` integration;
- `Sources | Browse | Updates` navigation;
- live source configuration through `ctx.configForms.get('registry-aggregator')`; the bundle slot is presentation-only because DSH does not guarantee a single `form` for bundle-wide pages;
- built-in npm and GitHub sources;
- custom JSON and corporate catalog sources;
- Host-side health checks and discovered-item counts;
- per-source enable/disable, add, remove, refresh, copy-address, count, and error state;
- DSH 0.2-native switch geometry and icon-action sizing copied under the plugin namespace;
- authenticated Host RPC over the DSH Connection service;
- bounded responses, request timeouts, redirect validation, DNS pinning, and private-network blocking;
- no duplicate `Installed` view;
- live federated Browse search across enabled npm, GitHub, custom JSON, and corporate sources;
- compact single-row source/release/freshness/tag/compatibility/page-size filters on desktop, with responsive wrapping below 900px, multi-source metadata, and 20/50/100 pagination; compatibility uses the native DSH shield contour as its neutral filter icon;
- combinable multi-sort criteria for relevance, stars, downloads, freshness, and name with per-criterion direction; when several are active they contribute equally through percentile-normalized composite ranking, so every selected criterion can affect the order;
- npm 30-day download enrichment plus lazy paired `30d | total` stats for visible npm rows; lifetime totals are summed from the package creation date (or npm's 2015-01-10 data floor) in bounded windows, and the UI never presents a partial lifetime sum as a real total;
- package freshness distinguishes npm release time from GitHub repository push time, so GitHub metadata churn does not make every item look newly released;
- best-effort package artwork discovery prefers the official DSH top-level manifest `icon`; when it is absent, Browse can recover the GitHub repository from npm manifest metadata and lazily use a safe repository-local README logo/icon image. Installed Updates reuse the native Plugin Manager `BundleInfo.meta.icon`. All fetched artwork remains limited to SVG/PNG/JPEG/WebP and 256 KiB;
- popular/default Browse results when the query is empty;
- real npm/GitHub source marks and a package icon exposed through the DSH 0.2 manifest contract;
- horizontal layout containment for narrow Plugin Manager detail panes;
- one-click Browse installation through the native DSH `remote.pluginManager` service: `inspect` → `installBundle`, installed-state synchronization via `listBundles` / `plugin-manager/changed`, and inline failure reporting;
- icon-only Browse install states using the same local DSH-style glyph language as the rest of the page;
- explicit `v<version>` package versions plus lazy manifest evidence for GitHub/npm rows;
- compatibility evidence against the actual running DSH version, following DSH peer semantics for `@deepseek-ai/dsh` and `@deepseek-ai/dsh-*`; Browse shows `Compatible`, `Incompatible`, or neutral `Not verified` as plain colored text, and can filter by compatibility;
- live Updates discovery from native installed bundles plus latest npm manifests, with per-package update through `remote.pluginManager.installBundle`; package update actions use a distinct two-arrow Update glyph while content/list refresh keeps the single-arrow Refresh glyph;
- live numeric update indicator on the **Updates** tab, plus sequential **Update all** when more than one update is available; explicitly incompatible entries stay disabled, and Registry Aggregator updates itself last so it cannot interrupt the rest of the queue;
- no runtime import of Harness Client implementation packages;
- Harness-provided React and DSH theme tokens.

Known limitations in `0.5.2-rc.2`:

- build-script approval UI remains in the native **Add plugin** dialog;
- bulk update cancellation is not implemented yet; **Update all** runs eligible updates sequentially once started;
- update discovery for GitHub-only installed dependencies without npm package identity is not implemented yet.

## DSH 0.2.1-alpha.1 compatibility

The branch was checked against the version-matched official `cordis-plugin-development` guidance. The existing UI architecture remains valid: Harness-provided React, `ctx.slots.inject` / `ctx.slots.register`, lifecycle-owned effects, native Plugin Manager integration, and no runtime imports of Harness Client implementation packages.

The current Registry Aggregator is a package-root plugin, so the DSH `0.2.1-alpha.1` change that stops reading separate `package.json` files for subpath plugins does not require a package-layout change here. The removed runtime invariant exports and the old composer `stats` entry are not used by this plugin.

CI validates JavaScript syntax, repository tests, package dry-run, and an isolated install/dump-config smoke test against exactly `@deepseek-ai/dsh@0.2.1-alpha.1`.

## Architecture

```text
DSH Plugins
  └─ Installed
      └─ Registry Aggregator
          └─ plugins.bundle.config
              ├─ Sources
              ├─ Browse
              └─ Updates

Sources UI
  ├─ ctx.configForms.get('registry-aggregator')
  │    ├─ snapshot subscription
  │    └─ form.mutate(...) → Host Config.sources
  └─ ctx.connection.rpc.call
       └─ /api/plugin-sources/{health,counts,browse,icons,metadata,download-stats}
            └─ Host source adapters
                 ├─ npm
                 ├─ GitHub
                 ├─ custom-json
                 └─ corporate

Browse Install
  └─ native DSH remote.pluginManager
       ├─ inspect(spec)
       ├─ installBundle(spec)
       └─ listBundles() / plugin-manager/changed

Enable / disable / uninstall
  └─ native DSH Plugin Manager
```

## Test from GitHub

Use a commit SHA from this branch rather than publishing a test package:

```powershell
$DSH_VERSION = "0.2.1-alpha.1"
$PROFILE = "dsh-021-alpha-test"
$COMMIT = "<commit-sha>"
$env:DSH_HOME = "$env:USERPROFILE\.dsh-021-alpha-test"

pnpm dlx "@deepseek-ai/dsh@$DSH_VERSION" plugin --profile $PROFILE add "github:Stolyarovmn/dsh-ui-registry-aggregator#$COMMIT"
pnpm dlx "@deepseek-ai/dsh@$DSH_VERSION" --profile $PROFILE
```

Then open **Plugins → Installed → Registry Aggregator → Sources** and verify source state, Browse, Updates, install/update actions, and light/dark appearance in the real Harness UI.

## Historical lines

- `dsh-0.2.0` — DSH `0.2.0-rc.2` validation line and source of this compatibility branch.
- `dsh-0.1.7` — stable `v0.4.17` line for DSH `0.1.7-rc.2`.
- `dsh-0.1.5` — historical DSH `0.1.5-rc.3` compatibility line.
- `main` — neutral project landing branch.
