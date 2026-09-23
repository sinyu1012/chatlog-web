<div align="center">
  <img src="public/brand/logo.svg" width="64" alt="Chatlog" />
  <h1>Chatlog Web</h1>
  <p><strong>Every conversation deserves a place.</strong></p>
  <p>A quieter workspace for browsing your own conversation archive.</p>
  <p>English · <a href="README.md">简体中文</a> · <a href="UI-REDESIGN.md">Design notes</a></p>
</div>

A read-only web interface for [chatlog](https://github.com/sjzar/chatlog). The redesign covers seven pages, a shared sage-and-paper design system, dark mode, responsive navigation, and original SVG icons.

> This project contains no data-cracking code or instructions. You provide the data and backend service. Only access data you are authorized to use. The interface does not send chat messages.

## HTTP and local plaintext archives

Use an existing chatlog HTTP service, or import already-decrypted WeChat 4.x SQLite files in **Data sources**. SQLite WASM runs inside a browser worker; this feature neither invokes key-extraction tools nor uploads chat data. All seven archive views share the selected source.

![Local import report using fictional SQLite fixtures](images/wcdb/sources.png)

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
| `/dashboard` | Archive counts, message trend, recent conversations and shortcuts |
| `/chatlog` | Conversation context, keyword/date filters, literal highlighting, pagination and CSV/JSON/text export |
| `/analytics` | Shared 7/30/90-day sample range, trends, message types, hourly heatmap, word counts and sampled-group ranking |
| `/contacts` | Search, details, copy ID and open history |
| `/chatrooms` | Group cards, membership metadata, details and pagination |
| `/sessions` | Recent-first timeline, private/group filters and search |
| `/media` | Deduplicated media references, type filters, search, previews and resource links |

Shared features include `Cmd/Ctrl + K` search, connection settings, light/dark themes, mobile navigation, keyboard focus, loading, error and empty states. The 39 original stroke icons in `src/lib/icons.js` do not require icon fonts.

## Getting started

Development and CI use Node.js 22.

```bash
npm install
npm run serve
```

Open `http://localhost:8080`. To explore without a backend, explicitly enable demo mode:

```text
http://localhost:8080/dashboard?demo=1
```

Errors never automatically switch to demo data. Demo audio, video and document cards are UI placeholders, not playable or downloadable files.

For real data, prepare your own service following the [chatlog documentation](https://github.com/sjzar/chatlog). The development proxy targets `http://127.0.0.1:5030` by default; override it with `CHATLOG_PROXY_TARGET`. Connection settings accept a trusted HTTP(S) backend URL; leave it empty for the same-origin proxy.

## Production

```bash
npm run build
```

Serve `dist/` with an SPA fallback to `index.html`. The default public base is `/`. For a subdirectory, build with an absolute base such as `VUE_APP_PUBLIC_PATH=/chatlog/` and configure the corresponding fallback.

`VUE_APP_API_BASE_URL` sets the build-time API URL. Without it, production defaults to `http://127.0.0.1:5030`, which refers to the **visitor's device**. For remote use, prefer a same-origin HTTPS reverse proxy and an empty URL in connection settings. Cross-origin access requires backend CORS support; HTTPS pages may block HTTP resources. Never expose an unauthenticated private chat service publicly.

## Scope and privacy

Analytics and media scan up to the **10 most recent sessions, at most 1,000 messages each**, with explicit coverage, failure and truncation notices. These are samples, not complete archive statistics. No synthetic response-rate metric is displayed.

The main keyword is queried on the backend. Additional AND/OR keyword filters apply **only to the current returned page**. Query exports read at most 5,000 messages and report the cap.

Unknown sizes, member counts and dates stay unknown. Message content is rendered as text with literal highlight segments, not interpolated HTML. Previewing media from a different origin requires consent; opening a resource link contacts that server.

Only the endpoint and theme are persisted in browser storage. Loaded chat data may remain in page memory; exports contain chat content and should be protected by the user.

## Validation and screenshot updates

```bash
node --test tests/core.test.mjs
npm run lint -- --no-fix src
npm run build
python -m pip install playwright==1.52.0
python -m playwright install --with-deps chromium
python tests/browser-smoke.py
```

The browser script runs the real production `dist/` build and updates `images/ui/`. The [UI validation workflow](.github/workflows/ui-validation.yml) verifies code on PRs and main. A successful push to the redesign branch also commits generated fictional screenshots to that branch. PR and main checks do not modify the repository. [`images/ui/manifest.json`](images/ui/manifest.json) records the rendered source commit and browser checks.

Actual chatlog versions, private backend data, Safari and physical mobile devices require separate acceptance testing. See [TEST-REPORT.md](TEST-REPORT.md).

## Implementation and contributions

Vue 3 and Vue Router power the interface, with native HTML/SVG/CSS components and the existing Vue CLI build. Legacy dependencies are temporarily retained to avoid an unrelated migration; the old Vuex module is no longer loaded by the entry point. See [design notes](UI-REDESIGN.md) and [archived documentation](docs/legacy) for context; archived feature descriptions do not describe the current UI.

Please run the checks before submitting a PR and never upload private conversations. See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md) and [Issues](https://github.com/sinyu1012/chatlog-web/issues).

Licensed under [Apache License 2.0](LICENSE). Thanks to chatlog, Vue, and the open-source libraries used by the previous interface, including Element Plus and ECharts.
