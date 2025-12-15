# Integration snippets (Squarespace source of truth)

This folder contains the exact code that is pasted into Squarespace.
If something changes in Squarespace, the matching file here must be updated.

## Naming rules (this replaces a manifest)

### Sitewide injection
- `sitewide_*.html`
  Paste into:
  Squarespace → Settings → Advanced → Code Injection

### Page header code injection
- `headers_<page>.html`
  Paste into:
  That page → Settings → Advanced → Page Header Code Injection

  `<page>` should match the Squarespace page slug or a clear identifier
  (e.g. `members`, `vault-admin`).

### Page code blocks
- `blocks_<page>.html`
  Paste into:
  A Code Block on that page

## Editing workflow

1. Edit the relevant file in this folder.
2. Copy–paste the full contents into Squarespace.
3. Commit the change.

This folder is the only reference point – no separate manifests or indexes exist.
