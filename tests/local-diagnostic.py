"""Capture the first real WASM/OPFS import failure, using fictional files only."""
import importlib.util
import json
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'review'
OUT.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('fixtures',ROOT/'tests/make-local-fixtures.py')
fixtures=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixtures)
class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if not Path(self.path.split('?')[0]).suffix:self.path='/index.html'
        super().do_GET()
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',8790),partial(Handler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
  with tempfile.TemporaryDirectory() as temporary,sync_playwright() as p:
    data=fixtures.build(Path(temporary))
    browser=p.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':1000})
    diagnostics=[]
    page.on('console',lambda msg:diagnostics.append({'type':msg.type,'text':msg.text}))
    page.on('pageerror',lambda error:diagnostics.append({'type':'pageerror','text':str(error)}))
    page.add_init_script("""const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(url,options){super(url,options);this.addEventListener('error',e=>console.error('WORKER ERROR',e.message,e.filename,e.lineno));this.addEventListener('message',e=>{if(e.data.error)console.error('WORKER RPC ERROR',JSON.stringify(e.data.error))})}};""")
    page.route('**/api/v1/**',lambda route:route.fulfill(status=200,content_type='application/json',body='[]'))
    try:
      page.goto('http://127.0.0.1:8790/sources')
      page.wait_for_timeout(4000)
      page.get_by_label('选择多个数据库',exact=True).set_input_files(data['files'])
      page.locator('.source-import input[type=checkbox]').nth(0).check()
      page.locator('.source-import input[type=checkbox]').nth(1).check()
      page.get_by_role('button',name='导入本地档案',exact=True).click()
      page.wait_for_function("document.querySelector('.source-metrics') || document.querySelector('.source-error')",timeout=50000)
    finally:
      page.screenshot(path=str(OUT/'import-diagnostic.png'),full_page=True)
      body=page.locator('body').inner_text()
      print('IMPORT PAGE:',body,flush=True)
      print('IMPORT DIAGNOSTICS:',json.dumps(diagnostics,ensure_ascii=False),flush=True)
      (OUT/'import-diagnostic.json').write_text(json.dumps({'fictional':True,'body':body,'diagnostics':diagnostics},ensure_ascii=False,indent=2))
      browser.close()
finally:
  server.shutdown()
