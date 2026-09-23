"""Exercise the production dist build, then capture fictional demo screenshots.
Usage: python tests/browser-smoke.py (requires Playwright Chromium and npm run build).
No backend, private chat data, credentials, or external media are used.
"""
import functools
import json
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'images' / 'ui'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []
requests = []

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        candidate = Path(self.translate_path(path))
        if not candidate.exists() and not Path(path).suffix:
            self.path = '/index.html'
        super().do_GET()
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT / 'dist')))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'

def passed(name):
    checks.append(name)
    print('PASS:', name, flush=True)

def settled(page):
    expect(page.locator('h1')).to_be_visible(timeout=15000)
    expect(page.locator('.skeleton-stack')).to_have_count(0, timeout=15000)
    page.evaluate('document.fonts.ready')

def visit(page, route):
    page.goto(f'{base}/{route}?demo=1', wait_until='networkidle')
    settled(page)
    expect(page.locator('.demo-banner')).to_be_visible()

def layout_check(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), label + ': document overflow'
    assert page.evaluate("getComputedStyle(document.querySelector('.sidebar')).position") == 'fixed', 'CSS not loaded'
    assert page.evaluate("[...document.images].filter(i=>i.offsetWidth>0).every(i=>i.complete && i.naturalWidth>0)"), label + ': broken image'
    passed(label)

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width': 1440, 'height': 1050}, device_scale_factor=1, timezone_id='Asia/Shanghai', reduced_motion='reduce', accept_downloads=True)
    context.add_init_script("window.__CHATLOG_NOW__ = '2026-09-23T11:00:00+08:00';")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda req: requests.append(req.url))
    try:
        for route in ['dashboard', 'chatlog', 'analytics', 'contacts', 'chatrooms', 'sessions', 'media']:
            visit(page, route)
            layout_check(page, 'desktop route: ' + route)
            page.screenshot(path=str(OUT / (route + '.png')), full_page=True, animations='disabled')
        page.locator('.topbar').get_by_role('button', name='切换深色模式').click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        page.screenshot(path=str(OUT / 'media-dark.png'), full_page=True, animations='disabled')
        passed('dark theme switch')
        page.reload(wait_until='networkidle')
        settled(page)
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        passed('theme persists after reload')
        page.locator('.topbar').get_by_role('button', name='切换浅色模式').click()
        visit(page, 'contacts')
        page.get_by_role('button', name='下一页').click()
        expect(page.locator('.page-indicator')).to_contain_text('2')
        passed('contacts pagination')
        page.get_by_role('searchbox', name='搜索联系人').fill('周知意')
        expect(page.locator('.data-table tbody tr')).to_have_count(1)
        page.locator('.row-detail').first.click()
        expect(page.locator('dialog[open]')).to_be_visible()
        page.locator('dialog[open]').get_by_role('button', name='关闭对话框').click()
        passed('contact search and detail dialog')
        visit(page, 'chatrooms')
        page.get_by_role('button', name='下一页').click()
        expect(page.locator('.room-card')).to_have_count(3)
        passed('group pagination')
        visit(page, 'sessions')
        page.get_by_role('button', name='私聊', exact=True).click()
        expect(page.locator('.session-list .group-pill')).to_have_count(0)
        passed('private session filter')
        visit(page, 'chatlog')
        expect(page.locator('.message-row').first).to_be_visible()
        page.get_by_role('searchbox', name='消息关键词').fill('设计')
        page.locator('.chat-search').get_by_role('button', name='搜索', exact=True).click()
        settled(page)
        expect(page.locator('mark').first).to_be_visible()
        passed('backend demo search and literal highlighting')
        page.get_by_role('button', name='导出记录', exact=True).click()
        with page.expect_download() as info:
            page.locator('dialog[open]').get_by_role('button', name='下载文件').click()
        assert info.value.suggested_filename.endswith('.csv')
        passed('CSV export downloads a file')
        page.keyboard.press('Control+k')
        expect(page.locator('dialog[open]')).to_be_visible()
        page.locator('dialog[open]').get_by_role('textbox', name='搜索聊天内容').fill('项目')
        page.locator('dialog[open]').get_by_role('button', name='搜索', exact=True).click()
        settled(page)
        expect(page.get_by_role('searchbox', name='消息关键词')).to_have_value('项目')
        passed('global keyboard search navigates via Vue Router')
        visit(page, 'media')
        page.locator('.media-thumb').first.click()
        expect(page.locator('dialog[open]')).to_be_visible()
        page.locator('dialog[open]').get_by_role('button', name='关闭对话框').click()
        passed('media preview opens and closes')
        page.set_viewport_size({'width': 390, 'height': 844})
        for route in ['dashboard', 'chatlog', 'analytics', 'contacts', 'chatrooms', 'sessions', 'media']:
            visit(page, route)
            layout_check(page, 'mobile route: ' + route)
            if route in ['dashboard', 'chatlog', 'media']:
                page.screenshot(path=str(OUT / ('mobile-' + route + '.png')), full_page=True, animations='disabled')
        page.get_by_role('button', name='打开导航', exact=True).click()
        expect(page.locator('.sidebar')).to_have_class('sidebar open')
        page.locator('.sidebar').get_by_role('button', name='联系人', exact=True).click()
        settled(page)
        expect(page.locator('h1')).to_contain_text('联系人')
        passed('mobile navigation')
        assert not any('/api/v1/' in url or ':5030/' in url for url in requests), requests
        passed('demo makes no backend requests')
        assert not errors, errors
        passed('no uncaught browser errors')
        # Failure and empty data are separate real-mode states, never demo fallbacks.
        real = browser.new_context(viewport={'width': 1440, 'height': 1050})
        real.add_init_script("localStorage.setItem('chatlog-ui-api-base', '');")
        real.route('**/api/v1/**', lambda route: route.fulfill(status=503, body='unavailable'))
        q = real.new_page()
        q.goto(base + '/contacts', wait_until='networkidle')
        settled(q)
        expect(q.get_by_role('heading', name='无法读取联系人')).to_be_visible()
        expect(q.locator('.demo-banner')).to_have_count(0)
        passed('real-mode API failure does not activate demo')
        real.unroute('**/api/v1/**')
        real.route('**/api/v1/**', lambda route: route.fulfill(status=200, content_type='application/json', body='[]'))
        q.reload(wait_until='networkidle')
        settled(q)
        expect(q.get_by_role('heading', name='联系人档案还是空的')).to_be_visible()
        passed('successful empty response has an empty state')
        real.close()
    except Exception:
        page.screenshot(path=str(OUT / 'failure.png'), full_page=True)
        raise
    finally:
        (OUT / 'manifest.json').write_text(json.dumps({'fictional': True, 'sourceCommit': os.environ.get('GITHUB_SHA', 'local'), 'renderer': 'production dist / Playwright Chromium', 'clock': '2026-09-23T11:00:00+08:00', 'checks': checks, 'browserErrors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
        server.shutdown()
print(f'{len(checks)} browser checks passed', flush=True)
