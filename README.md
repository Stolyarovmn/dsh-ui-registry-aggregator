# Registry Aggregator for DeepSeek Harness 0.2.x

This branch is the clean DSH `0.2.0` implementation line. It does **not** carry compatibility code or UI workarounds from DSH `0.1.x`.

Current stable version: `0.5.0`  
Current test version: `0.5.1-rc.1`  
Current validation baseline: DSH `v0.2.0-rc.2`. Compatibility checks use the actual running DSH version from the active installation manifest rather than a hardcoded RC.

## Install from npm

```powershell
$DSH_VERSION = "0.2.0-rc.2"
$PROFILE = "dsh-020-test"
$env:DSH_HOME = "$env:USERPROFILE\.dsh-020-test"

pnpm dlx "@deepseek-ai/dsh@$DSH_VERSION" plugin --profile $PROFILE add "@stolyarovmn/dsh-ui-registry-aggregator@0.5.0"
pnpm dlx "@deepseek-ai/dsh@$DSH_VERSION" --profile $PROFILE
```

The package declares DSH compatibility as `>=0.2.0-rc.2 <0.3.0`. Registry compatibility badges are evaluated against the DSH version that is actually running.

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
- live Updates discovery from native installed bundles plus latest npm manifests, with per-package update through `remote.pluginManager.installBundle`;
- no runtime import of Harness Client implementation packages;
- Harness-provided React and DSH theme tokens.

Known limitations in `0.5.0`:

- build-script approval UI remains in the native **Add plugin** dialog;
- bulk **Update all** / cancel orchestration is not part of the DSH 0.2 line yet;
- update discovery for GitHub-only installed dependencies without npm package identity is not implemented yet.

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
$DSH_VERSION = "0.2.0-rc.2"
$PROFILE = "dsh-020-test"
$COMMIT = "<commit-sha>"
$env:DSH_HOME = "$env:USERPROFILE\.dsh-020-test"

pnpm dlx "@deepseek-ai/dsh@$DSH_VERSION" plugin --profile $PROFILE add "github:Stolyarovmn/dsh-ui-registry-aggregator#$COMMIT"
pnpm dlx "@deepseek-ai/dsh@$DSH_VERSION" --profile $PROFILE
```

Then open **Plugins → Installed → Registry Aggregator → Sources** and verify source state in the real Harness UI.

## Historical lines

- `dsh-0.1.7` — stable `v0.4.17` line for DSH `0.1.7-rc.2`.
- `dsh-0.1.5` — historical DSH `0.1.5-rc.3` compatibility line.
- `main` — neutral project landing branch.
