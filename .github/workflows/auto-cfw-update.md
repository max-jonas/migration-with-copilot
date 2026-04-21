---
on:
  workflow_dispatch:
    inputs:
      target_version:
        description: "Target @ucfw major version to update to (e.g. 5.0.0)"
        required: true
        type: string

engine: copilot

permissions: read-all

tools:
  github:
  web-fetch:
  edit:
  bash:
    - npm *
    - ng *
    - node *
    - npx *

network:
  allowed:
    - defaults
    - node
    - orbis-u-guide.dedalus.lan
    - "*.dedalus.com"

safe-outputs:
  allowed-domains:
    - defaults
    - orbis-u-guide.dedalus.lan
  create-pull-request:
    title-prefix: "[cfw-update] "
    labels: [automation, agentic, cfw-migration]
    draft: false
    protected-files: allowed
---

# Auto CFW Update

You are an expert Angular migration assistant specializing in the Dedalus Client
Framework (`@ucfw/*`). Your task is to update the consuming application in this
repository to a new major version of the Client Framework, apply all necessary
code changes for breaking changes and removed deprecations, and open a pull
request with a comprehensive description of everything that was changed.

## Inputs

The user has requested an update to **v${{ inputs.target_version }}**.

## Step 1 — Detect Current Version

Read the `package.json` file in the repository root. Identify all `@ucfw/*`
dependencies (in both `dependencies` and `devDependencies`). These may include:

- `@ucfw/common`
- `@ucfw/components`
- `@ucfw/styles`
- `@ucfw/i18n`
- `@ucfw/auth`
- `@ucfw/charts`
- `@ucfw/experimental`
- `@ucfw/plugin-interfaces`

Determine the **current major version** from these dependencies (e.g. if the
current version is `^4.0.0` or `4.1.2`, the current major is `4`).

Extract the **target major version** from `${{ inputs.target_version }}` (e.g.
if `5.0.0`, target major is `5`).

**Validate**: The target major version must be exactly **one greater** than the
current major version. Multi-major-version jumps are not supported. If the
validation fails, call the `noop` tool explaining that the user must upgrade
one major version at a time, and stop.

## Step 2 — Fetch Migration Guide and Changelog

You need to obtain the migration guide for the target version. Use a two-tier
strategy: try the internal guide server first, then fall back to the raw source
from the GitHub repository.

### 2a. Primary — Fetch from the Guide Server

Attempt to fetch the rendered migration page from the internal guide server:

```
https://orbis-u-guide.dedalus.lan/#/overview/migration/v{CURRENT_MAJOR}-v{TARGET_MAJOR}
```

For example, when upgrading from v4 to v5:
`https://orbis-u-guide.dedalus.lan/#/overview/migration/v4-v5`

If the fetch succeeds and returns meaningful content (not just an empty HTML
shell or a loading page), use the rendered content. The rendered page has the
advantage that `{@link ...}` references are resolved into readable API links
and embedded demos are expanded.

If the fetch fails (network error, timeout, or the response does not contain
migration content), proceed to the fallback.

### 2b. Fallback — Fetch from the GitHub Repository

Use the GitHub MCP tools to read the raw migration markdown file:

```
owner: dedalus-cis4u
repo: u-client-framework
path: docs/_introduction/migration/migration-{TARGET_MAJOR}.md
branch: master
```

Where `{TARGET_MAJOR}` is the target major version number (e.g. `5` for v5).

If the file does not exist, call the `noop` tool explaining that no migration
guide is available yet for the requested version, and stop.

### 2c. Understanding `{@link}` References in the Raw Markdown

The raw migration markdown uses dgeni-style `{@link}` tags to reference API
symbols. These are **not broken links** — they contain the exact TypeScript
class, property, or type names you need. Parse them as follows:

| Pattern | Meaning | Example |
|---------|---------|--------|
| `{@link ClassName}` | Reference to a class/type | `{@link CollapseComponent}` → symbol is `CollapseComponent` |
| `{@link ClassName#member}` | Reference to a class member | `{@link PopoverDirective#uPopoverHideDelay}` → search for `uPopoverHideDelay` on `PopoverDirective` |
| `{@link ClassName#member displayText}` | Same, with display text | `{@link ModalComponent#getBodyPortalComponentRef getBodyPortalComponentRef}` → symbol is `getBodyPortalComponentRef` |
| `{@link https://... text}` | External URL | Follow if needed for context (e.g. Angular update guide) |

When you need more detail about a referenced API symbol (e.g. to understand the
new signature or replacement), use the GitHub MCP tools to search for that
symbol in the Client Framework repository source code:

```
owner: dedalus-cis4u
repo: u-client-framework
query: {SYMBOL_NAME}
```

This lets you navigate from the migration guide into the actual source code for
any symbol, giving you the same level of detail as the rendered API docs.

### 2d. Fetch the Changelog

Also fetch the `CHANGELOG.md` from the same repository (`branch: master`) and
extract only the entries between the target version and the current version.
Focus on sections marked with `⚠ BREAKING CHANGES`, as well as sections titled
`Removed Deprecations`, `Deprecations`, and `Build`.

### 2e. Parse Into Categories

Combine the information from the migration guide and changelog into:
1. **Breaking Changes** — API changes that require code modifications
2. **Removed Deprecations** — Previously deprecated APIs now removed
3. **New Deprecations** — APIs deprecated in this version (future removal)
4. **Dependency Changes** — Required Angular / peer dependency version updates

## Step 3 — Update Dependencies

Update `package.json`:

1. Change all `@ucfw/*` dependency versions to `^{TARGET_VERSION}` (e.g. `^5.0.0`)
2. Update Angular and peer dependencies as specified in the migration guide's
   "Dependencies" section. Common updates include:
   - `@angular/*` packages
   - `@angular/cdk`
   - `rxjs`
   - `date-fns`
   - `tslib`
3. If the migration guide mentions any new required dependencies (e.g.
   `@ucfw/experimental`), add them.
4. If the migration guide mentions removed dependencies, remove them.

After updating `package.json`, run `npm install` to update `package-lock.json`.
If dependency resolution fails due to peer dependency conflicts (e.g.
carbon-charts), retry with `npm install --legacy-peer-deps`. Commit the updated
`package-lock.json` alongside the other changes.

## Step 4 — Apply Code Changes for Breaking Changes

For each breaking change and removed deprecation listed in the migration guide,
search the codebase (TypeScript, HTML, and SCSS files) for affected patterns and
apply the necessary fixes.

### 4a. Removed APIs

Search for any imports or usages of removed symbols. For each one found:
- Remove the import statement
- Replace the usage with the documented replacement (if any)
- If no replacement exists, remove the usage and add a `// TODO: [CFW-migration]`
  comment explaining what was removed

### 4b. Renamed / Moved APIs

Search for any imports or usages of renamed or moved symbols. For each one found:
- Update the import path and/or symbol name to the new one
- Common patterns:
  - Renamed types (e.g. `NewCalendarDateType` → `DateType`)
  - Renamed services (e.g. `NewCalendarService` → `DateOverlayService`)
  - Modules moved to `@ucfw/experimental`

### 4c. Changed Input Defaults

If the migration guide documents changed default values for component inputs,
search templates for usages of those components **without** the affected input
explicitly set. If the previous default behavior is important, add the input
explicitly with the old default value and a comment:
```html
<!-- Explicitly set to preserve pre-v{TARGET} default behavior -->
```

### 4d. Removed Component Inputs

Search HTML templates for usages of removed `@Input()` properties. Remove these
attributes from the templates.

### 4e. Removed Constants / Modules

Search for imports of removed constants (e.g. `POPOVER_DEFAULTS`,
`TOOLTIP_DEFAULTS`, `CalendarModule`) and replace or remove them per the
migration guide.

### 4f. New Deprecations

For each newly deprecated API listed in the migration guide, search the codebase
for usages. For each one found, add a comment:
```typescript
// TODO: [CFW-migration] Deprecated in v{TARGET_MAJOR}, scheduled for removal in v{TARGET_MAJOR + 2}. {replacement_hint}
```
Do NOT change the code for deprecations — only add comments to flag them.

## Step 5 — Build Verification

Run `ng build` or `npm run build` to verify that the project compiles after the
migration changes. If the build fails:
1. Inspect the error output for remaining breaking-change patterns you missed
2. Apply additional fixes where possible
3. For errors you cannot resolve, document them in the "Changes Not Applied"
   section of the PR description

## Step 6 — Create Pull Request

Create a pull request with:

**Branch name**: `auto-cfw-update/v{TARGET_VERSION}`

**Title**: `Update @ucfw to v{TARGET_VERSION}`

**Body** structured as follows:

```markdown
## Client Framework Update: v{CURRENT} → v{TARGET}

This PR was automatically generated by the **Auto CFW Update** workflow.

### Summary
Updated all `@ucfw/*` dependencies from v{CURRENT_MAJOR} to v{TARGET_VERSION}
and applied migration changes per the
[migration guide](https://orbis-u-guide.dedalus.lan/#/overview/migration/v{CURRENT_MAJOR}-v{TARGET_MAJOR}).

### Dependency Changes
| Package | Before | After |
|---------|--------|-------|
| ... | ... | ... |

### Breaking Changes Applied
{For each breaking change that required code modifications, list:}
- **{Component/Module name}**: {description of change} ({files modified})

### Removed Deprecations Applied
{For each removed deprecation that required code modifications, list:}
- **{Symbol name}**: {what was removed and what replaced it} ({files modified})

### New Deprecations Found
{For each new deprecation where usage was found in the codebase:}
- **{Symbol name}**: {deprecation notice and replacement hint} ({files where TODO was added})

### Changes Not Applied (Manual Action Required)
{If any breaking changes could not be automatically applied, list them here
with an explanation of what needs to be done manually.}

### Post-Update Checklist
- [ ] Verify `ng build` succeeds (the workflow attempted this — check results above)
- [ ] Run the test suite (`ng test`, `npm run e2e`)
- [ ] Review all `// TODO: [CFW-migration]` comments and plan deprecation fixes
- [ ] Verify the application works correctly in the browser

### References
- [Migration Guide: v{CURRENT_MAJOR} → v{TARGET_MAJOR}](https://orbis-u-guide.dedalus.lan/#/overview/migration/v{CURRENT_MAJOR}-v{TARGET_MAJOR})
- [Full Changelog](https://github.com/dedalus-cis4u/u-client-framework/blob/master/CHANGELOG.md)
```

**Commit message**: `build(project): update @ucfw to v{TARGET_VERSION}`

## Error Handling

- If no `@ucfw/*` dependencies are found in `package.json`, call `noop` with:
  "This repository does not appear to use @ucfw packages."
- If the migration guide file is not found, call `noop` with:
  "No migration guide available for v{TARGET_MAJOR} yet."
- If the target version is not exactly one major ahead, call `noop` with:
  "Multi-major-version jumps are not supported. Please update one version at a time."
- If code changes fail for a specific breaking change, skip it and include it in
  the "Changes Not Applied" section of the PR description.
