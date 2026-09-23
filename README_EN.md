<div align="center">
  <img src="public/brand/logo.svg" width="64" alt="Chatlog" />
  <h1>Chatlog Web</h1>
  <p><strong>Every conversation deserves a place.</strong></p>
  <p>A quieter workspace for browsing your own conversation archive.</p>
  <p>English · <a href="README.md">简体中文</a> · <a href="UI-REDESIGN.md">Design notes</a> · <a href="LOCAL-TEST-REPORT.md">Local archive validation</a></p>
</div>

A read-only conversation archive viewer that connects to [chatlog](https://github.com/sjzar/chatlog) HTTP services or imports already-decrypted WeChat 4.x SQLite databases. The interface covers seven archive pages, a data-source manager, a shared sage-and-paper design system, dark mode, responsive navigation, and original SVG icons.

> This project contains no data-cracking code or instructions and does not invoke key-extraction tools. You provide the data and, optionally, a backend service. Only access data you are authorized to use. The interface does not send chat messages.

## HTTP and local plaintext archives

Use an existing chatlog HTTP service, or import already-decrypted WeChat 4.x SQLite files in **Data sources**. SQLite WASM runs inside a browser worker; this feature neither invokes key-extraction tools nor uploads chat data. All seven archive views share the selected source.

![Local import report using fictional SQLite fixtures](images/wcdb/sources.png)

<details>
<summary>Local chat history, attachments and mobile import</summary>

![Multi-shard local chat history](images/wcdb/chatlog.png)
![Local media references and attachment association](images/wcdb/media.png)
<img src="images/wcdb/mobile-sources.png" width="320" alt="Mobile data-source manager" />

</details>

Local archives require HTTPS/localhost, OPFS support and storage permission. The browser copy is not additionally encrypted. Unknown schemas, unsupported dictionary compression and missing attachments are explicit states, not empty history. Only synthetic fixtures have been automatically validated; compatibility with every WeChat build and complete history recovery are not claimed.

See [local archive documentation](docs/LOCAL-ARCHIVE.md) for consent, storage, resource limits, media support and tests.

## Screenshots

These are screenshots of the **running production build**, not design mockups. Names, conversations, chart values, and media are explicitly fictional demo data. Images are stored in this repository under `images/ui/` and reproduced by `tests/browser-smoke.py`.

### Overview

![Conversation archive overview](images/ui/dashboard.png)

### Chat history

![Conversation sidebar, search, filters and read-only messages](images/ui/chatlog.png)

### Analytics

![Consistent sample range, trends and hourly heatmap](images/ui/analytics.png)

### Media library

![Media gallery and type filters](images/ui/media.png)

<details>
<summary>Contacts, groups and sessions</summary>

![Contacts directory](images/ui/contacts.png)
![Group spaces](images/ui/chatrooms.png)
![Session timeline](images/ui/sessions.png)

</details>

<details>
<summary>Dark mode</summary>

![Dark media library](images/ui/media-dark.png)

</details>

### Mobile

<p>
  <img src="images/ui/mobile-dashboard.png" width="30%" alt="Mobile overview at 390px" />
  <img src="images/ui/mobile-chatlog.png" width="30%" alt="Mobile chat history at 390px" />
  <img src="images/ui/mobile-media.png" width="30%" alt="Mobile media library at 390px" />
</p>

## Pages and features

| Route | Features |
| --- | --- |
| `/sources` | HTTP/local switching, database import and cancellation, coverage report, attachment association and clearing browser archives |
| `/dashboard` | Archive counts, message trend, recent conversations and shortcuts |
| `/chatlog` | Conversation context, keyword/date filters, literal highlighting, pagination and CSV/JSON/text export |
| `/analytics` | Shared 7/30/90-day range; sampled HTTP data or the full imported local index; trends, types, heatmap, word counts and group ranking |
| `/contacts` | Search, details, copy ID and open history |
| `/chatrooms` | Group cards, membership metadata, details and pagination |
| `/sessions` | Recent-first timeline, private/group filters and search |
| `/media` | Media references, type filters, search and previews of HTTP resources or explicitly associated local attachments |

Shared features include `Cmd/Ctrl + K` search, connection settings, light/dark themes, mobile navigation, keyboard focus, loading, error and empty states. The 39 original stroke icons in `src/lib/icons.js` do not require icon fonts.

## Getting started

Development and CI use Node.js 22. Install from the committed lockfile:

```bash
npm ci
npm run serve
```

Open `http://localhost:8080`. For local data, open **Data sources** in the sidebar or `/sources` and select an already-decrypted, WAL-checkpointed, consistent snapshot from one account. No chatlog backend is needed for this source.

To explore without a backend or database, explicitly enable demo mode:

```text
http://localhost:8080/dashboard?demo=1
```

Errors never automatically switch to demo data. Demo audio, video and document cards are UI placeholders, not playable or downloadable files.

For the HTTP source, prepare your own service following the [chatlog documentation](https://github.com/sjzar/chatlog). The development proxy targets `http://127.0.0.1:5030` by default; override it with `CHATLOG_PROXY_TARGET`. Connection settings accept a trusted HTTP(S) backend URL; leave it empty for the same-origin proxy.

## Production

```bash
npm run build
```

Serve `dist/` with an SPA fallback to `index.html`. The default public base is `/`. For a subdirectory, build with an absolute base such as `VUE_APP_PUBLIC_PATH=/chatlog/` and configure the corresponding fallback.

Local database imports require HTTPS or localhost and OPFS storage access. Same-origin JavaScript and WASM assets must still load successfully; not uploading chat data does not mean an offline PWA has been implemented.

The following connection configuration applies only to the **HTTP source**. `VUE_APP_API_BASE_URL` sets the build-time API URL. Without it, production defaults to `http://127.0.0.1:5030`, which refers to the **visitor's device**. For remote use, prefer a same-origin HTTPS reverse proxy and an empty URL in connection settings. Cross-origin access requires backend CORS support; HTTPS pages may block HTTP resources. Never expose an unauthenticated private chat service publicly.

## Scope and privacy

| Area | HTTP source | Local database source |
| --- | --- | --- |
| Analytics and media coverage | Up to 10 recent sessions, at most 1,000 messages each, with sampling, failure and truncation notices | The full imported index within the selected dates; defaults to the archive's latest message date, not a claim of complete upstream history |
| Keyword search | Main keyword is queried on the backend; additional AND/OR filters apply only to the current returned page | All keywords are filtered in the local index before pagination, including Chinese short words and literal substrings |
| Chat-content storage | The application does not persist HTTP response bodies; loaded content remains in page memory | With consent, decoded content and its index are persisted in the current origin's OPFS; explicitly associated attachments are stored in IndexedDB |
| Media | Previewing a different origin requires consent; opening a resource link contacts its server | External media is not automatically requested; only explicitly associated local attachments are used |

Query exports for either source read at most 5,000 messages and report the cap. Undecoded local messages remain in message counts but are excluded from body search and word frequencies. See [local archive documentation](docs/LOCAL-ARCHIVE.md) for additional decoding and resource limits.

**Local browser copies have no additional application-layer encryption.** Trust the deployment origin and avoid importing on public computers. Clearing the archive in Data sources removes the browser index and associated attachments, not the original files. Browsers may evict site storage; keep backups of your source files. Exports contain chat content and should also be protected.

Unknown sizes, member counts and dates stay unknown. Empty data and connection errors remain distinct, and no synthetic response-rate metric is displayed. Message content is rendered as text with literal highlight segments, not interpolated HTML. Successful import does not prove complete history; unknown schemas and unparsed data are reported explicitly.

## Validation and screenshot updates

```bash
npm ci
node --test tests/*.test.mjs
npm run lint -- --no-fix src
npm run build
python -m pip install playwright==1.52.0 pillow
python -m playwright install --with-deps chromium
python tests/browser-smoke.py
python tests/browser-local.py
```

The browser scripts run the production `dist/` build and generate `images/ui/` demo screenshots and `images/wcdb/` local archive screenshots. Both suites use fictional data. Local tests import actual SQLite fixtures through the Worker, WASM and OPFS rather than substituting a mock import API.

CI includes [UI validation](.github/workflows/ui-validation.yml) and [Local archive validation](.github/workflows/local-archive.yml). PR and main checks do not modify the repository. [`images/ui/manifest.json`](images/ui/manifest.json) and [`images/wcdb/manifest.json`](images/wcdb/manifest.json) record screenshot provenance and completed checks. Commit updated screenshots and their manifests together.

Actual chatlog versions, private WeChat database schemas, Safari/Firefox, physical mobile devices and multi-GiB performance require separate acceptance testing. See [TEST-REPORT.md](TEST-REPORT.md) and [LOCAL-TEST-REPORT.md](LOCAL-TEST-REPORT.md).

## Implementation and contributions

Vue 3 and Vue Router power the interface, with native HTML/SVG/CSS components and the existing Vue CLI build. Local imports use official SQLite WASM in a dedicated Worker. Legacy dependencies are temporarily retained to avoid an unrelated migration; the old Vuex module is no longer loaded by the entry point. See [design notes](UI-REDESIGN.md) and [archived documentation](docs/legacy) for context; archived feature descriptions do not describe the current UI.

Please run the checks before submitting a PR and never upload private conversations. See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md) and [Issues](https://github.com/sinyu1012/chatlog-web/issues).

Licensed under [Apache License 2.0](LICENSE). Thanks to chatlog, Vue, and the open-source libraries used by the previous interface, including Element Plus and ECharts.
