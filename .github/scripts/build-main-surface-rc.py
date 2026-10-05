from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
UPSTREAM_COMMIT = "639ed015397290b3745d163aafe02ffee4aa3f84"
PATCH_NAME = "dsh-v0.2.0-rc.2-plugins-main-section.patch"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"anchor not found: {label}")
    return text.replace(old, new, 1)


def run(*args: str, cwd: Path | None = None, capture: bool = False) -> str:
    result = subprocess.run(args, cwd=cwd, text=True, check=True, capture_output=capture)
    return result.stdout if capture else ""


def patch_plugin() -> None:
    client_path = ROOT / "client.js"
    client = client_path.read_text()
    client = replace_once(
        client,
        "    function RegistryAggregator({ t, view }) {\n      const [tab, setTab] = React.useState('sources')\n      const updateDiscovery = useUpdateDiscovery(view === 'page')\n",
        "    function RegistryAggregator({ t, view }) {\n      const active = view === undefined || view === 'page'\n      const [tab, setTab] = React.useState('sources')\n      const updateDiscovery = useUpdateDiscovery(active)\n",
        "RegistryAggregator activation",
    )
    client = replace_once(client, "      if (view !== 'page') return null\n", "      if (!active) return null\n", "RegistryAggregator guard")
    client = replace_once(
        client,
        """        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: bundle page')
""",
        """        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.main.section', () => ctx.slots.register({
            name: 'plugins.main.section',
            id: 'registry-aggregator',
            order: 100,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: Plugins main page')
        ctx.effect(() => ctx.configForms.whileServed([HOST_ENTRY], () =>
          ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
            name: 'plugins.bundle.config',
            key: PACKAGE,
            locale: NS,
          }, RegistryAggregator))), 'registry-aggregator: bundle page fallback')
""",
        "slot registration",
    )
    client_path.write_text(client)

    pkg_path = ROOT / "package.json"
    pkg = json.loads(pkg_path.read_text())
    if pkg["version"] != "0.5.2-rc.1":
        raise RuntimeError(f"unexpected package version: {pkg['version']}")
    pkg["version"] = "0.5.2-rc.2"
    pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n")

    test_path = ROOT / "test" / "skeleton.test.js"
    test = test_path.read_text()
    test = replace_once(
        test,
        "test('uses the native bundle slot but binds the Host entry form explicitly', () => {\n  assert.match(client, /plugins\\.bundle\\.config/)\n",
        "test('uses the native Plugins main slot with bundle-detail fallback and binds the Host entry form explicitly', () => {\n  assert.match(client, /plugins\\.main\\.section/)\n  assert.match(client, /name: 'plugins\\.main\\.section'/)\n  assert.match(client, /id: 'registry-aggregator'/)\n  assert.match(client, /order: 100/)\n  assert.match(client, /plugins\\.bundle\\.config/)\n",
        "slot test",
    )
    test += """

test('main Plugins surface and bundle fallback share the same Registry Aggregator view safely', () => {
  assert.match(client, /const active = view === undefined \\|\\| view === 'page'/)
  assert.match(client, /useUpdateDiscovery\\(active\\)/)
  assert.match(client, /if \\(!active\\) return null/)
  assert.match(client, /registry-aggregator: Plugins main page/)
  assert.match(client, /registry-aggregator: bundle page fallback/)
})
"""
    test_path.write_text(test)

    readme_path = ROOT / "README.md"
    readme = readme_path.read_text().replace("Current test version: `0.5.2-rc.1`", "Current test version: `0.5.2-rc.2`")
    section = """## Native Plugins main-page integration

`0.5.2-rc.2` can render Registry Aggregator directly on the native Plugins list through the additive `plugins.main.section` slot. Stock DSH `0.2.0-rc.2` does not declare that slot, so this branch includes an exact version-matched Harness patch at `docs/dsh-v0.2.0-rc.2-plugins-main-section.patch`. The existing `plugins.bundle.config` registration remains as a fallback on stock Harness builds.

For manual UI validation use the instructions in `docs/DSH_0.2.0_RC2_MAIN_SECTION.md`.

"""
    marker = "## Install from npm\n"
    if section not in readme:
        readme = replace_once(readme, marker, section + marker, "README install marker")
    readme_path.write_text(readme)


def patch_upstream() -> None:
    tmp = Path(tempfile.mkdtemp(prefix="dsh-main-section-"))
    try:
        run("git", "clone", "--depth", "1", "--branch", "dsh-v0.2.0-rc.2", "https://github.com/deepseek-ai/deepseek-harness.git", str(tmp))
        actual = run("git", "rev-parse", "HEAD", cwd=tmp, capture=True).strip()
        if actual != UPSTREAM_COMMIT:
            raise RuntimeError(f"unexpected upstream commit: {actual}")

        p = tmp / "packages/client/ui-plugin-manager/src/client/slot-contract.ts"
        s = p.read_text()
        s = replace_once(
            s,
            """  interface SlotMap {
    /** Optional guidance after the user enables a bundle from the list, keyed by npm package name. */
""",
            """  interface SlotMap {
    /** Additive sections rendered on the Plugins list after the native Official and Installed groups. */
    'plugins.main.section': { kind: 'list'; scope: 'root'; owner: Record<never, never> }
    /** Optional guidance after the user enables a bundle from the list, keyed by npm package name. */
""",
            "upstream slot contract",
        )
        p.write_text(s)

        p = tmp / "packages/client/ui-plugin-manager/src/client/index.ts"
        s = p.read_text()
        s = replace_once(
            s,
            """      children: {
        'plugins.item': { kind: 'list', scope: 'root' },
""",
            """      children: {
        'plugins.main.section': { kind: 'list', scope: 'root' },
        'plugins.item': { kind: 'list', scope: 'root' },
""",
            "upstream children",
        )
        p.write_text(s)

        p = tmp / "packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx"
        s = p.read_text()
        s = replace_once(
            s,
            """  & PropsRenderSlots<
    | 'plugins.item' | 'plugins.bundle.config' | 'plugins.row.config' | 'plugins.bundle.activation'
    | 'plugins.detail.actions' | 'plugins.detail.badge' | 'plugins.detail.section'
  >
""",
            """  & PropsRenderSlots<
    | 'plugins.main.section' | 'plugins.item' | 'plugins.bundle.config' | 'plugins.row.config' | 'plugins.bundle.activation'
    | 'plugins.detail.actions' | 'plugins.detail.badge' | 'plugins.detail.section'
  >
""",
            "upstream props",
        )
        s = replace_once(
            s,
            """        : null}
      {showsCards && activated !== undefined && !state.install.open
""",
            """        : null}
      {loaded && showsCards ? renderSlot('plugins.main.section', {}) : null}
      {showsCards && activated !== undefined && !state.install.open
""",
            "upstream render",
        )
        p.write_text(s)

        p = tmp / "packages/client/ui-plugin-manager/tests/browser-plugin.client.spec.tsx"
        s = p.read_text()
        s = replace_once(
            s,
            "    expect(b.slots.spec('plugins.item')).toMatchObject({ kind: 'list', scope: 'root' })\n",
            "    expect(b.slots.spec('plugins.main.section')).toMatchObject({ kind: 'list', scope: 'root' })\n    expect(b.slots.spec('plugins.item')).toMatchObject({ kind: 'list', scope: 'root' })\n",
            "upstream browser contract test",
        )
        p.write_text(s)

        changed = [
            "packages/client/ui-plugin-manager/src/client/slot-contract.ts",
            "packages/client/ui-plugin-manager/src/client/index.ts",
            "packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx",
            "packages/client/ui-plugin-manager/tests/browser-plugin.client.spec.tsx",
        ]
        run("git", "diff", "--check", cwd=tmp)
        patch = run("git", "diff", "--", *changed, cwd=tmp, capture=True)
        docs = ROOT / "docs"
        docs.mkdir(exist_ok=True)
        patch_path = docs / PATCH_NAME
        patch_path.write_text(patch)
        if patch_path.stat().st_size == 0:
            raise RuntimeError("generated patch is empty")
        run("git", "reset", "--hard", "HEAD", cwd=tmp)
        run("git", "apply", "--check", str(patch_path), cwd=tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def write_docs() -> None:
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    (docs / "DSH_0.2.0_RC2_MAIN_SECTION.md").write_text("""# DSH 0.2.0-rc.2 — Registry Aggregator on the native Plugins page

Target Harness: `dsh-v0.2.0-rc.2` (`639ed015397290b3745d163aafe02ffee4aa3f84`).

Stock `0.2.0-rc.2` does not expose a main-page list slot for an additive Registry section. The companion patch `dsh-v0.2.0-rc.2-plugins-main-section.patch` adds the smallest host-owned extension point required by the plugin:

- declares `plugins.main.section` as a root-scoped list slot;
- exposes it from the native Plugin Manager `main` registration;
- renders contributions after the native Official and Installed groups, only in list view;
- adds a browser contract assertion for the new slot.

Registry Aggregator `0.5.2-rc.2` registers into that slot and retains `plugins.bundle.config` as a stock-Harness fallback.

## Manual validation on Windows / PowerShell

```powershell
$DSH_REPO = "$HOME\\src\\deepseek-harness-0.2.0-rc.2-main-section"
$PLUGIN_COMMIT = "REPLACE_WITH_FINAL_RC_COMMIT"
$PROFILE = "dsh-020-main-section-test"
$env:DSH_HOME = "$env:USERPROFILE\\.dsh-020-main-section-test"

if (Test-Path $DSH_REPO) { Remove-Item -Recurse -Force $DSH_REPO }
git clone --branch dsh-v0.2.0-rc.2 --depth 1 https://github.com/deepseek-ai/deepseek-harness.git $DSH_REPO
Set-Location $DSH_REPO

Invoke-WebRequest `
  "https://raw.githubusercontent.com/Stolyarovmn/dsh-ui-registry-aggregator/$PLUGIN_COMMIT/docs/dsh-v0.2.0-rc.2-plugins-main-section.patch" `
  -OutFile "$env:TEMP\\dsh-plugins-main-section.patch"

git apply --check "$env:TEMP\\dsh-plugins-main-section.patch"
git apply "$env:TEMP\\dsh-plugins-main-section.patch"

corepack enable
pnpm install --frozen-lockfile
pnpm run build

pnpm dsh plugin --profile $PROFILE add "github:Stolyarovmn/dsh-ui-registry-aggregator#$PLUGIN_COMMIT"
pnpm dsh --profile $PROFILE
```

Expected result on the main **Plugins** list: native Official and Installed groups remain unchanged; below them Registry Aggregator renders `Sources | Browse | Updates N`. Opening the Registry Aggregator package detail still renders the existing fallback UI.

Do not publish or merge this RC until the real Harness UI has been checked.
""")


if __name__ == "__main__":
    patch_plugin()
    patch_upstream()
    write_docs()
