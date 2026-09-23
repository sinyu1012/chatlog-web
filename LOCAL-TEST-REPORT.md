# Local archive validation

## Verified coverage

The local archive suite uses **real plaintext SQLite files**, imported through the production-built browser Worker and SQLite WASM/OPFS storage. Fixtures contain fictional people and messages. No private database, process, key or account is accessed.

Validated review run: https://github.com/sinyu1012/chatlog-web/actions/runs/35846323980

- 45 JavaScript unit tests across the existing core, archive decoder/schema boundaries and Worker argument handling.
- `npm ci --no-audit --no-fund`, `npm run lint -- --no-fix src`, `npm run build`.
- 29 existing HTTP/demo browser regression checks.
- 36 local archive browser checks: multi-shard SQLite import, ordinary Zstd, explicit unparsed messages, 64-bit ID preservation, Chinese short-keyword and literal wildcard searches, AND/OR before pagination, full-index statistics, all seven desktop and 390px mobile views, safe text rendering, CSV download, attachment association/persistence, reload without backend requests, invalid/unsupported replacement rollback, cancellation, WAL rejection, source switching, source-manager dark mode, and clearing.

`images/wcdb/manifest.json` records the checklist and source commit used for committed screenshots. The final PR reruns both validation workflows against committed source. Validation has read-only repository permissions and cannot rewrite application code or push commits.

## Reproduce

```sh
npm ci
node --test tests/*.test.mjs
npm run lint -- --no-fix src
npm run build
python -m pip install playwright==1.52.0 pillow
python -m playwright install chromium
python tests/browser-smoke.py
python tests/browser-local.py
```

Browser screenshots are generated under `images/ui/` and `images/wcdb/`. The archive name is explicitly marked as a synthetic SQLite demonstration. Browser evidence is attached to CI runs. Sources and attachments are generated in a temporary directory, not copied from a user's filesystem.

## Not validated

Real WeChat database versions across macOS/Windows/Linux, physical devices, Safari/Firefox, multi-gigabyte performance, dictionary-compressed content, encrypted DB/WAL files, encrypted `.dat` attachments, and SILK conversion. The stated import limits are protective ceilings, not performance or compatibility guarantees. Source snapshot completeness cannot be established merely from successfully reading a database.
