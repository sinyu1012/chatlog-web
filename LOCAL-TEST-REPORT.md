# Local archive validation

## Verified baseline

The local archive suite uses **real plaintext SQLite files**, imported through the production-built browser Worker and SQLite WASM/OPFS storage. Fixtures contain fictional people and messages. No private database, process, key or account is accessed.

Baseline run: https://github.com/sinyu1012/chatlog-web/actions/runs/35845888750

- 45 JavaScript unit tests across the existing core, archive decoder/schema boundaries and Worker argument handling.
- `npm run lint -- --no-fix src`.
- `npm run build`.
- 29 existing HTTP/demo browser regression checks.
- 28 local archive browser checks, including multi-shard SQLite import, ordinary Zstd, explicit unparsed messages, 64-bit ID preservation, Chinese short-keyword and literal wildcard searches, AND/OR before pagination, full-index statistics, all seven desktop views, safe text rendering, CSV download, attachment association/persistence, reload without backend requests, invalid/unsupported replacement rollback, cancellation, WAL rejection, source switching and clearing.

The final review adds seven local-source mobile-route checks plus a dark-mode source screen, and waits for mobile navigation to finish closing before taking the README screenshot. Consult `images/wcdb/manifest.json` and the final PR CI checks for the executed checklist and source commit, rather than treating planned test additions as passed.

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

Browser test screenshots are generated under `images/ui/` and `images/wcdb/`. The archive name is explicitly marked as a synthetic SQLite demonstration. Browser evidence is attached to CI runs. Sources/attachments are generated in a temporary directory, not copied from a user's filesystem.

## Not validated

Real WeChat database versions across macOS/Windows/Linux, physical devices, Safari/Firefox, multi-gigabyte performance, dictionary-compressed content, encrypted DB/WAL files, encrypted `.dat` attachments, and SILK conversion. The stated import limits are protective ceilings, not performance or compatibility guarantees. Source snapshot completeness cannot be established merely from successfully reading a database.
