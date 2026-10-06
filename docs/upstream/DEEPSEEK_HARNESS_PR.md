# Upstream proposal: additive main Plugins section slot

Target upstream commit: `deepseek-ai/deepseek-harness@5badb15009ae1756c3afe0ae0cef1faafc290ccc` (`dsh-v0.2.1-alpha.1`).

## Proposed PR title

`feat(ui-plugin-manager): add main Plugins section slot`

## Problem

The Plugin Manager exposes configuration/detail extension points and `plugins.add.actions`, but it does not expose a list-level rendering surface after the native **Official** and **Installed** groups. A third-party discovery/registry plugin therefore cannot add a full-width `Sources | Browse | Updates` surface to the main Plugins page through the supported slot system.

## Change

Declare a root-scoped additive list slot named `plugins.main.section`, expose it from the Plugin Manager's `main` registration, and render it after the native list content while the Plugins page is in list view.

This keeps ownership in `ui-plugin-manager`: contributors only call `ctx.slots.inject('plugins.main.section', ...)`, so their registrations follow the Plugin Manager declaration lifecycle and do not import Client implementation packages or manipulate the DOM.

## Example contributor

```ts
ctx.slots.inject('plugins.main.section', () => ctx.slots.register({
  name: 'plugins.main.section',
  id: 'registry-aggregator',
  order: 100,
  locale: NS,
}, RegistryAggregator))
```

## Files

The prepared patch changes only:

- `packages/client/ui-plugin-manager/src/client/slot-contract.ts`
- `packages/client/ui-plugin-manager/src/client/index.ts`
- `packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx`
- `packages/client/ui-plugin-manager/tests/browser-plugin.client.spec.tsx`
- `docs/subsystems/slots.md`

Patch: `docs/upstream/deepseek-harness-plugins-main-section.patch`.

## Verification expected upstream

- `pnpm run typecheck`
- Plugin Manager browser tests
- Client/catalog generation checks if required by CI
- real Web UI: native Official/Installed remain unchanged; an injected section renders after them; leaving/re-entering Plugins disposes/reinstalls the contribution with the normal slot lifecycle.

No Registry Aggregator-specific code belongs in Harness; the proposed API is a generic additive extension point.
