# DSH 0.2.0-rc.2 — Registry Aggregator on the native Plugins page

Target Harness: `dsh-v0.2.0-rc.2` (`639ed015397290b3745d163aafe02ffee4aa3f84`).

Stock `0.2.0-rc.2` does not expose a main-page list slot for an additive Registry section. The companion patch `dsh-v0.2.0-rc.2-plugins-main-section.patch` adds the smallest host-owned extension point required by the plugin:

- declares `plugins.main.section` as a root-scoped list slot;
- exposes it from the native Plugin Manager `main` registration;
- renders contributions after the native Official and Installed groups, only in list view;
- adds a browser contract assertion for the new slot.

Registry Aggregator `0.5.2-rc.2` registers into that slot and retains `plugins.bundle.config` as a stock-Harness fallback.

## Manual validation on Windows / PowerShell

```powershell
$DSH_REPO = "$HOME\src\deepseek-harness-0.2.0-rc.2-main-section"
$PLUGIN_COMMIT = "REPLACE_WITH_FINAL_RC_COMMIT"
$PROFILE = "dsh-020-main-section-test"
$env:DSH_HOME = "$env:USERPROFILE\.dsh-020-main-section-test"

if (Test-Path $DSH_REPO) { Remove-Item -Recurse -Force $DSH_REPO }
git clone --branch dsh-v0.2.0-rc.2 --depth 1 https://github.com/deepseek-ai/deepseek-harness.git $DSH_REPO
Set-Location $DSH_REPO

Invoke-WebRequest `
  "https://raw.githubusercontent.com/Stolyarovmn/dsh-ui-registry-aggregator/$PLUGIN_COMMIT/docs/dsh-v0.2.0-rc.2-plugins-main-section.patch" `
  -OutFile "$env:TEMP\dsh-plugins-main-section.patch"

git apply --check "$env:TEMP\dsh-plugins-main-section.patch"
git apply "$env:TEMP\dsh-plugins-main-section.patch"

corepack enable
pnpm install --frozen-lockfile
pnpm run build

pnpm dsh plugin --profile $PROFILE add "github:Stolyarovmn/dsh-ui-registry-aggregator#$PLUGIN_COMMIT"
pnpm dsh --profile $PROFILE
```

Expected result on the main **Plugins** list: native Official and Installed groups remain unchanged; below them Registry Aggregator renders `Sources | Browse | Updates N`. Opening the Registry Aggregator package detail still renders the existing fallback UI.

Do not publish or merge this RC until the real Harness UI has been checked.
